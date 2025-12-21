// =============================================================================
// SEND PUSH NOTIFICATION ENDPOINT
// app/api/push/send/route.ts
// Called by Supabase Edge Functions or admin actions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@popanddroppartyrentals.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    bookingId?: string;
    type?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
  }>;
  requireInteraction?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Verify request is from trusted source (Supabase webhook or internal)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.PUSH_WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notification, adminId }: { notification: NotificationPayload; adminId?: string } = 
      await request.json();

    if (!notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'Missing notification title or body' },
        { status: 400 }
      );
    }

    // Get subscriptions (either for specific admin or all)
    let query = supabase.from('push_subscriptions').select('*');
    if (adminId) {
      query = query.eq('admin_id', adminId);
    }
    
    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('[Push] Failed to fetch subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No subscriptions found');
      return NextResponse.json({ success: true, sent: 0 });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/admin/icon-192.png',
      badge: notification.badge || '/admin/badge-72.png',
      tag: notification.tag || 'default',
      data: notification.data || { url: '/admin' },
      actions: notification.actions || [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: notification.requireInteraction || false,
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (err: unknown) {
          const error = err as { statusCode?: number };
          // If subscription is invalid, remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log('[Push] Removing invalid subscription:', sub.endpoint);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[Push] Sent: ${sent}, Failed: ${failed}`);
    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error('[Push] Send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
