// =============================================================================
// BOOKING CUTOFF SYSTEM
// lib/booking-cutoff.ts
// 
// Implements lead time restrictions for bookings.
// Customers cannot book for the next day if it's past the cutoff time.
// =============================================================================

import { EASTERN_TIMEZONE } from './timezone';

// =============================================================================
// CUTOFF CONFIGURATION
// =============================================================================

/**
 * Booking cutoff configuration
 * 
 * RULE: Customers cannot book for tomorrow if it's past 12 PM (noon) Eastern Time.
 * This gives the business adequate time to prepare equipment and schedule deliveries.
 * 
 * Change these values in ONE place if the business needs to adjust.
 */
export const BOOKING_CUTOFF = {
  /** Hour of the day (24-hour format) when cutoff occurs */
  hour: 12, // 12 PM (noon)
  
  /** Minute of the hour (usually 0) */
  minute: 0,
  
  /** Business timezone - all cutoff calculations use this */
  timezone: EASTERN_TIMEZONE, // 'America/New_York'
  
  /** Human-readable time for display */
  displayTime: '12 PM',
  
  /** Minimum days notice required after cutoff */
  minDaysAfterCutoff: 2, // If past cutoff, earliest available is day after tomorrow
} as const;

// =============================================================================
// CUTOFF CHECK FUNCTIONS
// =============================================================================

/**
 * Get the current time in Eastern timezone
 * Returns an object with hour, minute, and full date info
 */
export function getCurrentTimeET(): {
  hour: number;
  minute: number;
  date: Date;
  dateString: string; // YYYY-MM-DD
} {
  const now = new Date();
  
  // Get current time parts in Eastern timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_CUTOFF.timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  
  // Get today's date in Eastern timezone as YYYY-MM-DD
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_CUTOFF.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateString = dateFormatter.format(now);
  
  return { hour, minute, date: now, dateString };
}

/**
 * Check if we're currently past the booking cutoff time
 * @returns true if current Eastern time is >= 12:00 PM
 */
export function isPastCutoffTime(): boolean {
  const { hour, minute } = getCurrentTimeET();
  
  // Past cutoff if hour is greater, or hour is equal and minute is >= cutoff minute
  if (hour > BOOKING_CUTOFF.hour) return true;
  if (hour === BOOKING_CUTOFF.hour && minute >= BOOKING_CUTOFF.minute) return true;
  
  return false;
}

/**
 * Get tomorrow's date in Eastern timezone as YYYY-MM-DD
 */
export function getTomorrowDateET(): string {
  const { dateString } = getCurrentTimeET();
  const today = new Date(dateString + 'T12:00:00');
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
}

/**
 * Get the earliest bookable date based on cutoff rules
 * 
 * LOGIC:
 * - Before 12 PM: Tomorrow is available (subject to other rules)
 * - At/After 12 PM: Day after tomorrow is the earliest
 * 
 * @returns Date string in YYYY-MM-DD format
 */
export function getEarliestBookableDate(): string {
  const { dateString } = getCurrentTimeET();
  const today = new Date(dateString + 'T12:00:00');
  
  if (isPastCutoffTime()) {
    // Past cutoff: earliest is day after tomorrow
    today.setDate(today.getDate() + 2);
  } else {
    // Before cutoff: earliest is tomorrow
    today.setDate(today.getDate() + 1);
  }
  
  return today.toISOString().split('T')[0];
}

/**
 * Check if a specific date is blocked by the cutoff rule
 * 
 * @param dateStr - Date to check in YYYY-MM-DD format
 * @returns true if the date cannot be booked due to cutoff
 */
export function isDateBlockedByCutoff(dateStr: string): boolean {
  const { dateString: todayStr } = getCurrentTimeET();
  const today = new Date(todayStr + 'T12:00:00');
  const checkDate = new Date(dateStr + 'T12:00:00');
  
  // Calculate days from today
  const diffTime = checkDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // Today is always blocked (same-day bookings not allowed)
  if (diffDays <= 0) return true;
  
  // Tomorrow is blocked if past cutoff
  if (diffDays === 1 && isPastCutoffTime()) return true;
  
  return false;
}

/**
 * Check if a date is valid for booking (passes cutoff check)
 * This is the inverse of isDateBlockedByCutoff for semantic clarity
 * 
 * @param dateStr - Date to check in YYYY-MM-DD format
 * @returns true if the date can be booked (passes cutoff rule)
 */
export function isDateValidForBooking(dateStr: string): boolean {
  return !isDateBlockedByCutoff(dateStr);
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface CutoffValidationResult {
  valid: boolean;
  reason?: string;
  earliestAvailable?: string;
  isPastCutoff?: boolean;
}

/**
 * Validate a booking date against cutoff rules
 * Returns detailed information for error messages
 * 
 * @param dateStr - Event date in YYYY-MM-DD format
 * @returns Validation result with reason if invalid
 */
export function validateBookingDateCutoff(dateStr: string): CutoffValidationResult {
  const { dateString: todayStr } = getCurrentTimeET();
  const today = new Date(todayStr + 'T12:00:00');
  const eventDate = new Date(dateStr + 'T12:00:00');
  
  // Calculate days from today
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const earliestAvailable = getEarliestBookableDate();
  const pastCutoff = isPastCutoffTime();
  
  // Past dates
  if (diffDays < 0) {
    return {
      valid: false,
      reason: 'This date is in the past.',
      earliestAvailable,
      isPastCutoff: pastCutoff,
    };
  }
  
  // Same day (today)
  if (diffDays === 0) {
    return {
      valid: false,
      reason: 'Same-day bookings are not available. We need time to prepare your rental!',
      earliestAvailable,
      isPastCutoff: pastCutoff,
    };
  }
  
  // Tomorrow but past cutoff
  if (diffDays === 1 && pastCutoff) {
    return {
      valid: false,
      reason: `Bookings for tomorrow must be made by ${BOOKING_CUTOFF.displayTime} the day before. Need it sooner? Give us a call!`,
      earliestAvailable,
      isPastCutoff: true,
    };
  }
  
  // Valid date
  return {
    valid: true,
    isPastCutoff: pastCutoff,
  };
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get user-friendly messaging about the cutoff rule
 */
export function getCutoffMessage(): {
  short: string;
  full: string;
  contactNudge: string;
} {
  return {
    short: `Orders must be placed by ${BOOKING_CUTOFF.displayTime} the day before.`,
    full: `To ensure we can properly prepare and deliver your rental, bookings must be made by ${BOOKING_CUTOFF.displayTime} the day before your event.`,
    contactNudge: `Need it sooner? Give us a call or text and we'll see what we can do!`,
  };
}

/**
 * Check if we should show the cutoff warning
 * (Show when it's getting close to cutoff time on any given day)
 * 
 * @returns true if within 2 hours of cutoff time
 */
export function shouldShowCutoffWarning(): boolean {
  const { hour } = getCurrentTimeET();
  
  // Show warning between 10 AM and 12 PM (2 hours before cutoff)
  return hour >= (BOOKING_CUTOFF.hour - 2) && hour < BOOKING_CUTOFF.hour;
}

/**
 * Get time remaining until cutoff (for countdown displays)
 * @returns Minutes until cutoff, or null if past cutoff
 */
export function getMinutesUntilCutoff(): number | null {
  if (isPastCutoffTime()) return null;
  
  const { hour, minute } = getCurrentTimeET();
  const currentMinutes = hour * 60 + minute;
  const cutoffMinutes = BOOKING_CUTOFF.hour * 60 + BOOKING_CUTOFF.minute;
  
  return cutoffMinutes - currentMinutes;
}

// =============================================================================
// DATE GENERATION FOR CALENDAR
// =============================================================================

/**
 * Get all dates blocked by cutoff within a date range
 * Used by the calendar component to mark unavailable dates
 * 
 * @param startDate - Start of range (YYYY-MM-DD)
 * @param endDate - End of range (YYYY-MM-DD)
 * @returns Array of blocked date strings
 */
export function getCutoffBlockedDates(startDate: string, endDate: string): string[] {
  const blocked: string[] = [];
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (isDateBlockedByCutoff(dateStr)) {
      blocked.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return blocked;
}
