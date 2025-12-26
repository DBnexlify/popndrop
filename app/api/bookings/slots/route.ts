// =============================================================================
// SLOTS AVAILABILITY API
// app/api/bookings/slots/route.ts
// Get available time slots for slot-based products (Party House)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { 
  getAvailableSlotsForDate, 
  LEAD_TIME_HOURS,
  isSlotBasedProduct,
} from '@/lib/booking-blocks';

/**
 * GET /api/bookings/slots?productSlug=blackout-party-house&date=2024-12-28
 * 
 * Returns available time slots for a slot-based product on a specific date
 * 
 * Response:
 * {
 *   slots: [
 *     {
 *       slot_id: "uuid",
 *       label: "3 PM – 7 PM",
 *       start_time_local: "15:00:00",
 *       end_time_local: "19:00:00",
 *       event_start: "2024-12-28T15:00:00-05:00",
 *       event_end: "2024-12-28T19:00:00-05:00",
 *       service_start: "2024-12-28T13:45:00-05:00",
 *       service_end: "2024-12-28T21:15:00-05:00",
 *       is_available: true,
 *       unavailable_reason: null
 *     },
 *     ...
 *   ],
 *   productName: "Blackout Party House",
 *   schedulingMode: "slot_based",
 *   date: "2024-12-28"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get('productSlug');
    const date = searchParams.get('date');

    // Validate required parameters
    if (!productSlug) {
      return NextResponse.json(
        { error: 'productSlug is required', slots: [] },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'date is required (YYYY-MM-DD format)', slots: [] },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD', slots: [] },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, scheduling_mode')
      .eq('slug', productSlug)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found', slots: [] },
        { status: 404 }
      );
    }

    // Check if product is slot-based
    if (!isSlotBasedProduct(product as any)) {
      return NextResponse.json(
        { 
          error: 'This product does not use time slots. Use the standard availability endpoint.',
          schedulingMode: product.scheduling_mode || 'day_rental',
          slots: [] 
        },
        { status: 400 }
      );
    }

    // Get available slots for the date
    const { slots, error } = await getAvailableSlotsForDate(
      product.id,
      date,
      LEAD_TIME_HOURS
    );

    if (error) {
      return NextResponse.json(
        { error, slots: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      slots,
      productName: product.name,
      productId: product.id,
      schedulingMode: product.scheduling_mode,
      date,
      leadTimeHours: LEAD_TIME_HOURS,
    });

  } catch (error) {
    console.error('[Slots API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', slots: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/slots/validate
 * 
 * Validate that a specific slot is still available before proceeding to checkout
 * This prevents race conditions where a slot becomes unavailable during form completion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productSlug, slotId, date } = body;

    // Validate required parameters
    if (!productSlug || !slotId || !date) {
      return NextResponse.json(
        { valid: false, error: 'productSlug, slotId, and date are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, scheduling_mode')
      .eq('slug', productSlug)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { valid: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get available slots and check if the requested slot is available
    const { slots, error } = await getAvailableSlotsForDate(
      product.id,
      date,
      LEAD_TIME_HOURS
    );

    if (error) {
      return NextResponse.json(
        { valid: false, error },
        { status: 500 }
      );
    }

    const slot = slots.find(s => s.slot_id === slotId);

    if (!slot) {
      return NextResponse.json({
        valid: false,
        error: 'Slot not found for this date',
      });
    }

    if (!slot.is_available) {
      return NextResponse.json({
        valid: false,
        error: slot.unavailable_reason || 'This time slot is no longer available',
        reason: slot.unavailable_reason,
      });
    }

    return NextResponse.json({
      valid: true,
      slot,
      productId: product.id,
      productName: product.name,
    });

  } catch (error) {
    console.error('[Slots Validate API] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
