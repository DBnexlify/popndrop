// =============================================================================
// DAILY DELIVERY REMINDER CRON JOB
// app/api/cron/delivery-reminders/route.ts
// Sends push notifications for next-day deliveries
// Should be called daily via Vercel Cron or similar
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToAllAdmins } from '@/lib/push-notifications';

// Create Supabase client with service role
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If no secret configured, allow in development
  if (!cronSecret && process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get all deliveries scheduled for tomorrow
    const { data: deliveries, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        delivery_date,
        delivery_window,
        delivery_address,
        delivery_city,
        product_snapshot,
        customer:customers(first_name, last_name, phone)
      `)
      .eq('delivery_date', tomorrowStr)
      .in('status', ['confirmed', 'pending'])
      .order('delivery_window');

    if (error) {
      console.error('[Cron] Failed to fetch deliveries:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!deliveries || deliveries.length === 0) {
      console.log('[Cron] No deliveries tomorrow');
      return NextResponse.json({ 
        success: true, 
        message: 'No deliveries tomorrow',
        count: 0 
      });
    }

    console.log(`[Cron] Found ${deliveries.length} deliveries for tomorrow`);

    // Build notification message
    const deliveryList = deliveries.map((d: { 
      booking_number: string;
      delivery_window: string;
      delivery_city: string;
      product_snapshot: { name: string };
      customer: { first_name: string; last_name: string } | null;
    }) => {
      const customerName = d.customer 
        ? `${d.customer.first_name} ${d.customer.last_name}` 
        : 'Unknown';
      return `• ${d.delivery_window}: ${d.product_snapshot?.name || 'Rental'} to ${customerName} (${d.delivery_city})`;
    }).join('\n');

    // Send push notification
    const result = await sendPushToAllAdmins({
      title: `📦 ${deliveries.length} Deliver${deliveries.length === 1 ? 'y' : 'ies'} Tomorrow`,
      body: deliveries.length <= 3 
        ? deliveryList 
        : `You have ${deliveries.length} deliveries scheduled. Tap to view details.`,
      icon: '/admin/icon-192.png',
      badge: '/admin/badge-72.png',
      tag: 'delivery-reminder',
      requireInteraction: true,
      data: {
        url: '/admin',
        type: 'delivery_reminder',
      },
      actions: [
        { action: 'view', title: 'View Schedule' },
      ],
    });

    console.log('[Cron] Reminder sent:', result);

    return NextResponse.json({
      success: true,
      deliveryCount: deliveries.length,
      notificationResult: result,
    });

  } catch (error) {
    console.error('[Cron] Delivery reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
