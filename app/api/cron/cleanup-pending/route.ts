// =============================================================================
// PENDING BOOKING CLEANUP CRON JOB
// app/api/cron/cleanup-pending/route.ts
// 
// Runs every 15 minutes to clean up abandoned pending bookings
// This prevents "ghost blocks" that permanently reserve slots
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

// Pending bookings older than this many minutes will be cleaned up
const EXPIRY_MINUTES = 45;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('[Cleanup] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`[Cleanup] Starting pending booking cleanup (expiry: ${EXPIRY_MINUTES} minutes)`);

    // Call the database cleanup function
    const { data, error } = await supabase.rpc('cleanup_expired_pending_bookings', {
      p_expiry_minutes: EXPIRY_MINUTES,
    });

    if (error) {
      console.error('[Cleanup] Database error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    const result = data?.[0] || { deleted_bookings: 0, deleted_blocks: 0, booking_numbers: [] };
    const duration = Date.now() - startTime;

    console.log(`[Cleanup] Completed in ${duration}ms:`, result);

    // If bookings were cleaned up, send notification
    if (result.deleted_bookings > 0) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: NOTIFY_EMAIL,
          subject: `🧹 Cleanup: ${result.deleted_bookings} abandoned booking(s) removed`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">🧹 Pending Bookings Cleaned Up</h2>
              <p>The automated cleanup job removed abandoned checkout sessions:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f3f4f6;">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Bookings Removed</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${result.deleted_bookings}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Blocks Released</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${result.deleted_blocks}</td>
                </tr>
                <tr style="background: #f3f4f6;">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Booking Numbers</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${result.booking_numbers?.join(', ') || 'N/A'}</td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 14px;">
                These were bookings where customers started checkout but never completed payment 
                (abandoned after ${EXPIRY_MINUTES} minutes). The reserved time slots are now available again.
              </p>
            </div>
          `,
        });
        console.log('[Cleanup] Notification email sent');
      } catch (emailError) {
        console.error('[Cleanup] Failed to send notification email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      expiry_minutes: EXPIRY_MINUTES,
      deleted_bookings: result.deleted_bookings,
      deleted_blocks: result.deleted_blocks,
      booking_numbers: result.booking_numbers || [],
    });

  } catch (error) {
    console.error('[Cleanup] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
