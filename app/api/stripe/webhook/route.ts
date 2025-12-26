// =============================================================================
// STRIPE WEBHOOK HANDLER - COMPREHENSIVE PAYMENT PROCESSING
// app/api/stripe/webhook/route.ts
// 
// Handles ALL payment events including:
// - Card payments (immediate)
// - ACH/Bank transfers (async - 3-5 business days)
// - Refunds (full and partial)
// - Disputes/Chargebacks
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
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ [WEBHOOK] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [WEBHOOK] Signature verification failed:', message);
      return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 });
    }

    console.log(`📨 [WEBHOOK] Received: ${event.type} | ID: ${event.id}`);

    // ==========================================================================
    // IDEMPOTENCY CHECK - Don't process the same event twice
    // ==========================================================================
    const supabase = createServerClient();
    const { data: alreadyProcessed } = await supabase
      .rpc('is_stripe_event_processed', { p_event_id: event.id });
    
    if (alreadyProcessed) {
      console.log(`ℹ️ [WEBHOOK] Event ${event.id} already processed - skipping (idempotent)`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // ==========================================================================
    // HANDLE ALL WEBHOOK EVENTS
    // ==========================================================================

    switch (event.type) {
      // ========================================================================
      // CHECKOUT SESSION EVENTS
      // ========================================================================
      
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💳 [WEBHOOK] checkout.session.completed | Session: ${session.id}`);
        await handleCheckoutCompleted(session, event.id);
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        // CRITICAL FOR ACH - This fires when bank transfer clears (3-5 days later)
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`✅ [WEBHOOK] checkout.session.async_payment_succeeded | Session: ${session.id}`);
        await handleAsyncPaymentSucceeded(session, event.id);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        // CRITICAL FOR ACH - This fires when bank transfer fails
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`❌ [WEBHOOK] checkout.session.async_payment_failed | Session: ${session.id}`);
        await handleAsyncPaymentFailed(session, event.id);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`⏰ [WEBHOOK] checkout.session.expired | Session: ${session.id}`);
        await handleCheckoutExpired(session, event.id);
        break;
      }

      // ========================================================================
      // PAYMENT INTENT EVENTS
      // ========================================================================

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`✅ [WEBHOOK] payment_intent.succeeded | PI: ${paymentIntent.id}`);
        await handlePaymentIntentSucceeded(paymentIntent, event.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ [WEBHOOK] payment_intent.payment_failed | PI: ${paymentIntent.id}`);
        await handlePaymentIntentFailed(paymentIntent, event.id);
        break;
      }

      // ========================================================================
      // CHARGE EVENTS
      // ========================================================================

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`💸 [WEBHOOK] charge.refunded | Charge: ${charge.id}`);
        await handleChargeRefunded(charge, event.id);
        break;
      }

      case 'charge.updated': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`🔄 [WEBHOOK] charge.updated | Charge: ${charge.id}`);
        await handleChargeUpdated(charge, event.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`⚠️ [WEBHOOK] charge.dispute.created | Dispute: ${dispute.id}`);
        await handleDisputeCreated(dispute, event.id);
        break;
      }

      // ========================================================================
      // REFUND EVENTS
      // ========================================================================

      case 'refund.created': {
        const refund = event.data.object as Stripe.Refund;
        console.log(`💰 [WEBHOOK] refund.created | Refund: ${refund.id}`);
        await handleRefundCreated(refund, event.id);
        break;
      }

      case 'refund.updated': {
        const refund = event.data.object as Stripe.Refund;
        console.log(`🔄 [WEBHOOK] refund.updated | Refund: ${refund.id}`);
        await handleRefundUpdated(refund, event.id);
        break;
      }

      // ========================================================================
      // UNHANDLED EVENTS
      // ========================================================================

      default:
        console.log(`ℹ️ [WEBHOOK] Unhandled event type: ${event.type}`);
    }

    // Record that we processed this event
    await supabase.rpc('record_stripe_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: { processed_at: new Date().toISOString() }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [WEBHOOK] Processed ${event.type} in ${duration}ms`);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ [WEBHOOK] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// =============================================================================
// CHECKOUT COMPLETED
// Handles both immediate (card) and async (ACH) payments
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const bookingId = session.metadata?.booking_id;
  const paymentType = session.metadata?.payment_type || 'deposit';
  const customerId = session.metadata?.customer_id;
  
  if (!bookingId) {
    console.error('❌ [WEBHOOK] No booking_id in session metadata:', session.id);
    return;
  }

  const supabase = createServerClient();

  // Check if this is an async payment (ACH/bank transfer)
  const isAsyncPayment = session.payment_status === 'unpaid' || 
                         session.payment_status === 'no_payment_required' ||
                         (session.payment_method_types?.includes('us_bank_account') && 
                          session.payment_status !== 'paid');

  // For async payments, payment_status will be 'unpaid' until the bank transfer clears
  // We need to handle this differently than card payments
  
  if (session.payment_status === 'paid') {
    // IMMEDIATE PAYMENT (Card) - Process normally
    console.log(`💳 [WEBHOOK] Immediate payment confirmed for booking ${bookingId}`);
    await processSuccessfulPayment(session, eventId, bookingId, paymentType, customerId);
  } else if (session.payment_status === 'unpaid' && session.payment_method_types?.includes('us_bank_account')) {
    // ACH PAYMENT - Mark as pending, don't confirm yet
    console.log(`🏦 [WEBHOOK] ACH payment initiated for booking ${bookingId} - awaiting bank transfer`);
    await processAsyncPaymentInitiated(session, eventId, bookingId, paymentType, customerId);
  } else {
    // Unknown state - log for investigation
    console.log(`⚠️ [WEBHOOK] Unexpected payment_status: ${session.payment_status} for booking ${bookingId}`);
  }
}

// =============================================================================
// PROCESS SUCCESSFUL PAYMENT (Card or ACH after clearing)
// =============================================================================

async function processSuccessfulPayment(
  session: Stripe.Checkout.Session,
  eventId: string,
  bookingId: string,
  paymentType: string,
  customerId: string | undefined
) {
  const supabase = createServerClient();
  const promoCodeId = session.metadata?.promo_code_id || null;
  const promoDiscount = parseFloat(session.metadata?.promo_discount || '0');
  const originalPrice = parseFloat(session.metadata?.original_price || '0');
  const finalPrice = parseFloat(session.metadata?.final_price || '0');

  // ===========================================================================
  // CRITICAL FIX: Check if booking was cancelled before processing payment
  // This prevents the race condition where:
  // 1. Customer has pending booking
  // 2. Customer clicks cancel → booking status changes to 'cancelled'
  // 3. Customer still completes payment in another tab
  // 4. Payment confirms a cancelled booking (data corruption!)
  // ===========================================================================
  const { data: bookingStatus, error: statusError } = await supabase
    .from('bookings')
    .select('status, booking_number')
    .eq('id', bookingId)
    .single();

  if (statusError || !bookingStatus) {
    console.error('❌ [WEBHOOK] Could not verify booking status:', statusError);
    // Continue processing - better to potentially confirm than to lose the payment
  } else if (bookingStatus.status === 'cancelled') {
    console.log(`🚫 [WEBHOOK] REJECTED: Payment attempted on CANCELLED booking ${bookingStatus.booking_number}`);
    console.log(`🚫 [WEBHOOK] Session: ${session.id} | Amount: ${(session.amount_total || 0) / 100}`);
    
    // Record the rejected payment for audit trail
    await supabase.from('payments').insert({
      booking_id: bookingId,
      payment_type: paymentType === 'full' ? 'full' : 'deposit',
      amount: (session.amount_total || 0) / 100,
      status: 'rejected',
      payment_method: 'card',
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
    });

    // Alert the business owner to handle manually (may need refund)
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `⚠️ ALERT: Payment on Cancelled Booking - ${bookingStatus.booking_number}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #dc2626; margin: 0;">⚠️ Payment Received on Cancelled Booking</h2>
              <p style="color: #991b1b; margin: 10px 0 0 0;">Manual review required!</p>
            </div>
            <p>A customer completed payment for a booking that was already cancelled. This payment was NOT applied to the booking.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr><td style="padding: 8px 0;"><strong>Booking:</strong></td><td>${bookingStatus.booking_number}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Amount:</strong></td><td>${((session.amount_total || 0) / 100).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Stripe Session:</strong></td><td>${session.id}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Payment Intent:</strong></td><td>${session.payment_intent || 'N/A'}</td></tr>
            </table>
            <p style="margin-top: 20px; padding: 15px; background: #fef9c3; border-radius: 8px;">
              <strong>Action Required:</strong> Please review in Stripe Dashboard and issue a refund if appropriate.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('❌ [WEBHOOK] Failed to send cancelled payment alert:', emailError);
    }

    return; // Stop processing - don't confirm the cancelled booking
  }

  // ===========================================================================
  // CRITICAL FIX: Verify booking blocks still exist
  // This prevents confirming a booking whose blocks were cleaned up by the
  // pending cleanup cron (customer took too long to pay)
  // ===========================================================================
  const { data: existingBlocks, error: blocksError } = await supabase
    .from('booking_blocks')
    .select('id')
    .eq('booking_id', bookingId);

  if (blocksError || !existingBlocks || existingBlocks.length === 0) {
    console.error(`🚫 [WEBHOOK] REJECTED: Booking ${bookingStatus?.booking_number || bookingId} has no blocks (expired pending)`);
    console.log(`🚫 [WEBHOOK] Session: ${session.id} | Amount: ${(session.amount_total || 0) / 100}`);
    
    // Record the rejected payment for audit trail
    await supabase.from('payments').insert({
      booking_id: bookingId,
      payment_type: paymentType === 'full' ? 'full' : 'deposit',
      amount: (session.amount_total || 0) / 100,
      status: 'rejected',
      payment_method: 'card',
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
    });

    // Issue automatic refund
    try {
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent,
          reason: 'requested_by_customer',
          metadata: {
            reason: 'Booking expired while customer was checking out',
            booking_id: bookingId,
          },
        });
        console.log(`💸 [WEBHOOK] Auto-refund issued: ${refund.id} for expired booking`);
      }
    } catch (refundError) {
      console.error('❌ [WEBHOOK] Failed to auto-refund expired booking:', refundError);
    }

    // Alert the business owner
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `⚠️ ALERT: Payment on Expired Booking - Auto-Refunded`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef9c3; border: 2px solid #eab308; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #a16207; margin: 0;">⚠️ Expired Booking Payment</h2>
              <p style="color: #854d0e; margin: 10px 0 0 0;">Auto-refund issued</p>
            </div>
            <p>A customer completed payment for a booking that had expired (pending cleanup removed the reservation blocks). An automatic refund has been issued.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr><td style="padding: 8px 0;"><strong>Booking ID:</strong></td><td>${bookingId}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Amount:</strong></td><td>${((session.amount_total || 0) / 100).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Stripe Session:</strong></td><td>${session.id}</td></tr>
            </table>
            <p style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
              <strong>What happened:</strong> The customer started checkout but took longer than 45 minutes to complete payment. Our cleanup process released the time slot, then the customer completed payment for a slot that's no longer available.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('❌ [WEBHOOK] Failed to send expired booking alert:', emailError);
    }

    return; // Stop processing - blocks were cleaned up
  }
  // ===========================================================================

  // Idempotency check
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .eq('status', 'succeeded')
    .single();

  if (existingPayment) {
    console.log(`ℹ️ [WEBHOOK] Payment already processed for session ${session.id}`);
    return;
  }

  // Fetch payment details from Stripe
  let stripeReceiptUrl: string | null = null;
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  let bankName: string | null = null;
  let bankLast4: string | null = null;
  let actualStripeFee: number | null = null;
  let paymentMethodType = 'card';
  
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ['latest_charge.balance_transaction', 'payment_method'],
      });
      
      const charge = paymentIntent.latest_charge as Stripe.Charge | null;
      if (charge) {
        stripeReceiptUrl = charge.receipt_url || null;
        
        // Get payment method details
        if (charge.payment_method_details?.card) {
          cardLast4 = charge.payment_method_details.card.last4 || null;
          cardBrand = charge.payment_method_details.card.brand || null;
          paymentMethodType = 'card';
        } else if (charge.payment_method_details?.us_bank_account) {
          bankName = charge.payment_method_details.us_bank_account.bank_name || null;
          bankLast4 = charge.payment_method_details.us_bank_account.last4 || null;
          paymentMethodType = 'us_bank_account';
        }
        
        // Get actual Stripe fee
        const balanceTx = charge.balance_transaction as Stripe.BalanceTransaction | null;
        if (balanceTx && typeof balanceTx === 'object') {
          actualStripeFee = balanceTx.fee / 100;
          console.log(`💰 [WEBHOOK] Actual Stripe fee: $${actualStripeFee.toFixed(2)}`);
        }
      }
    } catch (stripeErr) {
      console.log('ℹ️ [WEBHOOK] Could not fetch payment details:', stripeErr);
    }
  }

  const now = new Date().toISOString();
  const amountPaid = (session.amount_total || 0) / 100;
  const isFullPayment = paymentType === 'full';

  // Get booking with all details
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers (*),
      unit:units (*, product:products (*))
    `)
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error('❌ [WEBHOOK] Error fetching booking:', fetchError);
    return;
  }

  console.log(`📋 [WEBHOOK] Booking found: ${booking.booking_number} | Status: ${booking.status}`);

  // Update booking status
  const bookingUpdate: Record<string, unknown> = {
    status: 'confirmed',
    deposit_paid: true,
    deposit_paid_at: now,
    confirmed_at: now,
    stripe_payment_intent_id: session.payment_intent as string || null,
    payment_method_type: paymentMethodType,
    is_async_payment: paymentMethodType === 'us_bank_account',
    async_payment_status: paymentMethodType === 'us_bank_account' ? 'succeeded' : null,
    async_payment_completed_at: paymentMethodType === 'us_bank_account' ? now : null,
  };

  if (isFullPayment) {
    bookingUpdate.balance_paid = true;
    bookingUpdate.balance_paid_at = now;
    bookingUpdate.balance_payment_method = paymentMethodType;
  }

  const { error: bookingError } = await supabase
    .from('bookings')
    .update(bookingUpdate)
    .eq('id', bookingId);

  if (bookingError) {
    console.error('❌ [WEBHOOK] Error updating booking:', bookingError);
  } else {
    console.log(`✅ [WEBHOOK] Booking ${booking.booking_number} confirmed`);
  }

  // Create payment record
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      payment_type: isFullPayment ? 'full' : 'deposit',
      amount: amountPaid,
      status: 'succeeded',
      payment_method: paymentMethodType,
      payment_method_type: paymentMethodType,
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
      card_brand: cardBrand,
      card_last_four: cardLast4,
      bank_name: bankName,
      bank_last_four: bankLast4,
      stripe_fee: actualStripeFee,
      is_async: paymentMethodType === 'us_bank_account',
      async_status: 'succeeded',
      async_completed_at: paymentMethodType === 'us_bank_account' ? now : null,
    });

  if (paymentError) {
    console.error('❌ [WEBHOOK] Error creating payment record:', paymentError);
  } else {
    console.log(`✅ [WEBHOOK] Payment recorded: $${amountPaid} (${isFullPayment ? 'full' : 'deposit'})`);
  }

  // Record promo code usage
  if (promoCodeId && promoDiscount > 0 && customerId) {
    try {
      await supabase.rpc('apply_promo_code', {
        p_promo_code_id: promoCodeId,
        p_booking_id: bookingId,
        p_customer_id: customerId,
        p_original_amount: originalPrice,
        p_discount_applied: promoDiscount,
      });
      console.log(`✅ [WEBHOOK] Promo code usage recorded`);
    } catch (promoErr) {
      console.error('❌ [WEBHOOK] Error recording promo code:', promoErr);
    }
  }

  // Update customer stats
  if (customerId) {
    await supabase
      .from('customers')
      .update({
        booking_count: (booking.customer?.booking_count || 0) + 1,
        total_spent: (Number(booking.customer?.total_spent) || 0) + amountPaid,
      })
      .eq('id', customerId);
  }

  // Send push notification
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
  } catch (pushError) {
    console.log('ℹ️ [WEBHOOK] Push notification skipped');
  }

  // Send confirmation emails
  await sendConfirmationEmails(booking, amountPaid, isFullPayment, paymentMethodType, cardBrand, cardLast4, bankName, bankLast4, stripeReceiptUrl, session.payment_intent as string);
}

// =============================================================================
// PROCESS ASYNC PAYMENT INITIATED (ACH - waiting for bank transfer)
// =============================================================================

async function processAsyncPaymentInitiated(
  session: Stripe.Checkout.Session,
  eventId: string,
  bookingId: string,
  paymentType: string,
  customerId: string | undefined
) {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const amountPaid = (session.amount_total || 0) / 100;
  const isFullPayment = paymentType === 'full';

  // Get booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`*, customer:customers (*)`)
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error('❌ [WEBHOOK] Error fetching booking:', fetchError);
    return;
  }

  // Update booking - DO NOT CONFIRM YET
  // Status stays 'pending' until payment clears
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      // Keep status as pending - NOT confirmed yet
      payment_method_type: 'us_bank_account',
      is_async_payment: true,
      async_payment_status: 'pending',
      async_payment_initiated_at: now,
      stripe_payment_intent_id: session.payment_intent as string || null,
      internal_notes: `ACH payment initiated. Amount: $${amountPaid}. Awaiting bank transfer (3-5 business days).`,
    })
    .eq('id', bookingId);

  if (bookingError) {
    console.error('❌ [WEBHOOK] Error updating booking:', bookingError);
  } else {
    console.log(`✅ [WEBHOOK] Booking ${booking.booking_number} marked as awaiting ACH clearance`);
  }

  // Create payment record with pending status
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      payment_type: isFullPayment ? 'full' : 'deposit',
      amount: amountPaid,
      status: 'pending', // PENDING until ACH clears
      payment_method: 'us_bank_account',
      payment_method_type: 'us_bank_account',
      stripe_payment_intent_id: session.payment_intent as string || null,
      stripe_checkout_session_id: session.id,
      is_async: true,
      async_status: 'pending',
    });

  if (paymentError) {
    console.error('❌ [WEBHOOK] Error creating payment record:', paymentError);
  }

  // Send "Payment Processing" email to customer
  const customerName = `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim();
  const productName = booking.product_snapshot?.name || 'Bounce House';
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: booking.customer?.email || '',
      subject: `🏦 Payment Processing: ${productName} on ${formatDate(booking.event_date)}`,
      html: createACHPendingEmail({
        customerName: booking.customer?.first_name || 'there',
        productName,
        bookingNumber: booking.booking_number,
        eventDate: booking.event_date,
        amount: amountPaid,
        isFullPayment,
      }),
    });
    console.log('✅ [WEBHOOK] ACH pending email sent to customer');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send ACH pending email:', emailError);
  }

  // Notify business
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `🏦 ACH Payment Pending: ${booking.booking_number} - $${amountPaid}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #fff; padding: 24px; border-radius: 12px;">
          <h2 style="color: #fbbf24;">🏦 ACH Payment Initiated</h2>
          <p>A customer has initiated a bank transfer payment. The booking will be confirmed automatically when the payment clears (typically 3-5 business days).</p>
          <table style="width: 100%; margin-top: 20px;">
            <tr><td style="color: #888;">Booking:</td><td style="color: #fff;">${booking.booking_number}</td></tr>
            <tr><td style="color: #888;">Customer:</td><td style="color: #fff;">${customerName}</td></tr>
            <tr><td style="color: #888;">Amount:</td><td style="color: #22c55e;">$${amountPaid}</td></tr>
            <tr><td style="color: #888;">Event Date:</td><td style="color: #fff;">${formatDate(booking.event_date)}</td></tr>
            <tr><td style="color: #888;">Status:</td><td style="color: #fbbf24;">⏳ Awaiting Bank Transfer</td></tr>
          </table>
          <p style="margin-top: 20px; color: #888; font-size: 12px;">You'll receive another notification when the payment clears or fails.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send business notification:', emailError);
  }
}

// =============================================================================
// ASYNC PAYMENT SUCCEEDED (ACH cleared!)
// =============================================================================

async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session, eventId: string) {
  const bookingId = session.metadata?.booking_id;
  const paymentType = session.metadata?.payment_type || 'deposit';
  const customerId = session.metadata?.customer_id;

  if (!bookingId) {
    console.error('❌ [WEBHOOK] No booking_id in async_payment_succeeded');
    return;
  }

  console.log(`🎉 [WEBHOOK] ACH payment cleared for booking ${bookingId}!`);

  // Process as successful payment - this will confirm the booking
  await processSuccessfulPayment(session, eventId, bookingId, paymentType, customerId);
}

// =============================================================================
// ASYNC PAYMENT FAILED (ACH failed)
// =============================================================================

async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session, eventId: string) {
  const bookingId = session.metadata?.booking_id;

  if (!bookingId) {
    console.error('❌ [WEBHOOK] No booking_id in async_payment_failed');
    return;
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Get booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`*, customer:customers (*)`)
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error('❌ [WEBHOOK] Error fetching booking:', fetchError);
    return;
  }

  console.log(`❌ [WEBHOOK] ACH payment FAILED for booking ${booking.booking_number}`);

  // Update booking
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      async_payment_status: 'failed',
      async_payment_failed_at: now,
      async_payment_failure_reason: 'Bank transfer failed',
      needs_attention: true,
      attention_reason: 'ACH payment failed - customer needs to retry payment',
    })
    .eq('id', bookingId);

  if (bookingError) {
    console.error('❌ [WEBHOOK] Error updating booking:', bookingError);
  }

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      async_status: 'failed',
      async_failed_at: now,
      async_failure_reason: 'Bank transfer failed',
    })
    .eq('stripe_checkout_session_id', session.id);

  // Send failure notification to customer
  const customerName = booking.customer?.first_name || 'there';
  const productName = booking.product_snapshot?.name || 'Bounce House';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: booking.customer?.email || '',
      subject: `⚠️ Payment Failed: ${productName} Booking`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a1a; color: #fff; padding: 24px; border-radius: 12px;">
          <div style="text-align: center; padding: 20px;">
            <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: #ef4444; border-radius: 50%; line-height: 56px;">
              <span style="color: white; font-size: 28px;">!</span>
            </div>
            <h1 style="color: #ef4444; margin: 0;">Payment Failed</h1>
          </div>
          
          <p>Hey ${customerName},</p>
          <p>Unfortunately, your bank transfer for the ${productName} rental couldn't be completed.</p>
          
          <div style="background: #222; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #888;">Booking: <strong style="color: #fff;">${booking.booking_number}</strong></p>
            <p style="margin: 8px 0 0; color: #888;">Event: <strong style="color: #fff;">${formatDate(booking.event_date)}</strong></p>
          </div>
          
          <p><strong>What to do next:</strong></p>
          <p>Please visit <a href="https://popndroprentals.com/my-bookings" style="color: #22d3ee;">My Bookings</a> to complete your payment with a different method.</p>
          
          <p style="margin-top: 20px;">Questions? Call us at <a href="tel:3524453723" style="color: #22d3ee;">(352) 445-3723</a></p>
        </div>
      `,
    });
    console.log('✅ [WEBHOOK] ACH failure email sent to customer');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send ACH failure email:', emailError);
  }

  // Send urgent notification to business
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `🚨 ACH Payment FAILED: ${booking.booking_number}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #fff; padding: 24px; border-radius: 12px;">
          <div style="background: #7f1d1d; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #fca5a5; margin: 0;">🚨 ACH Payment Failed</h2>
            <p style="color: #fecaca; margin: 8px 0 0;">Action may be required!</p>
          </div>
          <table style="width: 100%;">
            <tr><td style="color: #888;">Booking:</td><td style="color: #fff;">${booking.booking_number}</td></tr>
            <tr><td style="color: #888;">Customer:</td><td style="color: #fff;">${booking.customer?.first_name} ${booking.customer?.last_name}</td></tr>
            <tr><td style="color: #888;">Email:</td><td style="color: #fff;">${booking.customer?.email}</td></tr>
            <tr><td style="color: #888;">Phone:</td><td style="color: #fff;">${booking.customer?.phone}</td></tr>
            <tr><td style="color: #888;">Event Date:</td><td style="color: #fbbf24;">${formatDate(booking.event_date)}</td></tr>
          </table>
          <p style="margin-top: 20px;">The customer has been notified to retry their payment. Consider following up if the event date is soon.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send business notification:', emailError);
  }
}

// =============================================================================
// CHECKOUT EXPIRED
// =============================================================================

async function handleCheckoutExpired(session: Stripe.Checkout.Session, eventId: string) {
  const bookingId = session.metadata?.booking_id;
  
  if (!bookingId) {
    console.log('ℹ️ [WEBHOOK] Expired session had no booking_id');
    return;
  }

  const supabase = createServerClient();

  // Get booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select('status, booking_number')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    console.log(`ℹ️ [WEBHOOK] No booking found for expired session: ${bookingId}`);
    return;
  }

  // Only clean up if still pending (not already confirmed or cancelled)
  if (booking.status === 'pending') {
    console.log(`🧹 [WEBHOOK] Cleaning up expired checkout: ${booking.booking_number}`);

    // Delete booking blocks first (foreign key constraint)
    const { error: blocksError, count: blocksDeleted } = await supabase
      .from('booking_blocks')
      .delete()
      .eq('booking_id', bookingId)
      .select();

    if (blocksError) {
      console.error('❌ [WEBHOOK] Error deleting blocks:', blocksError);
    } else {
      console.log(`✅ [WEBHOOK] Released ${blocksDeleted || 0} booking blocks`);
    }

    // Delete the pending booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('status', 'pending'); // Safety: only delete if still pending

    if (bookingError) {
      console.error('❌ [WEBHOOK] Error deleting pending booking:', bookingError);
    } else {
      console.log(`✅ [WEBHOOK] Deleted pending booking: ${booking.booking_number}`);
    }

    // Log for monitoring
    console.log(`🎯 [WEBHOOK] Slot released immediately for ${booking.booking_number} (checkout expired after 30 min)`);
  } else {
    console.log(`ℹ️ [WEBHOOK] Booking ${booking.booking_number} is ${booking.status} - no cleanup needed`);
  }
}

// =============================================================================
// PAYMENT INTENT SUCCEEDED
// =============================================================================

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  // Most processing happens in checkout.session.completed
  // This is mainly for logging and edge cases
  console.log(`ℹ️ [WEBHOOK] Payment intent ${paymentIntent.id} succeeded - Amount: $${paymentIntent.amount / 100}`);
}

// =============================================================================
// PAYMENT INTENT FAILED
// =============================================================================

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  const supabase = createServerClient();
  const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
  
  console.log(`❌ [WEBHOOK] Payment failed: ${errorMessage}`);

  // Find related booking by payment intent
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, booking_number, customer:customers(email, first_name)')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (booking) {
    // Update booking with failure info
    await supabase
      .from('bookings')
      .update({
        needs_attention: true,
        attention_reason: `Payment failed: ${errorMessage}`,
      })
      .eq('id', booking.id);

    console.log(`⚠️ [WEBHOOK] Marked booking ${booking.booking_number} as needing attention`);
  }
}

// =============================================================================
// CHARGE REFUNDED
// =============================================================================

async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  const supabase = createServerClient();
  const paymentIntentId = typeof charge.payment_intent === 'string' 
    ? charge.payment_intent 
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.log('ℹ️ [WEBHOOK] Refund charge has no payment_intent');
    return;
  }

  // Find original payment
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .select(`id, booking_id, amount, stripe_fee, booking:bookings(booking_number, customer_id)`)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (paymentError || !paymentData) {
    console.error('❌ [WEBHOOK] Could not find original payment:', paymentIntentId);
    return;
  }

  const booking = Array.isArray(paymentData.booking) ? paymentData.booking[0] : paymentData.booking;
  const payment = { ...paymentData, booking };

  const refundAmount = (charge.amount_refunded || 0) / 100;
  const isFullRefund = refundAmount >= payment.amount;
  const originalFee = payment.stripe_fee || (payment.amount * 0.029 + 0.30);
  const feeLost = isFullRefund ? originalFee : (originalFee * (refundAmount / payment.amount));

  console.log(`💸 [WEBHOOK] Refund: $${refundAmount} | Fee lost: $${feeLost.toFixed(2)} | Full: ${isFullRefund}`);

  // Check idempotency
  const { data: existingRefund } = await supabase
    .from('refunds')
    .select('id')
    .eq('payment_id', payment.id)
    .eq('amount', refundAmount)
    .single();

  if (existingRefund) {
    console.log('ℹ️ [WEBHOOK] Refund already recorded');
    return;
  }

  // Get Stripe refund ID
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
  console.log(`✅ [WEBHOOK] Refund recorded for ${bookingNumber}`);

  // Update booking if full refund
  if (isFullRefund) {
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Refunded via Stripe',
      })
      .eq('id', payment.booking_id);
  }

  // Send notification
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `⚠️ Refund Processed: ${bookingNumber} - $${refundAmount.toFixed(2)}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">⚠️ Refund Processed</h2>
          <p><strong>Booking:</strong> ${bookingNumber}</p>
          <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
          <p><strong>Original Payment:</strong> $${payment.amount.toFixed(2)}</p>
          <p><strong>Stripe Fee Lost:</strong> $${feeLost.toFixed(2)}</p>
          <p><strong>Full Refund:</strong> ${isFullRefund ? 'Yes' : 'No (Partial)'}</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">
            💡 Stripe does not return processing fees on refunds. This cost you $${feeLost.toFixed(2)} in lost fees.
          </p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send refund notification:', emailError);
  }
}

// =============================================================================
// CHARGE UPDATED
// =============================================================================

async function handleChargeUpdated(charge: Stripe.Charge, eventId: string) {
  // Log for audit trail
  console.log(`🔄 [WEBHOOK] Charge ${charge.id} updated | Status: ${charge.status} | Disputed: ${charge.disputed}`);
  
  // Could track specific changes here if needed
}

// =============================================================================
// DISPUTE CREATED
// =============================================================================

async function handleDisputeCreated(dispute: Stripe.Dispute, eventId: string) {
  const supabase = createServerClient();
  
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    console.log('ℹ️ [WEBHOOK] Dispute has no charge ID');
    return;
  }

  // Get payment intent from charge
  let paymentIntentId: string | null = null;
  let booking: { booking_number?: string } | null = null;
  
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || null;
  } catch (err) {
    console.error('❌ [WEBHOOK] Could not fetch charge:', err);
  }

  if (paymentIntentId) {
    const { data } = await supabase
      .from('payments')
      .select(`booking:bookings(booking_number)`)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();
    
    const bookingData = Array.isArray(data?.booking) ? data?.booking[0] : data?.booking;
    booking = bookingData ?? null;
  }

  const bookingNumber = booking?.booking_number || 'Unknown';
  const disputeAmount = dispute.amount / 100;
  const disputeFee = 15.00;
  
  const evidenceDueDate = dispute.evidence_details?.due_by 
    ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Unknown';

  // Record expense
  const { data: category } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('name', 'Bank/Processing Fees')
    .single();

  if (category) {
    await supabase.from('expenses').insert({
      category_id: category.id,
      amount: disputeFee,
      description: `Stripe dispute fee - ${dispute.reason} - ${bookingNumber}`,
      vendor_name: 'Stripe',
      expense_date: new Date().toISOString().split('T')[0],
      notes: `Dispute ID: ${dispute.id}. Evidence due: ${evidenceDueDate}`,
    });
  }

  // Send URGENT notification
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `🚨 URGENT: Chargeback - ${bookingNumber} - $${disputeAmount.toFixed(2)}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0;">🚨 CHARGEBACK DISPUTE</h2>
            <p style="color: #991b1b; margin: 10px 0 0 0;">Action required!</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Booking:</strong></td><td>${bookingNumber}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Amount:</strong></td><td>$${disputeAmount.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Fee:</strong></td><td>$${disputeFee} (charged regardless)</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Reason:</strong></td><td>${dispute.reason?.replace(/_/g, ' ')}</td></tr>
            <tr style="background: #fef9c3;"><td style="padding: 8px;"><strong>⏰ Evidence Due:</strong></td><td style="padding: 8px;"><strong>${evidenceDueDate}</strong></td></tr>
          </table>
          
          <p style="margin-top: 20px;">
            <a href="https://dashboard.stripe.com/disputes/${dispute.id}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
              View in Stripe →
            </a>
          </p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send dispute notification:', emailError);
  }
}

// =============================================================================
// REFUND CREATED
// =============================================================================

async function handleRefundCreated(refund: Stripe.Refund, eventId: string) {
  console.log(`💰 [WEBHOOK] Refund created: ${refund.id} | Amount: $${(refund.amount || 0) / 100} | Status: ${refund.status}`);
  // Main processing happens in charge.refunded
}

// =============================================================================
// REFUND UPDATED
// =============================================================================

async function handleRefundUpdated(refund: Stripe.Refund, eventId: string) {
  const supabase = createServerClient();
  
  console.log(`🔄 [WEBHOOK] Refund ${refund.id} updated | Status: ${refund.status}`);

  // Update our refund record if status changed
  if (refund.status === 'succeeded' || refund.status === 'failed') {
    const { error } = await supabase
      .from('refunds')
      .update({
        status: refund.status === 'succeeded' ? 'completed' : 'failed',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_refund_id', refund.id);

    if (error) {
      console.error('❌ [WEBHOOK] Error updating refund status:', error);
    } else {
      console.log(`✅ [WEBHOOK] Refund ${refund.id} marked as ${refund.status}`);
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

async function sendConfirmationEmails(
  booking: any,
  amountPaid: number,
  isFullPayment: boolean,
  paymentMethodType: string,
  cardBrand: string | null,
  cardLast4: string | null,
  bankName: string | null,
  bankLast4: string | null,
  stripeReceiptUrl: string | null,
  paymentIntentId: string
) {
  const customerName = `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim();
  const productName = booking.product_snapshot?.name || 'Bounce House';
  const customerEmail = booking.customer?.email || '';

  // Customer email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
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
        bookingType: booking.booking_type,
        paidInFull: isFullPayment,
        deliveryDate: booking.delivery_date,
      }),
    });
    console.log('✅ [WEBHOOK] Customer email sent');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send customer email:', emailError);
  }

  // Business email
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
        bookingType: booking.booking_type,
        paidInFull: isFullPayment,
        amountPaid,
        stripePaymentIntentId: paymentIntentId,
        stripeReceiptUrl: stripeReceiptUrl || undefined,
        cardLast4: cardLast4 || undefined,
        cardBrand: cardBrand || undefined,
      }),
    });
    console.log('✅ [WEBHOOK] Business email sent');
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Failed to send business email:', emailError);
  }
}

// =============================================================================
// ACH PENDING EMAIL TEMPLATE
// =============================================================================

function createACHPendingEmail(data: {
  customerName: string;
  productName: string;
  bookingNumber: string;
  eventDate: string;
  amount: number;
  isFullPayment: boolean;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://popndroprentals.com/brand/logo.png" alt="Pop and Drop Party Rentals" width="180" />
    </div>
    
    <div style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
      <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
        <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #fbbf24; border-radius: 50%; line-height: 56px;">
          <span style="color: white; font-size: 28px;">🏦</span>
        </div>
        <h1 style="margin: 0; color: white; font-size: 24px;">Payment Processing</h1>
        <p style="margin: 8px 0 0; color: #888;">Booking ${data.bookingNumber}</p>
      </div>
      
      <div style="padding: 24px;">
        <p style="color: #ccc; margin: 0 0 20px;">Hey ${data.customerName}! Your bank transfer is being processed.</p>
        
        <div style="background: #422006; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; color: #fbbf24; font-weight: 600;">⏳ What's next?</p>
          <p style="margin: 8px 0 0; color: #fde68a; font-size: 14px;">Bank transfers typically take 3-5 business days to complete. We'll email you as soon as your payment clears and your booking is confirmed!</p>
        </div>
        
        <div style="background-color: #222; border-radius: 12px; padding: 16px;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Rental</td>
              <td style="padding: 8px 0; color: white; text-align: right;">${data.productName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Event Date</td>
              <td style="padding: 8px 0; color: white; text-align: right;">${formatDate(data.eventDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Amount</td>
              <td style="padding: 8px 0; color: #22c55e; text-align: right; font-weight: 600;">$${data.amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Status</td>
              <td style="padding: 8px 0; color: #fbbf24; text-align: right;">⏳ Processing</td>
            </tr>
          </table>
        </div>
        
        <p style="margin: 20px 0; color: #888; font-size: 13px;">
          Your date is reserved while we wait for the payment to clear. If there are any issues, we'll reach out right away.
        </p>
      </div>
      
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Questions? We're here to help!</p>
        <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none;">(352) 445-3723</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
