// =============================================================================
// RESCHEDULE API
// app/api/bookings/reschedule/route.ts
// Smart reschedule endpoint - checks availability, prevents conflicts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendRescheduleConfirmationEmail } from '@/lib/emails/cancellation-emails';

// =============================================================================
// TYPES
// =============================================================================

type BookingType = 'daily' | 'weekend' | 'sunday';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calculate delivery and pickup dates based on event date and booking type
 */
function calculateDates(eventDate: string, bookingType: BookingType): {
  deliveryDate: string;
  pickupDate: string;
} {
  const event = new Date(eventDate + 'T12:00:00');
  const delivery = new Date(event);
  const pickup = new Date(event);

  if (bookingType === 'sunday') {
    // Sunday event: deliver Saturday, pickup Monday
    delivery.setDate(delivery.getDate() - 1);
    pickup.setDate(pickup.getDate() + 1);
  } else if (bookingType === 'weekend') {
    // Saturday event with weekend package: pickup Monday
    pickup.setDate(pickup.getDate() + 2);
  }
  // Daily: delivery and pickup same day

  return {
    deliveryDate: delivery.toISOString().split('T')[0],
    pickupDate: pickup.toISOString().split('T')[0],
  };
}

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

/**
 * Get day of week (0 = Sunday)
 */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

/**
 * Determine booking type from event date
 */
function getBookingType(eventDate: string, originalBookingType?: BookingType): BookingType {
  const dayOfWeek = getDayOfWeek(eventDate);
  
  // Sunday = 0
  if (dayOfWeek === 0) return 'sunday';
  
  // Saturday = 6, could be weekend package
  if (dayOfWeek === 6 && originalBookingType === 'weekend') return 'weekend';
  
  return 'daily';
}

// Helper to extract customer from Supabase join
function extractCustomer(customer: unknown): { 
  email?: string; 
  id?: string; 
  first_name?: string; 
  last_name?: string 
} | null {
  if (!customer) return null;
  if (Array.isArray(customer)) return customer[0] || null;
  return customer as { email?: string; id?: string; first_name?: string; last_name?: string };
}

// =============================================================================
// GET: Check available dates for reschedule
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const email = searchParams.get('email');

    if (!bookingId || !email) {
      return NextResponse.json(
        { error: 'Booking ID and email are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get booking with customer verification
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        event_date,
        booking_type,
        unit_id,
        delivery_window,
        pickup_window,
        product_snapshot,
        status,
        customer:customers!inner (
          id,
          email,
          first_name
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const customer = extractCustomer(booking.customer);
    if (customer?.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match booking' }, { status: 403 });
    }

    // Can't reschedule cancelled or completed bookings
    if (['cancelled', 'completed'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'This booking cannot be rescheduled' },
        { status: 400 }
      );
    }

    // Get the unit's product to check all units
    const { data: unit } = await supabase
      .from('units')
      .select('product_id')
      .eq('id', booking.unit_id)
      .single();

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Get available dates for the next 60 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 2); // At least 2 days out
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);

    // Get all booked dates for this product (excluding current booking)
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select(`
        event_date,
        delivery_date,
        pickup_date,
        units!inner (product_id)
      `)
      .eq('units.product_id', unit.product_id)
      .neq('id', bookingId) // Exclude current booking
      .not('status', 'in', '("cancelled","pending")') // Only confirmed/paid bookings block
      .gte('event_date', startDate.toISOString().split('T')[0])
      .lte('event_date', endDate.toISOString().split('T')[0]);

    // Get blackout dates
    const { data: blackoutDates } = await supabase
      .from('blackout_dates')
      .select('date, reason')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    // Build set of unavailable dates
    const unavailableDates = new Set<string>();
    
    // Add blackout dates
    blackoutDates?.forEach(b => unavailableDates.add(b.date));
    
    // Add booked date ranges (delivery through pickup)
    existingBookings?.forEach(b => {
      const delivery = new Date(b.delivery_date + 'T12:00:00');
      const pickup = new Date(b.pickup_date + 'T12:00:00');
      
      for (let d = new Date(delivery); d <= pickup; d.setDate(d.getDate() + 1)) {
        unavailableDates.add(d.toISOString().split('T')[0]);
      }
    });

    // Generate available dates
    const availableDates: Array<{
      date: string;
      formatted: string;
      dayOfWeek: string;
      bookingType: BookingType;
    }> = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      
      // Check if this date (and related delivery/pickup dates) are available
      const potentialBookingType = getBookingType(dateStr, booking.booking_type as BookingType);
      const { deliveryDate, pickupDate } = calculateDates(dateStr, potentialBookingType);
      
      // Check entire range is available
      let isAvailable = true;
      const checkStart = new Date(deliveryDate + 'T12:00:00');
      const checkEnd = new Date(pickupDate + 'T12:00:00');
      
      for (let check = new Date(checkStart); check <= checkEnd; check.setDate(check.getDate() + 1)) {
        if (unavailableDates.has(check.toISOString().split('T')[0])) {
          isAvailable = false;
          break;
        }
      }
      
      if (isAvailable) {
        availableDates.push({
          date: dateStr,
          formatted: formatDate(dateStr),
          dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
          bookingType: potentialBookingType,
        });
      }
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        bookingNumber: booking.booking_number,
        currentEventDate: booking.event_date,
        currentEventDateFormatted: formatDate(booking.event_date),
        productName: (booking.product_snapshot as { name?: string })?.name || 'Bounce House',
        deliveryWindow: booking.delivery_window,
        pickupWindow: booking.pickup_window,
      },
      availableDates: availableDates.slice(0, 30), // Limit to 30 options
      totalAvailable: availableDates.length,
    });

  } catch (error) {
    console.error('Error getting reschedule options:', error);
    return NextResponse.json(
      { error: 'Failed to get reschedule options' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Process reschedule
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, email, newEventDate, deliveryWindow, pickupWindow } = body;

    if (!bookingId || !email || !newEventDate) {
      return NextResponse.json(
        { error: 'Booking ID, email, and new event date are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get booking with customer verification
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        event_date,
        booking_type,
        unit_id,
        delivery_window,
        pickup_window,
        product_snapshot,
        status,
        customer:customers!inner (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const customer = extractCustomer(booking.customer);
    if (customer?.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match booking' }, { status: 403 });
    }

    // Validate booking can be rescheduled
    if (['cancelled', 'completed'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'This booking cannot be rescheduled' },
        { status: 400 }
      );
    }

    // Validate new date is in the future
    const newDate = new Date(newEventDate + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate <= today) {
      return NextResponse.json(
        { error: 'New event date must be in the future' },
        { status: 400 }
      );
    }

    // Calculate new booking type and dates
    const newBookingType = getBookingType(newEventDate, booking.booking_type as BookingType);
    const { deliveryDate, pickupDate } = calculateDates(newEventDate, newBookingType);

    // CRITICAL: Verify availability one more time (prevent race conditions)
    const { data: conflictCheck } = await supabase
      .from('bookings')
      .select('id')
      .eq('unit_id', booking.unit_id)
      .neq('id', bookingId)
      .not('status', 'in', '("cancelled","pending")')
      .or(`delivery_date.lte.${pickupDate},pickup_date.gte.${deliveryDate}`)
      .limit(1);

    if (conflictCheck && conflictCheck.length > 0) {
      return NextResponse.json(
        { error: 'Sorry, this date is no longer available. Please choose another date.' },
        { status: 409 }
      );
    }

    // Check blackout dates
    const { data: blackoutCheck } = await supabase
      .from('blackout_dates')
      .select('date')
      .gte('date', deliveryDate)
      .lte('date', pickupDate)
      .limit(1);

    if (blackoutCheck && blackoutCheck.length > 0) {
      return NextResponse.json(
        { error: 'This date falls on a blackout period. Please choose another date.' },
        { status: 409 }
      );
    }

    // Store original date for logging
    const originalEventDate = booking.event_date;

    // Update the booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        event_date: newEventDate,
        delivery_date: deliveryDate,
        pickup_date: pickupDate,
        booking_type: newBookingType,
        delivery_window: deliveryWindow || booking.delivery_window,
        pickup_window: pickupWindow || booking.pickup_window,
        // Clear pending cancellation status if it was set
        status: booking.status === 'pending_cancellation' ? 'confirmed' : booking.status,
        internal_notes: `Rescheduled on ${new Date().toLocaleDateString()} from ${originalEventDate} to ${newEventDate}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      
      // Check for exclusion constraint violation (double booking)
      if (updateError.code === '23P01' || updateError.message?.includes('exclusion')) {
        return NextResponse.json(
          { error: 'This date was just booked by someone else. Please choose another date.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to reschedule booking' },
        { status: 500 }
      );
    }

    // If there was a pending cancellation request, mark it as resolved
    await supabase
      .from('cancellation_requests')
      .update({
        status: 'resolved',
        admin_notes: `Customer rescheduled to ${newEventDate}`,
        reviewed_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    // Send confirmation email
    if (customer?.email) {
      await sendRescheduleConfirmationEmail({
        customerEmail: customer.email,
        customerFirstName: customer.first_name || 'there',
        bookingNumber: booking.booking_number,
        productName: (booking.product_snapshot as { name?: string })?.name || 'Bounce House',
        eventDate: formatDate(originalEventDate),
        newEventDate: formatDate(newEventDate),
        newDeliveryWindow: deliveryWindow || booking.delivery_window,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking rescheduled successfully!',
      booking: {
        id: booking.id,
        bookingNumber: booking.booking_number,
        previousEventDate: originalEventDate,
        newEventDate: newEventDate,
        newEventDateFormatted: formatDate(newEventDate),
        deliveryDate,
        pickupDate,
        bookingType: newBookingType,
      },
    });

  } catch (error) {
    console.error('Error processing reschedule:', error);
    return NextResponse.json(
      { error: 'Failed to process reschedule' },
      { status: 500 }
    );
  }
}
