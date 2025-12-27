// =============================================================================
// STRIPE CLIENT & CONFIGURATION
// lib/stripe.ts
// =============================================================================

import Stripe from 'stripe';

// =============================================================================
// STRIPE INITIALIZATION
// Creates a fresh instance each time to avoid stale key caching issues
// (Important when switching between test/live keys)
// =============================================================================

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  
  // Always create fresh instance to ensure we use current env var
  // This prevents issues with warm serverless functions caching old keys
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
  });
}

// For backwards compatibility - getter that creates fresh instance
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// =============================================================================
// PRICING CONSTANTS
// =============================================================================

// Deposit amount in cents (for Stripe API)
export const DEPOSIT_AMOUNT_CENTS = 5000; // $50.00

// Deposit amount in dollars (for display and database)
export const DEPOSIT_AMOUNT_DOLLARS = 50;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert dollars to cents for Stripe
 * @example dollarsToCents(50) => 5000
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars for display
 * @example centsToDollars(5000) => 50
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format cents as currency string
 * @example formatCentsAsCurrency(5000) => "$50.00"
 */
export function formatCentsAsCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
