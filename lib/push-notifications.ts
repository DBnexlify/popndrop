// =============================================================================
// PUSH NOTIFICATION SEND UTILITY
// lib/push-notifications.ts
// Server-side utility to send push notifications to admins
// =============================================================================

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_SUBJECT = 'mailto:bookings@popanddroprentals.com';

// Track if VAPID has been initialized
let vapidInitialized = false;

/**
 * Initialize VAPID - called at runtime, not module load
 */
function initializeVapid(): boolean {
  // Already initialized
  if (vapidInitialized) return true;
  
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  console.log('[Push] Checking VAPID keys...');
  console.log('[Push] Public key exists:', !!publicKey);
  console.log('[Push] Private key exists:', !!privateKey);
  
  if (!publicKey || !privateKey) {
    console.error('[Push] VAPID keys missing from environment');
    return false;
  }
  
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    vapidInitialized = true;
    console.log('[Push] VAPID initialized successfully');
    return true;
  } catch (e) {
    console.error('[Push] Failed to set VAPID details:', e);
    return false;
  }
}

// Supabase client with service role for server-side operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// =============================================================================
// TYPES
// =============================================================================

export type NotificationType = 
  | 'new_booking'
  | 'payment_received'
  | 'booking_cancelled'
  | 'delivery_reminder'
  | 'test';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: NotificationType;
    bookingId?: string;
    calendarEvent?: {
      title: string;
      start: string;
      end: string;
      location: string;
      description: string;
    };
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
}

export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

// =============================================================================
// SEND TO ALL ADMINS
// =============================================================================

export async function sendPushToAllAdmins(
  payload: NotificationPayload
): Promise<SendResult> {
  // Initialize VAPID at runtime
  if (!initializeVapid()) {
    console.log('[Push] VAPID not configured, skipping notification');
    return { success: true, sent: 0, failed: 0 };
  }

  const supabase = getSupabase();
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  try {
    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      console.error('[Push] Failed to fetch subscriptions:', error);
      return { success: false, sent: 0, failed: 0, errors: [error.message] };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No subscriptions found');
      return { success: true, sent: 0, failed: 0 };
    }

    console.log(`[Push] Sending to ${subscriptions.length} subscription(s)`);

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );

        sent++;
        console.log('[Push] Sent successfully to:', sub.endpoint.slice(0, 50));
      } catch (err: unknown) {
        failed++;
        const error = err as Error & { statusCode?: number };
        console.error('[Push] Failed to send:', error.message);
        errors.push(error.message);

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('[Push] Removing stale subscription');
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    }

    // Log notification (don't fail if this errors)
    try {
      await supabase.from('notification_log').insert({
        title: payload.title,
        body: payload.body,
        type: payload.data?.type || 'general',
        sent_count: sent,
        failed_count: failed,
      });
    } catch (logError) {
      console.error('[Push] Failed to log notification:', logError);
    }

    return {
      success: sent > 0 || subscriptions.length === 0,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    console.error('[Push] Unexpected error:', err);
    return {
      success: false,
      sent,
      failed,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS (used by API routes)
// =============================================================================

/**
 * Send a new booking notification to all admins
 * Called from /api/bookings when a new booking is created
 */
export async function notifyNewBooking(
  bookingNumber: string,
  customerName: string,
  eventDateFormatted: string,
  rentalName?: string,
  total?: number,
  address?: string,
  city?: string
): Promise<SendResult> {
  const payload: NotificationPayload = {
    title: '🎉 New Booking!',
    body: `${customerName} booked ${rentalName || 'a rental'} for ${eventDateFormatted}`,
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
    tag: `booking-${bookingNumber}`,
    requireInteraction: true,
    data: {
      url: `/admin/bookings?search=${bookingNumber}`,
      type: 'new_booking',
      bookingId: bookingNumber,
      ...(address && city && rentalName && total && {
        calendarEvent: {
          title: `🎈 ${rentalName} - ${customerName}`,
          start: eventDateFormatted,
          end: eventDateFormatted,
          location: `${address}, ${city}, FL`,
          description: `Booking #${bookingNumber}\nCustomer: ${customerName}\nTotal: $${total}`,
        },
      }),
    },
    actions: [
      { action: 'view', title: 'View Booking' },
      { action: 'calendar', title: '📅 Calendar' },
    ],
  };

  return sendPushToAllAdmins(payload);
}

/**
 * Send a payment received notification
 */
export async function notifyPaymentReceived(
  bookingNumber: string,
  customerName: string,
  amount: number,
  paymentType: 'deposit' | 'full' | 'balance'
): Promise<SendResult> {
  const typeLabel = {
    deposit: 'Deposit',
    full: 'Full payment',
    balance: 'Balance',
  }[paymentType];

  const payload: NotificationPayload = {
    title: '💰 Payment Received',
    body: `${typeLabel} of $${amount} from ${customerName}`,
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
    tag: `payment-${bookingNumber}`,
    data: {
      url: `/admin/bookings?search=${bookingNumber}`,
      type: 'payment_received',
      bookingId: bookingNumber,
    },
    actions: [
      { action: 'view', title: 'View Booking' },
    ],
  };

  return sendPushToAllAdmins(payload);
}

/**
 * Send a booking cancelled notification
 */
export async function notifyBookingCancelled(
  bookingNumber: string,
  customerName: string,
  eventDate: string
): Promise<SendResult> {
  const payload: NotificationPayload = {
    title: '❌ Booking Cancelled',
    body: `${customerName}'s booking for ${eventDate} was cancelled`,
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
    tag: `cancel-${bookingNumber}`,
    data: {
      url: `/admin/bookings?search=${bookingNumber}`,
      type: 'booking_cancelled',
      bookingId: bookingNumber,
    },
    actions: [
      { action: 'view', title: 'View Details' },
    ],
  };

  return sendPushToAllAdmins(payload);
}

/**
 * Send test notification
 */
export async function sendTestNotification(): Promise<SendResult> {
  const payload: NotificationPayload = {
    title: '🔔 Test Notification',
    body: "Push notifications are working! You'll receive alerts for new bookings.",
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
    tag: 'test',
    data: {
      url: '/admin/settings',
      type: 'test',
    },
  };

  return sendPushToAllAdmins(payload);
}

// =============================================================================
// NOTIFICATION BUILDERS (for more complex use cases)
// =============================================================================

/**
 * Build a new booking notification payload
 */
export function buildNewBookingNotification(booking: {
  bookingNumber: string;
  customerName: string;
  eventDate: string;
  rentalName: string;
  total: number;
  address: string;
  city: string;
}): NotificationPayload {
  const eventDate = new Date(booking.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    title: '🎉 New Booking!',
    body: `${booking.customerName} booked ${booking.rentalName} for ${formattedDate}`,
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
    tag: `booking-${booking.bookingNumber}`,
    requireInteraction: true,
    data: {
      url: `/admin/bookings?search=${booking.bookingNumber}`,
      type: 'new_booking',
      bookingId: booking.bookingNumber,
      calendarEvent: {
        title: `🎈 ${booking.rentalName} - ${booking.customerName}`,
        start: booking.eventDate,
        end: booking.eventDate,
        location: `${booking.address}, ${booking.city}, FL`,
        description: `Booking #${booking.bookingNumber}\nCustomer: ${booking.customerName}\nTotal: $${booking.total}`,
      },
    },
    actions: [
      { action: 'view', title: 'View Booking' },
      { action: 'calendar', title: '📅 Add to Calendar' },
    ],
  };
}

/**
 * Build a test notification payload
 */
export function buildTestNotification(): NotificationPayload {
  return {
    title: '🔔 Test Notification',
    body: "Push notifications are working! You'll receive alerts for new bookings.",
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
    tag: 'test',
    data: {
      url: '/admin/settings',
      type: 'test',
    },
  };
}

// =============================================================================
// CALENDAR EVENT GENERATOR
// =============================================================================

/**
 * Generate an .ics calendar file content
 */
export function generateICS(event: {
  title: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
}): string {
  const startDate = new Date(event.start + 'T09:00:00');
  const endDate = event.end 
    ? new Date(event.end + 'T17:00:00') 
    : new Date(startDate.getTime() + 8 * 60 * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string) => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pop & Drop Rentals//Admin//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    `UID:${Date.now()}@popanddroprentals.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.filter(Boolean).join('\r\n');
}
