/**
 * Calendar Link Generators
 * Creates downloadable/clickable calendar event links for Google, Apple, Outlook, and Yahoo
 * 
 * TIMEZONE: All events are created in Eastern Time (America/New_York)
 * This ensures events appear at correct local times regardless of user's timezone
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

export interface CustomerCalendarData {
  productName: string;
  bookingNumber: string;
  eventDate: string;        // YYYY-MM-DD
  pickupDate: string;       // YYYY-MM-DD
  deliveryWindow: string;   // e.g., "9:00 AM - 11:00 AM" or "Morning (9-11 AM)"
  pickupWindow: string;
  address: string;
  city: string;
  totalPrice: number;
  balanceDue: number;
  isPaidInFull: boolean;
  notes?: string;
}

export interface OwnerCalendarData {
  productName: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  state?: string;
  zip?: string;
  unitNumber?: number;
  unitNickname?: string;
  deliveryNotes?: string;
  totalPrice: number;
  balanceDue: number;
  depositPaid: boolean;
  balancePaid: boolean;
  isPaidInFull: boolean;
  bookingType: 'daily' | 'weekend' | 'sunday';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BUSINESS_PHONE = '352-445-3723';
const BUSINESS_EMAIL = 'bookings@popndroprentals.com';
const EASTERN_TIMEZONE = 'America/New_York';

// =============================================================================
// DATE/TIME UTILITIES
// =============================================================================

/**
 * Parse time string like "9:00 AM", "9 AM", "Morning (9-11 AM)" to hours and minutes
 * Returns the START time of the window
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 };
  
  // Clean up the string
  const cleaned = timeStr.trim().toLowerCase();
  
  // Handle descriptive time windows (legacy support + fallback)
  // These match the values stored in the database
  if (cleaned.includes('8') && cleaned.includes('11')) return { hours: 8, minutes: 0 }; // 8-11 AM
  if (cleaned.includes('11') && cleaned.includes('2')) return { hours: 11, minutes: 0 }; // 11 AM-2 PM
  if (cleaned.includes('2') && cleaned.includes('5')) return { hours: 14, minutes: 0 }; // 2-5 PM
  if (cleaned.includes('5') && cleaned.includes('7')) return { hours: 17, minutes: 0 }; // 5-7 PM
  if (cleaned.includes('6') && cleaned.includes('8')) return { hours: 18, minutes: 0 }; // 6-8 PM
  if (cleaned.includes('morning')) return { hours: 8, minutes: 0 };
  if (cleaned.includes('midday')) return { hours: 11, minutes: 0 };
  if (cleaned.includes('afternoon')) return { hours: 14, minutes: 0 };
  if (cleaned.includes('evening')) return { hours: 18, minutes: 0 };
  
  // Try to find a specific time pattern like "9:00 AM", "9 AM", "9:30 am"
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return { hours: 9, minutes: 0 };
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toLowerCase();
  
  // Handle 12-hour to 24-hour conversion
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  // If no AM/PM specified, assume morning times (1-11) are AM, others PM
  if (!period) {
    if (hours >= 1 && hours <= 6) hours += 12; // Assume 1-6 without period is PM
  }
  
  return { hours, minutes };
}

/**
 * Parse a time window like "9:00 AM - 11:00 AM" and return start/end times
 */
export function parseTimeWindow(timeWindow: string): { 
  startHours: number; 
  startMinutes: number; 
  endHours: number; 
  endMinutes: number;
} {
  if (!timeWindow) {
    return { startHours: 9, startMinutes: 0, endHours: 11, endMinutes: 0 };
  }
  
  const cleaned = timeWindow.toLowerCase().trim();
  
  // Handle descriptive windows (legacy support + database values)
  // Match both new format ("8–11 AM") and legacy ("morning")
  if (cleaned.includes('8') && cleaned.includes('11')) {
    return { startHours: 8, startMinutes: 0, endHours: 11, endMinutes: 0 };
  }
  if (cleaned.includes('11') && (cleaned.includes('2') || cleaned.includes('14'))) {
    return { startHours: 11, startMinutes: 0, endHours: 14, endMinutes: 0 };
  }
  if ((cleaned.includes('2') || cleaned.includes('14')) && (cleaned.includes('5') || cleaned.includes('17'))) {
    return { startHours: 14, startMinutes: 0, endHours: 17, endMinutes: 0 };
  }
  if ((cleaned.includes('5') || cleaned.includes('17')) && (cleaned.includes('7') || cleaned.includes('19'))) {
    return { startHours: 17, startMinutes: 0, endHours: 19, endMinutes: 0 };
  }
  if ((cleaned.includes('6') || cleaned.includes('18')) && (cleaned.includes('8') || cleaned.includes('20'))) {
    return { startHours: 18, startMinutes: 0, endHours: 20, endMinutes: 0 };
  }
  if (cleaned.includes('by 10') || cleaned.includes('10 am')) {
    return { startHours: 8, startMinutes: 0, endHours: 10, endMinutes: 0 };
  }
  // Legacy fallbacks
  if (cleaned.includes('morning')) {
    return { startHours: 8, startMinutes: 0, endHours: 11, endMinutes: 0 };
  }
  if (cleaned.includes('midday')) {
    return { startHours: 11, startMinutes: 0, endHours: 14, endMinutes: 0 };
  }
  if (cleaned.includes('afternoon')) {
    return { startHours: 14, startMinutes: 0, endHours: 17, endMinutes: 0 };
  }
  if (cleaned.includes('evening')) {
    return { startHours: 18, startMinutes: 0, endHours: 20, endMinutes: 0 };
  }
  
  // Try to split by common separators
  const parts = timeWindow.split(/\s*[-–—to]\s*/i);
  
  if (parts.length >= 2) {
    const start = parseTimeString(parts[0]);
    const end = parseTimeString(parts[1]);
    return {
      startHours: start.hours,
      startMinutes: start.minutes,
      endHours: end.hours,
      endMinutes: end.minutes,
    };
  }
  
  // Single time - assume 2-hour window
  const start = parseTimeString(timeWindow);
  return {
    startHours: start.hours,
    startMinutes: start.minutes,
    endHours: start.hours + 2,
    endMinutes: start.minutes,
  };
}

/**
 * Create a Date object from a date string (YYYY-MM-DD) and time components
 * The date is interpreted as Eastern Time
 */
export function createDateTime(dateStr: string, timeStr: string): Date {
  const { hours, minutes } = parseTimeString(timeStr);
  
  // Parse the date parts
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date in local time (will be converted to UTC by the calendar functions)
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  return date;
}

/**
 * Create start and end Date objects from a date string and time window
 */
export function createDateTimeRange(dateStr: string, timeWindow: string): { start: Date; end: Date } {
  const { startHours, startMinutes, endHours, endMinutes } = parseTimeWindow(timeWindow);
  
  const [year, month, day] = dateStr.split('-').map(Number);
  
  const start = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);
  const end = new Date(year, month - 1, day, endHours, endMinutes, 0, 0);
  
  return { start, end };
}

// =============================================================================
// FORMAT UTILITIES
// =============================================================================

/**
 * Format date for Google Calendar (YYYYMMDDTHHmmssZ format in UTC)
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Format date for ICS file with timezone
 * Uses TZID format for proper timezone handling
 */
function formatICSDateWithTZ(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Format date for display in descriptions
 */
function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date short for compact displays
 */
function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/**
 * Format phone number for tel: links
 */
function formatPhoneForLink(phone: string): string {
  return phone.replace(/\D/g, '');
}

// =============================================================================
// GOOGLE CALENDAR
// =============================================================================

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    details: event.description,
    location: event.location,
    ctz: EASTERN_TIMEZONE, // Tell Google Calendar the timezone
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// =============================================================================
// ICS FILE (Apple Calendar, Outlook Desktop)
// =============================================================================

/**
 * Generate ICS file content with proper timezone handling
 */
export function generateICSContent(event: CalendarEvent): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@popndroprentals.com`;
  const now = new Date();

  // ICS content with VTIMEZONE for Eastern Time
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pop and Drop Party Rentals//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Eastern timezone definition
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:STANDARD',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    // Event
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDateWithTZ(now)}Z`,
    `DTSTART;TZID=America/New_York:${formatICSDateWithTZ(event.startDate)}`,
    `DTEND;TZID=America/New_York:${formatICSDateWithTZ(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Download ICS file (for Apple Calendar / Outlook desktop)
 */
export function downloadICSFile(event: CalendarEvent, filename: string = 'event.ics'): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// OUTLOOK WEB
// =============================================================================

/**
 * Generate Outlook.com calendar URL
 */
export function generateOutlookUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    location: event.location,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// =============================================================================
// YAHOO CALENDAR
// =============================================================================

/**
 * Generate Yahoo Calendar URL
 */
export function generateYahooCalendarUrl(event: CalendarEvent): string {
  // Yahoo uses format: YYYYMMDDTHHMMSS
  const formatYahooDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  };

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatYahooDate(event.startDate),
    et: formatYahooDate(event.endDate),
    desc: event.description,
    in_loc: event.location,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

// =============================================================================
// CUSTOMER CALENDAR EVENT BUILDER
// =============================================================================

/**
 * Build a complete calendar event for customer use
 * Used on success page and in confirmation emails
 */
export function buildCustomerCalendarEvent(data: CustomerCalendarData): CalendarEvent {
  const { start, end } = createDateTimeRange(data.eventDate, data.deliveryWindow);
  
  // Override end time with pickup date/time for multi-day events
  const pickupTime = parseTimeWindow(data.pickupWindow);
  const [pickupYear, pickupMonth, pickupDay] = data.pickupDate.split('-').map(Number);
  const endDate = new Date(
    pickupYear, 
    pickupMonth - 1, 
    pickupDay, 
    pickupTime.endHours, 
    pickupTime.endMinutes, 
    0, 
    0
  );

  // Build comprehensive description
  const paymentLine = data.isPaidInFull
    ? '✓ PAID IN FULL - Nothing due on delivery!'
    : `💰 Balance due on delivery: $${data.balanceDue}`;

  const description = [
    `🎈 ${data.productName} Rental`,
    '',
    `📋 Booking: ${data.bookingNumber}`,
    '',
    `📅 Event: ${formatDateDisplay(data.eventDate)}`,
    `🚚 Delivery: ${data.deliveryWindow}`,
    `📦 Pickup: ${formatDateDisplay(data.pickupDate)} at ${data.pickupWindow}`,
    '',
    paymentLine,
    '',
    '─────────────────',
    `📞 Questions? Call ${BUSINESS_PHONE}`,
    `✉️ Email: ${BUSINESS_EMAIL}`,
    '─────────────────',
    '',
    'Pop and Drop Party Rentals',
    'Ocala, FL',
  ].join('\n');

  return {
    title: `🎉 ${data.productName} - Party Day!`,
    description,
    location: `${data.address}, ${data.city}, FL`,
    startDate: start,
    endDate: endDate,
  };
}

// =============================================================================
// OWNER/ADMIN CALENDAR EVENT BUILDERS
// =============================================================================

/**
 * Build a delivery calendar event for the business owner
 */
export function buildOwnerDeliveryEvent(
  data: OwnerCalendarData,
  deliveryDate: string,
  deliveryWindow: string
): CalendarEvent {
  const { start, end } = createDateTimeRange(deliveryDate, deliveryWindow);
  
  const fullAddress = [data.address, data.city, data.state, data.zip]
    .filter(Boolean)
    .join(', ');

  // Payment status
  let paymentStatus: string;
  if (data.isPaidInFull || data.balancePaid) {
    paymentStatus = '✓ PAID IN FULL - Nothing to collect!';
  } else if (data.depositPaid) {
    paymentStatus = `💰 Collect: $${data.balanceDue} on delivery`;
  } else {
    paymentStatus = `⚠️ UNPAID - Collect full amount: $${data.totalPrice}`;
  }

  // Build description
  const description = [
    `📋 Booking: ${data.bookingNumber}`,
    '',
    '👤 CUSTOMER',
    `   ${data.customerName}`,
    `   📱 ${data.customerPhone}`,
    `   ✉️ ${data.customerEmail}`,
    '',
    '📍 ADDRESS',
    `   ${fullAddress}`,
    '',
    `🎈 PRODUCT: ${data.productName}`,
    data.unitNumber ? `   Unit #${data.unitNumber}${data.unitNickname ? ` (${data.unitNickname})` : ''}` : '',
    '',
    '💳 PAYMENT',
    `   ${paymentStatus}`,
    '',
    data.deliveryNotes ? `📝 NOTES: ${data.deliveryNotes}` : '',
  ].filter(Boolean).join('\n');

  return {
    title: `🚚 DELIVER: ${data.productName} → ${data.customerName.split(' ')[0]}`,
    description,
    location: fullAddress,
    startDate: start,
    endDate: end,
  };
}

/**
 * Build a pickup calendar event for the business owner
 */
export function buildOwnerPickupEvent(
  data: OwnerCalendarData,
  pickupDate: string,
  pickupWindow: string
): CalendarEvent {
  const { start, end } = createDateTimeRange(pickupDate, pickupWindow);
  
  const fullAddress = [data.address, data.city, data.state, data.zip]
    .filter(Boolean)
    .join(', ');

  // Build description
  const description = [
    `📋 Booking: ${data.bookingNumber}`,
    '',
    '👤 CUSTOMER',
    `   ${data.customerName}`,
    `   📱 ${data.customerPhone}`,
    '',
    '📍 PICKUP FROM',
    `   ${fullAddress}`,
    '',
    `📦 ITEM: ${data.productName}`,
    data.unitNumber ? `   Unit #${data.unitNumber}${data.unitNickname ? ` (${data.unitNickname})` : ''}` : '',
    '',
    data.deliveryNotes ? `📝 NOTES: ${data.deliveryNotes}` : '',
  ].filter(Boolean).join('\n');

  return {
    title: `📦 PICKUP: ${data.productName} ← ${data.customerName.split(' ')[0]}`,
    description,
    location: fullAddress,
    startDate: start,
    endDate: end,
  };
}

// =============================================================================
// URL GENERATORS FOR EMAIL (server-side safe)
// =============================================================================

/**
 * Generate all calendar URLs for an event (for use in emails)
 */
export function generateAllCalendarUrls(event: CalendarEvent): {
  google: string;
  outlook: string;
  yahoo: string;
} {
  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookUrl(event),
    yahoo: generateYahooCalendarUrl(event),
  };
}
