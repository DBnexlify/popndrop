// =============================================================================
// INPUT VALIDATION UTILITY
// lib/validation.ts
// Centralized validation for API inputs
// =============================================================================

// =============================================================================
// SANITIZERS
// =============================================================================

/**
 * Sanitize string input - trim and limit length
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Sanitize email - lowercase and trim
 */
export function sanitizeEmail(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().toLowerCase().slice(0, 254);
}

/**
 * Sanitize phone - remove non-numeric except + for country code
 */
export function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\d+\-() ]/g, '').slice(0, 20);
}

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate US phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  // Remove formatting to check digit count
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Validate date string (YYYY-MM-DD format)
 */
export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T12:00:00');
  return !isNaN(parsed.getTime());
}

/**
 * Validate date is in the future
 */
export function isFutureDate(date: string, minDaysAhead: number = 0): boolean {
  const inputDate = new Date(date + 'T12:00:00');
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + minDaysAhead);
  return inputDate >= minDate;
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate booking type
 */
export function isValidBookingType(type: string): type is 'daily' | 'weekend' | 'sunday' {
  return ['daily', 'weekend', 'sunday'].includes(type);
}

// =============================================================================
// BOOKING VALIDATION
// =============================================================================

export interface BookingInput {
  productSlug: string;
  eventDate: string;
  bookingType: string;
  deliveryWindow: string;
  pickupWindow: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  notes?: string;
  paymentType?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateBookingInput(input: unknown): {
  valid: boolean;
  errors: ValidationError[];
  sanitized: BookingInput | null;
} {
  const errors: ValidationError[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }], sanitized: null };
  }
  
  const data = input as Record<string, unknown>;
  
  // Required fields
  const productSlug = sanitizeString(data.productSlug, 100);
  if (!productSlug) {
    errors.push({ field: 'productSlug', message: 'Product is required' });
  }
  
  const eventDate = sanitizeString(data.eventDate, 10);
  if (!eventDate || !isValidDateString(eventDate)) {
    errors.push({ field: 'eventDate', message: 'Valid event date is required' });
  } else if (!isFutureDate(eventDate, 1)) {
    errors.push({ field: 'eventDate', message: 'Event date must be at least 1 day in the future' });
  }
  
  const bookingType = sanitizeString(data.bookingType, 20);
  if (!isValidBookingType(bookingType)) {
    errors.push({ field: 'bookingType', message: 'Invalid booking type' });
  }
  
  const deliveryWindow = sanitizeString(data.deliveryWindow, 50);
  if (!deliveryWindow) {
    errors.push({ field: 'deliveryWindow', message: 'Delivery window is required' });
  }
  
  const pickupWindow = sanitizeString(data.pickupWindow, 50);
  if (!pickupWindow) {
    errors.push({ field: 'pickupWindow', message: 'Pickup window is required' });
  }
  
  const customerName = sanitizeString(data.customerName, 100);
  if (!customerName || customerName.length < 2) {
    errors.push({ field: 'customerName', message: 'Name is required (min 2 characters)' });
  }
  
  const customerEmail = sanitizeEmail(data.customerEmail);
  if (!customerEmail || !isValidEmail(customerEmail)) {
    errors.push({ field: 'customerEmail', message: 'Valid email is required' });
  }
  
  const customerPhone = sanitizePhone(data.customerPhone);
  if (!customerPhone || !isValidPhone(customerPhone)) {
    errors.push({ field: 'customerPhone', message: 'Valid phone number is required' });
  }
  
  const address = sanitizeString(data.address, 200);
  if (!address || address.length < 5) {
    errors.push({ field: 'address', message: 'Valid address is required' });
  }
  
  const city = sanitizeString(data.city, 100);
  if (!city) {
    errors.push({ field: 'city', message: 'City is required' });
  }
  
  // Optional fields
  const notes = sanitizeString(data.notes, 500);
  const paymentType = sanitizeString(data.paymentType, 20) || 'deposit';
  
  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }
  
  return {
    valid: true,
    errors: [],
    sanitized: {
      productSlug,
      eventDate,
      bookingType,
      deliveryWindow,
      pickupWindow,
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      notes: notes || undefined,
      paymentType,
    },
  };
}

// =============================================================================
// CANCELLATION VALIDATION
// =============================================================================

export function validateCancellationInput(input: unknown): {
  valid: boolean;
  errors: ValidationError[];
  sanitized: { bookingId: string; email: string; reason?: string } | null;
} {
  const errors: ValidationError[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }], sanitized: null };
  }
  
  const data = input as Record<string, unknown>;
  
  const bookingId = sanitizeString(data.bookingId, 50);
  if (!bookingId || !isValidUUID(bookingId)) {
    errors.push({ field: 'bookingId', message: 'Valid booking ID is required' });
  }
  
  const email = sanitizeEmail(data.email);
  if (!email || !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }
  
  const reason = sanitizeString(data.reason, 500);
  
  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }
  
  return {
    valid: true,
    errors: [],
    sanitized: {
      bookingId,
      email,
      reason: reason || undefined,
    },
  };
}
