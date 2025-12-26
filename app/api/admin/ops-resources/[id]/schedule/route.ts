// =============================================================================
// OPS RESOURCE SCHEDULE API
// app/api/admin/ops-resources/[id]/schedule/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT - Update schedule (replaces all availability entries)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: resourceId } = await context.params;
    const body = await request.json();
    const { schedule } = body;

    // Validate schedule format
    // Expected: { 0: { start: "08:00", end: "20:00", enabled: true }, ... }
    if (!schedule || typeof schedule !== 'object') {
      return NextResponse.json({ error: 'Invalid schedule format' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify resource exists
    const { data: resource, error: resourceError } = await supabase
      .from('ops_resources')
      .select('id')
      .eq('id', resourceId)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Delete existing availability
    const { error: deleteError } = await supabase
      .from('ops_resource_availability')
      .delete()
      .eq('resource_id', resourceId);

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }

    // Build new availability entries
    const availabilityEntries = [];
    
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      const daySchedule = schedule[dayOfWeek];
      
      if (daySchedule) {
        // Ensure time format includes seconds
        const startTime = daySchedule.start?.length === 5 
          ? `${daySchedule.start}:00` 
          : daySchedule.start || '08:00:00';
        const endTime = daySchedule.end?.length === 5 
          ? `${daySchedule.end}:00` 
          : daySchedule.end || '20:00:00';

        availabilityEntries.push({
          resource_id: resourceId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_available: daySchedule.enabled ?? true,
        });
      } else {
        // Default entry for missing days
        availabilityEntries.push({
          resource_id: resourceId,
          day_of_week: dayOfWeek,
          start_time: '08:00:00',
          end_time: '20:00:00',
          is_available: true,
        });
      }
    }

    // Insert new availability
    const { error: insertError } = await supabase
      .from('ops_resource_availability')
      .insert(availabilityEntries);

    if (insertError) {
      console.error('Error inserting availability:', insertError);
      return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
    }

    // Fetch updated resource with availability
    const { data: updatedResource, error: fetchError } = await supabase
      .from('ops_resources')
      .select(`
        *,
        availability:ops_resource_availability(*)
      `)
      .eq('id', resourceId)
      .single();

    if (fetchError) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error('Error in PUT /api/admin/ops-resources/[id]/schedule:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - Get schedule for a resource
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: resourceId } = await context.params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('ops_resource_availability')
      .select('*')
      .eq('resource_id', resourceId)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching schedule:', error);
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/admin/ops-resources/[id]/schedule:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
