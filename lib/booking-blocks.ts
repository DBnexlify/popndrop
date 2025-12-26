// =============================================================================
// BOOKING BLOCKS SYSTEM - Utility Functions
// lib/booking-blocks.ts
// 
// PURPOSE: Interface with the ops resource scheduling system
// 
// ARCHITECTURE:
//   - Assets (bounce houses, party house) are blocked for FULL rental period
//   - Ops resources (crews) are blocked for DELIVERY and PICKUP legs only
//   - This allows multiple bookings when you have multiple crews
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import type { 
  AvailableSlot, 
  DayRentalAvailability, 
  Product,
  ProductSlot,
  SchedulingMode,
} from '@/lib/database-types';

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

/** Minimum hours from now to delivery start */
export const LEAD_TIME_HOURS = 18;

/** Eastern timezone for all date/time calculations */
export const EASTERN_TZ = 'America/New_York';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SlotAvailabilityResult {
  slots: AvailableSlot[];
  error?: string;
}

export interface DayRentalAvailabilityResult {
  isAvailable: boolean;
  unavailableReason: string | null;
  unitId: string | null;
  serviceStart: string | null;
  serviceEnd: string | null;
  sameDayPickupPossible: boolean;
  deliveryCrewId: string | null;
  pickupCrewId: string | null;
  error?: string;
}

export interface BookingBlocksInput {
  bookingId: string;
  unitId: string;
  productId: string;
  eventStart: string;  // ISO timestamp
  eventEnd: string;    // ISO timestamp
  deliveryCrewId?: string | null;
  pickupCrewId?: string | null;
}

export interface OpsResource {
  id: string;
  name: string;
  resourceType: 'delivery_crew' | 'vehicle';
  isActive: boolean;
  color: string;
  notes: string | null;
}

// -----------------------------------------------------------------------------
// GET PRODUCT WITH SCHEDULING INFO
// -----------------------------------------------------------------------------

/**
 * Get product with scheduling configuration
 */
export async function getProductWithScheduling(slug: string): Promise<{
  product: Product | null;
  error?: string;
}> {
  const supabase = createServerClient();
  
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !product) {
    return { product: null, error: 'Product not found' };
  }

  return { product: product as Product };
}

// -----------------------------------------------------------------------------
// SLOT-BASED AVAILABILITY (Party House)
// -----------------------------------------------------------------------------

/**
 * Get available time slots for a slot-based product on a specific date
 * Uses the database function get_available_slots_for_date()
 * 
 * This checks BOTH:
 * 1. Asset availability (is the Party House unit free?)
 * 2. Ops capacity (is ANY crew available for delivery AND pickup?)
 */
export async function getAvailableSlotsForDate(
  productId: string,
  date: string,  // YYYY-MM-DD
  leadTimeHours: number = LEAD_TIME_HOURS
): Promise<SlotAvailabilityResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .rpc('get_available_slots_for_date', {
      p_product_id: productId,
      p_date: date,
      p_lead_time_hours: leadTimeHours,
    });

  if (error) {
    console.error('[BookingBlocks] Error getting slots:', error);
    return { 
      slots: [], 
      error: 'Failed to check slot availability' 
    };
  }

  return { slots: data || [] };
}

/**
 * Get a specific slot by ID
 */
export async function getSlotById(slotId: string): Promise<ProductSlot | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('product_slots')
    .select('*')
    .eq('id', slotId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProductSlot;
}

/**
 * Validate that a slot is available for booking
 */
export async function validateSlotAvailability(
  productId: string,
  slotId: string,
  date: string
): Promise<{
  valid: boolean;
  slot?: AvailableSlot;
  error?: string;
}> {
  const { slots, error } = await getAvailableSlotsForDate(productId, date);

  if (error) {
    return { valid: false, error };
  }

  const slot = slots.find(s => s.slot_id === slotId);

  if (!slot) {
    return { valid: false, error: 'Slot not found for this date' };
  }

  if (!slot.is_available) {
    return { 
      valid: false, 
      error: slot.unavailable_reason || 'Slot is not available' 
    };
  }

  return { valid: true, slot };
}

// -----------------------------------------------------------------------------
// DAY RENTAL AVAILABILITY (Bounce Houses)
// -----------------------------------------------------------------------------

/**
 * Check availability for a day rental product
 * Uses the database function check_day_rental_availability()
 * 
 * This checks:
 * 1. Asset availability (is a bounce house unit free?)
 * 2. Ops capacity for delivery leg (is ANY crew available?)
 * 3. Ops capacity for pickup leg (is ANY crew available?)
 * 
 * Returns the assigned crew IDs for booking block creation
 */
export async function checkDayRentalAvailability(
  productId: string,
  deliveryDate: string,  // YYYY-MM-DD
  pickupDate: string,    // YYYY-MM-DD
  leadTimeHours: number = LEAD_TIME_HOURS
): Promise<DayRentalAvailabilityResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .rpc('check_day_rental_availability', {
      p_product_id: productId,
      p_delivery_date: deliveryDate,
      p_pickup_date: pickupDate,
      p_lead_time_hours: leadTimeHours,
    });

  if (error) {
    console.error('[BookingBlocks] Error checking day rental:', error);
    return {
      isAvailable: false,
      unavailableReason: 'Failed to check availability',
      unitId: null,
      serviceStart: null,
      serviceEnd: null,
      sameDayPickupPossible: false,
      deliveryCrewId: null,
      pickupCrewId: null,
      error: 'Failed to check availability',
    };
  }

  // RPC returns array, get first result
  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    return {
      isAvailable: false,
      unavailableReason: 'No availability data returned',
      unitId: null,
      serviceStart: null,
      serviceEnd: null,
      sameDayPickupPossible: false,
      deliveryCrewId: null,
      pickupCrewId: null,
    };
  }

  return {
    isAvailable: result.is_available,
    unavailableReason: result.unavailable_reason,
    unitId: result.unit_id,
    serviceStart: result.service_start,
    serviceEnd: result.service_end,
    sameDayPickupPossible: result.same_day_pickup_possible,
    deliveryCrewId: result.delivery_crew_id,
    pickupCrewId: result.pickup_crew_id,
  };
}

/**
 * Determine if same-day pickup is possible for a day rental
 * This depends on ops capacity in the evening (6-8 PM)
 */
export async function canHaveSameDayPickup(
  deliveryDate: string
): Promise<boolean> {
  const supabase = createServerClient();

  // Check if any crew is available for evening pickup (6-8 PM)
  const pickupStart = `${deliveryDate}T18:00:00-05:00`;
  const pickupEnd = `${deliveryDate}T20:30:00-05:00`; // Include travel buffer

  const { data, error } = await supabase
    .rpc('count_available_ops_resources', {
      p_resource_type: 'delivery_crew',
      p_start_ts: pickupStart,
      p_end_ts: pickupEnd,
    });

  if (error) {
    console.error('[BookingBlocks] Error checking same-day pickup:', error);
    return false;
  }

  return (data || 0) > 0;
}

// -----------------------------------------------------------------------------
// CREATE BOOKING BLOCKS
// -----------------------------------------------------------------------------

/**
 * Create booking blocks after a booking is created
 * Uses the database function create_booking_blocks()
 * 
 * Creates:
 * 1. ASSET block (full service window) - reserves the bounce house/party house
 * 2. OPS delivery_leg block - reserves crew for delivery + setup
 * 3. OPS pickup_leg block - reserves crew for teardown + pickup
 * 
 * The ops blocks are ONLY for the delivery/pickup portions, not the full rental.
 * This is what enables scaling - with 2 crews, you can have overlapping events!
 */
export async function createBookingBlocks(
  input: BookingBlocksInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  const { error } = await supabase
    .rpc('create_booking_blocks', {
      p_booking_id: input.bookingId,
      p_unit_id: input.unitId,
      p_product_id: input.productId,
      p_event_start: input.eventStart,
      p_event_end: input.eventEnd,
      p_delivery_crew_id: input.deliveryCrewId || null,
      p_pickup_crew_id: input.pickupCrewId || null,
    });

  if (error) {
    console.error('[BookingBlocks] Error creating blocks:', error);
    
    // Check for specific error types
    if (error.message?.includes('exclusion') || error.message?.includes('conflict')) {
      return { 
        success: false, 
        error: 'Someone just booked this slot! Please choose another time.' 
      };
    }
    
    return { success: false, error: 'Failed to create booking blocks' };
  }

  return { success: true };
}

// -----------------------------------------------------------------------------
// OPS RESOURCE MANAGEMENT
// -----------------------------------------------------------------------------

/**
 * Get all ops resources (for admin dashboard)
 */
export async function getOpsResources(): Promise<OpsResource[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('ops_resources')
    .select('*')
    .order('resource_type', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[BookingBlocks] Error getting ops resources:', error);
    return [];
  }

  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    resourceType: r.resource_type as 'delivery_crew' | 'vehicle',
    isActive: r.is_active,
    color: r.color,
    notes: r.notes,
  }));
}

/**
 * Count available ops resources for a time window
 */
export async function countAvailableOpsResources(
  resourceType: 'delivery_crew' | 'vehicle',
  startTs: string,
  endTs: string
): Promise<number> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .rpc('count_available_ops_resources', {
      p_resource_type: resourceType,
      p_start_ts: startTs,
      p_end_ts: endTs,
    });

  if (error) {
    console.error('[BookingBlocks] Error counting resources:', error);
    return 0;
  }

  return data || 0;
}

// -----------------------------------------------------------------------------
// LEAD TIME VALIDATION
// -----------------------------------------------------------------------------

/**
 * Validate that a booking meets the minimum lead time requirement
 * Lead time is measured from NOW to the service start time
 */
export function validateLeadTime(
  serviceStartTime: string | Date,
  leadTimeHours: number = LEAD_TIME_HOURS
): { valid: boolean; error?: string } {
  const now = new Date();
  const serviceStart = new Date(serviceStartTime);
  
  const hoursUntilService = (serviceStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilService < leadTimeHours) {
    return {
      valid: false,
      error: `Bookings require at least ${leadTimeHours} hours advance notice. Please choose a later date or time.`,
    };
  }

  return { valid: true };
}

// -----------------------------------------------------------------------------
// DATE/TIME HELPERS
// -----------------------------------------------------------------------------

/**
 * Convert a local time slot to a full timestamp for a given date
 */
export function slotToTimestamp(
  date: string,           // YYYY-MM-DD
  timeLocal: string,      // HH:MM:SS
  timezone: string = EASTERN_TZ
): string {
  // Create the timestamp in Eastern time
  const dateTime = new Date(`${date}T${timeLocal}`);
  
  // Format as ISO string (will be in local time, then converted by Supabase)
  return dateTime.toISOString();
}

/**
 * Calculate event timestamps from a slot and date
 */
export function calculateEventTimesFromSlot(
  date: string,           // YYYY-MM-DD
  slot: ProductSlot | AvailableSlot
): { eventStart: string; eventEnd: string } {
  // If it's an AvailableSlot, it already has the timestamps
  if ('event_start' in slot && slot.event_start) {
    return {
      eventStart: slot.event_start,
      eventEnd: slot.event_end,
    };
  }

  // Otherwise calculate from local times
  const startTime = 'start_time_local' in slot ? slot.start_time_local : '';
  const endTime = 'end_time_local' in slot ? slot.end_time_local : '';

  return {
    eventStart: slotToTimestamp(date, startTime),
    eventEnd: slotToTimestamp(date, endTime),
  };
}

/**
 * Calculate event timestamps for a day rental
 * Day rentals run from delivery (9 AM) to pickup (6 PM same day or 10 AM next day)
 */
export function calculateEventTimesForDayRental(
  deliveryDate: string,   // YYYY-MM-DD
  pickupDate: string,     // YYYY-MM-DD
  sameDayPickup: boolean
): { eventStart: string; eventEnd: string } {
  // Event starts at 9 AM on delivery date
  const eventStart = `${deliveryDate}T09:00:00`;
  
  // Event ends at 6 PM same day or 10 AM next day
  const eventEnd = sameDayPickup 
    ? `${deliveryDate}T18:00:00`
    : `${pickupDate}T10:00:00`;

  return {
    eventStart: slotToTimestamp(deliveryDate, '09:00:00'),
    eventEnd: slotToTimestamp(sameDayPickup ? deliveryDate : pickupDate, sameDayPickup ? '18:00:00' : '10:00:00'),
  };
}

// -----------------------------------------------------------------------------
// HELPER: GET BLOCKED DATES FOR CALENDAR
// -----------------------------------------------------------------------------

/**
 * Get blocked dates for a product using the new booking blocks system
 * This is used by the availability API for the calendar view
 */
export async function getBlockedDatesForProduct(
  productId: string,
  fromDate: string,
  toDate: string
): Promise<string[]> {
  const supabase = createServerClient();

  // Use the v2 function that checks booking blocks
  const { data, error } = await supabase
    .rpc('get_blocked_dates_for_product_v2', {
      p_product_id: productId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

  if (error) {
    console.error('[BookingBlocks] Error getting blocked dates:', error);
    return [];
  }

  return (data || []).map((d: { blocked_date: string }) => d.blocked_date);
}

// -----------------------------------------------------------------------------
// HELPER: DETERMINE SCHEDULING MODE
// -----------------------------------------------------------------------------

/**
 * Check if a product uses slot-based scheduling
 */
export function isSlotBasedProduct(product: Product): boolean {
  return product.scheduling_mode === 'slot_based';
}

/**
 * Check if a product uses day rental scheduling
 */
export function isDayRentalProduct(product: Product): boolean {
  return product.scheduling_mode === 'day_rental' || !product.scheduling_mode;
}

// -----------------------------------------------------------------------------
// ADMIN: GET BOOKING BLOCKS FOR A BOOKING
// -----------------------------------------------------------------------------

/**
 * Get all booking blocks for a specific booking (for admin calendar)
 */
export async function getBookingBlocksForBooking(bookingId: string): Promise<{
  assetBlock: { start: string; end: string } | null;
  deliveryLeg: { start: string; end: string; crewId: string } | null;
  pickupLeg: { start: string; end: string; crewId: string } | null;
}> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('booking_blocks')
    .select('*')
    .eq('booking_id', bookingId);

  if (error || !data) {
    return { assetBlock: null, deliveryLeg: null, pickupLeg: null };
  }

  const assetBlock = data.find(b => b.block_type === 'full_rental');
  const deliveryLeg = data.find(b => b.block_type === 'delivery_leg');
  const pickupLeg = data.find(b => b.block_type === 'pickup_leg');

  return {
    assetBlock: assetBlock ? { start: assetBlock.start_ts, end: assetBlock.end_ts } : null,
    deliveryLeg: deliveryLeg ? { 
      start: deliveryLeg.start_ts, 
      end: deliveryLeg.end_ts, 
      crewId: deliveryLeg.resource_id 
    } : null,
    pickupLeg: pickupLeg ? { 
      start: pickupLeg.start_ts, 
      end: pickupLeg.end_ts, 
      crewId: pickupLeg.resource_id 
    } : null,
  };
}
