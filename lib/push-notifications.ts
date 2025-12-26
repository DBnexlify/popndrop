// =============================================================================
// PUSH NOTIFICATION SEND UTILITY
// lib/push-notifications.ts
// Server-side utility to send push notifications to admins
// =============================================================================

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_SUBJECT = 'mailto:bookings@popndroprentals.com';

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

/**
 * Map push notification types to preference keys
 */
const TYPE_TO_PREFERENCE_KEY: Record<string, string> = {
  'new_booking': 'new_booking',
  'payment_received': 'payment_deposit', // Maps to deposit or full based on context
  'booking_cancelled': 'booking_cancelled',
  'delivery_reminder': 'delivery_prompt',
  'test': 'test', // Always allowed
};

/**
 * Check if current time is within quiet hours
 * @param quietStart - Start time in "HH:MM:SS" format (e.g., "22:00:00")
 * @param quietEnd - End time in "HH:MM:SS" format (e.g., "07:00:00")
 */
function isQuietHours(quietStart: string | null, quietEnd: string | null): boolean {
  if (!quietStart || !quietEnd) return false;
  
  // Get current time in Eastern timezone
  const now = new Date();
  const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentHour = easternTime.getHours();
  const currentMinute = easternTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  // Parse quiet hours
  const [startHour, startMinute] = quietStart.split(':').map(Number);
  const [endHour, endMinute] = quietEnd.split(':').map(Number);
  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;
  
  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTimeMinutes > endTimeMinutes) {
    // Quiet hours span midnight
    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
  } else {
    // Quiet hours within same day
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
  }
}

/**
 * Check if a notification type is marked as urgent (should bypass quiet hours/digest)
 */
function isUrgentNotificationType(type: NotificationType): boolean {
  const urgentTypes = ['booking_cancelled', 'payment_failed'];
  return urgentTypes.includes(type);
}

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
  let skipped = 0;

  const notificationType = payload.data?.type || 'test';
  const isUrgent = isUrgentNotificationType(notificationType);

  try {
    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('[Push] Failed to fetch subscriptions:', subError);
      return { success: false, sent: 0, failed: 0, errors: [subError.message] };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No subscriptions found');
      return { success: true, sent: 0, failed: 0 };
    }

    // Get all notification preferences (keyed by admin_id for quick lookup)
    const adminIds = subscriptions.map(s => s.admin_id);
    const { data: allPrefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .in('admin_id', adminIds);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefsMap = new Map<string, any>();
    if (allPrefs) {
      for (const pref of allPrefs) {
        prefsMap.set(pref.admin_id, pref);
      }
    }

    console.log(`[Push] Processing ${subscriptions.length} subscription(s) for type: ${notificationType}`);

    // Send to each subscription (checking preferences)
    for (const sub of subscriptions) {
      try {
        const prefs = prefsMap.get(sub.admin_id) || null;
        
        // Check if we should send based on preferences
        if (notificationType !== 'test' && prefs) {
          // Check notification mode
          const mode = prefs.mode || 'realtime';
          
          // In digest mode, only urgent notifications go through in real-time
          if (mode === 'digest' && !isUrgent) {
            console.log(`[Push] Skipping (digest mode, non-urgent): ${sub.endpoint.slice(0, 50)}`);
            skipped++;
            continue;
          }
          
          // In custom mode, check if this specific type is enabled
          if (mode === 'custom') {
            const prefKey = TYPE_TO_PREFERENCE_KEY[notificationType];
            if (prefKey && prefs[prefKey] === false) {
              console.log(`[Push] Skipping (${notificationType} disabled): ${sub.endpoint.slice(0, 50)}`);
              skipped++;
              continue;
            }
          }
          
          // Check quiet hours (urgent notifications bypass this)
          if (!isUrgent && prefs.quiet_hours_enabled) {
            if (isQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
              console.log(`[Push] Skipping (quiet hours): ${sub.endpoint.slice(0, 50)}`);
              skipped++;
              continue;
            }
          }
        }

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
        type: notificationType,
        sent_count: sent,
        failed_count: failed,
        // Note: skipped count tracked in console logs only
      });
    } catch (logError) {
      console.error('[Push] Failed to log notification:', logError);
    }

    console.log(`[Push] Complete: ${sent} sent, ${skipped} skipped, ${failed} failed`);

    return {
      success: sent > 0 || subscriptions.length === 0 || skipped > 0,
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
