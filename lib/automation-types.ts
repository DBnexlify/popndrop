// =============================================================================
// BOOKING AUTOMATION TYPES
// lib/automation-types.ts
// Types for the smart status automation system
// =============================================================================

// =============================================================================
// ENUMS (matching PostgreSQL custom types)
// =============================================================================

export type AttentionType =
  | 'delivery_confirmation'    // Was this delivered?
  | 'pickup_confirmation'      // Was this picked up?
  | 'payment_collection'       // How was payment collected?
  | 'booking_closure'          // Ready to close booking?
  | 'issue_reported'           // Customer reported an issue
  | 'manual_review'            // Admin flagged for review
  | 'cancellation_request';    // Customer requested cancellation

export type AttentionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type AttentionStatus = 'pending' | 'in_progress' | 'resolved' | 'dismissed';

// =============================================================================
// SUGGESTED ACTION FOR ATTENTION ITEMS
// =============================================================================

export interface SuggestedAction {
  id: string;
  label: string;               // Button text
  action: string;              // Action type identifier
  variant: 'primary' | 'secondary' | 'destructive' | 'outline';
  data?: Record<string, unknown>;  // Additional data for the action
  confirmRequired?: boolean;   // Show confirmation dialog?
  confirmMessage?: string;     // Confirmation message
}

// =============================================================================
// ATTENTION ITEMS TABLE
// =============================================================================

export interface AttentionItem {
  id: string;
  booking_id: string;
  attention_type: AttentionType;
  priority: AttentionPriority;
  status: AttentionStatus;
  title: string;
  description: string | null;
  suggested_actions: SuggestedAction[];
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  resolution_action: string | null;
  is_automated: boolean;
  created_at: string;
  updated_at: string;
  // Notification fields
  viewed_at: string | null;
  snoozed_until: string | null;
}

// =============================================================================
// NOTIFICATION TYPES (from get_pending_notifications function)
// =============================================================================

export interface NotificationItem {
  id: string;
  booking_id: string;
  attention_type: AttentionType;
  priority: AttentionPriority;
  status: AttentionStatus;
  title: string;
  description: string | null;
  suggested_actions: SuggestedAction[];
  created_at: string;
  viewed_at: string | null;
  snoozed_until: string | null;
  // Joined booking data
  booking_number: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  event_date: string;
  balance_due: number;
}

export interface NotificationCounts {
  total: number;
  unviewed: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface AttentionItemInsert {
  booking_id: string;
  attention_type: AttentionType;
  priority?: AttentionPriority;
  status?: AttentionStatus;
  title: string;
  description?: string | null;
  suggested_actions?: SuggestedAction[];
  is_automated?: boolean;
}

export interface AttentionItemUpdate {
  status?: AttentionStatus;
  priority?: AttentionPriority;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  resolution_action?: string | null;
}

// Attention item with booking details for display
// Note: customer comes as array from Supabase join, product_snapshot is JSONB
export interface AttentionItemWithBooking extends AttentionItem {
  booking: {
    booking_number: string;
    status: string;
    event_date: string;
    delivery_date: string;
    pickup_date: string;
    delivery_window: string;
    pickup_window: string;
    subtotal: number;
    deposit_paid: boolean;
    balance_paid: boolean;
    balance_due: number;
    customer: {
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
    }[] | null;  // Array from Supabase join
    product_snapshot: {
      name?: string;
    } | null;
  } | null;
}

// =============================================================================
// AUTOMATION LOG TABLE
// =============================================================================

export interface AutomationLog {
  id: string;
  booking_id: string | null;
  booking_number: string | null;
  action_type: string;
  action_details: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AutomationLogInsert {
  booking_id?: string | null;
  booking_number?: string | null;
  action_type: string;
  action_details?: Record<string, unknown>;
  success?: boolean;
  error_message?: string | null;
}

// =============================================================================
// AUTOMATION CHECK RESULT (from check_booking_automation_status function)
// =============================================================================

export interface AutomationCheckResult {
  booking_id: string;
  booking_number: string;
  status: string;
  needs_action: boolean;
  action_type: AttentionType | null;
  action_reason: string | null;
  can_auto_complete: boolean;
  delivery_window_end: string | null;
  pickup_window_end: string | null;
  deposit_paid: boolean;
  balance_paid: boolean;
  balance_due: number;
  checked_at: string;
}

// =============================================================================
// BOOKINGS NEEDING ATTENTION VIEW
// =============================================================================

export interface BookingNeedingAttention {
  booking_id: string;
  booking_number: string;
  status: string;
  action_type: string;
  action_reason: string;
  can_auto_complete: boolean;
  delivery_window_end: string | null;
  pickup_window_end: string | null;
  deposit_paid: boolean;
  balance_paid: boolean;
  balance_due: number;
  customer_name: string;
  product_name: string;
  event_date: string;
}

// =============================================================================
// DASHBOARD STATS EXTENSION
// =============================================================================

export interface AutomationDashboardStats {
  pendingAttentionItems: number;
  urgentItems: number;
  autoCompletedToday: number;
  bookingsNeedingAction: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getAttentionTypeLabel(type: AttentionType): string {
  const labels: Record<AttentionType, string> = {
    delivery_confirmation: 'Confirm Delivery',
    pickup_confirmation: 'Confirm Pickup',
    payment_collection: 'Collect Payment',
    booking_closure: 'Close Booking',
    issue_reported: 'Issue Reported',
    manual_review: 'Manual Review',
    cancellation_request: 'Cancellation Request',
  };
  return labels[type];
}

export function getAttentionTypeIcon(type: AttentionType): string {
  const icons: Record<AttentionType, string> = {
    delivery_confirmation: '🚚',
    pickup_confirmation: '📦',
    payment_collection: '💰',
    booking_closure: '✅',
    issue_reported: '⚠️',
    manual_review: '👁️',
    cancellation_request: '❌',
  };
  return icons[type];
}

export function getAttentionPriorityColor(priority: AttentionPriority): string {
  const colors: Record<AttentionPriority, string> = {
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    urgent: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return colors[priority];
}

export function getAttentionStatusColor(status: AttentionStatus): string {
  const colors: Record<AttentionStatus, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    resolved: 'bg-green-500/10 text-green-400 border-green-500/30',
    dismissed: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };
  return colors[status];
}

// =============================================================================
// QUICK ACTION CONFIGURATIONS
// =============================================================================

/**
 * Generate suggested actions based on attention type and booking state
 */
export function generateSuggestedActions(
  type: AttentionType,
  isPaidInFull: boolean,
  balanceDue: number
): SuggestedAction[] {
  switch (type) {
    case 'delivery_confirmation':
      return [
        {
          id: 'mark_delivered',
          label: 'Mark Delivered',
          action: 'update_status',
          variant: 'primary',
          data: { newStatus: 'delivered' },
        },
        {
          id: 'delay_delivery',
          label: 'Delivery Delayed',
          action: 'add_note',
          variant: 'outline',
          data: { noteType: 'delivery_delay' },
        },
        {
          id: 'contact_customer',
          label: 'Contact Customer',
          action: 'contact',
          variant: 'secondary',
        },
      ];

    case 'pickup_confirmation':
      const pickupActions: SuggestedAction[] = [
        {
          id: 'mark_picked_up',
          label: 'Mark Picked Up',
          action: 'update_status',
          variant: 'primary',
          data: { newStatus: 'picked_up' },
        },
      ];
      
      if (!isPaidInFull && balanceDue > 0) {
        pickupActions.push({
          id: 'collect_cash',
          label: `Collect Cash ($${balanceDue})`,
          action: 'collect_payment',
          variant: 'secondary',
          data: { method: 'cash', amount: balanceDue },
        });
      }
      
      pickupActions.push({
        id: 'contact_customer',
        label: 'Contact Customer',
        action: 'contact',
        variant: 'outline',
      });
      
      return pickupActions;

    case 'payment_collection':
      return [
        {
          id: 'cash_collected',
          label: 'Cash Collected',
          action: 'collect_payment',
          variant: 'primary',
          data: { method: 'cash', amount: balanceDue },
        },
        {
          id: 'card_collected',
          label: 'Card Payment',
          action: 'collect_payment',
          variant: 'secondary',
          data: { method: 'card', amount: balanceDue },
        },
        {
          id: 'other_payment',
          label: 'Other',
          action: 'collect_payment',
          variant: 'outline',
          data: { method: 'other', amount: balanceDue },
        },
      ];

    case 'booking_closure':
      return [
        {
          id: 'complete_booking',
          label: 'Complete Booking',
          action: 'update_status',
          variant: 'primary',
          data: { newStatus: 'completed' },
        },
        {
          id: 'report_issue',
          label: 'Report Issue',
          action: 'create_attention',
          variant: 'destructive',
          data: { type: 'issue_reported' },
        },
      ];

    case 'issue_reported':
      return [
        {
          id: 'resolve_issue',
          label: 'Mark Resolved',
          action: 'resolve',
          variant: 'primary',
        },
        {
          id: 'escalate',
          label: 'Escalate',
          action: 'escalate',
          variant: 'destructive',
        },
      ];

    case 'manual_review':
      return [
        {
          id: 'approve',
          label: 'Approve',
          action: 'resolve',
          variant: 'primary',
        },
        {
          id: 'dismiss',
          label: 'Dismiss',
          action: 'dismiss',
          variant: 'outline',
        },
      ];

    case 'cancellation_request':
      return [
        {
          id: 'review_cancellation',
          label: 'Review Request',
          action: 'navigate',
          variant: 'primary',
          data: { destination: 'cancellations' },
        },
        {
          id: 'contact_customer',
          label: 'Contact Customer',
          action: 'contact',
          variant: 'secondary',
        },
      ];

    default:
      return [];
  }
}

// =============================================================================
// AUTOMATION RULE DEFINITIONS
// =============================================================================

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    status: string;
    condition: 'window_passed' | 'payment_received' | 'manual';
    windowType?: 'delivery' | 'pickup';
  };
  action: {
    type: 'auto_advance' | 'create_attention' | 'notify';
    targetStatus?: string;
    attentionType?: AttentionType;
    notificationMessage?: string;
  };
  conditions: {
    requireFullPayment: boolean;
    requireNoIssues: boolean;
    gracePeriodHours?: number;
  };
  enabled: boolean;
}

// Default automation rules
export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'delivery_window_passed_paid',
    name: 'Auto-advance delivery (paid in full)',
    description: 'Auto-advance to delivered when delivery window passes and fully paid',
    trigger: {
      status: 'confirmed',
      condition: 'window_passed',
      windowType: 'delivery',
    },
    action: {
      type: 'create_attention',  // Start with attention, can change to auto_advance
      attentionType: 'delivery_confirmation',
    },
    conditions: {
      requireFullPayment: true,
      requireNoIssues: true,
      gracePeriodHours: 2,  // Wait 2 hours after window end
    },
    enabled: true,
  },
  {
    id: 'delivery_window_passed_unpaid',
    name: 'Prompt for delivery (balance due)',
    description: 'Prompt admin when delivery window passes and balance is due',
    trigger: {
      status: 'confirmed',
      condition: 'window_passed',
      windowType: 'delivery',
    },
    action: {
      type: 'create_attention',
      attentionType: 'delivery_confirmation',
    },
    conditions: {
      requireFullPayment: false,
      requireNoIssues: true,
    },
    enabled: true,
  },
  {
    id: 'pickup_window_passed_paid',
    name: 'Auto-complete (paid in full)',
    description: 'Auto-complete booking when pickup window passes and fully paid',
    trigger: {
      status: 'delivered',
      condition: 'window_passed',
      windowType: 'pickup',
    },
    action: {
      type: 'auto_advance',
      targetStatus: 'completed',
    },
    conditions: {
      requireFullPayment: true,
      requireNoIssues: true,
      gracePeriodHours: 4,  // Wait 4 hours after window end
    },
    enabled: true,
  },
  {
    id: 'pickup_window_passed_unpaid',
    name: 'Prompt for pickup (balance due)',
    description: 'Prompt admin when pickup window passes and balance is due',
    trigger: {
      status: 'delivered',
      condition: 'window_passed',
      windowType: 'pickup',
    },
    action: {
      type: 'create_attention',
      attentionType: 'payment_collection',
    },
    conditions: {
      requireFullPayment: false,
      requireNoIssues: true,
    },
    enabled: true,
  },
];
