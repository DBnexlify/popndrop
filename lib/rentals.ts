// ============================================================================
// RENTAL TYPES & HELPERS
// Data now comes from database - this file contains only business logic
// ============================================================================

import { ProductDisplay, BookingType } from './database-types';

// Re-export types for backwards compatibility
export type { ProductDisplay as Rental };
export type { BookingType };

// ============================================================================
// BOOKING TYPES
// ============================================================================

// Time window for delivery/pickup selection
export type TimeWindow = {
  label: string;
  value: string;
};

export interface PricingOption {
  type: BookingType;
  price: number;
  label: string;
  description: string;
  deliveryDay: string;
  deliveryWindows: readonly TimeWindow[];
  pickupDay: string;
  pickupWindows: readonly TimeWindow[];
  recommended?: boolean;
  badge?: string;
  // Event-based rentals use a single selection for both delivery and pickup
  isEventBased?: boolean;
  eventWindows?: readonly { label: string; value: string; deliveryTime: string; pickupTime: string }[];
}

export interface PricingResult {
  available: boolean;
  reason?: string;
  options: PricingOption[];
}

// ============================================================================
// SCHEDULE CONFIGURATION
// ============================================================================

export const SCHEDULE = {
  // Days we deliver (0 = Sunday, 6 = Saturday)
  // Note: Sunday (0) is allowed as an EVENT date, but delivery happens Saturday
  deliveryDays: [1, 2, 3, 4, 5, 6], // Mon-Sat (actual delivery days)
  eventDays: [0, 1, 2, 3, 4, 5, 6], // All days (Sun events get Sat delivery)
  
  // Days we pick up
  pickupDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  
  // Delivery time windows (show actual times, not labels like "Morning")
  deliveryWindows: [
    { label: "8–11 AM", value: "morning" },
    { label: "11 AM–2 PM", value: "midday" },
    { label: "2–5 PM", value: "afternoon" },
  ],
  
  // Saturday evening delivery (for Sunday-only rentals)
  saturdayEveningWindow: [
    { label: "5–7 PM (Saturday)", value: "saturday-evening" },
  ],
  
  // Pickup windows (show actual times)
  sameDayPickupWindows: [
    { label: "6–8 PM", value: "evening" },
  ],
  
  nextMorningPickupWindows: [
    { label: "By 10 AM (next day)", value: "next-morning" },
  ],
  
  mondayPickupWindows: [
    { label: "By 10 AM (Monday)", value: "monday-morning" },
    { label: "2–5 PM (Monday)", value: "monday-afternoon" },
  ],
  
  // Event-based rentals (4-hour blocks with setup/teardown buffer)
  // Format: Event runs X-Y, we deliver ~1.5hrs before, pickup ~30min after
  eventWindows: [
    { label: "4–8 PM (we arrive ~2:30 PM)", value: "event-4pm-8pm", deliveryTime: "2:30 PM", pickupTime: "8:30 PM" },
    { label: "5–9 PM (we arrive ~3:30 PM)", value: "event-5pm-9pm", deliveryTime: "3:30 PM", pickupTime: "9:30 PM" },
    { label: "6–10 PM (we arrive ~4:30 PM)", value: "event-6pm-10pm", deliveryTime: "4:30 PM", pickupTime: "10:30 PM" },
    { label: "7–11 PM (we arrive ~5:30 PM)", value: "event-7pm-11pm", deliveryTime: "5:30 PM", pickupTime: "11:30 PM" },
  ],
} as const;

export const DEPOSIT_AMOUNT = 50;

// ============================================================================
// AVAILABILITY HELPERS
// ============================================================================

/**
 * Check if a specific date is available as an EVENT date
 * Note: Sunday is allowed as an event date (delivery happens Saturday)
 */
export function isEventDateAvailable(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return (SCHEDULE.eventDays as readonly number[]).includes(dayOfWeek);
}

/**
 * Check if we can physically deliver on a given date
 * (Used internally - Sunday delivery is NOT available)
 */
export function isDeliveryDayAvailable(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return (SCHEDULE.deliveryDays as readonly number[]).includes(dayOfWeek);
}

// Keep old function name for backward compatibility
export const isDeliveryAvailable = isEventDateAvailable;

/**
 * Get the day name from a date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

// ============================================================================
// PRICING LOGIC
// ============================================================================

/**
 * Get pricing options for a product on a specific date
 * 
 * BUSINESS LOGIC:
 * - Sunday (day 0): Offer Sunday-only (BASE) or weekend package (UPGRADE)
 *   → Sunday-only: Delivered Saturday evening, pickup Monday
 *   → Weekend: Delivered Saturday morning, pickup Monday
 * - Saturday (day 6): Offer daily (BASE) OR weekend package (UPGRADE)
 * - Mon-Fri (days 1-5): Daily rate only
 * 
 * IMPORTANT: The BASE option (non-recommended) should be FIRST in the array.
 * This prevents auto-upgrading users without their consent.
 * 
 * NEW: Respects product.availableBookingTypes to filter which options are shown.
 * NEW: Respects product.sameDayPickupOnly to restrict pickup windows.
 */
export function getPricingOptions(product: ProductDisplay, date: Date): PricingResult {
  const dayOfWeek = date.getDay();
  const dayName = getDayName(date);
  
  // Get available booking types for this product (default to all if not set)
  const availableTypes = product.availableBookingTypes ?? ['daily', 'weekend', 'sunday'];
  const sameDayOnly = product.sameDayPickupOnly ?? false;
  
  // Helper to check if a booking type is available
  const isTypeAvailable = (type: BookingType) => availableTypes.includes(type);
  
  // Pickup windows based on sameDayPickupOnly setting
  // sameDayOnly = true: Event-based products (Party House) that must be picked up same night
  // sameDayOnly = false: Standard bounce houses - ONLY next morning pickup (customer request)
  const dailyPickupWindows = sameDayOnly 
    ? SCHEDULE.sameDayPickupWindows 
    : SCHEDULE.nextMorningPickupWindows;  // Bounce houses: ONLY next morning, no same-day
  
  // Coming soon products (price = 0)
  if (product.pricing.daily === 0) {
    return {
      available: false,
      reason: "This rental is coming soon and not yet available for booking.",
      options: [],
    };
  }
  
  // =========================================================================
  // SUNDAY - offer Sunday-only (base) or weekend (upgrade)
  // Base option FIRST so user isn't auto-upgraded
  // =========================================================================
  if (dayOfWeek === 0) {
    const options: PricingOption[] = [];
    
    // Only add sunday option if available for this product
    if (isTypeAvailable('sunday')) {
      options.push({
        type: "sunday",
        price: product.pricing.sunday,
        label: "Sunday only",
        description: "Delivered Saturday 5–7 PM, pickup Monday",
        deliveryDay: "Saturday",
        deliveryWindows: SCHEDULE.saturdayEveningWindow,
        pickupDay: "Monday",
        pickupWindows: SCHEDULE.mondayPickupWindows,
      });
    }
    
    // Only add weekend option if available for this product
    if (isTypeAvailable('weekend')) {
      options.push({
        type: "weekend",
        price: product.pricing.weekend,
        label: "Full weekend",
        description: "Delivered Saturday 8–11 AM, pickup Monday — more time!",
        deliveryDay: "Saturday",
        deliveryWindows: SCHEDULE.deliveryWindows,
        pickupDay: "Monday",
        pickupWindows: SCHEDULE.mondayPickupWindows,
        recommended: options.length > 0, // Only recommend if there's a base option
        badge: options.length > 0 ? "Best value" : undefined,
      });
    }
    
    // If no options available for Sunday, return unavailable
    if (options.length === 0) {
      return {
        available: false,
        reason: "This rental is not available for Sunday events.",
        options: [],
      };
    }
    
    return { available: true, options };
  }
  
  // =========================================================================
  // SATURDAY - offer daily (base) or weekend (upgrade)
  // Base option FIRST
  // =========================================================================
  if (dayOfWeek === 6) {
    const options: PricingOption[] = [];
    
    // Only add daily option if available for this product
    if (isTypeAvailable('daily')) {
      // Event-based products use event time windows
      if (sameDayOnly) {
        options.push({
          type: "daily",
          price: product.pricing.daily,
          label: "Saturday event",
          description: "4-hour event rental with setup & teardown",
          deliveryDay: "Saturday",
          deliveryWindows: [], // Not used for event-based
          pickupDay: "Saturday",
          pickupWindows: [], // Not used for event-based
          isEventBased: true,
          eventWindows: SCHEDULE.eventWindows,
        });
      } else {
        options.push({
          type: "daily",
          price: product.pricing.daily,
          label: "Saturday only",
          description: "Single day rental, pickup Sunday morning",
          deliveryDay: "Saturday",
          deliveryWindows: SCHEDULE.deliveryWindows,
          pickupDay: "Sunday",
          pickupWindows: SCHEDULE.nextMorningPickupWindows, // Bounce houses: next morning pickup
        });
      }
    }
    
    // Only add weekend option if available for this product (not for event-based)
    if (isTypeAvailable('weekend') && !sameDayOnly) {
      options.push({
        type: "weekend",
        price: product.pricing.weekend,
        label: "Full weekend",
        description: "Keep it Saturday & Sunday, pickup Monday",
        deliveryDay: "Saturday",
        deliveryWindows: SCHEDULE.deliveryWindows,
        pickupDay: "Monday",
        pickupWindows: SCHEDULE.mondayPickupWindows,
        recommended: options.length > 0,
        badge: options.length > 0 ? "Best value" : undefined,
      });
    }
    
    // If no options available for Saturday, return unavailable
    if (options.length === 0) {
      return {
        available: false,
        reason: "This rental is not available for Saturday events.",
        options: [],
      };
    }
    
    return { available: true, options };
  }
  
  // =========================================================================
  // FRIDAY - daily with next-morning pickup option
  // =========================================================================
  if (dayOfWeek === 5) {
    if (!isTypeAvailable('daily')) {
      return {
        available: false,
        reason: "This rental is not available for Friday events.",
        options: [],
      };
    }
    
    // Event-based products use event time windows
    if (sameDayOnly) {
      return {
        available: true,
        options: [
          {
            type: "daily",
            price: product.pricing.daily,
            label: `${dayName} event`,
            description: "4-hour event rental with setup & teardown",
            deliveryDay: dayName,
            deliveryWindows: [], // Not used for event-based
            pickupDay: dayName,
            pickupWindows: [], // Not used for event-based
            isEventBased: true,
            eventWindows: SCHEDULE.eventWindows,
          },
        ],
      };
    }
    
    return {
      available: true,
      options: [
        {
          type: "daily",
          price: product.pricing.daily,
          label: `${dayName} rental`,
          description: "Single day rental",
          deliveryDay: dayName,
          deliveryWindows: SCHEDULE.deliveryWindows,
          pickupDay: dayName,
          pickupWindows: dailyPickupWindows,
        },
      ],
    };
  }
  
  // =========================================================================
  // MONDAY-THURSDAY - daily rate only
  // =========================================================================
  if (!isTypeAvailable('daily')) {
    return {
      available: false,
      reason: "This rental is not available for weekday events.",
      options: [],
    };
  }
  
  // Event-based products use event time windows
  if (sameDayOnly) {
    return {
      available: true,
      options: [
        {
          type: "daily",
          price: product.pricing.daily,
          label: `${dayName} event`,
          description: "4-hour event rental with setup & teardown",
          deliveryDay: dayName,
          deliveryWindows: [], // Not used for event-based
          pickupDay: dayName,
          pickupWindows: [], // Not used for event-based
          isEventBased: true,
          eventWindows: SCHEDULE.eventWindows,
        },
      ],
    };
  }
  
  return {
    available: true,
    options: [
      {
        type: "daily",
        price: product.pricing.daily,
        label: `${dayName} rental`,
        description: "Single day rental",
        deliveryDay: dayName,
        deliveryWindows: SCHEDULE.deliveryWindows,
        pickupDay: dayName,
        pickupWindows: dailyPickupWindows,
      },
    ],
  };
}

/**
 * Calculate the total price for a booking
 */
export function calculateTotal(product: ProductDisplay, bookingType: BookingType): number {
  switch (bookingType) {
    case "daily":
      return product.pricing.daily;
    case "weekend":
      return product.pricing.weekend;
    case "sunday":
      return product.pricing.sunday;
    default:
      return 0;
  }
}

/**
 * Calculate the balance due after deposit
 */
export function calculateBalance(product: ProductDisplay, bookingType: BookingType): number {
  return calculateTotal(product, bookingType) - DEPOSIT_AMOUNT;
}

/**
 * Get the pickup date based on booking type and event date
 */
export function getPickupDate(eventDate: Date, bookingType: BookingType): Date {
  const pickup = new Date(eventDate);
  
  if (bookingType === "weekend") {
    // Saturday event → Monday pickup (skip Sunday)
    pickup.setDate(pickup.getDate() + 2);
  } else if (bookingType === "sunday") {
    // Sunday event → Monday pickup
    pickup.setDate(pickup.getDate() + 1);
  }
  // For daily, pickup is same day (time-based, not date-based)
  
  return pickup;
}

/**
 * Get the delivery date based on booking type and event date
 * (Sunday events get Saturday delivery)
 */
export function getDeliveryDate(eventDate: Date, bookingType: BookingType): Date {
  const delivery = new Date(eventDate);
  
  if (bookingType === "sunday") {
    // Sunday event → Saturday delivery
    delivery.setDate(delivery.getDate() - 1);
  }
  // For daily and weekend, delivery is on the event date
  
  return delivery;
}

/**
 * Format a price as currency
 */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a booking request
 */
export function validateBooking(
  product: ProductDisplay | undefined,
  date: Date | undefined,
  bookingType: BookingType,
  deliveryTime: string,
  pickupTime: string
): ValidationResult {
  const errors: string[] = [];
  
  if (!product) {
    errors.push("Please select a rental");
  }
  
  if (!date) {
    errors.push("Please select an event date");
  } else {
    if (!isEventDateAvailable(date)) {
      errors.push("This date is not available for events");
    }
    
    const dayOfWeek = date.getDay();
    
    // Weekend package only valid on Saturday or Sunday
    if (bookingType === "weekend" && dayOfWeek !== 6 && dayOfWeek !== 0) {
      errors.push("Weekend package is only available for Saturday or Sunday events");
    }
    
    // Sunday-only booking only valid on Sunday
    if (bookingType === "sunday" && dayOfWeek !== 0) {
      errors.push("Sunday-only booking is only available for Sunday events");
    }
  }
  
  if (!deliveryTime) {
    errors.push("Please select a delivery time");
  }
  
  if (!pickupTime) {
    errors.push("Please select a pickup time");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
