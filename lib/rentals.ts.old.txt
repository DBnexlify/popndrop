// ============================================
// RENTAL TYPES
// ============================================

export interface RentalPricing {
  daily: number;       // Any single day (Mon-Sat)
  weekend: number;     // Sat + Sun package (pickup Monday)
}

export interface RentalSpecs {
  dimensions: string;          // L x W x H
  footprint: string;           // Space needed for setup
  maxPlayers: number;          // At one time
  maxWeightPerPlayer: number;  // lbs
  totalWeightLimit: number;    // lbs
  heightRange: string;         // Min-max participant height
  wetOrDry: "wet" | "dry" | "both";
  powerRequired: string;
}

export interface Rental {
  id: string;
  name: string;
  series?: string;
  subtitle: string;
  description: string;
  pricing: RentalPricing;
  specs: RentalSpecs;
  features: string[];
  image: string;
  gallery: string[];
  safetyNotes?: string[];
}

// ============================================
// BOOKING TYPES
// ============================================

export type BookingType = "daily" | "weekend";

export interface PricingOption {
  type: BookingType;
  price: number;
  label: string;
  description: string;
  pickupDay: string;
  pickupTimes: readonly string[];
}

export interface PricingResult {
  available: boolean;
  reason?: string;
  options: PricingOption[];
}

// ============================================
// SCHEDULE CONFIGURATION
// ============================================

export const SCHEDULE = {
  // Days we deliver (0 = Sunday, 6 = Saturday)
  deliveryDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  
  // Days we pick up
  pickupDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  
  // Delivery time slots
  deliveryTimes: [
    "7:00 AM",
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
  ],
  
  // Pickup time slots for same-day
  sameDayPickupTimes: [
    "5:00 PM",
    "6:00 PM",
    "7:00 PM",
    "8:00 PM",
  ],
  
  // Pickup time slots for next-morning
  nextMorningPickupTimes: [
    "Next morning (by 9 AM)",
  ],
  
  // Pickup time slots for Monday (weekend package)
  mondayPickupTimes: [
    "Monday morning (by 10 AM)",
    "Monday evening (after 4 PM)",
  ],
} as const;

export const DEPOSIT_AMOUNT = 50;

// ============================================
// RENTAL INVENTORY
// ============================================

export const rentals: Rental[] = [
  {
    id: "glitch-combo",
    name: "Glitch Combo",
    series: "Glitch Series",
    subtitle: "Bounce house with slide – wet or dry",
    description:
      "The ultimate gamer-themed combo unit! Features a spacious bounce area and an exciting slide that can be used wet or dry. The vibrant gaming graphics and colors make this perfect for birthday parties, school events, and backyard fun. ASTM F2374 certified for safety.",
    pricing: {
      daily: 350,
      weekend: 475,
    },
    specs: {
      dimensions: "28' L × 13' W × 15' H",
      footprint: "40' × 25' flat area required",
      maxPlayers: 2,
      maxWeightPerPlayer: 180,
      totalWeightLimit: 360,
      heightRange: "3' to 6' tall",
      wetOrDry: "both",
      powerRequired: "1 standard outlet within 50ft",
    },
    features: [
      "Bounce house + slide combo",
      "Wet or dry use",
      "Ages 3–12",
      "Gaming theme",
    ],
    image: "/rentals/glitch/combo/hero.png",
    gallery: [
      "/rentals/glitch/combo/hero.png",
      "/rentals/glitch/combo/photo-1.png",
      "/rentals/glitch/combo/photo-2.png",
      "/rentals/glitch/combo/photo-3.png",
      "/rentals/glitch/combo/photo-4.png",
      "/rentals/glitch/combo/photo-5.png",
      "/rentals/glitch/combo/photo-6.jpg",
      "/rentals/glitch/combo/photo-7.jpg",
      "/rentals/glitch/combo/photo-8.jpg",
    ],
    safetyNotes: [
      "Adult supervision required at all times",
      "Max 2 jumpers at once",
      "No shoes, glasses, or sharp objects",
      "No flips or rough play",
    ],
  },
  // Placeholder for second rental
  {
    id: "coming-soon",
    name: "Coming Soon",
    subtitle: "New rental arriving soon",
    description: "Stay tuned for our next exciting rental!",
    pricing: {
      daily: 0,
      weekend: 0,
    },
    specs: {
      dimensions: "TBD",
      footprint: "TBD",
      maxPlayers: 0,
      maxWeightPerPlayer: 0,
      totalWeightLimit: 0,
      heightRange: "TBD",
      wetOrDry: "dry",
      powerRequired: "TBD",
    },
    features: [],
    image: "/rentals/placeholder/hero.png",
    gallery: [],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a rental by its ID
 */
export function getRentalById(id: string): Rental | undefined {
  return rentals.find((r) => r.id === id);
}

/**
 * Get all rentals in a series
 */
export function getRentalsBySeries(series: string): Rental[] {
  return rentals.filter((r) => r.series === series);
}

/**
 * Get only rentals that are available for booking (not "coming soon")
 */
export function getAvailableRentals(): Rental[] {
  return rentals.filter((r) => r.pricing.daily > 0);
}

// ============================================
// PRICING & AVAILABILITY LOGIC
// ============================================

/**
 * Check if a specific date is available for delivery
 */
export function isDeliveryAvailable(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return (SCHEDULE.deliveryDays as readonly number[]).includes(dayOfWeek);
}

/**
 * Get the day name from a date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Get pricing options for a rental on a specific date
 * 
 * BUSINESS LOGIC:
 * - Sunday (day 0): No delivery available
 * - Saturday (day 6): Offer daily OR weekend package
 * - Mon-Fri (days 1-5): Daily rate only
 */
export function getPricingOptions(rental: Rental, date: Date): PricingResult {
  const dayOfWeek = date.getDay();
  const dayName = getDayName(date);
  
  // Sunday - no delivery
  if (dayOfWeek === 0) {
    return {
      available: false,
      reason: "Delivery is not available on Sundays. Please select another date.",
      options: [],
    };
  }
  
  // Coming soon rentals
  if (rental.pricing.daily === 0) {
    return {
      available: false,
      reason: "This rental is coming soon and not yet available for booking.",
      options: [],
    };
  }
  
  // Saturday - offer both daily and weekend options
  if (dayOfWeek === 6) {
    return {
      available: true,
      options: [
        {
          type: "daily",
          price: rental.pricing.daily,
          label: "Saturday only",
          description: "Single day rental, pickup Saturday evening",
          pickupDay: "Saturday",
          // NO next morning option - that would be Sunday!
          pickupTimes: SCHEDULE.sameDayPickupTimes,
        },
        {
          type: "weekend",
          price: rental.pricing.weekend,
          label: "Weekend package",
          description: "Keep it Saturday & Sunday, we pick up Monday",
          pickupDay: "Monday",
          pickupTimes: SCHEDULE.mondayPickupTimes,
        },
      ],
    };
  }
  
  // Monday-Friday - daily rate only
  return {
    available: true,
    options: [
      {
        type: "daily",
        price: rental.pricing.daily,
        label: `${dayName} rental`,
        description: "Single day rental",
        pickupDay: dayName,
        pickupTimes: [...SCHEDULE.sameDayPickupTimes, ...SCHEDULE.nextMorningPickupTimes],
      },
    ],
  };
}

/**
 * Calculate the total price for a booking
 */
export function calculateTotal(rental: Rental, bookingType: BookingType): number {
  switch (bookingType) {
    case "daily":
      return rental.pricing.daily;
    case "weekend":
      return rental.pricing.weekend;
    default:
      return 0;
  }
}

/**
 * Calculate the balance due after deposit
 */
export function calculateBalance(rental: Rental, bookingType: BookingType): number {
  return calculateTotal(rental, bookingType) - DEPOSIT_AMOUNT;
}

/**
 * Get the pickup date based on booking type
 */
export function getPickupDate(startDate: Date, bookingType: BookingType): Date {
  const pickup = new Date(startDate);
  
  if (bookingType === "weekend") {
    // Saturday → Monday (skip Sunday)
    pickup.setDate(pickup.getDate() + 2);
  }
  // For daily, pickup is same day (time-based, not date-based)
  
  return pickup;
}

/**
 * Format a price as currency
 */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a booking request
 */
export function validateBooking(
  rental: Rental | undefined,
  date: Date | undefined,
  bookingType: BookingType,
  deliveryTime: string,
  pickupTime: string
): ValidationResult {
  const errors: string[] = [];
  
  if (!rental) {
    errors.push("Please select a rental");
  }
  
  if (!date) {
    errors.push("Please select an event date");
  } else {
    if (!isDeliveryAvailable(date)) {
      errors.push("Delivery is not available on the selected date");
    }
    
    // Weekend package only valid on Saturday
    if (bookingType === "weekend" && date.getDay() !== 6) {
      errors.push("Weekend package is only available for Saturday bookings");
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