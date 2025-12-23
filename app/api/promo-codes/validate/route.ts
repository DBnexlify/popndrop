// =============================================================================
// PROMO CODE VALIDATION API
// app/api/promo-codes/validate/route.ts
// Validates promo codes and returns discount information
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ValidatePromoCodeResponse, PromoCodeValidationResult } from '@/lib/promo-code-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, orderAmount, customerEmail, productSlug } = body;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      return NextResponse.json<ValidatePromoCodeResponse>(
        { valid: false, error: 'Please enter a promo code' },
        { status: 400 }
      );
    }

    if (!orderAmount || typeof orderAmount !== 'number' || orderAmount <= 0) {
      return NextResponse.json<ValidatePromoCodeResponse>(
        { valid: false, error: 'Invalid order amount' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    // Get customer ID if email provided
    let customerId: string | null = null;
    if (customerEmail) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail.toLowerCase())
        .single();
      
      customerId = customer?.id || null;
    }

    // Get product ID if slug provided
    let productId: string | null = null;
    if (productSlug) {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productSlug)
        .single();
      
      productId = product?.id || null;
    }

    // Call validation function
    const { data, error } = await supabase
      .rpc('validate_promo_code', {
        p_code: code.trim().toUpperCase(),
        p_customer_id: customerId,
        p_product_id: productId,
        p_order_amount: orderAmount,
      });

    if (error) {
      console.error('Error validating promo code:', error);
      return NextResponse.json<ValidatePromoCodeResponse>(
        { valid: false, error: 'Unable to validate code. Please try again.' },
        { status: 500 }
      );
    }

    // RPC returns array, get first result
    const result = Array.isArray(data) ? data[0] : data;
    
    if (!result) {
      return NextResponse.json<ValidatePromoCodeResponse>(
        { valid: false, error: 'Code not found' },
        { status: 200 }
      );
    }

    const validation = result as PromoCodeValidationResult;

    if (!validation.valid) {
      return NextResponse.json<ValidatePromoCodeResponse>(
        { valid: false, error: validation.error_message || 'Invalid code' },
        { status: 200 }
      );
    }

    // Success!
    return NextResponse.json<ValidatePromoCodeResponse>({
      valid: true,
      discount: {
        code: code.trim().toUpperCase(),
        type: validation.discount_type!,
        amount: validation.discount_amount!,
        calculatedDiscount: validation.calculated_discount!,
        description: validation.description,
      },
    });

  } catch (error) {
    console.error('Error in promo code validation:', error);
    return NextResponse.json<ValidatePromoCodeResponse>(
      { valid: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
