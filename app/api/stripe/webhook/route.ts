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
  const startTime = Date.now();
  let event: Stripe.Event;

  try {
    // Get raw body as text (required for signature verification)
    const body = await request.text();
    
    // Get Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ [WEBHOOK] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook secret is configured
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
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
      console.error('❌ [WEBHOOK] Signature verification failed:', message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 }
      );
    }

    console.log(`📨 [WEBHOOK] Received: ${event.type} | ID: ${event.id}`);

    // ==========================================================================
    // HANDLE EVENTS
    // ==========================================================================

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💳 [WEBHOOK] checkout.session.completed | Session: ${session.id} | Booking: ${session.metadata?.booking_id}`);
        await handleCheckoutCompleted(session, event.id);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`⏰ [WEBHOOK] checkout.session.expired | Session: ${session.id} | Booking: ${session.metadata?.booking_id}`);
        await handleCheckoutExpired(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`✅ [WEBHOOK] payment_intent.succeeded | PI: ${paymentIntent.id}`);
        // We handle this via checkout.session.completed, but log for debugging
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ [WEBHOOK] payment_intent.payment_failed | PI: ${paymentIntent.id} | Error: ${paymentIntent.last_payment_error?.message}`);
        break;
      }

      default:
        console.log(`ℹ️ [WEBHOOK] Unhandled event: ${event.type}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [WEBHOOK] Processed ${event.type} in ${duration}ms`);

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ [WEBHOOK] Handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// CHECKOUT COMPLETED - Customer successfully paid!
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const bookingId = session.metadata?.booking_id;
  const paymentType = session.metadata?.payment_type || 'deposit';
  const customerId = session.metadata?.customer_id;
  const promoCodeId = session.metadata?.promo_code_id || null;
  const promoDiscount = parseFloat(session.metadata?.promo_discount || '0');
  const originalPrice = parseFloat(session.metadata?.original_price || '0');
  const finalPrice = parseFloat(session.metadata?.final_price || '0');
  
  if (!bookingId) {
    console.error('❌ [WEBHOOK] No booking_id in session metadata:', session.id);
    return;
  }

  console.log(`🔄 [WEBHOOK] Processing payment for booking ${bookingId} | Type: ${paymentType} | Amount: $${(session.amount_total || 0) / 100}`);

  const supabase = createServerClient();

  // ==========================================================================
  // IDEMPOTENCY CHECK - Don't process the same payment twice
  // ==========================================================================
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .single();

  if (existingPayment) {
    console.log(`ℹ️ [WEBHOOK] Payment already processed for session ${session.id} - skipping (idempotent)`);
    return;
  }

  // Also check if booking is already confirmed (double-safety)
  const { data: bookingCheck } = await supabase
    .from('bookings')
    .select('status, stripe_payment_intent_id')
    .eq('id', bookingId)
    .single();

  if (bookingCheck?.status === 'confirmed' && bookingCheck?.stripe_payment_intent_id === session.payment_intent) {
    console.log(`ℹ️ [WEBHOOK] Booking ${bookingId} already confirmed with this payment - skipping (idempotent)`);
    return;
  }

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
      console.log(`✅ [WEBHOOK] Fetched payment details | Card: ${cardBrand} ****${cardLast4}`);
    } catch (stripeErr) {
      console.log('ℹ️ [WEBHOOK] Could not fetch payment details:', stripeErr);
    }
  }

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
    console.error('❌ [WEBHOOK] Error fetching booking:', fetchError);
    return;
  }

  console.log(`📋 [WEBHOOK] Booking found: ${booking.booking_number} | Current status: ${booking.status}`);

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
  // NOTE: balance_due stays at calculated value due to valid_balance constraint
  // We use balance_paid = true to indicate full payment was received
  if (isFullPayment) {
    bookingUpdate.balance_paid = true;
    bookingUpdate.balance_paid_at = now;
    bookingUpdate.balance_payment_method = 'stripe';
    console.log(`💰 [WEBHOOK] Full payment recorded - balance_paid = true`);
  }

  const { error: bookingError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', bookingId);

  if (bookingError) {
    console.error('❌ [WEBHOOK] Error updating booking:', bookingError);
    // Don't return - try to continue with other operations
  } else {
    console.log(`✅ [WEBHOOK] Booking ${booking.booking_number} status updated to CONFIRMED`);
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
      card_brand: cardBrand,
      card_last_four: cardLast4,
    });

  if (paymentError) {
    console.error('❌ [WEBHOOK] Error creating payment record:', paymentError);
  } else {
    console.log(`✅ [WEBHOOK] Payment record created: $${amountPaid} (${isFullPayment ? 'full' : 'deposit'})`);
  }

  // ==========================================================================
  // 3.5. RECORD PROMO CODE USAGE (if promo code was applied)
  // ==========================================================================
  if (promoCodeId && promoDiscount > 0 && customerId) {
    try {
      const { error: promoUsageError } = await supabase
        .rpc('apply_promo_code', {
          p_promo_code_id: promoCodeId,
          p_booking_id: bookingId,
          p_customer_id: customerId,
          p_original_amount: originalPrice,
          p_discount_applied: promoDiscount,
        });

      if (promoUsageError) {
        console.error('❌ [WEBHOOK] Error recording promo code usage:', promoUsageError);
      } else {
        console.log(`✅ [WEBHOOK] Promo code usage recorded: -$${promoDiscount}`);
      }
    } catch (promoErr) {
      console.error('❌ [WEBHOOK] Error in promo code usage:', promoErr);
    }
  }

  // ==========================================================================
  // 4. UPDATE CUSTOMER STATS
  // ==========================================================================
  if (customerId) {
    const { error: customerError } = await supabase
      .from('customers')
      .update({
        booking_count: (booking.customer?.booking_count || 0) + 1,
        total_spent: (Number(booking.customer?.total_spent) || 0) + amountPaid,
      })
      .eq('id', customerId);

    if (customerError) {
      console.error('❌ [WEBHOOK] Error updating customer stats:', customerError);
    } else {
      console.log(`✅ [WEBHOOK] Customer stats updated`);
    }
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
    console.log('✅ [WEBHOOK] Push notification sent to admin');
  } catch (pushError) {
    console.log('ℹ️ [WEBHOOK] Push notification skipped (no subscriptions or error)');
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
        balanceDue: isFullPayment ? 0 : Number(booking.balance_due),
        notes: booking.customer_notes || undefined,
        bookingType: booking.booking_type as 'daily' | 'weekend' | 'sunday',
        paidInFull: isFullPayment,
        deliveryDate: booking.delivery_date,
      }),
    });
    console.log('✅ [WEBHOOK] Customer confirmation email sent');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send customer email:', emailError);
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
        balanceDue: isFullPayment ? 0 : Number(booking.balance_due),
        notes: booking.customer_notes || undefined,
        bookingType: booking.booking_type as 'daily' | 'weekend' | 'sunday',
        paidInFull: isFullPayment,
        amountPaid,
        stripePaymentIntentId: session.payment_intent as string || undefined,
        stripeReceiptUrl: stripeReceiptUrl || undefined,
        cardLast4: cardLast4 || undefined,
        cardBrand: cardBrand || undefined,
      }),
    });
    console.log('✅ [WEBHOOK] Business notification email sent');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send business email:', emailError);
  }

  console.log(`🎉 [WEBHOOK] Booking ${booking.booking_number} fully processed!`);
}

// =============================================================================
// CHECKOUT EXPIRED - Customer didn't complete payment in time
// =============================================================================

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  
  if (!bookingId) {
    console.log('ℹ️ [WEBHOOK] Expired session had no booking_id');
    return;
  }

  console.log(`⏰ [WEBHOOK] Checkout expired for booking ${bookingId}`);

  const supabase = createServerClient();

  // Check if booking is still pending
  const { data: booking } = await supabase
    .from('bookings')
    .select('status, booking_number')
    .eq('id', bookingId)
    .single();

  if (booking?.status === 'pending') {
    // Keep it pending - customer can retry via "My Bookings" page
    // The "Complete Payment" button will create a new Stripe session
    console.log(`ℹ️ [WEBHOOK] Booking ${booking.booking_number} remains pending - customer can retry payment`);
    
    // Optionally: You could send a reminder email here
    // await sendPaymentReminderEmail(bookingId);
  } else {
    console.log(`ℹ️ [WEBHOOK] Booking ${booking?.booking_number} is already ${booking?.status}`);
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
