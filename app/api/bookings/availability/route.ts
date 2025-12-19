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
      unavailableDates.push(booking.event_date);
      
      // If weekend booking, also block the next day (Sunday)
      if (booking.booking_type === 'weekend') {
        const eventDate = new Date(booking.event_date);
        const nextDay = new Date(eventDate);
        nextDay.setDate(nextDay.getDate() + 1);
        unavailableDates.push(nextDay.toISOString().split('T')[0]);
      }
    }
  }

  return NextResponse.json({
    unavailableDates: [...new Set(unavailableDates)],
  });
}