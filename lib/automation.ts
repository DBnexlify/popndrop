// =============================================================================
// BOOKING AUTOMATION LOGIC
// lib/automation.ts
// Core business logic for smart status automation
// =============================================================================

import { createServerClient } from './supabase';
import type { BookingStatus } from './database-types';
import type {
  AttentionType,
  AttentionPriority,
  AttentionItem,
  AttentionItemInsert,
  BookingNeedingAttention,
  AutomationCheckResult,
  AutomationLogInsert,
} from './automation-types';
import { generateSuggestedActions as genActions } from './automation-types';

// =============================================================================
// CONSTANTS
// =============================================================================

// Grace periods before automation triggers (in hours)
const DELIVERY_GRACE_PERIOD_HOURS = 2;  // Wait 2 hours after delivery window
const PICKUP_GRACE_PERIOD_HOURS = 4;    // Wait 4 hours after pickup window
const AUTO_COMPLETE_GRACE_PERIOD_HOURS = 4; // Wait 4 hours before auto-completing

// =============================================================================
// WINDOW TIME CALCULATIONS
// =============================================================================

interface WindowTimes {
  start: number;  // Hour in 24h format
  end: number;    // Hour in 24h format
}

const DELIVERY_WINDOWS: Record<string, WindowTimes> = {
  'morning': { start: 8, end: 11 },
  'midday': { start: 11, end: 14 },
  'afternoon': { start: 14, end: 17 },
  'saturday-evening': { start: 17, end: 19 },
};

const PICKUP_WINDOWS: Record<string, WindowTimes> = {
  'evening': { start: 18, end: 20 },
  'next-morning': { start: 8, end: 10 },
  'monday-morning': { start: 8, end: 10 },
  'monday-afternoon': { start: 14, end: 17 },
};

/**
 * Calculate the actual end datetime for a delivery window
 */
export function calculateDeliveryWindowEnd(
  deliveryDate: string,
  deliveryWindow: string
): Date {
  const window = DELIVERY_WINDOWS[deliveryWindow];
  const endHour = window?.end ?? 17; // Default to 5 PM
  
  // Create date in Eastern timezone
  const date = new Date(deliveryDate + 'T12:00:00');
  date.setHours(endHour, 0, 0, 0);
  
  return date;
}

/**
 * Calculate the actual end datetime for a pickup window
 */
export function calculatePickupWindowEnd(
  pickupDate: string,
  pickupWindow: string
): Date {
  const window = PICKUP_WINDOWS[pickupWindow];
  const endHour = window?.end ?? 20; // Default to 8 PM
  
  // Create date in Eastern timezone
  const date = new Date(pickupDate + 'T12:00:00');
  date.setHours(endHour, 0, 0, 0);
  
  return date;
}

/**
 * Check if a window has passed (with optional grace period)
 */
export function hasWindowPassed(
  windowEnd: Date | string,
  gracePeriodHours: number = 0
): boolean {
  const windowEndDate = typeof windowEnd === 'string' ? new Date(windowEnd) : windowEnd;
  const now = new Date();
  const graceMs = gracePeriodHours * 60 * 60 * 1000;
  
  return now.getTime() > (windowEndDate.getTime() + graceMs);
}

// =============================================================================
// GET BOOKINGS NEEDING ATTENTION
// =============================================================================

/**
 * Fetch all bookings that need admin attention
 * Uses the database function for optimal performance
 */
export async function getBookingsNeedingAttention(): Promise<BookingNeedingAttention[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('bookings_needing_attention')
    .select('*');
  
  if (error) {
    console.error('Error fetching bookings needing attention:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Check a single booking's automation status
 */
export async function checkBookingAutomationStatus(
  bookingId: string
): Promise<AutomationCheckResult | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .rpc('check_booking_automation_status', { booking_uuid: bookingId });
  
  if (error) {
    console.error('Error checking booking automation status:', error);
    throw error;
  }
  
  return data;
}

// =============================================================================
// ATTENTION ITEM MANAGEMENT
// =============================================================================

/**
 * Create a new attention item for a booking
 */
export async function createAttentionItem(
  bookingId: string,
  type: AttentionType,
  options: {
    title: string;
    description?: string;
    priority?: AttentionPriority;
    isPaidInFull?: boolean;
    balanceDue?: number;
  }
): Promise<AttentionItem | null> {
  const supabase = createServerClient();
  
  // Generate suggested actions based on type and payment status
  const suggestedActions = genActions(
    type,
    options.isPaidInFull ?? false,
    options.balanceDue ?? 0
  );
  
  const insert: AttentionItemInsert = {
    booking_id: bookingId,
    attention_type: type,
    priority: options.priority ?? 'medium',
    title: options.title,
    description: options.description ?? null,
    suggested_actions: suggestedActions,
    is_automated: true,
  };
  
  // Use upsert to avoid duplicates (constraint: unique_pending_attention)
  const { data, error } = await supabase
    .from('attention_items')
    .upsert(insert, {
      onConflict: 'booking_id,attention_type,status',
      ignoreDuplicates: true,
    })
    .select()
    .single();
  
  if (error) {
    // Ignore duplicate errors
    if (error.code === '23505') {
      console.log('Attention item already exists for this booking/type');
      return null;
    }
    console.error('Error creating attention item:', error);
    throw error;
  }
  
  // Log the automation action
  await logAutomationAction({
    booking_id: bookingId,
    action_type: 'create_attention',
    action_details: {
      attention_type: type,
      priority: options.priority ?? 'medium',
      title: options.title,
    },
    success: true,
  });
  
  return data;
}

/**
 * Resolve an attention item
 */
export async function resolveAttentionItem(
  itemId: string,
  options: {
    resolvedBy: string;
    resolutionAction: string;
    resolutionNotes?: string;
  }
): Promise<boolean> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('attention_items')
    .update({
      status: 'resolved',
      resolved_by: options.resolvedBy,
      resolved_at: new Date().toISOString(),
      resolution_action: options.resolutionAction,
      resolution_notes: options.resolutionNotes ?? null,
    })
    .eq('id', itemId);
  
  if (error) {
    console.error('Error resolving attention item:', error);
    return false;
  }
  
  return true;
}

/**
 * Dismiss an attention item
 */
export async function dismissAttentionItem(
  itemId: string,
  dismissedBy: string,
  reason?: string
): Promise<boolean> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('attention_items')
    .update({
      status: 'dismissed',
      resolved_by: dismissedBy,
      resolved_at: new Date().toISOString(),
      resolution_notes: reason ?? 'Dismissed by admin',
    })
    .eq('id', itemId);
  
  if (error) {
    console.error('Error dismissing attention item:', error);
    return false;
  }
  
  return true;
}

/**
 * Get all pending attention items for the dashboard
 */
export async function getPendingAttentionItems(): Promise<AttentionItem[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('attention_items')
    .select(`
      *,
      booking:bookings (
        booking_number,
        status,
        event_date,
        delivery_date,
        pickup_date,
        delivery_window,
        pickup_window,
        subtotal,
        deposit_paid,
        balance_paid,
        balance_due,
        customer:customers (
          first_name,
          last_name,
          phone,
          email
        ),
        product_snapshot
      )
    `)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching pending attention items:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get attention item count by priority
 */
export async function getAttentionItemCounts(): Promise<{
  total: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('attention_items')
    .select('priority')
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error fetching attention item counts:', error);
    return { total: 0, urgent: 0, high: 0, medium: 0, low: 0 };
  }
  
  const counts = {
    total: data?.length ?? 0,
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  data?.forEach((item: { priority: string }) => {
    const priority = item.priority as 'urgent' | 'high' | 'medium' | 'low';
    if (priority in counts) {
      counts[priority]++;
    }
  });
  
  return counts;
}

// =============================================================================
// AUTO-COMPLETION LOGIC
// =============================================================================

/**
 * Determine if a booking can be auto-completed
 */
export function canAutoComplete(booking: {
  status: string;
  deposit_paid: boolean;
  balance_paid: boolean;
  balance_due: number;
  pickup_window_end?: string | null;
}): { canComplete: boolean; reason: string } {
  // Must be in delivered or picked_up status
  if (!['delivered', 'picked_up'].includes(booking.status)) {
    return {
      canComplete: false,
      reason: `Cannot auto-complete booking in ${booking.status} status`,
    };
  }
  
  // Must be fully paid
  const isPaidInFull = (booking.deposit_paid && booking.balance_paid) ||
                       (booking.deposit_paid && booking.balance_due === 0);
  
  if (!isPaidInFull) {
    return {
      canComplete: false,
      reason: 'Balance not fully paid',
    };
  }
  
  // Pickup window must have passed (with grace period)
  if (booking.pickup_window_end) {
    if (!hasWindowPassed(booking.pickup_window_end, AUTO_COMPLETE_GRACE_PERIOD_HOURS)) {
      return {
        canComplete: false,
        reason: 'Pickup window has not passed yet',
      };
    }
  }
  
  return {
    canComplete: true,
    reason: 'All conditions met for auto-completion',
  };
}

/**
 * Auto-complete a booking
 */
export async function autoCompleteBooking(
  bookingId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  // First get the booking to verify it can be auto-completed
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('booking_number, status, deposit_paid, balance_paid, balance_due, pickup_window_end')
    .eq('id', bookingId)
    .single();
  
  if (fetchError || !booking) {
    return { success: false, error: 'Booking not found' };
  }
  
  // Verify conditions
  const { canComplete, reason: checkReason } = canAutoComplete(booking);
  
  if (!canComplete) {
    // Log the failed attempt
    await logAutomationAction({
      booking_id: bookingId,
      booking_number: booking.booking_number,
      action_type: 'auto_complete_failed',
      action_details: { reason: checkReason },
      success: false,
      error_message: checkReason,
    });
    
    return { success: false, error: checkReason };
  }
  
  // Update the booking
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'completed' as BookingStatus,
      completed_at: new Date().toISOString(),
      auto_completed: true,
      auto_completed_at: new Date().toISOString(),
      auto_completed_reason: reason,
      last_automation_check: new Date().toISOString(),
    })
    .eq('id', bookingId);
  
  if (updateError) {
    await logAutomationAction({
      booking_id: bookingId,
      booking_number: booking.booking_number,
      action_type: 'auto_complete_failed',
      action_details: { reason: 'Database update failed' },
      success: false,
      error_message: updateError.message,
    });
    
    return { success: false, error: updateError.message };
  }
  
  // Log successful auto-completion
  await logAutomationAction({
    booking_id: bookingId,
    booking_number: booking.booking_number,
    action_type: 'auto_complete',
    action_details: {
      previous_status: booking.status,
      new_status: 'completed',
      reason,
    },
    success: true,
  });
  
  // Resolve any pending attention items for this booking
  await supabase
    .from('attention_items')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_action: 'auto_completed',
      resolution_notes: reason,
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending');
  
  return { success: true };
}

// =============================================================================
// STATUS UPDATE WITH AUTOMATION
// =============================================================================

/**
 * Update booking status and handle related automation
 */
export async function updateBookingStatusWithAutomation(
  bookingId: string,
  newStatus: BookingStatus,
  options: {
    updatedBy?: string;
    notes?: string;
    resolveAttention?: boolean;
    attentionItemId?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  // Build update object based on status
  const updateData: Record<string, unknown> = {
    status: newStatus,
    last_automation_check: new Date().toISOString(),
  };
  
  // Add timestamp based on status
  switch (newStatus) {
    case 'confirmed':
      updateData.confirmed_at = new Date().toISOString();
      break;
    case 'delivered':
      updateData.delivered_at = new Date().toISOString();
      if (options.updatedBy) updateData.delivered_by = options.updatedBy;
      break;
    case 'picked_up':
      updateData.picked_up_at = new Date().toISOString();
      if (options.updatedBy) updateData.picked_up_by = options.updatedBy;
      break;
    case 'completed':
      updateData.completed_at = new Date().toISOString();
      break;
    case 'cancelled':
      updateData.cancelled_at = new Date().toISOString();
      if (options.notes) updateData.cancellation_reason = options.notes;
      break;
  }
  
  // Update booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select('booking_number')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Resolve attention item if specified
  if (options.resolveAttention && options.attentionItemId && options.updatedBy) {
    await resolveAttentionItem(options.attentionItemId, {
      resolvedBy: options.updatedBy,
      resolutionAction: `status_changed_to_${newStatus}`,
      resolutionNotes: options.notes,
    });
  }
  
  // Log the status change
  await logAutomationAction({
    booking_id: bookingId,
    booking_number: booking?.booking_number,
    action_type: 'status_update',
    action_details: {
      new_status: newStatus,
      updated_by: options.updatedBy ?? 'system',
      notes: options.notes,
    },
    success: true,
  });
  
  return { success: true };
}

// =============================================================================
// AUTOMATION LOG
// =============================================================================

/**
 * Log an automation action
 */
export async function logAutomationAction(
  log: AutomationLogInsert
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('automation_log')
    .insert(log);
  
  if (error) {
    console.error('Error logging automation action:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Get automation log for a booking
 */
export async function getAutomationLogForBooking(
  bookingId: string
): Promise<AutomationLogInsert[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('automation_log')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching automation log:', error);
    return [];
  }
  
  return data || [];
}

// =============================================================================
// CRON JOB: PROCESS AUTOMATION
// =============================================================================

/**
 * Main automation processor - run this on a schedule
 * Checks all bookings and creates attention items or auto-completes as needed
 */
export async function processBookingAutomation(): Promise<{
  processed: number;
  attentionCreated: number;
  autoCompleted: number;
  errors: number;
}> {
  const stats = {
    processed: 0,
    attentionCreated: 0,
    autoCompleted: 0,
    errors: 0,
  };
  
  try {
    // Get all bookings needing attention
    const bookings = await getBookingsNeedingAttention();
    
    for (const booking of bookings) {
      stats.processed++;
      
      try {
        // Determine if we should auto-complete or create attention item
        const isPaidInFull = booking.deposit_paid && 
          (booking.balance_paid || booking.balance_due === 0);
        
        if (booking.can_auto_complete && isPaidInFull) {
          // Auto-complete the booking
          const result = await autoCompleteBooking(
            booking.booking_id,
            `Auto-completed: ${booking.action_reason} (paid in full)`
          );
          
          if (result.success) {
            stats.autoCompleted++;
          } else {
            stats.errors++;
          }
        } else {
          // Create attention item
          const priority: AttentionPriority = isPaidInFull ? 'low' : 'medium';
          
          const result = await createAttentionItem(
            booking.booking_id,
            booking.action_type as AttentionType,
            {
              title: `${booking.booking_number}: ${booking.action_reason}`,
              description: `${booking.product_name} for ${booking.customer_name}`,
              priority,
              isPaidInFull,
              balanceDue: booking.balance_due,
            }
          );
          
          if (result) {
            stats.attentionCreated++;
          }
        }
      } catch (err) {
        console.error(`Error processing booking ${booking.booking_number}:`, err);
        stats.errors++;
      }
    }
  } catch (err) {
    console.error('Error in automation processor:', err);
    stats.errors++;
  }
  
  // Log the automation run
  await logAutomationAction({
    action_type: 'automation_run',
    action_details: stats,
    success: stats.errors === 0,
  });
  
  return stats;
}

// =============================================================================
// MARK BOOKING FOR ATTENTION (Manual)
// =============================================================================

/**
 * Manually flag a booking for attention
 */
export async function flagBookingForAttention(
  bookingId: string,
  options: {
    reason: string;
    priority: AttentionPriority;
    flaggedBy: string;
  }
): Promise<AttentionItem | null> {
  return createAttentionItem(bookingId, 'manual_review', {
    title: options.reason,
    description: `Flagged by admin`,
    priority: options.priority,
  });
}
