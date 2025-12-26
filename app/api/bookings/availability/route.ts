import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isSlotBasedProduct } from '@/lib/booking-blocks';

/**
 * GET /api/bookings/availability?productSlug=glitch-combo
 * 
 * Returns:
 * - unavailableDates: All dates where no units are available
 * - totalUnits: Total number of units for this product
 * - availableUnitsCount: Number of units currently available (not in maintenance/retired)
 * - schedulingMode: 'slot_based' or 'day_rental'
 * 
 * For slot_based products, use /api/bookings/slots instead to get specific time slots.
 * 
 * A date is unavailable if:
 * - All units of that product are booked (via booking_blocks)
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

  // Get the product first (with scheduling mode)
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, scheduling_mode')
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

  // Check if product is slot-based
  const isSlotBased = product.scheduling_mode === 'slot_based';

  // For slot-based products, we recommend using the /slots endpoint
  // But we still return blocked dates for the calendar
  if (isSlotBased) {
    // Use the v2 function that checks booking_blocks
    const { data: blockedDates, error: blockedError } = await supabase
      .rpc('get_blocked_dates_for_product_v2', {
        p_product_id: product.id,
        p_from_date: todayStr,
        p_to_date: sixMonthsStr,
      });

    if (blockedError) {
      console.error('Error fetching blocked dates (v2):', blockedError);
      // Fall back to v1
      return await getFallbackBlockedDates(
        supabase,
        product.id,
        todayStr,
        sixMonthsStr,
        totalUnits,
        availableUnitsCount,
        isSlotBased
      );
    }

    return NextResponse.json({
      unavailableDates: (blockedDates || []).map((d: { blocked_date: string }) => d.blocked_date),
      totalUnits,
      availableUnitsCount,
      schedulingMode: product.scheduling_mode || 'day_rental',
      isSlotBased: true,
      note: 'For slot-based products, use /api/bookings/slots to get available time slots for a specific date',
    });
  }

  // For day rental products, use the v2 function
  const { data: blockedDates, error: blockedError } = await supabase
    .rpc('get_blocked_dates_for_product_v2', {
      p_product_id: product.id,
      p_from_date: todayStr,
      p_to_date: sixMonthsStr,
    });

  if (blockedError) {
    console.error('Error fetching blocked dates (v2):', blockedError);
    
    // Try the v1 function as fallback
    const { data: blockedDatesV1, error: blockedErrorV1 } = await supabase
      .rpc('get_blocked_dates_for_product', {
        p_product_id: product.id,
        p_from_date: todayStr,
        p_to_date: sixMonthsStr,
      });

    if (blockedErrorV1) {
      console.error('Error fetching blocked dates (v1):', blockedErrorV1);
      return await getFallbackBlockedDates(
        supabase,
        product.id,
        todayStr,
        sixMonthsStr,
        totalUnits,
        availableUnitsCount,
        false
      );
    }

    return NextResponse.json({
      unavailableDates: (blockedDatesV1 || []).map((d: { blocked_date: string }) => d.blocked_date),
      totalUnits,
      availableUnitsCount,
      schedulingMode: product.scheduling_mode || 'day_rental',
    });
  }

  return NextResponse.json({
    unavailableDates: (blockedDates || []).map((d: { blocked_date: string }) => d.blocked_date),
    totalUnits,
    availableUnitsCount,
    schedulingMode: product.scheduling_mode || 'day_rental',
  });
}

/**
 * Fallback method if the RPC functions fail
 */
async function getFallbackBlockedDates(
  supabase: ReturnType<typeof createServerClient>,
  productId: string,
  fromDate: string,
  toDate: string,
  totalUnits: number,
  availableUnitsCount: number,
  isSlotBased: boolean
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
    return NextResponse.json({
      unavailableDates: [],
      totalUnits,
      availableUnitsCount,
      schedulingMode: isSlotBased ? 'slot_based' : 'day_rental',
      error: 'No units available for this product',
    });
  }

  // 2. Get all booking blocks for these units
  const { data: blocks } = await supabase
    .from('booking_blocks')
    .select('resource_id, start_ts, end_ts')
    .eq('resource_type', 'asset')
    .in('resource_id', unitIds);

  // Group blocks by unit and extract dates
  if (blocks && blocks.length > 0) {
    const blocksByUnit: Map<string, Array<{ start: Date; end: Date }>> = new Map();
    
    for (const block of blocks) {
      const unitBlocks = blocksByUnit.get(block.resource_id) || [];
      unitBlocks.push({
        start: new Date(block.start_ts),
        end: new Date(block.end_ts),
      });
      blocksByUnit.set(block.resource_id, unitBlocks);
    }

    // Check each date in the range
    const checkDate = new Date(fromDate + 'T12:00:00');
    const endDate = new Date(toDate + 'T12:00:00');

    while (checkDate <= endDate) {
      const dateStr = checkDate.toISOString().split('T')[0];
      
      // Count how many units are available on this date
      let availableOnDate = 0;
      
      for (const unitId of unitIds) {
        const unitBlocks = blocksByUnit.get(unitId) || [];
        const isBooked = unitBlocks.some(
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
    .select('start_date, end_date, product_id, unit_id')
    .or(`product_id.is.null,product_id.eq.${productId}`)
    .lte('start_date', toDate)
    .gte('end_date', fromDate);

  if (blackouts) {
    for (const blackout of blackouts) {
      // Generate all dates in the blackout range
      const start = new Date(blackout.start_date + 'T12:00:00');
      const end = new Date(blackout.end_date + 'T12:00:00');
      const current = new Date(start);
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        
        // Check if this blackout applies
        const isGlobal = !blackout.product_id && !blackout.unit_id;
        const isProductLevel = blackout.product_id === productId && !blackout.unit_id;
        const isUnitLevel = blackout.unit_id && unitIds.includes(blackout.unit_id);
        
        if (isGlobal || isProductLevel || (isUnitLevel && unitIds.length === 1)) {
          unavailableDates.add(dateStr);
        }
        
        current.setDate(current.getDate() + 1);
      }
    }
  }

  return NextResponse.json({
    unavailableDates: Array.from(unavailableDates).sort(),
    totalUnits,
    availableUnitsCount,
    schedulingMode: isSlotBased ? 'slot_based' : 'day_rental',
  });
}
