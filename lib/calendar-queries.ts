// =============================================================================
// CALENDAR QUERIES (Server-only)
// lib/calendar-queries.ts
// Data fetching for the admin smart calendar
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import type { BlackoutDate } from '@/lib/database-types';
import type { CalendarEvent, CalendarData } from '@/lib/calendar-types';

// Re-export types for convenience
export type { CalendarEvent, CalendarData } from '@/lib/calendar-types';
export { getCalendarStatusConfig } from '@/lib/calendar-types';

// -----------------------------------------------------------------------------
// MAIN QUERY
// -----------------------------------------------------------------------------

/**
 * Get all calendar events for a given month
 * Includes bookings and blackout dates
 * Fetches a few days before/after to show overflow from adjacent months
 */
export async function getCalendarEvents(
  year: number,
  month: number // 0-indexed (0 = January)
): Promise<CalendarData> {
  const supabase = createServerClient();

  // Calculate date range with buffer for multi-day events
  const startDate = new Date(year, month - 1, -6); // 7 days before month start
  const endDate = new Date(year, month + 1, 7); // 7 days after month end

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Calculate month boundaries for stats
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // Fetch bookings and blackout dates in parallel
  const [bookingsResult, blackoutResult, statsResult] = await Promise.all([
    // Bookings that overlap with our date range
    supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name, phone),
        unit:units(
          unit_number,
          product:products(name, slug)
        )
      `)
      .or(`and(delivery_date.lte.${endStr},pickup_date.gte.${startStr})`)
      .neq('status', 'cancelled'), // Include all except cancelled in main view

    // Blackout dates that overlap with our date range
    supabase
      .from('blackout_dates')
      .select(`
        *,
        product:products(name),
        unit:units(unit_number, product:products(name))
      `)
      .or(`and(start_date.lte.${endStr},end_date.gte.${startStr})`),

    // Stats for the visible month
    supabase
      .from('bookings')
      .select('status, subtotal')
      .gte('event_date', monthStart)
      .lte('event_date', monthEnd),
  ]);

  // Also get cancelled bookings separately for the stats
  const { data: cancelledData } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'cancelled')
    .gte('event_date', monthStart)
    .lte('event_date', monthEnd);

  const events: CalendarEvent[] = [];

  // Transform bookings into calendar events
  if (bookingsResult.data) {
    for (const booking of bookingsResult.data) {
      const customer = booking.customer as { first_name: string; last_name: string; phone: string } | null;
      const unit = booking.unit as { unit_number: number; product: { name: string; slug: string } | null } | null;

      events.push({
        id: booking.id,
        type: 'booking',
        status: booking.status,
        startDate: booking.delivery_date,
        endDate: booking.pickup_date,
        title: unit?.product?.name || 'Unknown Product',
        subtitle: customer ? `${customer.first_name} ${customer.last_name}` : undefined,
        bookingNumber: booking.booking_number,
        customerName: customer ? `${customer.first_name} ${customer.last_name}` : undefined,
        customerPhone: customer?.phone,
        productName: unit?.product?.name,
        unitNumber: unit?.unit_number,
        deliveryAddress: `${booking.delivery_address}, ${booking.delivery_city}`,
        balanceDue: booking.balance_due,
        balancePaid: booking.balance_paid,
      });
    }
  }

  // Transform blackout dates into calendar events
  if (blackoutResult.data) {
    for (const blackout of blackoutResult.data) {
      const product = blackout.product as { name: string } | null;
      const unit = blackout.unit as { unit_number: number; product: { name: string } | null } | null;

      let title = 'All Units Blocked';
      if (unit) {
        title = `${unit.product?.name || 'Unit'} #${unit.unit_number} Blocked`;
      } else if (product) {
        title = `${product.name} Blocked`;
      }

      events.push({
        id: blackout.id,
        type: 'blackout',
        status: 'blackout',
        startDate: blackout.start_date,
        endDate: blackout.end_date,
        title,
        reason: blackout.reason || undefined,
      });
    }
  }

  // Calculate stats
  const statsData = statsResult.data || [];
  const monthStats = {
    totalBookings: statsData.filter(b => b.status !== 'cancelled').length,
    totalRevenue: statsData
      .filter(b => ['confirmed', 'delivered', 'picked_up', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.subtotal || 0), 0),
    blockedDays: calculateBlockedDays(blackoutResult.data || [], monthStart, monthEnd),
    completedBookings: statsData.filter(b => b.status === 'completed').length,
    cancelledBookings: cancelledData?.length || 0,
  };

  return { events, monthStats };
}

/**
 * Calculate number of unique blocked days in a month
 */
function calculateBlockedDays(
  blackoutDates: BlackoutDate[],
  monthStart: string,
  monthEnd: string
): number {
  const blockedDays = new Set<string>();

  for (const blackout of blackoutDates) {
    const start = new Date(Math.max(
      new Date(blackout.start_date + 'T12:00:00').getTime(),
      new Date(monthStart + 'T12:00:00').getTime()
    ));
    const end = new Date(Math.min(
      new Date(blackout.end_date + 'T12:00:00').getTime(),
      new Date(monthEnd + 'T12:00:00').getTime()
    ));

    const current = new Date(start);
    while (current <= end) {
      blockedDays.add(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  }

  return blockedDays.size;
}
