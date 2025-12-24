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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`💸 [WEBHOOK] charge.refunded | Charge: ${charge.id} | Amount Refunded: ${(charge.amount_refunded || 0) / 100}`);
        await handleChargeRefunded(charge);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`⚠️ [WEBHOOK] charge.dispute.created | Dispute: ${dispute.id} | Amount: ${dispute.amount / 100}`);
        await handleDisputeCreated(dispute);
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
  // FETCH STRIPE PAYMENT DETAILS (for receipt URL, card info, ACTUAL FEE)
  // ==========================================================================
  let stripeReceiptUrl: string | null = null;
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  let actualStripeFee: number | null = null;
  
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ['latest_charge.balance_transaction'],
      });
      
      const charge = paymentIntent.latest_charge as Stripe.Charge | null;
      if (charge) {
        stripeReceiptUrl = charge.receipt_url || null;
        if (charge.payment_method_details?.card) {
          cardLast4 = charge.payment_method_details.card.last4 || null;
          cardBrand = charge.payment_method_details.card.brand || null;
        }
        
        // Get ACTUAL Stripe fee from balance_transaction
        const balanceTx = charge.balance_transaction as Stripe.BalanceTransaction | null;
        if (balanceTx && typeof balanceTx === 'object') {
          actualStripeFee = balanceTx.fee / 100; // Convert cents to dollars
          console.log(`💰 [WEBHOOK] Actual Stripe fee: ${actualStripeFee.toFixed(2)}`);
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
  // 3. CREATE PAYMENT RECORD (with actual Stripe fee)
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
      stripe_fee: actualStripeFee, // Actual fee from Stripe, not estimated!
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
  const customerEmailAddr = booking.customer?.email || session.customer_email || '';

  console.log(`📧 [WEBHOOK] Preparing to send customer email to: ${customerEmailAddr}`);

  // Customer email - send FIRST, before business email
  try {
    console.log(`📧 [WEBHOOK] Calling resend.emails.send for customer...`);
    const customerResult = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmailAddr,
      subject: `🎉 Booking Confirmed: ${productName} on ${formatDate(booking.event_date)}`,
      html: createCustomerEmail({
        customerName: booking.customer?.first_name || 'there',
        productName,
        bookingNumber: booking.booking_number,
        eventDate: booking.event_date,
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
        deliveryDate: booking.delivery_date,
      }),
    });
    console.log(`✅ [WEBHOOK] Customer email sent! ID: ${customerResult?.data?.id}`);
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

// =============================================================================
// CHARGE REFUNDED - Track refunds and lost fees
// =============================================================================

async function handleChargeRefunded(charge: Stripe.Charge) {
  const supabase = createServerClient();
  const paymentIntentId = typeof charge.payment_intent === 'string' 
    ? charge.payment_intent 
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.log('ℹ️ [WEBHOOK] Refund charge has no payment_intent');
    return;
  }

  // Find the original payment by payment_intent_id
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      amount,
      stripe_fee,
      booking:bookings(booking_number, customer_id)
    `)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (paymentError || !paymentData) {
    console.error('❌ [WEBHOOK] Could not find original payment for refund:', paymentIntentId);
    return;
  }

  // Extract booking from array (Supabase returns joins as arrays)
  const booking = Array.isArray(paymentData.booking) ? paymentData.booking[0] : paymentData.booking;
  const payment = { ...paymentData, booking };

  // Calculate refund details
  const refundAmount = (charge.amount_refunded || 0) / 100;
  const isFullRefund = refundAmount >= payment.amount;
  
  // IMPORTANT: Stripe does NOT return processing fees on refunds!
  // We lose the original fee when we refund
  const originalFee = payment.stripe_fee || (payment.amount * 0.029 + 0.30);
  const feeLost = isFullRefund ? originalFee : (originalFee * (refundAmount / payment.amount));

  console.log(`💸 [WEBHOOK] Processing refund: ${refundAmount} | Fee lost: ${feeLost.toFixed(2)} | Full refund: ${isFullRefund}`);

  // Check if we already recorded this refund (idempotency)
  const { data: existingRefund } = await supabase
    .from('refunds')
    .select('id')
    .eq('payment_id', payment.id)
    .eq('amount', refundAmount)
    .single();

  if (existingRefund) {
    console.log('ℹ️ [WEBHOOK] Refund already recorded - skipping (idempotent)');
    return;
  }

  // Get the latest Stripe refund ID
  let stripeRefundId: string | null = null;
  if (charge.refunds?.data && charge.refunds.data.length > 0) {
    stripeRefundId = charge.refunds.data[0].id;
  }

  // Create refund record
  const { error: refundError } = await supabase
    .from('refunds')
    .insert({
      booking_id: payment.booking_id,
      payment_id: payment.id,
      amount: refundAmount,
      refund_type: isFullRefund ? 'full_refund' : 'partial_refund',
      reason: 'Processed via Stripe',
      status: 'completed',
      stripe_refund_id: stripeRefundId,
      original_stripe_fee_lost: feeLost,
      processed_at: new Date().toISOString(),
      is_full_refund: isFullRefund,
    });

  if (refundError) {
    console.error('❌ [WEBHOOK] Error creating refund record:', refundError);
    return;
  }

  const bookingNumber = booking?.booking_number || 'Unknown';
  console.log(`✅ [WEBHOOK] Refund recorded: ${refundAmount} for booking ${bookingNumber}`);

  // Update booking status if full refund
  if (isFullRefund) {
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Refunded via Stripe',
      })
      .eq('id', payment.booking_id);

    if (bookingError) {
      console.error('❌ [WEBHOOK] Error updating booking status:', bookingError);
    } else {
      console.log(`✅ [WEBHOOK] Booking ${bookingNumber} marked as cancelled`);
    }
  }

  // Send notification email to business
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `⚠️ Refund Processed: ${bookingNumber} - ${refundAmount.toFixed(2)}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">⚠️ Refund Processed</h2>
          <p><strong>Booking:</strong> ${bookingNumber}</p>
          <p><strong>Refund Amount:</strong> ${refundAmount.toFixed(2)}</p>
          <p><strong>Original Payment:</strong> ${payment.amount.toFixed(2)}</p>
          <p><strong>Stripe Fee Lost:</strong> ${feeLost.toFixed(2)}</p>
          <p><strong>Full Refund:</strong> ${isFullRefund ? 'Yes' : 'No (Partial)'}</p>
          <p><strong>Stripe Refund ID:</strong> ${stripeRefundId || 'N/A'}</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">
            💡 <strong>Note:</strong> Stripe does not return processing fees on refunds. 
            This refund cost you ${feeLost.toFixed(2)} in lost fees.
          </p>
        </div>
      `,
    });
    console.log('✅ [WEBHOOK] Refund notification email sent');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send refund notification:', emailError);
  }
}

// =============================================================================
// DISPUTE CREATED - Track chargebacks
// =============================================================================

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const supabase = createServerClient();
  
  // Get the charge to find the payment
  const chargeId = typeof dispute.charge === 'string' 
    ? dispute.charge 
    : dispute.charge?.id;

  if (!chargeId) {
    console.log('ℹ️ [WEBHOOK] Dispute has no charge ID');
    return;
  }

  // Fetch the charge to get payment_intent
  let paymentIntentId: string | null = null;
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId = typeof charge.payment_intent === 'string' 
      ? charge.payment_intent 
      : charge.payment_intent?.id || null;
  } catch (err) {
    console.error('❌ [WEBHOOK] Could not fetch charge for dispute:', err);
  }

  // Find the original payment
  let payment = null;
  let booking: { booking_number?: string; customer_id?: string } | null = null;
  
  if (paymentIntentId) {
    const { data } = await supabase
      .from('payments')
      .select(`
        id,
        booking_id,
        amount,
        stripe_fee,
        booking:bookings(booking_number, customer_id)
      `)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();
    
    payment = data;
    // Extract booking from array (Supabase returns joins as arrays)
    const bookingData = Array.isArray(data?.booking) ? data?.booking[0] : data?.booking;
    booking = bookingData || null;
  }

  const bookingNumber = booking?.booking_number || 'Unknown';

  const disputeAmount = dispute.amount / 100;
  const disputeFee = 15.00; // Stripe charges $15 dispute fee

  console.log(`⚠️ [WEBHOOK] Dispute created: ${disputeAmount} | Reason: ${dispute.reason}`);

  // Record dispute as an expense (it's a real cost to the business)
  // First, get or create a "Chargebacks" expense category
  let categoryId: string | null = null;
  const { data: category } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('name', 'Bank/Processing Fees')
    .single();
  
  categoryId = category?.id || null;

  if (categoryId) {
    // Record the dispute fee as an expense
    const { error: expenseError } = await supabase
      .from('expenses')
      .insert({
        category_id: categoryId,
        booking_id: payment?.booking_id || null,
        amount: disputeFee,
        description: `Stripe dispute fee - ${dispute.reason} - ${bookingNumber}`,
        vendor_name: 'Stripe',
        expense_date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        notes: `Dispute ID: ${dispute.id}. Status: ${dispute.status}. Evidence due: ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : 'N/A'}`,
      });

    if (expenseError) {
      console.error('❌ [WEBHOOK] Error recording dispute expense:', expenseError);
    } else {
      console.log('✅ [WEBHOOK] Dispute fee recorded as expense');
    }
  }

  // Send URGENT notification email to business
  const evidenceDueDate = dispute.evidence_details?.due_by 
    ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `🚨 URGENT: Chargeback Dispute - ${bookingNumber} - ${disputeAmount.toFixed(2)}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0;">🚨 CHARGEBACK DISPUTE FILED</h2>
            <p style="color: #991b1b; margin: 10px 0 0 0;">Action required within deadline!</p>
          </div>
          
          <h3>Dispute Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Booking:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${bookingNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Disputed Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${disputeAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Dispute Fee:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${disputeFee.toFixed(2)} (charged regardless of outcome)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Reason:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${dispute.reason?.replace(/_/g, ' ')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">${dispute.status}</td>
            </tr>
            <tr style="background: #fef9c3;">
              <td style="padding: 8px 0;"><strong>⏰ Evidence Due:</strong></td>
              <td style="padding: 8px 0;"><strong>${evidenceDueDate}</strong></td>
            </tr>
          </table>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <h4 style="margin: 0 0 10px 0;">📝 What to do:</h4>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Log into Stripe Dashboard immediately</li>
              <li>Go to Payments → Disputes</li>
              <li>Submit evidence (signed waiver, delivery photos, communication)</li>
              <li>Submit before ${evidenceDueDate}</li>
            </ol>
          </div>
          
          <p style="margin-top: 20px;">
            <a href="https://dashboard.stripe.com/disputes/${dispute.id}" 
               style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View Dispute in Stripe →
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Dispute ID: ${dispute.id}
          </p>
        </div>
      `,
    });
    console.log('✅ [WEBHOOK] Dispute notification email sent');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send dispute notification:', emailError);
  }
}
