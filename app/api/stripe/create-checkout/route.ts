// =============================================================================
// STRIPE CREATE CHECKOUT SESSION API
// app/api/stripe/create-checkout/route.ts
// Creates a Stripe Checkout session for deposit or full payment
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe, dollarsToCents, DEPOSIT_AMOUNT_CENTS } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';

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

    // Determine amount based on payment type
    const isFullPayment = paymentType === 'full';
    const amountCents = isFullPayment 
      ? dollarsToCents(Number(booking.subtotal))
      : DEPOSIT_AMOUNT_CENTS;
    
    const productName = booking.product_snapshot?.name || 'Bounce House Rental';
    const eventDateFormatted = new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Build line item description
    const lineItemName = isFullPayment
      ? `${productName} - Full Payment`
      : `${productName} - Deposit`;
    
    const lineItemDescription = isFullPayment
      ? `Booking ${booking.booking_number} • Event: ${eventDateFormatted} • Paid in full - nothing due on delivery!`
      : `Booking ${booking.booking_number} • Event: ${eventDateFormatted} • Balance of $${Number(booking.balance_due).toFixed(0)} due on delivery`;

    // Get base URL (handle both localhost and production)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Extract customer (Supabase returns array for joins)
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customer?.email || undefined,
      client_reference_id: booking.id,
      metadata: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        payment_type: paymentType,
        customer_id: customer?.id || '',
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
    });

    // Update booking with checkout session ID for tracking
    await supabase
      .from('bookings')
      .update({
        // Store which payment type they chose
        internal_notes: `Payment type: ${paymentType}. Stripe session: ${session.id}`,
      })
      .eq('id', bookingId);

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentType,
      amount: amountCents / 100,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
