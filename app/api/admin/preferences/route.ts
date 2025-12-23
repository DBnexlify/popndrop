// =============================================================================
// ADMIN NOTIFICATION PREFERENCES API
// app/api/admin/preferences/route.ts
// GET: Fetch preferences, POST: Update preferences
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';
import { DEFAULT_PREFERENCES, type NotificationPreferences } from '@/lib/notification-preferences-types';

// =============================================================================
// GET - Fetch admin's notification preferences
// =============================================================================

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('admin_id', admin.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is fine, use defaults)
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          ...DEFAULT_PREFERENCES,
          admin_id: admin.id,
        },
        isDefault: true,
      });
    }

    return NextResponse.json({
      preferences,
      isDefault: false,
    });
  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Update admin's notification preferences
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServerClient();

    // Validate mode if provided
    if (body.mode && !['realtime', 'digest', 'custom'].includes(body.mode)) {
      return NextResponse.json(
        { error: 'Invalid notification mode' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Partial<NotificationPreferences> = {};
    
    const allowedFields = [
      'mode',
      'new_booking',
      'booking_cancelled',
      'booking_modified',
      'payment_deposit',
      'payment_full',
      'payment_failed',
      'refund_requested',
      'refund_completed',
      'delivery_prompt',
      'pickup_prompt',
      'balance_reminder',
      'auto_complete_notice',
      'daily_summary',
      'daily_summary_time',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = body[field];
      }
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('admin_id', admin.id)
      .single();

    let result;

    if (existing) {
      // Update existing preferences
      result = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('admin_id', admin.id)
        .select()
        .single();
    } else {
      // Insert new preferences with defaults + updates
      result = await supabase
        .from('notification_preferences')
        .insert({
          admin_id: admin.id,
          ...DEFAULT_PREFERENCES,
          ...updateData,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving preferences:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: result.data,
    });
  } catch (error) {
    console.error('Preferences POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
