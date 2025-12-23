// =============================================================================
// TIMEZONE UTILITIES
// lib/timezone.ts
// All times display in Eastern Time (America/New_York) for Florida business
// =============================================================================

/**
 * Florida timezone - Eastern Time
 * This is the ONLY timezone used for display in the entire application
 */
export const EASTERN_TIMEZONE = 'America/New_York';

// =============================================================================
// DATE-ONLY FORMATTING (for event dates, delivery dates, etc.)
// These dates don't have a time component - just format the date nicely
// =============================================================================

/**
 * Format a date string (YYYY-MM-DD) for display
 * Use this for event_date, delivery_date, pickup_date fields
 * These are date-only fields, so we add T12:00:00 to avoid timezone shifting
 * 
 * @example formatEventDate('2024-12-25') => "Wednesday, December 25, 2024"
 */
export function formatEventDate(dateStr: string): string {
  // Add noon time to prevent date shifting across timezones
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string for short display
 * @example formatEventDateShort('2024-12-25') => "Wed, Dec 25"
 */
export function formatEventDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string for compact display
 * @example formatEventDateCompact('2024-12-25') => "Dec 25"
 */
export function formatEventDateCompact(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get day of week from a date string
 * @example getDayOfWeek('2024-12-25') => "Wed"
 */
export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'short',
  });
}

/**
 * Get day number from a date string
 * @example getDayNumber('2024-12-25') => 25
 */
export function getDayNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00');
  // Use Intl.DateTimeFormat to get the correct day in Eastern timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    day: 'numeric',
  });
  return parseInt(formatter.format(date), 10);
}

/**
 * Get month abbreviation from a date string
 * @example getMonthShort('2024-12-25') => "Dec"
 */
export function getMonthShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
  });
}

/**
 * Format a date string for short display with year
 * @example formatDateWithYear('2024-12-25') => "Dec 25, 2024"
 */
export function formatDateWithYear(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// =============================================================================
// TIMESTAMP FORMATTING (for created_at, updated_at, etc.)
// These are full ISO timestamps stored in UTC - convert to Eastern for display
// =============================================================================

/**
 * Format a UTC timestamp for display in Eastern Time
 * Use this for created_at, confirmed_at, cancelled_at, etc.
 * 
 * @example formatTimestamp('2024-12-22T05:17:00Z') => "Dec 22, 2024, 12:17 AM"
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a UTC timestamp for compact display (no year)
 * @example formatTimestampShort('2024-12-22T05:17:00Z') => "Dec 22, 12:17 AM"
 */
export function formatTimestampShort(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a UTC timestamp with full date and time
 * @example formatTimestampFull('2024-12-22T05:17:00Z') => "Sunday, December 22, 2024 at 12:17 AM EST"
 */
export function formatTimestampFull(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

/**
 * Format current time in Eastern timezone
 * @example formatCurrentTime() => "Dec 22, 2024, 12:17 AM"
 */
export function formatCurrentTime(): string {
  return formatTimestamp(new Date().toISOString());
}

/**
 * Get current date in Eastern timezone as YYYY-MM-DD
 * @example getCurrentDateET() => "2024-12-22"
 */
export function getCurrentDateET(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Format "today" string in Eastern timezone
 * @example getTodayDisplayET() => "Sunday, December 22"
 */
export function getTodayDisplayET(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// =============================================================================
// RELATIVE TIME (for "X minutes ago" displays)
// =============================================================================

/**
 * Format a timestamp as relative time
 * @example formatRelativeTime('2024-12-22T05:17:00Z') => "2 hours ago"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  // Fall back to formatted date for older timestamps
  return formatTimestampShort(isoString);
}

/**
 * Format a timestamp as compact relative time (for notifications)
 * @example formatRelativeTimeShort('2024-12-22T05:17:00Z') => "2h"
 */
export function formatRelativeTimeShort(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  // Fall back to short date
  return date.toLocaleDateString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// TIME-ONLY FORMATTING
// =============================================================================

/**
 * Format time only from a UTC timestamp
 * @example formatTimeOnly('2024-12-22T05:17:00Z') => "12:17 AM"
 */
export function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    timeZone: EASTERN_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// DATE COMPARISON UTILITIES (in Eastern timezone)
// =============================================================================

/**
 * Check if a date string is today in Eastern timezone
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getCurrentDateET();
}

/**
 * Check if a date string is tomorrow in Eastern timezone
 */
export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dateStr === tomorrowFormatter.format(tomorrow);
}

// =============================================================================
// DELIVERY/PICKUP WINDOW TIME LABELS
// Shows actual times (e.g., "8–11 AM") instead of abstract labels ("Morning")
// =============================================================================

/**
 * Get delivery window as actual time display
 * @example getDeliveryWindowLabel('morning') => "8–11 AM"
 */
export function getDeliveryWindowLabel(window: string): string {
  const labels: Record<string, string> = {
    'morning': '8–11 AM',
    'midday': '11 AM–2 PM',
    'afternoon': '2–5 PM',
    'saturday-evening': '5–7 PM',
  };
  return labels[window] || window;
}

/**
 * Get pickup window as actual time display
 * @example getPickupWindowLabel('evening') => "6–8 PM"
 */
export function getPickupWindowLabel(window: string): string {
  const labels: Record<string, string> = {
    'evening': '6–8 PM',
    'next-morning': 'By 10 AM',
    'monday-morning': 'By 10 AM',
    'monday-afternoon': '2–5 PM',
  };
  return labels[window] || window;
}

/**
 * Format any time window (delivery or pickup) as actual time
 * @example formatTimeWindow('morning') => "8–11 AM"
 */
export function formatTimeWindow(window: string): string {
  const allLabels: Record<string, string> = {
    // Delivery windows
    'morning': '8–11 AM',
    'midday': '11 AM–2 PM',
    'afternoon': '2–5 PM',
    'saturday-evening': '5–7 PM',
    // Pickup windows
    'evening': '6–8 PM',
    'next-morning': 'By 10 AM',
    'monday-morning': 'By 10 AM',
    'monday-afternoon': '2–5 PM',
  };
  return allLabels[window] || window;
}
