// =============================================================================
// DAILY DELIVERY REMINDER CRON JOB
// app/api/cron/delivery-reminder/route.ts
// Runs at 6 PM daily to notify admin of tomorrow's deliveries
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToAllAdmins, type NotificationPayload } from '@/lib/push-notifications';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get tomorrow's date in local timezone (EST/EDT)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`[Cron] Checking deliveries for ${tomorrowStr}`);

    // Query bookings with delivery tomorrow
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        delivery_date,
        delivery_window,
        delivery_address,
        delivery_city,
        product_snapshot,
        customers (
          first_name,
          last_name,
          phone
        )
      `)
      .eq('delivery_date', tomorrowStr)
      .in('status', ['confirmed', 'paid'])
      .order('delivery_window', { ascending: true });

    if (error) {
      console.error('[Cron] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Cron] No deliveries tomorrow');
      return NextResponse.json({ 
        success: true, 
        message: 'No deliveries scheduled for tomorrow',
        deliveries: 0 
      });
    }

    console.log(`[Cron] Found ${bookings.length} delivery(ies) for tomorrow`);

    // Build notification content
    const deliveryCount = bookings.length;
    const deliveryWord = deliveryCount === 1 ? 'delivery' : 'deliveries';
    
    // Format delivery list for notification body
    const deliveryList = bookings.slice(0, 3).map(b => {
      const customer = b.customers as { first_name: string; last_name: string } | null;
      const name = customer ? `${customer.first_name} ${customer.last_name?.charAt(0) || ''}`.trim() : 'Unknown';
      const product = (b.product_snapshot as { name?: string })?.name || 'Rental';
      return `• ${b.delivery_window}: ${name} - ${product}`;
    }).join('\n');

    const moreText = deliveryCount > 3 ? `\n+ ${deliveryCount - 3} more` : '';

    // Build the push notification
    const payload: NotificationPayload = {
      title: `🚚 ${deliveryCount} ${deliveryWord} tomorrow`,
      body: `${deliveryList}${moreText}`,
      icon: '/admin/icon-192.png',
      badge: '/admin/badge-72.png',
      tag: `delivery-reminder-${tomorrowStr}`,
      requireInteraction: true,
      data: {
        url: '/admin/bookings?filter=upcoming',
        type: 'delivery_reminder',
      },
      actions: [
        { action: 'view', title: 'View Schedule' },
      ],
    };

    // Send push notification
    const result = await sendPushToAllAdmins(payload);

    console.log(`[Cron] Notification sent: ${result.sent} success, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Reminder sent for ${deliveryCount} ${deliveryWord}`,
      deliveries: deliveryCount,
      notification: {
        sent: result.sent,
        failed: result.failed,
      },
      bookings: bookings.map(b => ({
        booking_number: b.booking_number,
        window: b.delivery_window,
        address: `${b.delivery_address}, ${b.delivery_city}`,
      })),
    });

  } catch (error) {
    console.error('[Cron] Unexpected error:', error);
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
