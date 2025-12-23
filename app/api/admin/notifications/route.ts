// =============================================================================
// ADMIN NOTIFICATIONS API
// app/api/admin/notifications/route.ts
// Fetch pending notifications and perform quick actions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

// =============================================================================
// GET - Fetch pending notifications
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const countsOnly = searchParams.get('counts') === 'true';

    const supabase = createServerClient();

    // If only counts requested, return just the counts
    if (countsOnly) {
      const { data: counts, error } = await supabase
        .rpc('get_notification_counts');

      if (error) {
        console.error('Error fetching notification counts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ counts: counts || { total: 0, unviewed: 0, urgent: 0, high: 0, medium: 0, low: 0 } });
    }

    // Fetch full notification list
    const { data: notifications, error } = await supabase
      .rpc('get_pending_notifications', { p_limit: limit });

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get counts for badge
    const { data: counts } = await supabase
      .rpc('get_notification_counts');

    return NextResponse.json({
      notifications: notifications || [],
      counts: counts || { total: 0, unviewed: 0, urgent: 0, high: 0, medium: 0, low: 0 },
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Perform notification action (view, snooze, dismiss, resolve)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationId, data } = body;

    if (!action || !notificationId) {
      return NextResponse.json(
        { error: 'Missing action or notificationId' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    switch (action) {
      case 'mark_viewed': {
        const { error } = await supabase
          .rpc('mark_notification_viewed', { p_id: notificationId });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'snooze': {
        // Default 1 hour, or use provided duration
        const duration = data?.duration || '1 hour';
        
        const { data: snoozeTime, error } = await supabase
          .rpc('snooze_notification', { 
            p_id: notificationId,
            p_duration: duration,
          });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, snoozedUntil: snoozeTime });
      }

      case 'dismiss': {
        const { error } = await supabase
          .from('attention_items')
          .update({
            status: 'dismissed',
            resolved_by: admin.id,
            resolved_at: new Date().toISOString(),
            resolution_notes: data?.reason || 'Dismissed by admin',
          })
          .eq('id', notificationId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'resolve': {
        const { error } = await supabase
          .from('attention_items')
          .update({
            status: 'resolved',
            resolved_by: admin.id,
            resolved_at: new Date().toISOString(),
            resolution_action: data?.resolutionAction || 'manual_resolve',
            resolution_notes: data?.notes,
          })
          .eq('id', notificationId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
