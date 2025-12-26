// =============================================================================
// OPS RESOURCES API - List & Create
// app/api/admin/ops-resources/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

// GET - List all ops resources
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('ops_resources')
      .select(`
        *,
        availability:ops_resource_availability(*)
      `)
      .order('resource_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching ops resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/admin/ops-resources:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create new ops resource
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, resource_type, color, notes, is_active } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!['delivery_crew', 'vehicle'].includes(resource_type)) {
      return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Create the resource
    const { data: resource, error: resourceError } = await supabase
      .from('ops_resources')
      .insert({
        name: name.trim(),
        resource_type,
        color: color || '#22d3ee',
        notes: notes?.trim() || null,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (resourceError) {
      console.error('Error creating ops resource:', resourceError);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    // Create default availability (all days, 8am-8pm)
    const defaultAvailability = Array.from({ length: 7 }, (_, i) => ({
      resource_id: resource.id,
      day_of_week: i,
      start_time: '08:00:00',
      end_time: '20:00:00',
      is_available: true,
    }));

    const { error: availError } = await supabase
      .from('ops_resource_availability')
      .insert(defaultAvailability);

    if (availError) {
      console.error('Error creating default availability:', availError);
      // Don't fail the whole request, resource was created
    }

    // Fetch the complete resource with availability
    const { data: completeResource, error: fetchError } = await supabase
      .from('ops_resources')
      .select(`
        *,
        availability:ops_resource_availability(*)
      `)
      .eq('id', resource.id)
      .single();

    if (fetchError) {
      // Return basic resource if fetch fails
      return NextResponse.json(resource, { status: 201 });
    }

    return NextResponse.json(completeResource, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/ops-resources:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
