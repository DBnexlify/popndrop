// =============================================================================
// ADMIN BOOKING BLOCKS API
// app/api/admin/booking-blocks/route.ts
// CRUD operations for managing time slots (booking blocks)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

// -----------------------------------------------------------------------------
// GET - List all booking blocks for a product
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get('productSlug');

    const supabase = createServerClient();

    // Build query
    let query = supabase
      .from('booking_blocks')
      .select(`
        *,
        product:products(id, name, slug, scheduling_mode)
      `)
      .order('display_order', { ascending: true });

    // Filter by product if specified
    if (productSlug) {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productSlug)
        .single();

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      query = query.eq('product_id', product.id);
    }

    const { data: blocks, error } = await query;

    if (error) {
      console.error('Error fetching booking blocks:', error);
      return NextResponse.json({ error: 'Failed to fetch booking blocks' }, { status: 500 });
    }

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Booking blocks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST - Create a new booking block
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productSlug, startTime, endTime, label } = body;

    // Validation
    if (!productSlug || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'productSlug, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM (e.g., 09:00, 14:30)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, scheduling_mode')
      .eq('slug', productSlug)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify product uses slot-based scheduling
    if (product.scheduling_mode !== 'slot_based') {
      return NextResponse.json(
        { error: 'This product does not use slot-based scheduling' },
        { status: 400 }
      );
    }

    // Get max display_order for this product
    const { data: maxOrderData } = await supabase
      .from('booking_blocks')
      .select('display_order')
      .eq('product_id', product.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    // Create the booking block
    const { data: block, error: createError } = await supabase
      .from('booking_blocks')
      .insert({
        product_id: product.id,
        start_time: startTime,
        end_time: endTime,
        label: label || null,
        is_active: true,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating booking block:', createError);
      return NextResponse.json({ error: 'Failed to create time slot' }, { status: 500 });
    }

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error('Booking blocks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT - Update a booking block
// -----------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    // Verify admin auth
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { blockId, startTime, endTime, label, isActive, displayOrder } = body;

    if (!blockId) {
      return NextResponse.json({ error: 'blockId is required' }, { status: 400 });
    }

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return NextResponse.json(
        { error: 'Invalid start time format. Use HH:MM' },
        { status: 400 }
      );
    }
    if (endTime && !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Invalid end time format. Use HH:MM' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Build update object
    const updates: Record<string, any> = {};
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;
    if (label !== undefined) updates.label = label || null;
    if (isActive !== undefined) updates.is_active = isActive;
    if (displayOrder !== undefined) updates.display_order = displayOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update the block
    const { data: block, error: updateError } = await supabase
      .from('booking_blocks')
      .update(updates)
      .eq('block_id', blockId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking block:', updateError);
      return NextResponse.json({ error: 'Failed to update time slot' }, { status: 500 });
    }

    return NextResponse.json({ block });
  } catch (error) {
    console.error('Booking blocks PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE - Delete a booking block
// -----------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin auth
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');

    if (!blockId) {
      return NextResponse.json({ error: 'blockId is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if block has any active bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('block_id', blockId)
      .neq('status', 'cancelled')
      .limit(1);

    if (bookingsError) {
      console.error('Error checking bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to check existing bookings' }, { status: 500 });
    }

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete time slot with existing bookings. Deactivate it instead.',
          hasBookings: true 
        },
        { status: 400 }
      );
    }

    // Delete the block
    const { error: deleteError } = await supabase
      .from('booking_blocks')
      .delete()
      .eq('block_id', blockId);

    if (deleteError) {
      console.error('Error deleting booking block:', deleteError);
      return NextResponse.json({ error: 'Failed to delete time slot' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Booking blocks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
