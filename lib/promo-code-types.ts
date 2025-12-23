// =============================================================================
// PROMO CODE TYPES
// lib/promo-code-types.ts
// TypeScript types for the promo code system
// =============================================================================

// =============================================================================
// DATABASE TYPES
// =============================================================================

export type PromoCodeStatus = 'active' | 'used' | 'expired' | 'disabled';
export type PromoDiscountType = 'percent' | 'fixed';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_amount: number;
  max_discount_cap: number | null;
  minimum_order_amount: number | null;
  expiration_date: string | null;
  customer_id: string | null;
  usage_limit: number | null;
  usage_count: number;
  single_use_per_customer: boolean;
  applicable_products: string[] | null;
  excluded_products: string[] | null;
  status: PromoCodeStatus;
  description: string | null;
  internal_notes: string | null;
  campaign_name: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface PromoCodeUsage {
  id: string;
  promo_code_id: string;
  booking_id: string;
  customer_id: string;
  original_amount: number;
  discount_applied: number;
  final_amount: number;
  used_at: string;
}

// =============================================================================
// VALIDATION RESULT (from database function)
// =============================================================================

export interface PromoCodeValidationResult {
  valid: boolean;
  error_message: string | null;
  promo_code_id: string | null;
  discount_type: PromoDiscountType | null;
  discount_amount: number | null;
  max_discount_cap: number | null;
  calculated_discount: number | null;
  description: string | null;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface ValidatePromoCodeRequest {
  code: string;
  orderAmount: number;
  customerEmail?: string;
  productSlug?: string;
}

export interface ValidatePromoCodeResponse {
  valid: boolean;
  error?: string;
  discount?: {
    code: string;
    type: PromoDiscountType;
    amount: number;
    calculatedDiscount: number;
    description: string | null;
  };
}

export interface AppliedPromoCode {
  code: string;
  promoCodeId: string;
  discountType: PromoDiscountType;
  discountAmount: number;
  calculatedDiscount: number;
  description: string | null;
}

// =============================================================================
// ADMIN TYPES
// =============================================================================

export interface CreatePromoCodeRequest {
  code?: string;  // If not provided, auto-generate
  discount_type: PromoDiscountType;
  discount_amount: number;
  max_discount_cap?: number | null;
  minimum_order_amount?: number | null;
  expiration_date?: string | null;
  customer_id?: string | null;
  usage_limit?: number | null;
  single_use_per_customer?: boolean;
  applicable_products?: string[] | null;
  excluded_products?: string[] | null;
  description?: string | null;
  internal_notes?: string | null;
  campaign_name?: string | null;
}

export interface UpdatePromoCodeRequest {
  discount_type?: PromoDiscountType;
  discount_amount?: number;
  max_discount_cap?: number | null;
  minimum_order_amount?: number | null;
  expiration_date?: string | null;
  usage_limit?: number | null;
  single_use_per_customer?: boolean;
  applicable_products?: string[] | null;
  excluded_products?: string[] | null;
  status?: PromoCodeStatus;
  description?: string | null;
  internal_notes?: string | null;
  campaign_name?: string | null;
}

export interface PromoCodeWithUsage extends PromoCode {
  usage: PromoCodeUsage[];
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

// =============================================================================
// HELPERS
// =============================================================================

export function formatDiscount(type: PromoDiscountType, amount: number, cap?: number | null): string {
  if (type === 'percent') {
    const base = `${amount}% off`;
    return cap ? `${base} (max $${cap})` : base;
  }
  return `$${amount} off`;
}

export function formatPromoCodeStatus(status: PromoCodeStatus): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
      };
    case 'used':
      return {
        label: 'Fully Used',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    case 'expired':
      return {
        label: 'Expired',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
      };
    case 'disabled':
      return {
        label: 'Disabled',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/30',
      };
  }
}

export function calculateDiscount(
  type: PromoDiscountType,
  amount: number,
  orderAmount: number,
  cap?: number | null
): number {
  if (type === 'percent') {
    const discount = orderAmount * (amount / 100);
    if (cap && discount > cap) {
      return cap;
    }
    return Math.round(discount * 100) / 100;
  }
  // Fixed discount - can't exceed order amount
  return Math.min(amount, orderAmount);
}
