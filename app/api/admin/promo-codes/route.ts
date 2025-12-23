// =============================================================================
// ADMIN PROMO CODES API
// app/api/admin/promo-codes/route.ts
// CRUD operations for promo codes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { CreatePromoCodeRequest } from '@/lib/promo-code-types';

// =============================================================================
// GET - List all promo codes
// =============================================================================

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Verify admin auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all codes with usage
    const { data: codes, error } = await supabase
      .from('promo_codes')
      .select(`
        *,
        customer:customers (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promo codes:', error);
      return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });
    }

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error in GET promo codes:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// =============================================================================
// POST - Create new promo code
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify admin auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePromoCodeRequest = await request.json();

    // Validate required fields
    if (!body.discount_type || !body.discount_amount) {
      return NextResponse.json(
        { error: 'Discount type and amount are required' },
        { status: 400 }
      );
    }

    // Validate percent discount
    if (body.discount_type === 'percent' && body.discount_amount > 100) {
      return NextResponse.json(
        { error: 'Percent discount cannot exceed 100%' },
        { status: 400 }
      );
    }

    // Generate code if not provided
    let code = body.code?.trim().toUpperCase();
    if (!code) {
      const { data: generatedCode, error: genError } = await supabase
        .rpc('generate_promo_code');
      
      if (genError || !generatedCode) {
        console.error('Error generating code:', genError);
        return NextResponse.json(
          { error: 'Failed to generate code' },
          { status: 500 }
        );
      }
      code = generatedCode;
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Code already exists' },
        { status: 400 }
      );
    }

    // Create the code
    const { data: newCode, error: createError } = await supabase
      .from('promo_codes')
      .insert({
        code,
        discount_type: body.discount_type,
        discount_amount: body.discount_amount,
        max_discount_cap: body.max_discount_cap,
        minimum_order_amount: body.minimum_order_amount,
        expiration_date: body.expiration_date,
        customer_id: body.customer_id,
        usage_limit: body.usage_limit,
        single_use_per_customer: body.single_use_per_customer ?? false,
        applicable_products: body.applicable_products,
        excluded_products: body.excluded_products,
        description: body.description,
        internal_notes: body.internal_notes,
        campaign_name: body.campaign_name,
        created_by: admin.id,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating promo code:', createError);
      return NextResponse.json(
        { error: 'Failed to create code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: newCode });
  } catch (error) {
    console.error('Error in POST promo code:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// =============================================================================
// PATCH - Update promo code
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify admin auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Update the code
    const { data: updatedCode, error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating promo code:', error);
      return NextResponse.json(
        { error: 'Failed to update code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: updatedCode });
  } catch (error) {
    console.error('Error in PATCH promo code:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE - Delete promo code
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify admin auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete the code
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting promo code:', error);
      return NextResponse.json(
        { error: 'Failed to delete code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE promo code:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
