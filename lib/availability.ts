// =============================================================================
// AVAILABILITY MODULE - Soft Hold Support
// lib/availability.ts
//
// PURPOSE: Check availability with race condition prevention via soft holds
// =============================================================================

import { createServerClient } from '@/lib/supabase';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  unavailableReason: string | null;
  unitId: string | null;
  deliveryCrewId: string | null;
  pickupCrewId: string | null;
  serviceStart: string | null;
  serviceEnd: string | null;
  deliveryLegStart: string | null;
  deliveryLegEnd: string | null;
  pickupLegStart: string | null;
  pickupLegEnd: string | null;
}

export interface SoftHoldResult {
  success: boolean;
  holdId?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// CHECK AVAILABILITY WITH SOFT HOLDS
// -----------------------------------------------------------------------------

/**
 * Check availability using the enhanced function that considers:
 * 1. Committed booking_blocks from confirmed bookings
 * 2. Temporary soft_holds from in-progress checkouts
 * 3. Product-specific breakdown durations (Party House = 120 min!)
 */
export async function checkAvailabilityWithSoftHolds(
  productId: string,
  deliveryDate: string,
  pickupDate: string,
  deliveryWindow: string,
  pickupWindow: string,
  options: {
    leadTimeHours?: number;
    sessionId?: string | null;
  } = {}
): Promise<AvailabilityCheckResult> {
  const supabase = createServerClient();
  const { leadTimeHours = 18, sessionId = null } = options;

  console.log('[Availability] Checking with soft holds:', {
    productId,
    deliveryDate,
    pickupDate,
    deliveryWindow,
    pickupWindow,
    sessionId: sessionId ? sessionId.slice(0, 8) + '...' : null,
  });

  const { data, error } = await supabase.rpc('check_availability_with_soft_holds', {
    p_product_id: productId,
    p_delivery_date: deliveryDate,
    p_pickup_date: pickupDate,
    p_delivery_window: deliveryWindow,
    p_pickup_window: pickupWindow,
    p_lead_time_hours: leadTimeHours,
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[Availability] RPC error:', error);
    return {
      isAvailable: false,
      unavailableReason: 'Failed to check availability. Please try again.',
      unitId: null,
      deliveryCrewId: null,
      pickupCrewId: null,
      serviceStart: null,
      serviceEnd: null,
      deliveryLegStart: null,
      deliveryLegEnd: null,
      pickupLegStart: null,
      pickupLegEnd: null,
    };
  }

  // RPC returns array, get first result
  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    return {
      isAvailable: false,
      unavailableReason: 'No availability data returned',
      unitId: null,
      deliveryCrewId: null,
      pickupCrewId: null,
      serviceStart: null,
      serviceEnd: null,
      deliveryLegStart: null,
      deliveryLegEnd: null,
      pickupLegStart: null,
      pickupLegEnd: null,
    };
  }

  const availability: AvailabilityCheckResult = {
    isAvailable: result.is_available ?? false,
    unavailableReason: result.unavailable_reason ?? null,
    unitId: result.unit_id ?? null,
    deliveryCrewId: result.delivery_crew_id ?? null,
    pickupCrewId: result.pickup_crew_id ?? null,
    serviceStart: result.service_start ?? null,
    serviceEnd: result.service_end ?? null,
    deliveryLegStart: result.delivery_leg_start ?? null,
    deliveryLegEnd: result.delivery_leg_end ?? null,
    pickupLegStart: result.pickup_leg_start ?? null,
    pickupLegEnd: result.pickup_leg_end ?? null,
  };

  console.log('[Availability] Result:', {
    isAvailable: availability.isAvailable,
    reason: availability.unavailableReason,
    unitId: availability.unitId?.slice(0, 8),
    deliveryCrewId: availability.deliveryCrewId?.slice(0, 8),
    pickupCrewId: availability.pickupCrewId?.slice(0, 8),
  });

  return availability;
}

// -----------------------------------------------------------------------------
// SOFT HOLD MANAGEMENT
// -----------------------------------------------------------------------------

/**
 * Create a soft hold to reserve resources during checkout
 * Hold expires after 15 minutes automatically
 */
export async function createSoftHold(
  sessionId: string,
  availability: AvailabilityCheckResult
): Promise<SoftHoldResult> {
  if (!availability.isAvailable || !availability.unitId) {
    return { success: false, error: 'Cannot create hold for unavailable slot' };
  }

  if (!availability.serviceStart || !availability.serviceEnd) {
    return { success: false, error: 'Missing service time window' };
  }

  const supabase = createServerClient();

  console.log('[SoftHold] Creating hold:', {
    sessionId: sessionId.slice(0, 8) + '...',
    unitId: availability.unitId.slice(0, 8),
  });

  const { data, error } = await supabase.rpc('create_soft_hold', {
    p_session_id: sessionId,
    p_unit_id: availability.unitId,
    p_delivery_crew_id: availability.deliveryCrewId,
    p_pickup_crew_id: availability.pickupCrewId,
    p_service_start: availability.serviceStart,
    p_service_end: availability.serviceEnd,
    p_delivery_leg_start: availability.deliveryLegStart,
    p_delivery_leg_end: availability.deliveryLegEnd,
    p_pickup_leg_start: availability.pickupLegStart,
    p_pickup_leg_end: availability.pickupLegEnd,
  });

  if (error) {
    console.error('[SoftHold] Create error:', error);
    
    // Check for exclusion constraint violation (race condition)
    if (error.code === '23P01' || error.message?.includes('exclusion')) {
      return {
        success: false,
        error: 'Someone just booked this slot! Please choose another time.',
      };
    }
    
    return { success: false, error: 'Failed to reserve slot. Please try again.' };
  }

  console.log('[SoftHold] Created:', data);

  return { success: true, holdId: data };
}

/**
 * Release a soft hold (called after booking created or on timeout/abandonment)
 */
export async function releaseSoftHold(sessionId: string): Promise<boolean> {
  const supabase = createServerClient();

  console.log('[SoftHold] Releasing:', sessionId.slice(0, 8) + '...');

  const { error } = await supabase.rpc('release_soft_hold', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[SoftHold] Release error:', error);
    return false;
  }

  return true;
}

/**
 * Check if a session has an active soft hold
 */
export async function getActiveSoftHold(sessionId: string): Promise<{
  hasHold: boolean;
  expiresAt?: string;
}> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('booking_soft_holds')
    .select('id, expires_at')
    .eq('session_id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return { hasHold: false };
  }

  return { hasHold: true, expiresAt: data.expires_at };
}

// -----------------------------------------------------------------------------
// FRIENDLY ERROR MESSAGES
// -----------------------------------------------------------------------------

/**
 * Convert technical error messages to user-friendly ones
 */
export function getFriendlyUnavailableMessage(technicalReason: string | null): string {
  if (!technicalReason) {
    return 'This time slot is no longer available. Please try another.';
  }

  const friendlyMessages: Record<string, string> = {
    'No pickup crew available - another rental breakdown may be in progress':
      'Our team is handling another party at that time. Try a different pickup window!',
    'No delivery crew available for this time':
      'Our delivery team is fully booked for that time. Let\'s find another slot!',
    'No units available for these dates':
      'This rental is already booked for those dates. Check our other awesome options!',
    'Date not available':
      'We\'re not available on this date. Please choose another day.',
    'Product not found':
      'This rental is no longer available. Please refresh and try again.',
  };

  // Check for partial matches
  for (const [key, message] of Object.entries(friendlyMessages)) {
    if (technicalReason.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }

  // Check for lead time message
  if (technicalReason.includes('hours advance booking')) {
    return technicalReason; // Already user-friendly
  }

  return technicalReason;
}
