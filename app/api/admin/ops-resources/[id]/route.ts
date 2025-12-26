// =============================================================================
// OPS RESOURCE API - Individual Resource Operations
// app/api/admin/ops-resources/[id]/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get single resource
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('ops_resources')
      .select(`
        *,
        availability:ops_resource_availability(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
      console.error('Error fetching ops resource:', error);
      return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/admin/ops-resources/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Full update
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, resource_type, color, notes, is_active } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('ops_resources')
      .update({
        name: name.trim(),
        resource_type,
        color: color || '#22d3ee',
        notes: notes?.trim() || null,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        availability:ops_resource_availability(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
      console.error('Error updating ops resource:', error);
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/admin/ops-resources/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Partial update (e.g., toggle active status)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const supabase = createServerClient();

    // Only allow specific fields to be patched
    const allowedFields = ['is_active', 'name', 'color', 'notes'];
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('ops_resources')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        availability:ops_resource_availability(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
      console.error('Error patching ops resource:', error);
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/admin/ops-resources/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove resource
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createServerClient();

    // Check if resource has any active booking blocks
    const { data: activeBlocks, error: blockCheckError } = await supabase
      .from('booking_blocks')
      .select('id')
      .eq('resource_id', id)
      .eq('resource_type', 'ops')
      .gte('end_ts', new Date().toISOString())
      .limit(1);

    if (blockCheckError) {
      console.error('Error checking booking blocks:', blockCheckError);
    }

    if (activeBlocks && activeBlocks.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete: This resource has upcoming bookings. Deactivate it instead.' 
      }, { status: 400 });
    }

    // Delete availability first (cascade should handle this, but be explicit)
    await supabase
      .from('ops_resource_availability')
      .delete()
      .eq('resource_id', id);

    // Delete the resource
    const { error } = await supabase
      .from('ops_resources')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
      console.error('Error deleting ops resource:', error);
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/ops-resources/[id]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
