// =============================================================================
// PRODUCT SLOTS ADMIN API
// app/api/admin/product-slots/route.ts
// CRUD operations for product_slots table (time slot definitions)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

// =============================================================================
// GET - List all product slots
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const supabase = createServerClient();

    let query = supabase
      .from('product_slots')
      .select('*')
      .order('display_order', { ascending: true });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching product slots:', error);
      return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }

    return NextResponse.json({ slots: data });
  } catch (error) {
    console.error('GET product-slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST - Create new product slot
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, startTime, endTime, label } = body;

    if (!productId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'productId, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get max display_order for this product
    const { data: maxOrderData } = await supabase
      .from('product_slots')
      .select('display_order')
      .eq('product_id', productId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    // Create the slot
    const { data: slot, error } = await supabase
      .from('product_slots')
      .insert({
        product_id: productId,
        start_time_local: startTime + ':00',  // Convert HH:MM to HH:MM:SS
        end_time_local: endTime + ':00',
        label: label || null,
        is_active: true,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product slot:', error);
      return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error('POST product-slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// PUT - Update product slot
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotId, startTime, endTime, label, isActive, displayOrder } = body;

    if (!slotId) {
      return NextResponse.json({ error: 'slotId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Build update object
    const updates: Record<string, unknown> = {};
    
    if (startTime !== undefined) {
      updates.start_time_local = startTime.includes(':') && startTime.split(':').length === 2 
        ? startTime + ':00' 
        : startTime;
    }
    if (endTime !== undefined) {
      updates.end_time_local = endTime.includes(':') && endTime.split(':').length === 2 
        ? endTime + ':00' 
        : endTime;
    }
    if (label !== undefined) {
      updates.label = label;
    }
    if (isActive !== undefined) {
      updates.is_active = isActive;
    }
    if (displayOrder !== undefined) {
      updates.display_order = displayOrder;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: slot, error } = await supabase
      .from('product_slots')
      .update(updates)
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product slot:', error);
      return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error('PUT product-slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE - Delete product slot
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json({ error: 'slotId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if slot has any bookings
    // Note: This checks if the slot_id is referenced in bookings table
    const { data: bookingsWithSlot, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_id', slotId)
      .limit(1);

    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError);
    }

    if (bookingsWithSlot && bookingsWithSlot.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete slot with existing bookings', hasBookings: true },
        { status: 400 }
      );
    }

    // Delete the slot
    const { error } = await supabase
      .from('product_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error('Error deleting product slot:', error);
      return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE product-slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
