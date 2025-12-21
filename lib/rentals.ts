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
  
  // Delivery time windows
  deliveryWindows: [
    { label: "Morning (8–11 AM)", value: "morning" },
    { label: "Midday (11 AM–2 PM)", value: "midday" },
    { label: "Afternoon (2–5 PM)", value: "afternoon" },
  ],
  
  // Saturday evening delivery (for Sunday-only rentals)
  saturdayEveningWindow: [
    { label: "Saturday evening (5–7 PM)", value: "saturday-evening" },
  ],
  
  // Pickup windows
  sameDayPickupWindows: [
    { label: "Evening (6–8 PM)", value: "evening" },
  ],
  
  nextMorningPickupWindows: [
    { label: "Next morning (by 10 AM)", value: "next-morning" },
  ],
  
  mondayPickupWindows: [
    { label: "Monday morning (by 10 AM)", value: "monday-morning" },
    { label: "Monday afternoon (2–5 PM)", value: "monday-afternoon" },
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
 * - Sunday (day 0): Offer weekend package (PREFERRED) or Sunday-only
 *   → Weekend: Delivered Saturday morning, pickup Monday
 *   → Sunday-only: Delivered Saturday evening, pickup Monday
 * - Saturday (day 6): Offer daily OR weekend package
 * - Mon-Fri (days 1-5): Daily rate only
 */
export function getPricingOptions(product: ProductDisplay, date: Date): PricingResult {
  const dayOfWeek = date.getDay();
  const dayName = getDayName(date);
  
  // Coming soon products (price = 0)
  if (product.pricing.daily === 0) {
    return {
      available: false,
      reason: "This rental is coming soon and not yet available for booking.",
      options: [],
    };
  }
  
  // SUNDAY - offer weekend (preferred) or Sunday-only
  if (dayOfWeek === 0) {
    return {
      available: true,
      options: [
        {
          type: "weekend",
          price: product.pricing.weekend,
          label: "Weekend package",
          description: "Get the full weekend! Delivered Saturday morning, pickup Monday",
          deliveryDay: "Saturday",
          deliveryWindows: SCHEDULE.deliveryWindows,
          pickupDay: "Monday",
          pickupWindows: SCHEDULE.mondayPickupWindows,
          recommended: true,
          badge: "Best value",
        },
        {
          type: "sunday",
          price: product.pricing.sunday,
          label: "Sunday only",
          description: "Delivered Saturday evening, pickup Monday",
          deliveryDay: "Saturday",
          deliveryWindows: SCHEDULE.saturdayEveningWindow,
          pickupDay: "Monday",
          pickupWindows: SCHEDULE.mondayPickupWindows,
        },
      ],
    };
  }
  
  // SATURDAY - offer daily or weekend options
  if (dayOfWeek === 6) {
    return {
      available: true,
      options: [
        {
          type: "daily",
          price: product.pricing.daily,
          label: "Saturday only",
          description: "Single day rental, pickup Saturday evening",
          deliveryDay: "Saturday",
          deliveryWindows: SCHEDULE.deliveryWindows,
          pickupDay: "Saturday",
          pickupWindows: SCHEDULE.sameDayPickupWindows,
        },
        {
          type: "weekend",
          price: product.pricing.weekend,
          label: "Weekend package",
          description: "Keep it Saturday & Sunday, pickup Monday",
          deliveryDay: "Saturday",
          deliveryWindows: SCHEDULE.deliveryWindows,
          pickupDay: "Monday",
          pickupWindows: SCHEDULE.mondayPickupWindows,
          recommended: true,
          badge: "Best value",
        },
      ],
    };
  }
  
  // FRIDAY - offer daily with next-morning option
  if (dayOfWeek === 5) {
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
          pickupWindows: [...SCHEDULE.sameDayPickupWindows, ...SCHEDULE.nextMorningPickupWindows],
        },
      ],
    };
  }
  
  // MONDAY-THURSDAY - daily rate only
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
        pickupWindows: [...SCHEDULE.sameDayPickupWindows, ...SCHEDULE.nextMorningPickupWindows],
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