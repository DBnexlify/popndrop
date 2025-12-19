import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rentalId = searchParams.get('rentalId');

  if (!rentalId) {
    return NextResponse.json(
      { error: 'rentalId is required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  // Get all confirmed bookings for this rental from today onwards
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('event_date, booking_type, pickup_date')
    .eq('rental_id', rentalId)
    .gte('event_date', today)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }

  // Build list of unavailable dates
  const unavailableDates: string[] = [];

  if (bookings) {
    for (const booking of bookings) {
      const eventDate = new Date(booking.event_date + 'T12:00:00'); // Noon to avoid timezone issues
      
      // Always block the event date
      unavailableDates.push(booking.event_date);
      
      if (booking.booking_type === 'weekend') {
        // Weekend booking (Saturday start): block Saturday + Sunday
        const sunday = new Date(eventDate);
        sunday.setDate(sunday.getDate() + 1);
        unavailableDates.push(sunday.toISOString().split('T')[0]);
      } else if (booking.booking_type === 'sunday') {
        // Sunday-only booking: also block the preceding Saturday
        // (equipment is delivered Saturday evening)
        const saturday = new Date(eventDate);
        saturday.setDate(saturday.getDate() - 1);
        unavailableDates.push(saturday.toISOString().split('T')[0]);
      }
      // Daily bookings only block the event date itself (already added above)
    }
  }

  return NextResponse.json({
    unavailableDates: [...new Set(unavailableDates)],
  });
}