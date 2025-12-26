// =============================================================================
// CALENDAR TYPES & CLIENT UTILITIES
// lib/calendar-types.ts
// Shared types and client-safe utilities for the calendar
// =============================================================================

import type { BookingStatus } from '@/lib/database-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  type: 'booking' | 'blackout';
  status: BookingStatus | 'blackout';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  title: string;
  subtitle?: string;
  bookingNumber?: string;
  customerName?: string;
  customerPhone?: string;
  productName?: string;
  unitNumber?: number;
  deliveryAddress?: string;
  reason?: string; // For blackout dates
  balanceDue?: number;
  balancePaid?: boolean;
  // Slot-based booking fields (Party House)
  slotStartTime?: string; // HH:MM format (e.g., "10:00")
  slotEndTime?: string; // HH:MM format (e.g., "14:00")
  slotLabel?: string; // Display label (e.g., "Morning Session")
  isSlotBased?: boolean; // Whether this is a slot-based booking
}

export interface CalendarData {
  events: CalendarEvent[];
  monthStats: {
    totalBookings: number;
    totalRevenue: number;
    blockedDays: number;
    completedBookings: number;
    cancelledBookings: number;
  };
}

// -----------------------------------------------------------------------------
// CLIENT-SAFE HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get status display configuration
 */
export function getCalendarStatusConfig(status: BookingStatus | 'blackout') {
  const configs: Record<string, {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  }> = {
    pending: {
      label: 'Pending',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/40',
      icon: '⏳',
    },
    confirmed: {
      label: 'Confirmed',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/40',
      icon: '✓',
    },
    delivered: {
      label: 'Delivered',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/40',
      icon: '🚚',
    },
    picked_up: {
      label: 'Picked Up',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/40',
      icon: '📦',
    },
    completed: {
      label: 'Completed',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
      icon: '✅',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-500/40',
      icon: '✕',
    },
    blackout: {
      label: 'Blocked',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/20',
      borderColor: 'border-rose-500/40',
      icon: '🚫',
    },
  };

  return configs[status] || configs.pending;
}
