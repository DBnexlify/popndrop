// =============================================================================
// LOYALTY REWARDS TYPES
// lib/loyalty-types.ts
// TypeScript types for the customer loyalty rewards system
// =============================================================================

// =============================================================================
// DATABASE TYPES
// =============================================================================

export interface LoyaltyTier {
  id: string;
  tier_name: string;
  tier_level: number;
  bookings_required: number;
  discount_percent: number;
  max_discount_cap: number;
  minimum_order_amount: number;
  code_expiration_days: number;
  code_prefix: string;
  display_name: string;
  description: string | null;
  badge_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerLoyaltyReward {
  id: string;
  customer_id: string;
  tier_id: string;
  promo_code_id: string | null;
  bookings_at_award: number;
  triggering_booking_id: string | null;
  awarded_at: string;
  code_used: boolean;
  code_used_at: string | null;
  code_expired: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
}

export interface LoyaltyAuditLog {
  id: string;
  customer_id: string | null;
  reward_id: string | null;
  booking_id: string | null;
  action_type: LoyaltyActionType;
  action_details: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export type LoyaltyActionType = 
  | 'tier_achieved'
  | 'code_generated'
  | 'code_used'
  | 'code_expired'
  | 'manual_award'
  | 'email_sent'
  | 'reminder_sent';

// =============================================================================
// FUNCTION RETURN TYPES
// =============================================================================

export interface LoyaltyTierEligibility {
  eligible: boolean;
  tier_id: string;
  tier_name: string;
  tier_level: number;
  bookings_required: number;
  discount_percent: number;
  max_discount_cap: number;
  minimum_order_amount: number;
  code_prefix: string;
  display_name: string;
  description: string | null;
  already_awarded: boolean;
}

export interface LoyaltyAwardResult {
  success: boolean;
  reward_id: string | null;
  promo_code_id: string | null;
  promo_code: string | null;
  error_message: string | null;
}

export interface AvailableLoyaltyReward {
  reward_id: string;
  tier_name: string;
  discount_percent: number;
  promo_code: string;
  expires_at: string;
  min_order: number;
  max_discount: number;
}

export interface EarnedLoyaltyReward {
  reward_id: string;
  tier_name: string;
  discount_percent: number;
  awarded_at: string;
  code_used: boolean;
  code_used_at: string | null;
}

export interface CustomerLoyaltyStatus {
  current_bookings: number;
  current_tier_name: string | null;
  current_tier_level: number | null;
  next_tier_name: string | null;
  next_tier_level: number | null;
  bookings_until_next: number;
  progress_percent: number;
  available_rewards: AvailableLoyaltyReward[];
  earned_rewards: EarnedLoyaltyReward[];
}

export interface LoyaltyDashboardStats {
  total_rewards_issued: number;
  rewards_redeemed: number;
  rewards_pending: number;
  rewards_expired: number;
  redemption_rate_percent: number;
  total_discount_given: number;
  customers_with_rewards: number;
}

// =============================================================================
// UI TYPES
// =============================================================================

export interface LoyaltyProgressProps {
  currentBookings: number;
  nextTierBookings: number | null;
  nextTierName: string | null;
  nextTierDiscount: number | null;
  progressPercent: number;
}

export interface LoyaltyBadgeProps {
  tierName: string;
  tierLevel: number;
  badgeColor: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface LoyaltyRewardCardProps {
  reward: AvailableLoyaltyReward;
  onApply?: (code: string) => void;
}

// =============================================================================
// EMAIL TYPES
// =============================================================================

export interface LoyaltyRewardEmailData {
  customerName: string;
  customerEmail: string;
  tierName: string;
  discountPercent: number;
  promoCode: string;
  expirationDate: string;
  minOrderAmount: number;
  maxDiscountCap: number;
  bookingsCompleted: number;
  nextTierInfo: {
    name: string;
    bookingsRequired: number;
    discountPercent: number;
  } | null;
}

export interface LoyaltyReminderEmailData {
  customerName: string;
  customerEmail: string;
  promoCode: string;
  discountPercent: number;
  expirationDate: string;
  daysUntilExpiration: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get badge color classes based on tier
 */
export function getTierBadgeClasses(badgeColor: string): string {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    green: 'bg-green-500/10 border-green-500/30 text-green-300',
  };
  return colorMap[badgeColor] || colorMap.fuchsia;
}

/**
 * Get progress bar color based on progress percent
 * Uses brand colors: fuchsia → purple → cyan
 */
export function getProgressBarColor(percent: number): string {
  if (percent >= 100) return 'from-cyan-400 to-cyan-500';         // Complete! Cyan success
  if (percent >= 75) return 'from-purple-500 to-cyan-500';        // Almost there
  if (percent >= 50) return 'from-fuchsia-500 to-purple-600';     // Good progress (main brand)
  return 'from-fuchsia-600 to-fuchsia-400';                       // Getting started
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires tomorrow';
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  if (diffDays <= 30) return `Expires in ${Math.ceil(diffDays / 7)} weeks`;
  
  return `Expires ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get encouraging message based on progress
 */
export function getProgressMessage(
  currentBookings: number,
  nextTierBookings: number | null,
  nextTierName: string | null
): string {
  if (!nextTierBookings || !nextTierName) {
    return "You've reached our highest loyalty tier! 🎉";
  }
  
  const remaining = nextTierBookings - currentBookings;
  
  if (remaining === 1) {
    return `Just 1 more booking until you unlock ${nextTierName} rewards!`;
  }
  
  if (remaining <= 2) {
    return `So close! ${remaining} bookings away from ${nextTierName} rewards!`;
  }
  
  return `${remaining} bookings until you reach ${nextTierName} status`;
}

/**
 * Format discount for display
 */
export function formatDiscount(percent: number, maxCap: number): string {
  return `${percent}% off (up to $${maxCap})`;
}
