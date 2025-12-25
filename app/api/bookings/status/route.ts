// =============================================================================
// BOOKING STATUS API
// GET /api/bookings/status?id={bookingId}
// 
// Used by success page to poll for webhook completion
// Handles both card (immediate) and ACH (async) payments
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
        stripe_payment_intent_id,
        payment_method_type,
        is_async_payment,
        async_payment_status,
        async_payment_initiated_at,
        async_payment_completed_at,
        async_payment_failed_at,
        async_payment_failure_reason
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // ==========================================================================
    // DETERMINE PAYMENT STATUS
    // ==========================================================================

    // Is this an ACH (async) payment?
    const isAsyncPayment = booking.is_async_payment === true;
    const asyncStatus = booking.async_payment_status;

    // Determine if payment has been processed/confirmed
    // For card: immediate confirmation
    // For ACH: only confirmed when async_payment_status = 'succeeded'
    let isPaymentConfirmed = false;
    let isPaymentPending = false;
    let isPaymentFailed = false;

    if (isAsyncPayment) {
      // ACH payment flow
      switch (asyncStatus) {
        case 'succeeded':
          isPaymentConfirmed = true;
          break;
        case 'pending':
        case 'processing':
          isPaymentPending = true;
          break;
        case 'failed':
          isPaymentFailed = true;
          break;
        default:
          // Unknown state - treat as pending if async payment was initiated
          if (booking.async_payment_initiated_at) {
            isPaymentPending = true;
          }
      }
    } else {
      // Card payment flow (immediate)
      isPaymentConfirmed = 
        booking.status === 'confirmed' ||
        booking.deposit_paid === true ||
        !!booking.stripe_payment_intent_id;
    }

    // Determine if paid in full
    const isPaidInFull = 
      booking.balance_paid === true || 
      Number(booking.balance_due) === 0;

    // ==========================================================================
    // BUILD RESPONSE
    // ==========================================================================

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
        // Payment method info
        paymentMethodType: booking.payment_method_type || 'card',
      },
      // Overall payment status
      isPaymentConfirmed,
      isPaidInFull,
      // ACH-specific status
      isAsyncPayment,
      asyncPayment: isAsyncPayment ? {
        status: asyncStatus,
        isPending: isPaymentPending,
        isFailed: isPaymentFailed,
        isSucceeded: asyncStatus === 'succeeded',
        initiatedAt: booking.async_payment_initiated_at,
        completedAt: booking.async_payment_completed_at,
        failedAt: booking.async_payment_failed_at,
        failureReason: booking.async_payment_failure_reason,
        // Estimated clearance message
        estimatedClearance: isPaymentPending 
          ? 'Bank transfers typically take 3-5 business days to complete.' 
          : null,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching booking status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
