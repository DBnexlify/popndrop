// =============================================================================
// STRIPE CREATE CHECKOUT SESSION API
// app/api/stripe/create-checkout/route.ts
// 
// Creates a Stripe Checkout session for deposit or full payment
// Supports both card (immediate) and ACH/bank transfer (async) payments
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, dollarsToCents, DEPOSIT_AMOUNT_CENTS } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Enable ACH payments (set to false to disable)
const ENABLE_ACH_PAYMENTS = true;

// Minimum amount for ACH payments (Stripe requirement: $1.00)
const MIN_ACH_AMOUNT_CENTS = 100;

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, paymentType } = body;

    // Validate inputs
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    if (!paymentType || !['deposit', 'full'].includes(paymentType)) {
      return NextResponse.json(
        { error: 'Payment type must be "deposit" or "full"' },
        { status: 400 }
      );
    }

    // Get booking details from database
    const supabase = createServerClient();
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        product_snapshot,
        event_date,
        subtotal,
        deposit_amount,
        balance_due,
        discount_amount,
        promo_code_id,
        customer:customers (
          id,
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Calculate amounts
    const isFullPayment = paymentType === 'full';
    const subtotal = Number(booking.subtotal);
    const discountAmount = Number(booking.discount_amount || 0);
    const finalPrice = subtotal - discountAmount;
    const balanceDue = Number(booking.balance_due);
    
    // For full payment, charge the final price (after discounts)
    // For deposit, always charge $50
    const amountCents = isFullPayment 
      ? dollarsToCents(finalPrice)
      : DEPOSIT_AMOUNT_CENTS;
    
    const productName = booking.product_snapshot?.name || 'Bounce House Rental';
    const promoCode = booking.product_snapshot?.promo_code || null;
    
    const eventDateFormatted = new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Build line item description
    let lineItemName = isFullPayment
      ? `${productName} - Full Payment`
      : `${productName} - Deposit`;
    
    // Add promo code info if applicable
    if (promoCode && discountAmount > 0) {
      lineItemName += ` (${promoCode} -$${discountAmount})`;
    }
    
    const lineItemDescription = isFullPayment
      ? `Booking ${booking.booking_number} • Event: ${eventDateFormatted} • Paid in full - nothing due on delivery!`
      : `Booking ${booking.booking_number} • Event: ${eventDateFormatted} • Balance of $${balanceDue.toFixed(0)} due on delivery`;

    // Get base URL (handle both localhost and production)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Extract customer (Supabase returns array for joins)
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;

    // ==========================================================================
    // PAYMENT METHOD CONFIGURATION
    // ==========================================================================
    
    // Determine which payment methods to offer
    // ACH is only available for amounts >= $1.00 and when enabled
    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ['card'];
    
    if (ENABLE_ACH_PAYMENTS && amountCents >= MIN_ACH_AMOUNT_CENTS) {
      paymentMethodTypes.push('us_bank_account');
    }

    // ==========================================================================
    // CREATE STRIPE CHECKOUT SESSION
    // ==========================================================================
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: paymentMethodTypes,
      mode: 'payment',
      customer_email: customer?.email || undefined,
      client_reference_id: booking.id,
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        payment_type: paymentType,
        customer_id: customer?.id || '',
        product_name: productName,
        event_date: booking.event_date,
        // Include promo info for webhook processing
        promo_code_id: booking.promo_code_id || '',
        promo_code: promoCode || '',
        promo_discount: discountAmount.toString(),
        original_price: subtotal.toString(),
        final_price: finalPrice.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: lineItemName,
              description: lineItemDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      // Success: redirect to success page with payment_type for immediate accurate display
      success_url: `${baseUrl}/bookings/success?booking_id=${booking.id}&payment_type=${paymentType}`,
      // Cancel: return to booking form with state preserved
      cancel_url: `${baseUrl}/bookings?cancelled=true&r=${booking.product_snapshot?.slug || ''}`,
      // Expire after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    };

    // ==========================================================================
    // ACH-SPECIFIC CONFIGURATION
    // ==========================================================================
    
    if (paymentMethodTypes.includes('us_bank_account')) {
      // ACH payment options
      sessionParams.payment_method_options = {
        us_bank_account: {
          verification_method: 'instant',
          financial_connections: {
            permissions: ['payment_method'],
          },
        },
      };
    }

    // Create the session
    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update booking with checkout session ID for tracking
    await supabase
      .from('bookings')
      .update({
        internal_notes: `Payment type: ${paymentType}. Stripe session: ${session.id}. Methods: ${paymentMethodTypes.join(', ')}`,
      })
      .eq('id', bookingId);

    console.log(`✅ [CHECKOUT] Created session ${session.id} for booking ${booking.booking_number} | Methods: ${paymentMethodTypes.join(', ')}`);

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentType,
      amount: amountCents / 100,
      paymentMethods: paymentMethodTypes,
      achEnabled: paymentMethodTypes.includes('us_bank_account'),
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Handle specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes('api_key')) {
        return NextResponse.json(
          { error: 'Payment system configuration error. Please contact support.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
