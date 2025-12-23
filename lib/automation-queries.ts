// =============================================================================
// AUTOMATION QUERIES
// lib/automation-queries.ts
// Database queries for automation dashboard components
// =============================================================================

import { createServerClient } from './supabase';
import type {
  AttentionItem,
  AttentionItemWithBooking,
  BookingNeedingAttention,
  AutomationDashboardStats,
} from './automation-types';

// =============================================================================
// ATTENTION ITEMS QUERIES
// =============================================================================

/**
 * Get all pending attention items with full booking details
 */
export async function getPendingAttentionItemsWithBookings(): Promise<AttentionItemWithBooking[]> {
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
    console.error('Error fetching attention items:', error);
    throw error;
  }
  
  return (data || []) as AttentionItemWithBooking[];
}

/**
 * Get attention items for a specific booking
 */
export async function getAttentionItemsForBooking(
  bookingId: string
): Promise<AttentionItem[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('attention_items')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching booking attention items:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get count of attention items by status
 */
export async function getAttentionItemCounts(): Promise<{
  pending: number;
  inProgress: number;
  resolved: number;
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}> {
  const supabase = createServerClient();
  
  // Get all attention items with status and priority
  const { data, error } = await supabase
    .from('attention_items')
    .select('status, priority');
  
  if (error) {
    console.error('Error fetching attention counts:', error);
    return {
      pending: 0,
      inProgress: 0,
      resolved: 0,
      byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
    };
  }
  
  const counts = {
    pending: 0,
    inProgress: 0,
    resolved: 0,
    byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
  };
  
  data?.forEach((item: { status: string; priority: string }) => {
    // Count by status
    if (item.status === 'pending') counts.pending++;
    else if (item.status === 'in_progress') counts.inProgress++;
    else if (item.status === 'resolved') counts.resolved++;
    
    // Count pending items by priority
    if (item.status === 'pending') {
      const priority = item.priority as keyof typeof counts.byPriority;
      if (priority in counts.byPriority) {
        counts.byPriority[priority]++;
      }
    }
  });
  
  return counts;
}

// =============================================================================
// AUTOMATION STATS QUERIES
// =============================================================================

/**
 * Get automation dashboard statistics
 */
export async function getAutomationDashboardStats(): Promise<AutomationDashboardStats> {
  const supabase = createServerClient();
  
  // Get pending attention items count
  const { count: pendingCount } = await supabase
    .from('attention_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  // Get urgent items count
  const { count: urgentCount } = await supabase
    .from('attention_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('priority', 'urgent');
  
  // Get auto-completed today count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: autoCompletedCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('auto_completed', true)
    .gte('auto_completed_at', today.toISOString());
  
  // Get bookings needing action (from view)
  const { count: needingActionCount } = await supabase
    .from('bookings_needing_attention')
    .select('*', { count: 'exact', head: true });
  
  return {
    pendingAttentionItems: pendingCount ?? 0,
    urgentItems: urgentCount ?? 0,
    autoCompletedToday: autoCompletedCount ?? 0,
    bookingsNeedingAction: needingActionCount ?? 0,
  };
}

// =============================================================================
// BOOKINGS NEEDING ATTENTION
// =============================================================================

/**
 * Get bookings that need attention (from database view)
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

// =============================================================================
// AUTOMATION LOG QUERIES
// =============================================================================

/**
 * Get recent automation log entries
 */
export async function getRecentAutomationLog(
  limit: number = 50
): Promise<{
  id: string;
  booking_id: string | null;
  booking_number: string | null;
  action_type: string;
  action_details: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('automation_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching automation log:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get automation log for a specific booking
 */
export async function getBookingAutomationLog(
  bookingId: string
): Promise<{
  id: string;
  action_type: string;
  action_details: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('automation_log')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching booking automation log:', error);
    return [];
  }
  
  return data || [];
}

// =============================================================================
// AUTO-COMPLETED BOOKINGS
// =============================================================================

interface AutoCompletedBookingRow {
  id: string;
  booking_number: string;
  auto_completed_at: string | null;
  auto_completed_reason: string | null;
  customer: { first_name: string; last_name: string }[] | null;
  product_snapshot: { name?: string } | null;
}

/**
 * Get recently auto-completed bookings
 */
export async function getRecentAutoCompletedBookings(
  limit: number = 10
): Promise<{
  id: string;
  booking_number: string;
  auto_completed_at: string;
  auto_completed_reason: string;
  customer_name: string;
  product_name: string;
}[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      auto_completed_at,
      auto_completed_reason,
      customer:customers (first_name, last_name),
      product_snapshot
    `)
    .eq('auto_completed', true)
    .not('auto_completed_at', 'is', null)
    .order('auto_completed_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching auto-completed bookings:', error);
    return [];
  }
  
  return (data || []).map((b: AutoCompletedBookingRow) => ({
    id: b.id,
    booking_number: b.booking_number,
    auto_completed_at: b.auto_completed_at!,
    auto_completed_reason: b.auto_completed_reason || 'Unknown',
    customer_name: b.customer?.[0] ? `${b.customer[0].first_name} ${b.customer[0].last_name}` : 'Unknown',
    product_name: b.product_snapshot?.name || 'Unknown',
  }));
}

// =============================================================================
// BOOKING DETAIL ENRICHMENT
// =============================================================================

/**
 * Get automation info for a single booking
 */
export async function getBookingAutomationInfo(bookingId: string): Promise<{
  needsAttention: boolean;
  attentionItems: AttentionItem[];
  automationLog: {
    action_type: string;
    action_details: Record<string, unknown>;
    success: boolean;
    created_at: string;
  }[];
  canAutoComplete: boolean;
  autoCompleteReason?: string;
} | null> {
  const supabase = createServerClient();
  
  // Get booking with automation fields
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      needs_attention,
      delivery_window_end,
      pickup_window_end,
      deposit_paid,
      balance_paid,
      balance_due,
      auto_completed,
      auto_completed_at,
      auto_completed_reason
    `)
    .eq('id', bookingId)
    .single();
  
  if (bookingError || !booking) {
    return null;
  }
  
  // Get attention items
  const { data: attentionItems } = await supabase
    .from('attention_items')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  
  // Get automation log
  const { data: automationLog } = await supabase
    .from('automation_log')
    .select('action_type, action_details, success, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Determine if booking can auto-complete
  let canAutoComplete = false;
  let autoCompleteReason: string | undefined;
  
  const isPaidInFull = (booking.deposit_paid && booking.balance_paid) ||
                       (booking.deposit_paid && booking.balance_due === 0);
  
  if (['delivered', 'picked_up'].includes(booking.status) && isPaidInFull) {
    if (booking.pickup_window_end) {
      const windowEnd = new Date(booking.pickup_window_end);
      const now = new Date();
      canAutoComplete = now > windowEnd;
      autoCompleteReason = canAutoComplete 
        ? 'Ready for auto-completion (paid in full, window passed)'
        : 'Waiting for pickup window to pass';
    }
  } else if (!isPaidInFull) {
    autoCompleteReason = 'Cannot auto-complete: payment not complete';
  } else {
    autoCompleteReason = `Cannot auto-complete: booking in ${booking.status} status`;
  }
  
  return {
    needsAttention: booking.needs_attention || (attentionItems?.some((i: AttentionItem) => i.status === 'pending') ?? false),
    attentionItems: attentionItems || [],
    automationLog: automationLog || [],
    canAutoComplete,
    autoCompleteReason,
  };
}
