// =============================================================================
// CANCELLATION & REFUND SYSTEM
// lib/cancellations.ts
// Handles cancellation policy, refund calculations, and Stripe refunds
// NOW USES CENTRALIZED POLICY FROM lib/policies
// =============================================================================

import { getStripe } from './stripe';
import { 
  calculateRefund as centralCalculateRefund,
  REFUND_RULES,
  BUSINESS_CONSTANTS,
  type RefundCalculation as CentralRefundCalculation,
  type RefundRule,
} from './policies';

// =============================================================================
// TYPES (Backward compatible)
// =============================================================================

export interface CancellationPolicyRule {
  min_days: number;
  max_days: number | null;
  refund_percent: number;
  label: string;
}

export interface CancellationPolicy {
  id: string;
  name: string;
  is_active: boolean;
  rules: CancellationPolicyRule[];
  weather_full_refund: boolean;
  allow_reschedule: boolean;
  processing_fee: number;
}

export interface RefundCalculation {
  daysUntilEvent: number;
  refundPercent: number;
  refundAmount: number;
  processingFee: number;
  policyLabel: string;
  isEligible: boolean;
}

export interface CancellationRequest {
  id: string;
  booking_id: string;
  status: 'pending' | 'approved' | 'denied' | 'refunded';
  reason: string | null;
  cancellation_type: 'customer_request' | 'weather' | 'emergency' | 'admin_initiated';
  days_before_event: number;
  policy_refund_percent: number;
  original_paid: number;
  suggested_refund: number;
  approved_refund: number | null;
  processing_fee: number;
  admin_notes: string | null;
  reviewed_at: string | null;
  stripe_refund_id: string | null;
  refund_processed_at: string | null;
  created_at: string;
  booking?: {
    booking_number: string;
    event_date: string;
    product_snapshot: { name: string };
    customer: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  };
}

// =============================================================================
// DEFAULT POLICY - Now derived from centralized source
// =============================================================================

// Convert REFUND_RULES (hours-based) to days-based for backward compatibility
// This maintains compatibility with existing database schema
export const DEFAULT_POLICY: CancellationPolicy = {
  id: 'default',
  name: 'Standard Policy',
  is_active: true,
  rules: [
    // 48+ hours = 2+ days
    { min_days: 2, max_days: null, refund_percent: 100, label: '48+ hours before delivery' },
    // 24-48 hours = 1 day
    { min_days: 1, max_days: 1, refund_percent: 50, label: '24-48 hours before delivery' },
    // <24 hours = 0 days
    { min_days: 0, max_days: 0, refund_percent: 0, label: 'Less than 24 hours before delivery' },
  ],
  weather_full_refund: true,
  allow_reschedule: true,
  processing_fee: 0,
};

// =============================================================================
// REFUND CALCULATION - Uses centralized logic
// =============================================================================

/**
 * Calculate refund amount based on cancellation policy
 * UPDATED: Now uses hours-based calculation from centralized policy
 */
export function calculateRefund(
  eventDate: Date | string,
  amountPaid: number,
  policy: CancellationPolicy = DEFAULT_POLICY,
  cancellationType: 'customer_request' | 'weather' | 'emergency' | 'admin_initiated' = 'customer_request'
): RefundCalculation {
  // Convert event date to delivery date (same day for now)
  const deliveryDateTime = typeof eventDate === 'string' 
    ? new Date(eventDate + 'T08:00:00') // Assume 8 AM delivery
    : eventDate;
  
  const cancelDateTime = new Date();
  
  // Use centralized calculation for weather/emergency
  if (cancellationType === 'weather' || cancellationType === 'emergency') {
    const result = centralCalculateRefund(
      amountPaid,
      deliveryDateTime,
      cancelDateTime,
      cancellationType === 'weather'
    );
    
    const daysUntil = Math.ceil(result.hoursUntilDelivery / 24);
    
    return {
      daysUntilEvent: daysUntil,
      refundPercent: result.refundPercentage,
      refundAmount: result.refundAmount,
      processingFee: 0,
      policyLabel: result.policyApplied,
      isEligible: true,
    };
  }
  
  // Use centralized calculation for standard cancellations
  const result = centralCalculateRefund(
    amountPaid,
    deliveryDateTime,
    cancelDateTime,
    false
  );
  
  const daysUntil = Math.ceil(result.hoursUntilDelivery / 24);
  
  return {
    daysUntilEvent: daysUntil,
    refundPercent: result.refundPercentage,
    refundAmount: result.refundAmount,
    processingFee: 0,
    policyLabel: result.policyApplied,
    isEligible: result.refundPercentage > 0,
  };
}

// =============================================================================
// STRIPE REFUND PROCESSING
// =============================================================================

export interface StripeRefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

/**
 * Process a refund through Stripe
 */
export async function processStripeRefund(
  paymentIntentId: string,
  amountInDollars: number,
  reason?: string
): Promise<StripeRefundResult> {
  try {
    const stripe = getStripe();
    
    // Convert to cents
    const amountInCents = Math.round(amountInDollars * 100);
    
    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountInCents,
      reason: 'requested_by_customer',
      metadata: {
        reason: reason || 'Customer cancellation request',
      },
    });
    
    return {
      success: true,
      refundId: refund.id,
      amount: amountInDollars,
    };
  } catch (error: any) {
    console.error('Stripe refund error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message?.includes('charge has already been refunded')) {
        return {
          success: false,
          error: 'This payment has already been refunded.',
        };
      }
      if (error.message?.includes('greater than the amount')) {
        return {
          success: false,
          error: 'Refund amount exceeds the original payment.',
        };
      }
    }
    
    return {
      success: false,
      error: error.message || 'Failed to process refund. Please try again.',
    };
  }
}

/**
 * Get refund status from Stripe
 */
export async function getStripeRefundStatus(refundId: string) {
  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.retrieve(refundId);
    
    return {
      status: refund.status,
      amount: refund.amount / 100,
      created: new Date(refund.created * 1000),
    };
  } catch (error) {
    console.error('Error fetching refund status:', error);
    return null;
  }
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get user-friendly status text
 */
export function getCancellationStatusText(status: CancellationRequest['status']): string {
  const statusMap = {
    pending: 'Pending Review',
    approved: 'Approved',
    denied: 'Denied',
    refunded: 'Refunded',
  };
  return statusMap[status] || status;
}

/**
 * Get status color class
 */
export function getCancellationStatusColor(status: CancellationRequest['status']): string {
  const colorMap = {
    pending: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    approved: 'text-green-400 bg-green-500/20 border-green-500/30',
    denied: 'text-red-400 bg-red-500/20 border-red-500/30',
    refunded: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  };
  return colorMap[status] || 'text-foreground/50 bg-white/5';
}

/**
 * Format refund policy for display
 * NOW USES CENTRALIZED REFUND_RULES
 */
export function formatPolicyRules(policy: CancellationPolicy): string[] {
  // Use centralized rules for consistency
  return REFUND_RULES.map(rule => {
    const refundText = rule.refundPercent === 100
      ? 'Full refund minus deposit'
      : rule.refundPercent === 0
      ? 'No refund'
      : `${rule.refundPercent}% refund minus deposit`;
    
    return `${rule.label}: ${refundText}`;
  });
}

// =============================================================================
// CONVENIENCE EXPORTS FROM CENTRALIZED POLICY
// =============================================================================

export { BUSINESS_CONSTANTS, REFUND_RULES } from './policies';
export type { RefundRule };
