// =============================================================================
// NOTIFICATION PREFERENCES TYPES
// lib/notification-preferences-types.ts
// =============================================================================

export type NotificationMode = 'realtime' | 'digest' | 'custom';

export interface NotificationPreferences {
  id: string;
  admin_id: string;
  mode: NotificationMode;
  
  // Booking events
  new_booking: boolean;
  booking_cancelled: boolean;
  booking_modified: boolean;
  
  // Payment events
  payment_deposit: boolean;
  payment_full: boolean;
  payment_failed: boolean;
  refund_requested: boolean;
  refund_completed: boolean;
  
  // Operational prompts
  delivery_prompt: boolean;
  pickup_prompt: boolean;
  balance_reminder: boolean;
  auto_complete_notice: boolean;
  
  // Daily summary
  daily_summary: boolean;
  daily_summary_time: string; // TIME as string "HH:MM:SS"
  
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Default preferences (used when admin has no preferences set)
export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'admin_id' | 'created_at' | 'updated_at'> = {
  mode: 'realtime',
  
  // Booking events - all on by default
  new_booking: true,
  booking_cancelled: true,
  booking_modified: true,
  
  // Payment events - most on by default
  payment_deposit: true,
  payment_full: true,
  payment_failed: true,
  refund_requested: true,
  refund_completed: false, // Less urgent
  
  // Operational prompts - key ones on
  delivery_prompt: true,
  pickup_prompt: true,
  balance_reminder: true,
  auto_complete_notice: false, // Less urgent
  
  // Daily summary - on by default
  daily_summary: true,
  daily_summary_time: '07:00:00',
  
  // Quiet hours - off by default
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '07:00:00',
};

// Notification type to preference key mapping
export type NotificationType = 
  | 'new_booking'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'payment_deposit'
  | 'payment_full'
  | 'payment_failed'
  | 'refund_requested'
  | 'refund_completed'
  | 'delivery_prompt'
  | 'pickup_prompt'
  | 'balance_reminder'
  | 'auto_complete_notice'
  | 'daily_summary';

// Category groupings for UI
export interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  types: {
    key: NotificationType;
    label: string;
    description: string;
    urgent?: boolean; // Urgent notifications still sent in digest mode
  }[];
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'booking',
    label: 'Booking Events',
    description: 'New bookings and changes',
    types: [
      {
        key: 'new_booking',
        label: 'New Booking',
        description: 'When a new booking is placed',
      },
      {
        key: 'booking_cancelled',
        label: 'Booking Cancelled',
        description: 'When a customer cancels',
        urgent: true,
      },
      {
        key: 'booking_modified',
        label: 'Booking Modified',
        description: 'When booking details change',
      },
    ],
  },
  {
    id: 'payment',
    label: 'Payment Events',
    description: 'Deposits, payments, and refunds',
    types: [
      {
        key: 'payment_deposit',
        label: 'Deposit Received',
        description: 'When a deposit is paid',
      },
      {
        key: 'payment_full',
        label: 'Paid in Full',
        description: 'When full payment is received',
      },
      {
        key: 'payment_failed',
        label: 'Payment Failed',
        description: 'When a payment fails',
        urgent: true,
      },
      {
        key: 'refund_requested',
        label: 'Refund Requested',
        description: 'When a refund is requested',
      },
      {
        key: 'refund_completed',
        label: 'Refund Completed',
        description: 'When a refund is processed',
      },
    ],
  },
  {
    id: 'operational',
    label: 'Operational Prompts',
    description: 'Action reminders and confirmations',
    types: [
      {
        key: 'delivery_prompt',
        label: 'Delivery Confirmation',
        description: 'Remind to confirm deliveries',
      },
      {
        key: 'pickup_prompt',
        label: 'Pickup Confirmation',
        description: 'Remind to confirm pickups',
      },
      {
        key: 'balance_reminder',
        label: 'Balance Due',
        description: 'When payment is still owed',
      },
      {
        key: 'auto_complete_notice',
        label: 'Auto-Complete Notice',
        description: 'When bookings auto-complete',
      },
    ],
  },
  {
    id: 'summary',
    label: 'Daily Summary',
    description: 'Morning overview of your day',
    types: [
      {
        key: 'daily_summary',
        label: 'Daily Summary',
        description: 'Overview of deliveries, pickups, payments',
      },
    ],
  },
];

// Mode descriptions for UI
export const MODE_DESCRIPTIONS: Record<NotificationMode, { label: string; description: string }> = {
  realtime: {
    label: 'Real-time',
    description: 'Get notified instantly when events happen',
  },
  digest: {
    label: 'Daily Digest',
    description: 'One summary each morning. Only urgent alerts in real-time.',
  },
  custom: {
    label: 'Custom',
    description: 'Choose exactly which notifications you receive',
  },
};
