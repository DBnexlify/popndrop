import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/bookings/availability?productSlug=glitch-combo
 * 
 * Returns:
 * - unavailableDates: All dates where no units are available
 * - totalUnits: Total number of units for this product
 * - availableUnitsCount: Number of units currently available (not in maintenance/retired)
 * 
 * A date is unavailable if:
 * - All units of that product are booked (delivery_date to pickup_date range)
 * - There's a blackout date (global, product-level, or unit-level)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productSlug = searchParams.get('productSlug');
  
  // Support legacy parameter name too
  const legacyRentalId = searchParams.get('rentalId');
  const slug = productSlug || legacyRentalId;

  if (!slug) {
    return NextResponse.json(
      { error: 'productSlug is required', unavailableDates: [], totalUnits: 0 },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get the product first
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { error: 'Product not found', unavailableDates: [], totalUnits: 0 },
      { status: 404 }
    );
  }

  // Get unit counts for this product
  const { data: allUnits } = await supabase
    .from('units')
    .select('id, status')
    .eq('product_id', product.id);

  const totalUnits = allUnits?.length || 0;
  const availableUnitsCount = allUnits?.filter(u => u.status === 'available').length || 0;

  const today = new Date();
  const sixMonthsOut = new Date();
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);

  const todayStr = today.toISOString().split('T')[0];
  const sixMonthsStr = sixMonthsOut.toISOString().split('T')[0];

  // Use the database function to get blocked dates
  // Parameters use p_ prefix (p_product_id, p_from_date, p_to_date)
  const { data: blockedDates, error: blockedError } = await supabase
    .rpc('get_blocked_dates_for_product', {
      p_product_id: product.id,
      p_from_date: todayStr,
      p_to_date: sixMonthsStr,
    });

  if (blockedError) {
    console.error('Error fetching blocked dates:', blockedError);
    
    // Fallback: manually query bookings and blackouts
    return await getFallbackUnavailableDates(
      supabase, 
      product.id, 
      todayStr, 
      sixMonthsStr,
      totalUnits,
      availableUnitsCount
    );
  }

  return NextResponse.json({
    unavailableDates: (blockedDates || []).map((d: { blocked_date: string }) => d.blocked_date),
    totalUnits,
    availableUnitsCount,
  });
}

/**
 * Fallback method if the RPC function fails
 */
async function getFallbackUnavailableDates(
  supabase: ReturnType<typeof createServerClient>,
  productId: string,
  fromDate: string,
  toDate: string,
  totalUnits: number,
  availableUnitsCount: number
) {
  const unavailableDates: Set<string> = new Set();

  // 1. Get all units for this product
  const { data: units } = await supabase
    .from('units')
    .select('id')
    .eq('product_id', productId)
    .eq('status', 'available');

  const unitIds = units?.map(u => u.id) || [];

  if (unitIds.length === 0) {
    // No available units = all dates blocked
    return NextResponse.json({
      unavailableDates: [],
      totalUnits,
      availableUnitsCount,
      error: 'No units available for this product',
    });
  }

  // 2. Get all bookings for these units
  const { data: bookings } = await supabase
    .from('bookings')
    .select('delivery_date, pickup_date, unit_id')
    .in('unit_id', unitIds)
    .gte('pickup_date', fromDate)
    .lte('delivery_date', toDate)
    .in('status', ['pending', 'confirmed', 'delivered']);

  // For each date in range, check if ALL units are booked
  if (bookings && bookings.length > 0) {
    // Group bookings by unit
    const bookingsByUnit: Map<string, Array<{ start: Date; end: Date }>> = new Map();
    
    for (const booking of bookings) {
      const unitBookings = bookingsByUnit.get(booking.unit_id) || [];
      unitBookings.push({
        start: new Date(booking.delivery_date + 'T00:00:00'),
        end: new Date(booking.pickup_date + 'T23:59:59'),
      });
      bookingsByUnit.set(booking.unit_id, unitBookings);
    }

    // Check each date in the range
    const checkDate = new Date(fromDate + 'T12:00:00');
    const endDate = new Date(toDate + 'T12:00:00');

    while (checkDate <= endDate) {
      const dateStr = checkDate.toISOString().split('T')[0];
      
      // Count how many units are available on this date
      let availableOnDate = 0;
      
      for (const unitId of unitIds) {
        const unitBookings = bookingsByUnit.get(unitId) || [];
        const isBooked = unitBookings.some(
          b => checkDate >= b.start && checkDate <= b.end
        );
        if (!isBooked) {
          availableOnDate++;
        }
      }

      // If no units available, date is blocked
      if (availableOnDate === 0) {
        unavailableDates.add(dateStr);
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }
  }

  // 3. Get blackout dates
  const { data: blackouts } = await supabase
    .from('blackout_dates')
    .select('date, scope, product_id, unit_id')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (blackouts) {
    for (const blackout of blackouts) {
      // Global blackouts always apply
      if (blackout.scope === 'global') {
        unavailableDates.add(blackout.date);
      }
      // Product-level blackouts
      else if (blackout.scope === 'product' && blackout.product_id === productId) {
        unavailableDates.add(blackout.date);
      }
      // Unit-level blackouts (only if it blocks ALL units)
      else if (blackout.scope === 'unit' && blackout.unit_id && unitIds.includes(blackout.unit_id)) {
        if (unitIds.length === 1) {
          unavailableDates.add(blackout.date);
        }
      }
    }
  }

  return NextResponse.json({
    unavailableDates: Array.from(unavailableDates).sort(),
    totalUnits,
    availableUnitsCount,
  });
}
