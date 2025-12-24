// =============================================================================
// ADMIN CANCELLATION REVIEW API
// app/api/cancellations/review/route.ts
// Admin-facing: List, approve, deny, and process refunds
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { processStripeRefund } from '@/lib/cancellations';
import {
  sendCancellationApprovedEmail,
  sendCancellationRefundEmail,
  sendCancellationDeniedEmail,
} from '@/lib/emails/cancellation-emails';

// =============================================================================
// GET: List cancellation requests (with filters)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, denied, refunded, all
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createServerClient();

    let query = supabase
      .from('cancellation_requests')
      .select(`
        *,
        booking:bookings (
          id,
          booking_number,
          event_date,
          status,
          product_snapshot,
          stripe_payment_intent_id,
          customer:customers (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching cancellation requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cancellation requests' },
        { status: 500 }
      );
    }

    // Get counts by status
    const { data: pendingCount } = await supabase
      .from('cancellation_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      requests: requests || [],
      counts: {
        pending: pendingCount || 0,
      },
    });

  } catch (error) {
    console.error('Error in cancellation review GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cancellation requests' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Process cancellation request (approve/deny/refund)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      requestId, 
      action,           // 'approve' | 'deny' | 'refund'
      refundAmount,     // Custom refund amount (optional, uses suggested if not provided)
      adminNotes,       // Admin notes
    } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'deny', 'refund'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, deny, or refund' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the cancellation request with booking info
    const { data: cancellationRequest, error: fetchError } = await supabase
      .from('cancellation_requests')
      .select(`
        *,
        booking:bookings (
          id,
          booking_number,
          event_date,
          stripe_payment_intent_id,
          customer:customers (
            id,
            email,
            first_name,
            last_name
          )
        )
      `)
      .eq('id', requestId)
      .single();

    if (fetchError || !cancellationRequest) {
      return NextResponse.json(
        { error: 'Cancellation request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (cancellationRequest.status !== 'pending' && action !== 'refund') {
      return NextResponse.json(
        { error: `Request has already been ${cancellationRequest.status}` },
        { status: 400 }
      );
    }

    const booking = Array.isArray(cancellationRequest.booking) 
      ? cancellationRequest.booking[0] 
      : cancellationRequest.booking;

    // Handle different actions
    switch (action) {
      case 'deny': {
        // Update cancellation request
        await supabase
          .from('cancellation_requests')
          .update({
            status: 'denied',
            admin_notes: adminNotes || null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        // Resolve the attention item
        await supabase
          .from('attention_items')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_action: 'cancellation_denied',
            resolution_notes: adminNotes || 'Cancellation request denied',
          })
          .eq('booking_id', booking.id)
          .eq('attention_type', 'cancellation_request')
          .eq('status', 'pending');

        // Restore booking status
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            internal_notes: `Cancellation request denied on ${new Date().toLocaleDateString()}. ${adminNotes || ''}`,
          })
          .eq('id', booking.id);

        // Send denial email to customer
        const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        if (customer?.email) {
          const productSnapshot = cancellationRequest.booking?.product_snapshot as { name?: string } | undefined;
          await sendCancellationDeniedEmail({
            customerEmail: customer.email,
            customerFirstName: customer.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName: productSnapshot?.name || 'rental',
            eventDate: new Date(booking.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            reason: adminNotes,
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Cancellation request denied',
          status: 'denied',
        });
      }

      case 'approve': {
        // Approve but don't process refund yet
        const approvedAmount = refundAmount ?? cancellationRequest.suggested_refund;

        await supabase
          .from('cancellation_requests')
          .update({
            status: 'approved',
            approved_refund: approvedAmount,
            admin_notes: adminNotes || null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        // Resolve the attention item
        await supabase
          .from('attention_items')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_action: 'cancellation_approved',
            resolution_notes: adminNotes || `Cancellation approved. Refund: ${approvedAmount?.toFixed(2) || '0.00'}`,
          })
          .eq('booking_id', booking.id)
          .eq('attention_type', 'cancellation_request')
          .eq('status', 'pending');

        // Update booking status
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: cancellationRequest.reason || 'Customer request',
          })
          .eq('id', booking.id);

        // If there's a refund amount and payment intent, process refund automatically
        if (approvedAmount > 0 && booking.stripe_payment_intent_id) {
          const refundResult = await processStripeRefund(
            booking.stripe_payment_intent_id,
            approvedAmount,
            `Booking ${booking.booking_number} cancellation`
          );

          if (refundResult.success) {
            await supabase
              .from('cancellation_requests')
              .update({
                status: 'refunded',
                stripe_refund_id: refundResult.refundId,
                refund_processed_at: new Date().toISOString(),
              })
              .eq('id', requestId);

            // Send refund confirmation email
            const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
            if (customer?.email) {
              const productSnapshot = cancellationRequest.booking?.product_snapshot as { name?: string } | undefined;
              await sendCancellationRefundEmail({
                customerEmail: customer.email,
                customerFirstName: customer.first_name || 'there',
                bookingNumber: booking.booking_number,
                productName: productSnapshot?.name || 'rental',
                eventDate: new Date(booking.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }),
                refundAmount: approvedAmount,
              });
            }

            return NextResponse.json({
              success: true,
              message: `Cancellation approved and ${approvedAmount.toFixed(2)} refunded`,
              status: 'refunded',
              refundId: refundResult.refundId,
            });
          } else {
            // Refund failed but approval succeeded
            return NextResponse.json({
              success: true,
              message: `Cancellation approved but refund failed: ${refundResult.error}`,
              status: 'approved',
              refundError: refundResult.error,
            });
          }
        }

        // Send approval email (no refund)
        const customerForApproval = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        if (customerForApproval?.email) {
          const productSnapshot = cancellationRequest.booking?.product_snapshot as { name?: string } | undefined;
          await sendCancellationApprovedEmail({
            customerEmail: customerForApproval.email,
            customerFirstName: customerForApproval.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName: productSnapshot?.name || 'rental',
            eventDate: new Date(booking.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
          });
        }

        return NextResponse.json({
          success: true,
          message: approvedAmount > 0 
            ? `Cancellation approved. Refund of $${approvedAmount.toFixed(2)} pending.`
            : 'Cancellation approved. No refund applicable.',
          status: 'approved',
        });
      }

      case 'refund': {
        // Manual refund trigger (for already approved requests)
        if (cancellationRequest.status !== 'approved') {
          return NextResponse.json(
            { error: 'Can only refund approved requests' },
            { status: 400 }
          );
        }

        const amount = refundAmount ?? cancellationRequest.approved_refund ?? cancellationRequest.suggested_refund;

        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'No refund amount specified' },
            { status: 400 }
          );
        }

        if (!booking.stripe_payment_intent_id) {
          return NextResponse.json(
            { error: 'No payment found to refund' },
            { status: 400 }
          );
        }

        const refundResult = await processStripeRefund(
          booking.stripe_payment_intent_id,
          amount,
          `Booking ${booking.booking_number} cancellation`
        );

        if (!refundResult.success) {
          return NextResponse.json(
            { error: refundResult.error || 'Refund failed' },
            { status: 500 }
          );
        }

        await supabase
          .from('cancellation_requests')
          .update({
            status: 'refunded',
            approved_refund: amount,
            stripe_refund_id: refundResult.refundId,
            refund_processed_at: new Date().toISOString(),
            admin_notes: adminNotes 
              ? `${cancellationRequest.admin_notes || ''}\n${adminNotes}`.trim()
              : cancellationRequest.admin_notes,
          })
          .eq('id', requestId);

        // Send refund confirmation email
        const customerForRefund = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        if (customerForRefund?.email) {
          const productSnapshot = cancellationRequest.booking?.product_snapshot as { name?: string } | undefined;
          await sendCancellationRefundEmail({
            customerEmail: customerForRefund.email,
            customerFirstName: customerForRefund.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName: productSnapshot?.name || 'rental',
            eventDate: new Date(booking.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            refundAmount: amount,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Refund of ${amount.toFixed(2)} processed successfully`,
          status: 'refunded',
          refundId: refundResult.refundId,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing cancellation review:', error);
    return NextResponse.json(
      { error: 'Failed to process cancellation request' },
      { status: 500 }
    );
  }
}
