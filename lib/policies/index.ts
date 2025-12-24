// =============================================================================
// CENTRALIZED POLICY SYSTEM
// lib/policies/index.ts
// Single source of truth for ALL business policies
// =============================================================================
//
// HOW TO UPDATE POLICIES:
// 1. Edit the content in THIS FILE ONLY
// 2. All consumption points (website, emails, modals) pull from here
// 3. Changes here automatically reflect everywhere
//
// =============================================================================

// =============================================================================
// BUSINESS CONSTANTS
// =============================================================================

export const BUSINESS_CONSTANTS = {
  depositAmount: 50,
  currency: 'USD',
  timezone: 'America/New_York',
  phoneNumber: '(352) 445-3723',
  phoneNumberClean: '3524453723',
  email: 'bookings@popndroprentals.com',
  website: 'https://popndroprentals.com',
  businessName: 'Pop and Drop Party Rentals',
  serviceArea: 'Ocala, Florida and Marion County',
} as const;

// =============================================================================
// REFUND CALCULATION RULES
// =============================================================================

export interface RefundRule {
  minHours: number;
  maxHours: number | null;
  refundPercent: number;
  label: string;
  shortLabel: string;
}

export const REFUND_RULES: RefundRule[] = [
  {
    minHours: 48,
    maxHours: null,
    refundPercent: 100,
    label: '48+ hours before delivery',
    shortLabel: '48+ hours',
  },
  {
    minHours: 24,
    maxHours: 47,
    refundPercent: 50,
    label: '24 to 48 hours before delivery',
    shortLabel: '24-48 hours',
  },
  {
    minHours: 0,
    maxHours: 23,
    refundPercent: 0,
    label: 'Less than 24 hours before delivery',
    shortLabel: '<24 hours',
  },
];

// =============================================================================
// REFUND CALCULATION LOGIC
// =============================================================================

export interface RefundCalculation {
  hoursUntilDelivery: number;
  totalPaid: number;
  depositAmount: number;
  refundableAmount: number;
  refundPercentage: number;
  refundAmount: number;
  policyApplied: string;
  isWeatherRelated: boolean;
  ruleUsed: RefundRule | null;
}

/**
 * Calculate refund amount based on centralized policy rules
 * This is the SINGLE SOURCE OF TRUTH for refund calculations
 */
export function calculateRefund(
  totalPaid: number,
  deliveryDateTime: Date,
  cancelDateTime: Date = new Date(),
  isWeatherRelated: boolean = false
): RefundCalculation {
  const hoursUntil = Math.floor(
    (deliveryDateTime.getTime() - cancelDateTime.getTime()) / (1000 * 60 * 60)
  );

  // Weather cancellation: full refund INCLUDING deposit
  if (isWeatherRelated) {
    return {
      hoursUntilDelivery: hoursUntil,
      totalPaid,
      depositAmount: BUSINESS_CONSTANTS.depositAmount,
      refundableAmount: totalPaid,
      refundPercentage: 100,
      refundAmount: totalPaid,
      policyApplied: 'Weather cancellation: Full refund including deposit',
      isWeatherRelated: true,
      ruleUsed: null,
    };
  }

  // Standard cancellation: deposit is non-refundable
  const refundableAmount = Math.max(0, totalPaid - BUSINESS_CONSTANTS.depositAmount);

  // Find matching rule
  let matchedRule: RefundRule | null = null;
  for (const rule of REFUND_RULES) {
    const meetsMin = hoursUntil >= rule.minHours;
    const meetsMax = rule.maxHours === null || hoursUntil <= rule.maxHours;
    if (meetsMin && meetsMax) {
      matchedRule = rule;
      break;
    }
  }

  // No matching rule = no refund
  if (!matchedRule) {
    return {
      hoursUntilDelivery: hoursUntil,
      totalPaid,
      depositAmount: BUSINESS_CONSTANTS.depositAmount,
      refundableAmount,
      refundPercentage: 0,
      refundAmount: 0,
      policyApplied: 'Outside cancellation window: No refund',
      isWeatherRelated: false,
      ruleUsed: null,
    };
  }

  const refundAmount = Math.max(0, (refundableAmount * matchedRule.refundPercent) / 100);

  return {
    hoursUntilDelivery: hoursUntil,
    totalPaid,
    depositAmount: BUSINESS_CONSTANTS.depositAmount,
    refundableAmount,
    refundPercentage: matchedRule.refundPercent,
    refundAmount: Math.round(refundAmount * 100) / 100,
    policyApplied: `${matchedRule.label}: ${matchedRule.refundPercent}% refund minus deposit`,
    isWeatherRelated: false,
    ruleUsed: matchedRule,
  };
}

// =============================================================================
// POLICY CONTENT - Full Versions
// =============================================================================

export const POLICIES = {
  // ===========================================================================
  // CANCELLATION & REFUND POLICY (Approved wording)
  // ===========================================================================
  cancellation: {
    title: 'Cancellation & Refund Policy',
    lastUpdated: '2024-12-24',
    
    intro: `We're a family business, and we understand that life doesn't always go as planned. Kids get sick, schedules change, and sometimes things just don't work out. No stress. We're here to help and we'll always do our best to work with you.`,

    standardCancellations: {
      title: 'Standard Cancellations',
      table: [
        { timing: '48+ hours before delivery', refund: 'Full refund minus $50 booking deposit' },
        { timing: '24 to 48 hours before delivery', refund: '50% refund minus $50 booking deposit' },
        { timing: 'Less than 24 hours before delivery', refund: 'No refund' },
        { timing: 'No-show or same-day cancellation', refund: 'No refund' },
      ],
    },

    deposit: {
      title: 'About Your $50 Deposit',
      content: `Your deposit secures your date and helps us prepare for your rental. This deposit is non-refundable for standard cancellations. That said, we're real people running a small business. If something unexpected comes up, just reach out. We're always happy to have a conversation and see what we can do.`,
    },

    weather: {
      title: 'Weather Cancellations',
      intro: `Safety always comes first. If the weather makes it unsafe to use the equipment, we've got you covered with two options:`,
      options: [
        'Full refund including your deposit',
        'Reschedule to another available date at no extra cost',
      ],
      content: `If you think weather might be a problem, please let us know as early as you can. This gives you the best chance of finding another date that works. You can reschedule through your My Bookings dashboard or just give us a call, send a text, or shoot us an email.

Keep in mind that weekends fill up fast, so the earlier you reach out, the more options we'll have for you.`,
    },

    closing: `Don't overthink it. Just reach out and we'll figure it out together.`,
  },

  // ===========================================================================
  // RENTAL AGREEMENT
  // ===========================================================================
  rentalAgreement: {
    title: 'Rental Agreement',
    lastUpdated: '2024-12-24',

    intro: `By completing a booking with Pop and Drop Party Rentals, you agree to the following terms:`,

    sections: [
      {
        title: 'Booking & Deposit',
        items: [
          {
            emphasis: 'Your $50 deposit secures your rental date',
            text: 'and is applied toward your total rental cost. This deposit confirms your booking and takes the date off our calendar.',
          },
          {
            emphasis: 'The deposit is non-refundable under standard cancellations.',
            text: 'We understand that unexpected situations happen—if you have qualifying circumstances such as severe weather or emergencies, please reach out. We review these on a case-by-case basis.',
          },
          {
            emphasis: 'Balance due on delivery.',
            text: 'The remaining balance is due when we arrive to set up. We accept cash, credit card, Venmo, and Zelle.',
          },
        ],
      },
      {
        title: 'Equipment Care',
        items: [
          {
            emphasis: 'You are responsible for the equipment',
            text: 'from the time of delivery until the time of pickup. Please treat it with care.',
          },
          {
            emphasis: 'Damage charges may apply',
            text: 'if the equipment is returned with damage beyond normal wear and tear, including tears, punctures, stains, or damage caused by misuse, pets, or failure to follow safety rules.',
          },
          {
            emphasis: 'Excessive cleaning fees may apply',
            text: 'if the equipment is returned excessively dirty (mud, paint, pet waste, etc.).',
          },
        ],
      },
      {
        title: 'Rental Duration',
        items: [
          {
            emphasis: 'Standard rentals are for one day of use.',
            text: 'Equipment is typically delivered in the morning and picked up the same evening or next morning.',
          },
          {
            emphasis: 'Sunday events:',
            text: 'Since we don\'t deliver or pick up on Sundays, Sunday rentals are delivered Saturday and picked up Monday—your bounce house will be ready and waiting for your party!',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // SAFETY REQUIREMENTS
  // ===========================================================================
  safety: {
    title: 'Safety Requirements',
    lastUpdated: '2024-12-24',

    intro: `Your safety is our priority. The following rules must be followed at all times while the rental is in use:`,

    rules: [
      {
        emphasis: 'Adult supervision required.',
        text: 'A responsible adult (18 years or older) must be present and actively supervising at all times while the inflatable is in use. This is not optional.',
      },
      {
        emphasis: 'Capacity limits must be observed.',
        text: 'Do not exceed the posted maximum number of participants or weight limits. Separate children by size and age when possible for safer play.',
      },
      {
        emphasis: 'No shoes, eyeglasses, jewelry, or sharp objects',
        text: 'inside the inflatable. These can cause injury to participants or damage to the equipment.',
      },
      {
        emphasis: 'No flips, wrestling, roughhousing, or piling on.',
        text: 'Participants should bounce in the center of the unit, away from walls and openings.',
      },
      {
        emphasis: 'No food, drinks, gum, silly string, or sand',
        text: 'inside the inflatable. Keep face painting and substances that may stain away from the equipment.',
      },
      {
        emphasis: 'Exit immediately if the inflatable begins to deflate.',
        text: 'Keep all participants away until it is fully reinflated and checked.',
      },
      {
        emphasis: 'Do not allow participants who are intoxicated',
        text: 'or under the influence to use the equipment.',
      },
    ],

    compliance: {
      title: 'Equipment Compliance',
      text: 'The vinyl and netting material used in the construction of our inflatables is of the highest quality, 100% lead-free, adheres to manufacturer recommended methods, and was built to ASTM F2374 standards.',
    },
  },

  // ===========================================================================
  // LIABILITY WAIVER
  // ===========================================================================
  liability: {
    title: 'Liability Waiver & Assumption of Risk',
    lastUpdated: '2024-12-24',

    intro: `By renting from Pop and Drop Party Rentals, you acknowledge and agree to the following:`,

    terms: [
      'Inflatable amusement devices involve inherent risks, including but not limited to the risk of falls, collisions, and injuries. You voluntarily assume these risks for yourself and any participants under your supervision.',
      'You agree to supervise all participants and enforce the safety rules provided. Failure to do so may result in injury and is your responsibility.',
      'You agree to hold Pop and Drop Party Rentals, its owners, employees, and agents harmless from any claims, damages, or liability arising from the use or misuse of the rented equipment.',
      'If you have concerns about whether this activity is appropriate for any participant, please consult with a medical professional before allowing them to use the equipment.',
      'You certify that you are at least 18 years of age and have the legal authority to enter into this agreement on behalf of all participants.',
    ],

    closing: `By completing your booking, you confirm that you have read, understood, and agree to this liability waiver.`,
  },

  // ===========================================================================
  // WEATHER POLICY (Detailed)
  // ===========================================================================
  weather: {
    title: 'Weather Policy',
    lastUpdated: '2024-12-24',

    intro: `Safety always comes first. Here's what you need to know about weather and your rental:`,

    unsafe: {
      title: 'Conditions That Make Operation Unsafe',
      items: [
        'Rain or wet conditions',
        'Sustained winds over 15 mph',
        'Lightning or electrical storms',
        'Extreme temperatures (below 40°F or above 100°F)',
        'Other severe weather conditions',
      ],
    },

    monitoring: {
      title: 'Your Responsibility',
      text: `Please monitor the weather forecast leading up to your event. If you see concerning conditions developing, reach out to us as soon as possible so we can discuss options.`,
    },

    options: {
      title: 'Weather Cancellation Options',
      intro: 'If weather makes it unsafe to use the equipment, you have two options:',
      items: [
        {
          title: 'Full Refund',
          description: 'Receive a complete refund including your $50 deposit.',
        },
        {
          title: 'Reschedule',
          description: 'Move your rental to another available date at no extra cost.',
        },
      ],
    },

    process: {
      title: 'How to Request Weather Cancellation',
      steps: [
        'Contact us via phone, text, or email as soon as you become concerned about weather',
        'We\'ll monitor conditions with you and make a determination together',
        'If we determine conditions are unsafe, we\'ll process your chosen option (refund or reschedule)',
        'You can also request changes through your My Bookings dashboard',
      ],
    },

    timing: {
      title: 'Timing Tips',
      text: `Weekends fill up fast! If you think weather might be an issue, let us know as early as possible. The earlier you reach out, the more reschedule options we'll have available.`,
    },
  },

  // ===========================================================================
  // DELIVERY & PICKUP
  // ===========================================================================
  delivery: {
    title: 'Delivery & Pickup',
    lastUpdated: '2024-12-24',

    deliveryHours: {
      title: 'Delivery Hours',
      text: 'Monday through Saturday, between 7:00 AM and 2:00 PM. We will confirm a specific delivery window with you before your event.',
    },

    pickupHours: {
      title: 'Pickup Hours',
      text: 'Monday through Saturday, typically between 5:00 PM and 8:00 PM on the same day, or by 9:00 AM the following morning (weekdays only).',
    },

    noSunday: {
      title: 'No Sunday Service',
      text: 'We do not deliver or pick up on Sundays. If your event is on Sunday, we\'ll deliver Saturday and pick up Monday—your bounce house will be ready and waiting for your party!',
    },

    serviceArea: {
      title: 'Service Area',
      text: 'We proudly serve Ocala, Marion County, and surrounding areas. Delivery is included in your rental price for most locations. Not sure if you\'re in our area? Just ask!',
    },
  },

  // ===========================================================================
  // SETUP REQUIREMENTS
  // ===========================================================================
  setup: {
    title: 'Setup Requirements',
    lastUpdated: '2024-12-24',

    requirements: [
      {
        emphasis: 'Flat, level surface:',
        text: 'Inflatables must be set up on a flat, level area free of debris, holes, sprinkler heads, and sharp objects. Grass is preferred; concrete and asphalt are acceptable.',
      },
      {
        emphasis: 'Power access:',
        text: 'A standard 110/120V outdoor electrical outlet within 50 feet of the setup location is required. The outlet must be on a dedicated circuit. Extension cords are not recommended.',
      },
      {
        emphasis: 'Clear access:',
        text: 'Please ensure we have clear access to the setup area. Gates should be unlocked, and the path should be free of obstacles.',
      },
      {
        emphasis: 'Space requirements:',
        text: 'Each rental has specific space requirements listed on our website. Please verify you have adequate space before booking. Allow at least 5 feet of clearance on all sides.',
      },
    ],
  },
} as const;

// =============================================================================
// SUMMARY VERSIONS (For space-constrained areas)
// =============================================================================

export const POLICY_SUMMARIES = {
  cancellation: `Cancellations 48+ hours ahead receive a full refund (minus $50 deposit), 24-48 hours receive 50%, and within 24 hours receive no refund. Weather cancellations receive a full refund including deposit. Questions? We're happy to help—just reach out!`,

  safety: `Adult supervision required at all times. No shoes, sharp objects, food, or drinks inside. Observe all capacity limits. Exit immediately if the unit begins to deflate.`,

  liability: `By booking, you acknowledge inflatable activities involve inherent risks and agree to supervise all participants, follow safety rules, and hold Pop and Drop Party Rentals harmless from any claims arising from use of the equipment.`,

  weather: `If weather makes it unsafe to use the equipment, you'll receive a full refund (including deposit) or can reschedule at no extra cost. Safety always comes first!`,

  deposit: `Your $50 deposit secures your date and is applied toward your total. Non-refundable for standard cancellations, but we're always happy to talk if something unexpected comes up.`,

  termsCheckbox: `I agree to the rental terms, safety requirements, and liability waiver. I understand the cancellation policy and that adult supervision is required at all times.`,
} as const;

// =============================================================================
// QUICK FACTS (For Quick Reference displays)
// =============================================================================

export const QUICK_FACTS = [
  {
    icon: 'DollarSign',
    label: 'Deposit',
    value: '$50 secures your date',
    color: 'fuchsia' as const,
  },
  {
    icon: 'CalendarX',
    label: 'Sunday Service',
    value: 'No delivery/pickup',
    color: 'purple' as const,
  },
  {
    icon: 'Clock',
    label: 'Delivery',
    value: 'Mon–Sat, 7 AM–2 PM',
    color: 'cyan' as const,
  },
  {
    icon: 'MapPin',
    label: 'Service Area',
    value: 'Ocala & Marion County',
    color: 'cyan' as const,
  },
] as const;

// =============================================================================
// KEY TERMS (For bullet point displays)
// =============================================================================

export const KEY_TERMS = [
  '$50 deposit secures your date',
  '48+ hours notice = full refund (minus deposit)',
  'Weather issues? We\'ll work with you',
  'Balance due on delivery',
  'Adult supervision required at all times',
] as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PolicyKey = keyof typeof POLICIES;
export type PolicySummaryKey = keyof typeof POLICY_SUMMARIES;
