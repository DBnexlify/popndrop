// =============================================================================
// BOOKING STATUS API
// GET /api/bookings/status?id={bookingId}
// Used by success page to poll for webhook completion
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        deposit_paid,
        balance_paid,
        balance_due,
        subtotal,
        deposit_amount,
        confirmed_at,
        stripe_payment_intent_id
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Determine if payment has been processed
    // A booking is "payment confirmed" if:
    // 1. Status is 'confirmed' (webhook processed)
    // 2. OR deposit_paid is true
    // 3. OR stripe_payment_intent_id exists
    const isPaymentConfirmed = 
      booking.status === 'confirmed' ||
      booking.deposit_paid === true ||
      !!booking.stripe_payment_intent_id;

    // Determine if paid in full
    const isPaidInFull = 
      booking.balance_paid === true || 
      Number(booking.balance_due) === 0;

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingNumber: booking.booking_number,
        status: booking.status,
        depositPaid: booking.deposit_paid,
        balancePaid: booking.balance_paid,
        balanceDue: booking.balance_due,
        subtotal: booking.subtotal,
        depositAmount: booking.deposit_amount,
        confirmedAt: booking.confirmed_at,
        hasStripePayment: !!booking.stripe_payment_intent_id,
      },
      isPaymentConfirmed,
      isPaidInFull,
    });

  } catch (error) {
    console.error('Error fetching booking status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
