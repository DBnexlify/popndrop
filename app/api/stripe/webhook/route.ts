// =============================================================================
// STRIPE WEBHOOK HANDLER
// app/api/stripe/webhook/route.ts
// Receives payment confirmations from Stripe and updates booking status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';
import { notifyNewBooking } from '@/lib/push-notifications';
import { createCustomerEmail, createBusinessEmail } from '@/app/api/bookings/route';

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    // Get raw body as text (required for signature verification)
    const body = await request.text();
    
    // Get Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook secret is configured
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify the webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Webhook signature verification failed:', message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 }
      );
    }

    console.log(`📨 Received Stripe webhook: ${event.type}`);

    // ==========================================================================
    // HANDLE EVENTS
    // ==========================================================================

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// CHECKOUT COMPLETED - Customer successfully paid!
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  const paymentType = session.metadata?.payment_type || 'deposit';
  const customerId = session.metadata?.customer_id;
  
  if (!bookingId) {
    console.error('❌ No booking_id in session metadata:', session.id);
    return;
  }

  console.log(`✅ Processing payment for booking ${bookingId} (${paymentType})`);

  // ==========================================================================
  // FETCH STRIPE PAYMENT DETAILS (for receipt URL, card info)
  // ==========================================================================
  let stripeReceiptUrl: string | null = null;
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ['latest_charge'],
      });
      
      const charge = paymentIntent.latest_charge as Stripe.Charge | null;
      if (charge) {
        stripeReceiptUrl = charge.receipt_url || null;
        if (charge.payment_method_details?.card) {
          cardLast4 = charge.payment_method_details.card.last4 || null;
          cardBrand = charge.payment_method_details.card.brand || null;
        }
      }
      console.log('✅ Fetched Stripe payment details');
    } catch (stripeErr) {
      console.log('ℹ️ Could not fetch payment details:', stripeErr);
    }
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();
  const amountPaid = (session.amount_total || 0) / 100; // Convert cents to dollars
  const isFullPayment = paymentType === 'full';

  // ==========================================================================
  // 1. GET BOOKING WITH ALL DETAILS
  // ==========================================================================
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers (*),
      unit:units (
        *,
        product:products (*)
      )
    `)
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error('❌ Error fetching booking:', fetchError);
    return;
  }

  // ==========================================================================
  // 2. UPDATE BOOKING STATUS TO CONFIRMED
  // ==========================================================================
  const bookingUpdate: Record<string, unknown> = {
    status: 'confirmed',
    deposit_paid: true,
    deposit_paid_at: now,
    confirmed_at: now,
    stripe_payment_intent_id: session.payment_intent as string || null,
  };

  // If full payment, mark balance as paid too
  if (isFullPayment) {
    bookingUpdate.balance_paid = true;
    bookingUpdate.balance_paid_at = now;
    bookingUpdate.balance_payment_method = 'stripe';
  }

  const { error: bookingError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', bookingId);

  if (bookingError) {
    console.error('❌ Error updating booking:', bookingError);
  } else {
    console.log(`✅ Booking ${booking.booking_number} confirmed!`);
  }

  // ==========================================================================
  // 3. CREATE PAYMENT RECORD
  // ==========================================================================
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      payment_type: isFullPayment ? 'full' : 'deposit',
      amount: amountPaid,
      status: 'succeeded',
      payment_method: 'card',
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
    });

  if (paymentError) {
    console.error('❌ Error creating payment record:', paymentError);
  } else {
    console.log(`✅ Payment record created: $${amountPaid}`);
  }

  // ==========================================================================
  // 4. UPDATE CUSTOMER STATS
  // ==========================================================================
  if (customerId) {
    // Increment booking count and total spent
    await supabase
      .from('customers')
      .update({
        booking_count: (booking.customer?.booking_count || 0) + 1,
        total_spent: (Number(booking.customer?.total_spent) || 0) + amountPaid,
      })
      .eq('id', customerId);
  }

  // ==========================================================================
  // 5. SEND PUSH NOTIFICATION TO ADMIN
  // ==========================================================================
  try {
    const customerName = `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim();
    const productName = booking.product_snapshot?.name || 'Bounce House';
    
    await notifyNewBooking(
      booking.booking_number,
      customerName,
      formatDate(booking.event_date),
      productName,
      Number(booking.subtotal),
      booking.delivery_address,
      booking.delivery_city
    );
    console.log('✅ Push notification sent');
  } catch (pushError) {
    console.log('ℹ️ Push notification skipped');
  }

  // ==========================================================================
  // 6. SEND CONFIRMATION EMAILS
  // ==========================================================================
  const customerName = `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim();
  const productName = booking.product_snapshot?.name || 'Bounce House';

  // Customer email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: booking.customer?.email || session.customer_email || '',
      subject: `🎉 Booking Confirmed: ${productName} on ${formatDate(booking.event_date)}`,
      html: createCustomerEmail({
        customerName: booking.customer?.first_name || 'there',
        productName,
        bookingNumber: booking.booking_number,
        eventDate: formatDate(booking.event_date),
        pickupDate: formatDate(booking.pickup_date),
        deliveryWindow: booking.delivery_window,
        pickupWindow: booking.pickup_window,
        address: booking.delivery_address,
        city: booking.delivery_city,
        totalPrice: Number(booking.subtotal),
        depositAmount: Number(booking.deposit_amount),
        balanceDue: Number(booking.balance_due),
        notes: booking.customer_notes || undefined,
        bookingType: booking.booking_type as 'daily' | 'weekend' | 'sunday',
        paidInFull: isFullPayment,
      }),
    });
    console.log('✅ Customer confirmation email sent');
  } catch (emailError) {
    console.error('❌ Failed to send customer email:', emailError);
  }

  // Business notification email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `🎉 New Booking: ${booking.booking_number} - ${productName} - ${isFullPayment ? 'PAID IN FULL' : '$50 Deposit'}`,
      html: createBusinessEmail({
        bookingNumber: booking.booking_number,
        customerName,
        customerEmail: booking.customer?.email || '',
        customerPhone: booking.customer?.phone || '',
        productName,
        eventDate: booking.event_date,
        deliveryDate: booking.delivery_date,
        pickupDate: booking.pickup_date,
        deliveryWindow: booking.delivery_window,
        pickupWindow: booking.pickup_window,
        address: booking.delivery_address,
        city: booking.delivery_city,
        totalPrice: Number(booking.subtotal),
        depositAmount: Number(booking.deposit_amount),
        balanceDue: Number(booking.balance_due),
        notes: booking.customer_notes || undefined,
        bookingType: booking.booking_type as 'daily' | 'weekend' | 'sunday',
        paidInFull: isFullPayment,
        amountPaid,
        // Stripe details
        stripePaymentIntentId: session.payment_intent as string || undefined,
        stripeReceiptUrl: stripeReceiptUrl || undefined,
        cardLast4: cardLast4 || undefined,
        cardBrand: cardBrand || undefined,
      }),
    });
    console.log('✅ Business notification email sent');
  } catch (emailError) {
    console.error('❌ Failed to send business email:', emailError);
  }

  console.log(`🎉 Booking ${booking.booking_number} fully processed!`);
}

// =============================================================================
// CHECKOUT EXPIRED - Customer didn't complete payment in time
// =============================================================================

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  
  if (!bookingId) {
    console.log('ℹ️ Expired session had no booking_id');
    return;
  }

  console.log(`⏰ Checkout expired for booking ${bookingId}`);

  const supabase = createServerClient();

  // Check if booking is still pending
  const { data: booking } = await supabase
    .from('bookings')
    .select('status, booking_number')
    .eq('id', bookingId)
    .single();

  if (booking?.status === 'pending') {
    // Option 1: Auto-cancel (frees up the date for others)
    // Uncomment if you want expired checkouts to auto-cancel:
    /*
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'system',
        cancellation_reason: 'Payment not completed within 30 minutes',
      })
      .eq('id', bookingId);
    console.log(`🗑️ Booking ${booking.booking_number} auto-cancelled`);
    */
    
    // Option 2: Keep it pending, they might retry
    console.log(`ℹ️ Booking ${booking.booking_number} still pending after checkout expiry`);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
