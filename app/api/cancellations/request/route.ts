// =============================================================================
// CANCELLATION REQUEST API
// app/api/cancellations/request/route.ts
// Customer-facing: Submit cancellation request & get refund preview
// NOW WITH RESCHEDULE-FIRST NUDGE
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { calculateRefund, DEFAULT_POLICY, type CancellationPolicy } from '@/lib/cancellations';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// =============================================================================
// GET: Preview refund for a booking + RESCHEDULE OPTIONS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const email = searchParams.get('email');

    console.log('[Cancellation GET] Request:', { bookingId, email, bookingIdType: typeof bookingId });

    if (!bookingId || !email) {
      return NextResponse.json(
        { error: 'Booking ID and email are required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      console.log('[Cancellation GET] Invalid UUID format:', bookingId);
      return NextResponse.json(
        { error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // STEP 1: Get the booking first (without join to avoid failure)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        event_date,
        booking_type,
        unit_id,
        status,
        deposit_paid,
        deposit_amount,
        balance_paid,
        balance_due,
        subtotal,
        final_amount_collected,
        product_snapshot,
        delivery_window,
        customer_id
      `)
      .eq('id', bookingId)
      .single();

    console.log('[Cancellation GET] Booking query result:', { 
      found: !!booking, 
      error: bookingError?.message,
      bookingNumber: booking?.booking_number 
    });

    if (bookingError) {
      console.error('[Cancellation GET] Booking error:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // STEP 2: Get the customer separately
    let customer: { email?: string; first_name?: string; last_name?: string } | null = null;
    
    if (booking.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email, first_name, last_name')
        .eq('id', booking.customer_id)
        .single();
      
      if (customerError) {
        console.error('[Cancellation GET] Customer lookup error:', customerError);
      } else {
        customer = customerData;
      }
    }

    console.log('[Cancellation GET] Customer lookup:', { 
      customerId: booking.customer_id,
      customerEmail: customer?.email,
      providedEmail: email 
    });

    // Verify email matches
    if (!customer?.email || customer.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match booking' },
        { status: 403 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This booking has already been cancelled' },
        { status: 400 }
      );
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Completed bookings cannot be cancelled' },
        { status: 400 }
      );
    }

    // Check for existing pending cancellation request
    const { data: existingRequest } = await supabase
      .from('cancellation_requests')
      .select('id, status')
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A cancellation request is already pending for this booking' },
        { status: 400 }
      );
    }

    // Get active cancellation policy
    const { data: policyData } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('is_active', true)
      .single();

    const policy: CancellationPolicy = policyData || DEFAULT_POLICY;

    // Calculate refund
    // Calculate actual amount paid based on deposit and balance status
    let amountPaid = 0;
    if (booking.final_amount_collected) {
      amountPaid = Number(booking.final_amount_collected);
    } else {
      if (booking.deposit_paid) {
        amountPaid += Number(booking.deposit_amount) || 0;
      }
      if (booking.balance_paid) {
        amountPaid += Number(booking.balance_due) || 0;
      }
    }
    
    const refundCalc = calculateRefund(booking.event_date, amountPaid, policy);

    // Check if any payment exists for refund
    const hasPayment = amountPaid > 0;

    // =========================================================================
    // RESCHEDULE OPTIONS - Get a few available dates to nudge reschedule
    // =========================================================================
    let rescheduleOptions: Array<{
      date: string;
      formatted: string;
      dayOfWeek: string;
    }> = [];

    // Only show reschedule if policy allows it
    if (policy.allow_reschedule !== false && booking.unit_id) {
      // Get unit's product
      const { data: unit } = await supabase
        .from('units')
        .select('product_id')
        .eq('id', booking.unit_id)
        .single();

      if (unit) {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 2);
        
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 45);

        // Get booked dates
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('delivery_date, pickup_date, unit_id')
          .neq('id', bookingId)
          .not('status', 'in', '("cancelled","pending")')
          .gte('event_date', startDate.toISOString().split('T')[0]);

        // Filter to same product's units
        const { data: productUnits } = await supabase
          .from('units')
          .select('id')
          .eq('product_id', unit.product_id);
        
        const productUnitIds = new Set(productUnits?.map(u => u.id) || []);

        // Get blackout dates
        const { data: blackoutDates } = await supabase
          .from('blackout_dates')
          .select('start_date, end_date')
          .lte('start_date', endDate.toISOString().split('T')[0])
          .gte('end_date', startDate.toISOString().split('T')[0]);

        // Build unavailable set
        const unavailableDates = new Set<string>();
        blackoutDates?.forEach(b => {
          // Add all dates in the blackout range
          const start = new Date(b.start_date + 'T12:00:00');
          const end = new Date(b.end_date + 'T12:00:00');
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            unavailableDates.add(d.toISOString().split('T')[0]);
          }
        });
        existingBookings?.filter(b => productUnitIds.has(b.unit_id)).forEach(b => {
          const delivery = new Date(b.delivery_date + 'T12:00:00');
          const pickup = new Date(b.pickup_date + 'T12:00:00');
          for (let d = new Date(delivery); d <= pickup; d.setDate(d.getDate() + 1)) {
            unavailableDates.add(d.toISOString().split('T')[0]);
          }
        });

        // Find available dates (show up to 5 options)
        for (let d = new Date(startDate); d <= endDate && rescheduleOptions.length < 5; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (!unavailableDates.has(dateStr)) {
            rescheduleOptions.push({
              date: dateStr,
              formatted: formatDate(dateStr),
              dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
            });
          }
        }
      }
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        bookingNumber: booking.booking_number,
        eventDate: booking.event_date,
        eventDateFormatted: formatDate(booking.event_date),
        productName: (booking.product_snapshot as { name?: string })?.name || 'Bounce House Rental',
        status: booking.status,
        deliveryWindow: booking.delivery_window,
      },
      refund: {
        ...refundCalc,
        amountPaid,
        hasPayment,
        canCancel: true,
      },
      policy: {
        name: policy.name,
        rules: policy.rules,
        processingFee: policy.processing_fee,
        allowReschedule: policy.allow_reschedule !== false,
      },
      // RESCHEDULE NUDGE
      reschedule: {
        available: rescheduleOptions.length > 0,
        message: rescheduleOptions.length > 0 
          ? "Can't make it? We've got other dates available!" 
          : null,
        suggestedDates: rescheduleOptions,
        moreAvailable: rescheduleOptions.length >= 5,
      },
    });

  } catch (error) {
    console.error('[Cancellation GET] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to get cancellation details' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Submit cancellation request
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bookingId, 
      email, 
      reason, 
      cancellationType = 'customer_request',
      declinedReschedule = false,
    } = body;

    console.log('[Cancellation POST] Request:', { bookingId, email, bookingIdType: typeof bookingId });

    if (!bookingId || !email) {
      return NextResponse.json(
        { error: 'Booking ID and email are required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      console.log('[Cancellation POST] Invalid UUID format:', bookingId);
      return NextResponse.json(
        { error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // STEP 1: Get booking first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        event_date,
        status,
        deposit_paid,
        deposit_amount,
        balance_paid,
        balance_due,
        subtotal,
        final_amount_collected,
        product_snapshot,
        customer_id
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[Cancellation POST] Booking not found:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // STEP 2: Get customer
    let customer: { id?: string; email?: string; first_name?: string; last_name?: string } | null = null;
    
    if (booking.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name')
        .eq('id', booking.customer_id)
        .single();
      customer = customerData;
    }

    // Verify email
    if (!customer?.email || customer.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match booking' },
        { status: 403 }
      );
    }

    // Validate booking can be cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This booking has already been cancelled' },
        { status: 400 }
      );
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Completed bookings cannot be cancelled' },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('cancellation_requests')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A cancellation request is already pending' },
        { status: 400 }
      );
    }

    // Get active policy and calculate refund
    const { data: policyData } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('is_active', true)
      .single();

    const policy: CancellationPolicy = policyData || DEFAULT_POLICY;
    
    // Calculate actual amount paid
    let amountPaid = 0;
    if (booking.final_amount_collected) {
      amountPaid = Number(booking.final_amount_collected);
    } else {
      if (booking.deposit_paid) {
        amountPaid += Number(booking.deposit_amount) || 0;
      }
      if (booking.balance_paid) {
        amountPaid += Number(booking.balance_due) || 0;
      }
    }
    
    const refundCalc = calculateRefund(booking.event_date, amountPaid, policy, cancellationType);

    // Create cancellation request
    const { data: cancellationRequest, error: insertError } = await supabase
      .from('cancellation_requests')
      .insert({
        booking_id: bookingId,
        status: 'pending',
        reason: reason || null,
        cancellation_type: cancellationType,
        days_before_event: refundCalc.daysUntilEvent,
        policy_refund_percent: refundCalc.refundPercent,
        original_paid: amountPaid,
        suggested_refund: refundCalc.refundAmount,
        processing_fee: refundCalc.processingFee,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Cancellation POST] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit cancellation request' },
        { status: 500 }
      );
    }

    // Create attention item for admin dashboard notification
    const customerName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer';
    const productName = (booking.product_snapshot as { name?: string })?.name || 'Bounce House Rental';
    
    await supabase
      .from('attention_items')
      .insert({
        booking_id: bookingId,
        attention_type: 'cancellation_request',
        priority: refundCalc.daysUntilEvent <= 2 ? 'urgent' : refundCalc.daysUntilEvent <= 6 ? 'high' : 'medium',
        status: 'pending',
        title: `Cancellation Request - ${customerName}`,
        description: `${customerName} requested to cancel their ${productName} rental for ${formatDate(booking.event_date)}. Suggested refund: ${refundCalc.refundAmount.toFixed(2)}`,
        suggested_actions: [
          {
            id: 'review_cancellation',
            label: 'Review Request',
            action: 'navigate',
            variant: 'primary',
            data: { destination: '/admin/cancellations' },
          },
          {
            id: 'contact_customer',
            label: 'Contact Customer',
            action: 'contact',
            variant: 'secondary',
          },
        ],
        is_automated: true,
      });

    // Update booking status to indicate pending cancellation
    const noteText = declinedReschedule 
      ? `Cancellation requested on ${new Date().toLocaleDateString()} (declined reschedule). Reason: ${reason || 'Not provided'}`
      : `Cancellation requested on ${new Date().toLocaleDateString()}. Reason: ${reason || 'Not provided'}`;

    await supabase
      .from('bookings')
      .update({ 
        status: 'pending_cancellation',
        internal_notes: noteText,
      })
      .eq('id', bookingId);

    // Send confirmation email to customer
    if (customer?.email) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: customer.email,
          subject: `Cancellation Request Received - ${booking.booking_number}`,
          html: createCancellationRequestEmail({
            customerName: customer.first_name || 'there',
            bookingNumber: booking.booking_number,
            productName: (booking.product_snapshot as { name?: string })?.name || 'rental',
            eventDate: formatDate(booking.event_date),
            suggestedRefund: refundCalc.refundAmount,
          }),
        });
      } catch (emailError) {
        console.error('[Cancellation POST] Email error:', emailError);
      }
    }

    // Notify admin
    if (NOTIFY_EMAIL) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: NOTIFY_EMAIL,
          subject: `🚨 Cancellation Request - ${booking.booking_number}`,
          html: createAdminCancellationNotification({
            customerName: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer',
            customerEmail: customer?.email || 'unknown',
            bookingNumber: booking.booking_number,
            productName: (booking.product_snapshot as { name?: string })?.name || 'rental',
            eventDate: formatDate(booking.event_date),
            reason: reason || 'Not provided',
            suggestedRefund: refundCalc.refundAmount,
            declinedReschedule,
          }),
        });
      } catch (emailError) {
        console.error('[Cancellation POST] Admin email error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cancellation request submitted successfully',
      request: {
        id: cancellationRequest.id,
        status: 'pending',
        suggestedRefund: refundCalc.refundAmount,
        policyLabel: refundCalc.policyLabel,
      },
    });

  } catch (error) {
    console.error('[Cancellation POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to submit cancellation request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function createCancellationRequestEmail(data: {
  customerName: string;
  bookingNumber: string;
  productName: string;
  eventDate: string;
  suggestedRefund: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
    <div style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
      
      <!-- Header -->
      <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
        <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #f59e0b; border-radius: 50%; line-height: 56px; text-align: center;">
          <span style="color: white; font-size: 28px;">⏳</span>
        </div>
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Request Received</h1>
        <p style="margin: 8px 0 0; color: #888;">Booking ${data.bookingNumber}</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 24px;">
        <p style="color: #ccc; margin: 0 0 20px;">Hey ${data.customerName}! We received your cancellation request.</p>
        
        <!-- Status Card -->
        <div style="background-color: rgba(245, 158, 11, 0.1); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <p style="margin: 0 0 4px; color: #f59e0b; font-weight: 600; font-size: 13px;">📋 What happens next?</p>
          <p style="margin: 0; color: #fcd34d; font-size: 13px;">We'll review your request and get back to you within 24 hours with confirmation and any applicable refund details.</p>
        </div>
        
        <!-- Booking Details -->
        <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #888; font-size: 13px;">Rental</td>
              <td style="padding: 4px 0; color: white; font-size: 13px; text-align: right;">${data.productName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #888; font-size: 13px;">Event Date</td>
              <td style="padding: 4px 0; color: white; font-size: 13px; text-align: right;">${data.eventDate}</td>
            </tr>
            ${data.suggestedRefund > 0 ? `
            <tr>
              <td style="padding: 8px 0 0; color: #888; font-size: 13px; border-top: 1px solid #333;">Estimated Refund</td>
              <td style="padding: 8px 0 0; color: #22c55e; font-size: 16px; font-weight: 600; text-align: right; border-top: 1px solid #333;">~$${data.suggestedRefund.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="color: #888; margin: 0; font-size: 13px;">
          Changed your mind? Just reply to this email or give us a call — we're happy to help reschedule instead!
        </p>
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Questions? We're here to help!</p>
        <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none; font-weight: 500;">(352) 445-3723</a>
      </div>
      
    </div>
    
    <p style="margin: 20px 0 0; text-align: center; color: #444; font-size: 11px;">
      Pop and Drop Party Rentals • Ocala, FL
    </p>
  </div>
</body>
</html>
  `;
}

function createAdminCancellationNotification(data: {
  customerName: string;
  customerEmail: string;
  bookingNumber: string;
  productName: string;
  eventDate: string;
  reason: string;
  suggestedRefund: number;
  declinedReschedule: boolean;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
    <div style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
      
      <div style="padding: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 28px;">🚨</p>
        <h1 style="margin: 0; color: white; font-size: 22px;">Cancellation Request</h1>
        <p style="margin: 8px 0; color: #888;">${data.bookingNumber}</p>
        ${data.declinedReschedule ? '<span style="display: inline-block; background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 50px; font-size: 11px;">Declined Reschedule</span>' : ''}
      </div>
      
      <div style="margin: 0 24px 16px; background-color: #222; border-radius: 12px; padding: 16px;">
        <p style="margin: 0 0 10px; color: #666; font-size: 10px; text-transform: uppercase;">Customer</p>
        <p style="margin: 0 0 4px; color: white; font-weight: 600;">${data.customerName}</p>
        <p style="margin: 0; color: #888; font-size: 13px;">${data.customerEmail}</p>
      </div>
      
      <div style="margin: 0 24px 16px; background-color: #222; border-radius: 12px; padding: 16px;">
        <table style="width: 100%;">
          <tr><td style="padding: 4px 0; color: #888; font-size: 13px;">Rental</td><td style="text-align: right; color: white;">${data.productName}</td></tr>
          <tr><td style="padding: 4px 0; color: #888; font-size: 13px;">Event Date</td><td style="text-align: right; color: white;">${data.eventDate}</td></tr>
          <tr><td style="padding: 4px 0; color: #888; font-size: 13px;">Suggested Refund</td><td style="text-align: right; color: #22c55e; font-weight: 600;">$${data.suggestedRefund.toFixed(2)}</td></tr>
        </table>
      </div>
      
      <div style="margin: 0 24px 24px; background-color: #1f1a2e; border-left: 3px solid #a855f7; border-radius: 0 8px 8px 0; padding: 14px;">
        <p style="margin: 0 0 4px; color: #c084fc; font-size: 10px; text-transform: uppercase;">Reason Given</p>
        <p style="margin: 0; color: #ccc; font-size: 13px;">${data.reason}</p>
      </div>
      
      <div style="padding: 20px 24px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://popndroprentals.com'}/admin/cancellations" 
           style="display: inline-block; background: linear-gradient(135deg, #d946ef, #9333ea); color: white; text-decoration: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600;">
          Review Request →
        </a>
      </div>
      
    </div>
  </div>
</body>
</html>
  `;
}
