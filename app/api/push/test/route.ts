// =============================================================================
// TEST PUSH NOTIFICATION ENDPOINT
// app/api/push/test/route.ts
// Send a test notification to verify the system works
// =============================================================================

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase';
import { sendTestNotification } from '@/lib/push-notifications';

export async function POST() {
  try {
    // Verify admin is authenticated
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send test notification
    const result = await sendTestNotification();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.sent > 0 
          ? `Test notification sent to ${result.sent} device(s)!` 
          : 'No devices registered for notifications yet',
        sent: result.sent,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Failed to send notification',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Push Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
