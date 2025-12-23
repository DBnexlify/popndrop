// =============================================================================
// BOOKING AUTOMATION CRON JOB
// app/api/cron/booking-automation/route.ts
// Runs periodically to process booking status automation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processBookingAutomation } from '@/lib/automation';
import { sendPushToAllAdmins } from '@/lib/push-notifications';

// Vercel Cron configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

/**
 * GET /api/cron/booking-automation
 * 
 * This endpoint is called by Vercel Cron to process booking automation.
 * It checks all bookings and:
 * 1. Auto-completes eligible bookings (paid in full, window passed)
 * 2. Creates attention items for bookings needing admin action
 * 
 * Schedule: Every 2 hours (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting booking automation processing...');
    
    // Run the automation processor
    const stats = await processBookingAutomation();
    
    console.log('Automation processing complete:', stats);
    
    // Send push notification to admins if there are new attention items
    if (stats.attentionCreated > 0) {
      await sendPushToAllAdmins({
        title: `${stats.attentionCreated} booking${stats.attentionCreated > 1 ? 's need' : ' needs'} attention`,
        body: 'Tap to review and take action',
        data: {
          url: '/admin/bookings?filter=attention',
        },
      });
    }
    
    // Send notification for auto-completed bookings
    if (stats.autoCompleted > 0) {
      await sendPushToAllAdmins({
        title: `${stats.autoCompleted} booking${stats.autoCompleted > 1 ? 's' : ''} auto-completed`,
        body: 'Paid in full, pickup window passed',
        data: {
          url: '/admin/bookings?status=completed',
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
    
  } catch (error) {
    console.error('Booking automation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/booking-automation
 * 
 * Manual trigger for automation (admin use)
 */
export async function POST(request: NextRequest) {
  try {
    // This endpoint requires admin authentication
    // For now, just verify it's coming from the same origin
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Basic origin check
    if (origin && !origin.includes(host || '')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    console.log('Manual automation trigger...');
    
    const stats = await processBookingAutomation();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
    
  } catch (error) {
    console.error('Manual automation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
