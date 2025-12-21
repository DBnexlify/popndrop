// =============================================================================
// EVENT COUNTDOWN EMAIL CRON JOB
// app/api/cron/event-countdown/route.ts
// Runs daily at 10 AM to send "Your party is tomorrow!" emails
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend, FROM_EMAIL } from '@/lib/resend';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

// Days before event to send countdown email
const DAYS_BEFORE = 1; // 1 day before = tomorrow

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

    // Get target date (tomorrow)
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + DAYS_BEFORE);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    console.log(`[Cron] Checking events on ${targetDateStr} to send countdown emails`);

    // Query bookings with event tomorrow that haven't received countdown email
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        event_date,
        delivery_date,
        delivery_window,
        pickup_date,
        pickup_window,
        delivery_address,
        delivery_city,
        booking_type,
        product_snapshot,
        balance_due,
        countdown_sent_at,
        customers (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_date', targetDateStr)
      .in('status', ['confirmed', 'paid'])
      .is('countdown_sent_at', null);

    if (error) {
      console.error('[Cron] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Cron] No countdown emails to send');
      return NextResponse.json({ 
        success: true, 
        message: 'No events tomorrow requiring countdown emails',
        sent: 0 
      });
    }

    console.log(`[Cron] Sending ${bookings.length} countdown email(s)`);

    let sent = 0;
    let failed = 0;
    const results: { booking: string; status: string; error?: string }[] = [];

    for (const booking of bookings) {
      const customerData = booking.customers as unknown as { 
        id: string;
        first_name: string; 
        last_name: string;
        email: string;
      } | { id: string; first_name: string; last_name: string; email: string; }[] | null;
      const customer = Array.isArray(customerData) ? customerData[0] : customerData;

      if (!customer?.email) {
        console.log(`[Cron] Skipping ${booking.booking_number} - no customer email`);
        results.push({ booking: booking.booking_number, status: 'skipped', error: 'No email' });
        continue;
      }

      const productName = (booking.product_snapshot as { name?: string })?.name || 'bounce house';
      const eventDateFormatted = new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      try {
        // Send the countdown email
        await resend.emails.send({
          from: FROM_EMAIL,
          to: customer.email,
          subject: `🎉 Your party is TOMORROW! Get ready for fun!`,
          html: createCountdownEmail({
            firstName: customer.first_name,
            productName,
            eventDate: eventDateFormatted,
            deliveryWindow: booking.delivery_window,
            pickupWindow: booking.pickup_window,
            address: `${booking.delivery_address}, ${booking.delivery_city}`,
            bookingNumber: booking.booking_number,
            balanceDue: booking.balance_due,
          }),
        });

        // Mark as sent
        await supabase
          .from('bookings')
          .update({ countdown_sent_at: new Date().toISOString() })
          .eq('id', booking.id);

        sent++;
        results.push({ booking: booking.booking_number, status: 'sent' });
        console.log(`[Cron] Sent countdown to ${customer.email}`);

      } catch (emailError) {
        failed++;
        const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
        results.push({ booking: booking.booking_number, status: 'failed', error: errorMsg });
        console.error(`[Cron] Failed to send to ${customer.email}:`, errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} countdown email(s), ${failed} failed`,
      sent,
      failed,
      results,
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

// =============================================================================
// COUNTDOWN EMAIL TEMPLATE
// =============================================================================

function createCountdownEmail(data: {
  firstName: string;
  productName: string;
  eventDate: string;
  deliveryWindow: string;
  pickupWindow: string;
  address: string;
  bookingNumber: string;
  balanceDue: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
    <div style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
      
      <!-- Header with celebration -->
      <div style="padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #d946ef 0%, #9333ea 50%, #0891b2 100%);">
        <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
          It's Almost Party Time!
        </h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
          Your ${data.productName} arrives tomorrow!
        </p>
      </div>
      
      <!-- Content -->
      <div style="padding: 24px;">
        <p style="color: #ccc; margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
          Hey ${data.firstName}! 👋
        </p>
        
        <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
          We're so excited for your party! Here's everything you need to know for tomorrow:
        </p>
        
        <!-- Event Details Card -->
        <div style="background-color: #222; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">📅 Event Day</p>
            <p style="margin: 0; color: #fff; font-size: 18px; font-weight: 600;">${data.eventDate}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">🚚 Delivery Time</p>
            <p style="margin: 0; color: #22d3ee; font-size: 16px; font-weight: 600;">${data.deliveryWindow}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">📍 Location</p>
            <p style="margin: 0; color: #fff; font-size: 14px;">${data.address}</p>
          </div>
          
          <div>
            <p style="margin: 0 0 4px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">📦 Pickup</p>
            <p style="margin: 0; color: #fff; font-size: 14px;">${data.pickupWindow}</p>
          </div>
        </div>
        
        <!-- Checklist -->
        <div style="background: linear-gradient(135deg, rgba(217, 70, 239, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(217, 70, 239, 0.2);">
          <p style="margin: 0 0 12px; color: #d946ef; font-size: 14px; font-weight: 600;">
            ✅ Quick Checklist
          </p>
          <ul style="margin: 0; padding: 0 0 0 20px; color: #ccc; font-size: 13px; line-height: 1.8;">
            <li>Clear the setup area (level ground, no debris)</li>
            <li>Have a power outlet within 50 feet ready</li>
            <li>Keep a hose nearby for water slides (if applicable)</li>
            <li>We'll text you when we're on our way!</li>
          </ul>
        </div>
        
        ${data.balanceDue > 0 ? `
        <!-- Balance Due -->
        <div style="background-color: #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 4px; color: #92400e; font-size: 14px; font-weight: 600;">
            💵 Balance Due on Delivery
          </p>
          <p style="margin: 0; color: #78350f; font-size: 24px; font-weight: 700;">
            $${data.balanceDue.toFixed(2)}
          </p>
          <p style="margin: 8px 0 0; color: #a16207; font-size: 12px;">
            We accept cash, card, Venmo, or Zelle
          </p>
        </div>
        ` : ''}
        
        <!-- Safety Note -->
        <div style="border-top: 1px solid #333; padding-top: 16px; margin-top: 24px;">
          <p style="margin: 0; color: #888; font-size: 12px; line-height: 1.6;">
            <strong style="color: #aaa;">Safety first!</strong> Our team will provide a quick safety briefing when we arrive. Kids should remove shoes, glasses, and any sharp objects before jumping. 🦘
          </p>
        </div>
      </div>
      
      <!-- Contact Footer -->
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0 0 8px; color: #888; font-size: 12px;">
          Questions? We're here to help!
        </p>
        <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none; font-size: 16px; font-weight: 600;">
          📞 (352) 445-3723
        </a>
        <p style="margin: 12px 0 0; color: #444; font-size: 11px;">
          Booking #${data.bookingNumber}
        </p>
      </div>
      
    </div>
    
    <!-- Footer -->
    <p style="margin: 20px 0 0; text-align: center; color: #444; font-size: 10px;">
      Pop and Drop Party Rentals • Ocala, FL<br>
      Have an amazing party! 🎈
    </p>
  </div>
</body>
</html>
  `;
}
