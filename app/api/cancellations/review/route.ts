// =============================================================================
// ADMIN CANCELLATION REVIEW API
// app/api/cancellations/review/route.ts
// Admin-facing: List, approve, deny, and process refunds
// Supports both automatic Stripe refunds and manual refund methods
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
          delivery_address,
          delivery_city,
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
// POST: Process cancellation request (approve/deny/refund/mark_refunded)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      requestId, 
      action,              // 'approve' | 'deny' | 'refund' | 'mark_refunded'
      refundAmount,        // Custom refund amount (optional, uses suggested if not provided)
      refundMethod,        // 'stripe' | 'venmo' | 'zelle' | 'cash' | 'check'
      overrideReason,      // 'weather' | 'emergency' | 'our_fault' | 'goodwill' | 'other'
      adminNotes,          // Admin notes
      processStripeRefund: shouldProcessStripeRefund, // Boolean - process Stripe refund automatically
    } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'deny', 'refund', 'mark_refunded'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, deny, refund, or mark_refunded' },
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
          product_snapshot,
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

    // Check if already processed (except for mark_refunded action)
    if (cancellationRequest.status !== 'pending' && action !== 'refund' && action !== 'mark_refunded') {
      return NextResponse.json(
        { error: `Request has already been ${cancellationRequest.status}` },
        { status: 400 }
      );
    }

    const booking = Array.isArray(cancellationRequest.booking) 
      ? cancellationRequest.booking[0] 
      : cancellationRequest.booking;

    const customer = Array.isArray(booking?.customer) 
      ? booking.customer[0] 
      : booking?.customer;

    const productSnapshot = booking?.product_snapshot as { name?: string } | undefined;
    const productName = productSnapshot?.name || 'rental';
    const eventDateFormatted = booking?.event_date 
      ? new Date(booking.event_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : 'your event';

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

        // Restore booking status to confirmed
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            internal_notes: `Cancellation request denied on ${new Date().toLocaleDateString()}. ${adminNotes || ''}`,
          })
          .eq('id', booking.id);

        // Send denial email to customer
        if (customer?.email) {
          await sendCancellationDeniedEmail({
            customerEmail: customer.email,
            customerFirstName: customer.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName,
            eventDate: eventDateFormatted,
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
        const approvedAmount = refundAmount ?? cancellationRequest.suggested_refund ?? 0;
        const selectedRefundMethod = refundMethod || 'stripe';
        const isManualRefund = selectedRefundMethod !== 'stripe';

        // Build admin notes with override info
        let fullAdminNotes = adminNotes || '';
        if (overrideReason && overrideReason !== 'none') {
          const overrideLabels: Record<string, string> = {
            weather: 'Weather/Safety',
            emergency: 'Family emergency',
            our_fault: 'Our scheduling conflict',
            goodwill: 'Customer goodwill',
            other: 'Other override',
          };
          fullAdminNotes = `[Override: ${overrideLabels[overrideReason] || overrideReason}] ${fullAdminNotes}`.trim();
        }

        // Update cancellation request
        await supabase
          .from('cancellation_requests')
          .update({
            status: 'approved',
            approved_refund: approvedAmount,
            refund_method: selectedRefundMethod,
            admin_notes: fullAdminNotes || null,
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
            resolution_notes: fullAdminNotes || `Cancellation approved. Refund: $${approvedAmount?.toFixed(2) || '0.00'}`,
          })
          .eq('booking_id', booking.id)
          .eq('attention_type', 'cancellation_request')
          .eq('status', 'pending');

        // Update booking status to cancelled
        const cancelledBy = overrideReason === 'weather' ? 'weather' : 'customer';
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledBy,
            cancellation_reason: cancellationRequest.reason || 'Customer request',
            refund_amount: approvedAmount,
            refund_status: approvedAmount > 0 ? 'pending' : 'none',
          })
          .eq('id', booking.id);

        // If Stripe refund requested and payment intent exists, process automatically
        if (shouldProcessStripeRefund && booking.stripe_payment_intent_id && approvedAmount > 0) {
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

            await supabase
              .from('bookings')
              .update({
                refund_status: 'processed',
                refund_processed_at: new Date().toISOString(),
                stripe_refund_id: refundResult.refundId,
              })
              .eq('id', booking.id);

            // Send refund confirmation email
            if (customer?.email) {
              await sendCancellationRefundEmail({
                customerEmail: customer.email,
                customerFirstName: customer.first_name || 'there',
                bookingNumber: booking.booking_number,
                productName,
                eventDate: eventDateFormatted,
                refundAmount: approvedAmount,
              });
            }

            return NextResponse.json({
              success: true,
              message: `Cancellation approved and $${approvedAmount.toFixed(2)} refunded to card`,
              status: 'refunded',
              refundId: refundResult.refundId,
            });
          } else {
            // Stripe refund failed - mark as approved with pending manual refund
            return NextResponse.json({
              success: true,
              message: `Cancellation approved. Stripe refund failed: ${refundResult.error}. Please process refund manually via ${selectedRefundMethod}.`,
              status: 'approved',
              refundError: refundResult.error,
            });
          }
        }

        // Manual refund or no refund - send appropriate email
        if (customer?.email) {
          if (approvedAmount > 0) {
            // Send approval email mentioning refund is coming via manual method
            await sendCancellationApprovedEmail({
              customerEmail: customer.email,
              customerFirstName: customer.first_name || 'there',
              bookingNumber: booking.booking_number,
              productName,
              eventDate: eventDateFormatted,
              refundAmount: approvedAmount,
              refundMethod: isManualRefund ? selectedRefundMethod : undefined,
            });
          } else {
            // No refund - just approved
            await sendCancellationApprovedEmail({
              customerEmail: customer.email,
              customerFirstName: customer.first_name || 'there',
              bookingNumber: booking.booking_number,
              productName,
              eventDate: eventDateFormatted,
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: approvedAmount > 0 
            ? `Cancellation approved. $${approvedAmount.toFixed(2)} refund pending via ${selectedRefundMethod}.`
            : 'Cancellation approved. No refund applicable.',
          status: 'approved',
          refundPending: approvedAmount > 0,
          refundMethod: selectedRefundMethod,
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
            { error: 'No payment found to refund. Use mark_refunded for manual refunds.' },
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

        await supabase
          .from('bookings')
          .update({
            refund_status: 'processed',
            refund_processed_at: new Date().toISOString(),
            stripe_refund_id: refundResult.refundId,
          })
          .eq('id', booking.id);

        // Send refund confirmation email
        if (customer?.email) {
          await sendCancellationRefundEmail({
            customerEmail: customer.email,
            customerFirstName: customer.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName,
            eventDate: eventDateFormatted,
            refundAmount: amount,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Refund of $${amount.toFixed(2)} processed successfully`,
          status: 'refunded',
          refundId: refundResult.refundId,
        });
      }

      case 'mark_refunded': {
        // Mark manual refund as complete (for Venmo, Zelle, cash, check)
        if (cancellationRequest.status !== 'approved') {
          return NextResponse.json(
            { error: 'Can only mark approved requests as refunded' },
            { status: 400 }
          );
        }

        const amount = cancellationRequest.approved_refund || refundAmount || 0;
        const method = refundMethod || cancellationRequest.refund_method || 'manual';

        await supabase
          .from('cancellation_requests')
          .update({
            status: 'refunded',
            refund_processed_at: new Date().toISOString(),
            admin_notes: adminNotes 
              ? `${cancellationRequest.admin_notes || ''}\nRefund sent via ${method}. ${adminNotes}`.trim()
              : `${cancellationRequest.admin_notes || ''}\nRefund sent via ${method}.`.trim(),
          })
          .eq('id', requestId);

        await supabase
          .from('bookings')
          .update({
            refund_status: 'processed',
            refund_processed_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        // Send refund confirmation email
        if (customer?.email) {
          await sendCancellationRefundEmail({
            customerEmail: customer.email,
            customerFirstName: customer.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName,
            eventDate: eventDateFormatted,
            refundAmount: amount,
            refundMethod: method,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Marked as refunded via ${method}`,
          status: 'refunded',
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
