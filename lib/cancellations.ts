// =============================================================================
// CANCELLATION & REFUND SYSTEM
// lib/cancellations.ts
// Handles cancellation policy, refund calculations, and Stripe refunds
// =============================================================================

import { getStripe } from './stripe';

// =============================================================================
// TYPES
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
  // Joined data
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
// DEFAULT POLICY (fallback if database policy not found)
// =============================================================================

export const DEFAULT_POLICY: CancellationPolicy = {
  id: 'default',
  name: 'Standard Policy',
  is_active: true,
  rules: [
    { min_days: 7, max_days: null, refund_percent: 100, label: '7+ days before event' },
    { min_days: 3, max_days: 6, refund_percent: 50, label: '3-6 days before event' },
    { min_days: 0, max_days: 2, refund_percent: 0, label: '0-2 days before event' },
  ],
  weather_full_refund: true,
  allow_reschedule: true,
  processing_fee: 0,
};

// =============================================================================
// REFUND CALCULATION
// =============================================================================

/**
 * Calculate refund amount based on cancellation policy
 */
export function calculateRefund(
  eventDate: Date | string,
  amountPaid: number,
  policy: CancellationPolicy = DEFAULT_POLICY,
  cancellationType: 'customer_request' | 'weather' | 'emergency' | 'admin_initiated' = 'customer_request'
): RefundCalculation {
  const eventDateObj = typeof eventDate === 'string' ? new Date(eventDate + 'T12:00:00') : eventDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const timeDiff = eventDateObj.getTime() - today.getTime();
  const daysUntilEvent = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // Weather/emergency cancellations get full refund if policy allows
  if (cancellationType === 'weather' && policy.weather_full_refund) {
    return {
      daysUntilEvent,
      refundPercent: 100,
      refundAmount: amountPaid,
      processingFee: 0,
      policyLabel: 'Weather cancellation - full refund',
      isEligible: true,
    };
  }
  
  if (cancellationType === 'emergency') {
    return {
      daysUntilEvent,
      refundPercent: 100,
      refundAmount: amountPaid,
      processingFee: 0,
      policyLabel: 'Emergency cancellation - full refund',
      isEligible: true,
    };
  }
  
  // Find matching rule
  let matchedRule: CancellationPolicyRule | null = null;
  
  for (const rule of policy.rules) {
    const meetsMinDays = daysUntilEvent >= rule.min_days;
    const meetsMaxDays = rule.max_days === null || daysUntilEvent <= rule.max_days;
    
    if (meetsMinDays && meetsMaxDays) {
      matchedRule = rule;
      break;
    }
  }
  
  // No matching rule = no refund
  if (!matchedRule) {
    return {
      daysUntilEvent,
      refundPercent: 0,
      refundAmount: 0,
      processingFee: 0,
      policyLabel: 'Outside cancellation window',
      isEligible: false,
    };
  }
  
  // Calculate refund
  const grossRefund = (amountPaid * matchedRule.refund_percent) / 100;
  const netRefund = Math.max(0, grossRefund - policy.processing_fee);
  
  return {
    daysUntilEvent,
    refundPercent: matchedRule.refund_percent,
    refundAmount: Math.round(netRefund * 100) / 100, // Round to 2 decimals
    processingFee: matchedRule.refund_percent > 0 ? policy.processing_fee : 0,
    policyLabel: matchedRule.label,
    isEligible: matchedRule.refund_percent > 0,
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
 */
export function formatPolicyRules(policy: CancellationPolicy): string[] {
  return policy.rules.map(rule => {
    const timeFrame = rule.max_days === null 
      ? `${rule.min_days}+ days before`
      : rule.min_days === rule.max_days
      ? `${rule.min_days} days before`
      : `${rule.min_days}-${rule.max_days} days before`;
    
    const refundText = rule.refund_percent === 100
      ? 'Full refund'
      : rule.refund_percent === 0
      ? 'No refund'
      : `${rule.refund_percent}% refund`;
    
    return `${timeFrame}: ${refundText}`;
  });
}
