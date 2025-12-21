// =============================================================================
// PUSH NOTIFICATION UTILITIES
// lib/push-notifications.ts
// Server-side utilities for sending push notifications
// =============================================================================

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push if VAPID keys are available
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@popanddroppartyrentals.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// =============================================================================
// TYPES
// =============================================================================

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  bookingId?: string;
  type?: 'new_booking' | 'payment' | 'reminder' | 'alert';
  requireInteraction?: boolean;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  admin_id: string;
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

export const notificationTemplates = {
  newBooking: (bookingNumber: string, customerName: string, eventDate: string): PushNotification => ({
    title: '🎉 New Booking!',
    body: `${customerName} booked for ${eventDate}`,
    tag: `booking-${bookingNumber}`,
    url: `/admin/bookings?search=${bookingNumber}`,
    type: 'new_booking',
    requireInteraction: true,
  }),

  depositPaid: (bookingNumber: string, amount: number): PushNotification => ({
    title: '💰 Deposit Received',
    body: `$${amount.toFixed(2)} deposit paid for ${bookingNumber}`,
    tag: `payment-${bookingNumber}`,
    url: `/admin/bookings?search=${bookingNumber}`,
    type: 'payment',
  }),

  balancePaid: (bookingNumber: string, amount: number): PushNotification => ({
    title: '✅ Balance Paid',
    body: `$${amount.toFixed(2)} balance paid for ${bookingNumber}`,
    tag: `payment-${bookingNumber}`,
    url: `/admin/bookings?search=${bookingNumber}`,
    type: 'payment',
  }),

  deliveryReminder: (count: number): PushNotification => ({
    title: '🚚 Deliveries Today',
    body: `You have ${count} deliver${count === 1 ? 'y' : 'ies'} scheduled`,
    tag: 'daily-reminder',
    url: '/admin',
    type: 'reminder',
  }),

  pickupReminder: (count: number): PushNotification => ({
    title: '📦 Pickups Today',
    body: `You have ${count} pickup${count === 1 ? '' : 's'} scheduled`,
    tag: 'daily-reminder',
    url: '/admin',
    type: 'reminder',
  }),

  bookingCancelled: (bookingNumber: string, reason: string): PushNotification => ({
    title: '❌ Booking Cancelled',
    body: `${bookingNumber} was cancelled: ${reason.substring(0, 50)}`,
    tag: `cancel-${bookingNumber}`,
    url: `/admin/bookings?search=${bookingNumber}`,
    type: 'alert',
  }),
};

// =============================================================================
// SEND NOTIFICATION
// =============================================================================

/**
 * Send a push notification to all subscribed admins
 */
export async function sendPushNotification(notification: PushNotification): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> {
  try {
    // Check if web-push is configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('[Push] VAPID keys not configured, skipping notification');
      return { success: true, sent: 0, failed: 0 };
    }

    // Get all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      console.error('[Push] Failed to fetch subscriptions:', error);
      return { success: false, sent: 0, failed: 0 };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No subscriptions found');
      return { success: true, sent: 0, failed: 0 };
    }

    // Prepare payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/admin/icon-192.png',
      badge: notification.badge || '/admin/badge-72.png',
      tag: notification.tag || notification.type || 'default',
      data: {
        url: notification.url || '/admin',
        bookingId: notification.bookingId,
        type: notification.type,
      },
      requireInteraction: notification.requireInteraction || false,
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub: PushSubscription) => sendToSubscription(sub, payload))
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[Push] Notification sent - Success: ${sent}, Failed: ${failed}`);
    return { success: true, sent, failed };
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Send notification to a specific subscription
 */
async function sendToSubscription(sub: PushSubscription, payload: string): Promise<void> {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, payload);
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    // Remove invalid subscriptions
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('[Push] Removing invalid subscription:', sub.endpoint);
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', sub.endpoint);
    }
    throw err;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Notify admins of a new booking
 */
export async function notifyNewBooking(
  bookingNumber: string,
  customerName: string,
  eventDate: string
) {
  return sendPushNotification(
    notificationTemplates.newBooking(bookingNumber, customerName, eventDate)
  );
}

/**
 * Notify admins of deposit payment
 */
export async function notifyDepositPaid(bookingNumber: string, amount: number) {
  return sendPushNotification(
    notificationTemplates.depositPaid(bookingNumber, amount)
  );
}

/**
 * Notify admins of balance payment
 */
export async function notifyBalancePaid(bookingNumber: string, amount: number) {
  return sendPushNotification(
    notificationTemplates.balancePaid(bookingNumber, amount)
  );
}

/**
 * Notify admins of booking cancellation
 */
export async function notifyBookingCancelled(bookingNumber: string, reason: string) {
  return sendPushNotification(
    notificationTemplates.bookingCancelled(bookingNumber, reason)
  );
}
