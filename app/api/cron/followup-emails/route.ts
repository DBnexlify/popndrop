// =============================================================================
// POST-EVENT FOLLOW-UP EMAIL CRON JOB
// app/api/cron/followup-emails/route.ts
// Runs daily at 10 AM to send follow-up emails for events that happened 2 days ago
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend, FROM_EMAIL } from '@/lib/resend';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

// Days after event to send follow-up
const DAYS_AFTER_EVENT = 2;

// Google review link - set via environment variable or default
const GOOGLE_REVIEW_URL = process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review';

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

    // Get the target date (X days ago)
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - DAYS_AFTER_EVENT);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    console.log(`[Cron] Checking for events on ${targetDateStr} to send follow-ups`);

    // Query completed bookings from that date that haven't received follow-up
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        event_date,
        product_snapshot,
        followup_sent_at,
        customers (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_date', targetDateStr)
      .eq('status', 'completed')
      .is('followup_sent_at', null);

    if (error) {
      console.error('[Cron] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Cron] No follow-ups to send');
      return NextResponse.json({ 
        success: true, 
        message: 'No follow-up emails to send',
        sent: 0 
      });
    }

    console.log(`[Cron] Sending ${bookings.length} follow-up email(s)`);

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

      const productName = (booking.product_snapshot as { name?: string })?.name || 'rental';

      try {
        // Send the follow-up email
        await resend.emails.send({
          from: FROM_EMAIL,
          to: customer.email,
          subject: `How was your ${productName} experience? 🎈`,
          html: createFollowUpEmail({
            firstName: customer.first_name,
            productName,
            bookingNumber: booking.booking_number,
          }),
        });

        // Mark as sent
        await supabase
          .from('bookings')
          .update({ followup_sent_at: new Date().toISOString() })
          .eq('id', booking.id);

        sent++;
        results.push({ booking: booking.booking_number, status: 'sent' });
        console.log(`[Cron] Sent follow-up to ${customer.email}`);

      } catch (emailError) {
        failed++;
        const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
        results.push({ booking: booking.booking_number, status: 'failed', error: errorMsg });
        console.error(`[Cron] Failed to send to ${customer.email}:`, errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} follow-up email(s), ${failed} failed`,
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
// FOLLOW-UP EMAIL TEMPLATE
// =============================================================================

function createFollowUpEmail(data: {
  firstName: string;
  productName: string;
  bookingNumber: string;
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
      
      <!-- Header with party emoji -->
      <div style="padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #581c87 0%, #0e7490 100%);">
        <div style="font-size: 48px; margin-bottom: 12px;">🎈</div>
        <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">
          Hope you had a blast!
        </h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 24px;">
        <p style="color: #ccc; margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
          Hey ${data.firstName}! 👋
        </p>
        
        <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
          We hope the <strong style="color: #fff;">${data.productName}</strong> was a hit at your event! 
          There's nothing better than seeing families create awesome memories together.
        </p>
        
        <p style="color: #aaa; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
          If you have a minute, we'd love to hear how it went. Your feedback helps other 
          families find us and keeps our small business bouncing! 🙏
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${GOOGLE_REVIEW_URL}" 
             style="display: inline-block; background: linear-gradient(to right, #d946ef, #9333ea); 
                    color: white; text-decoration: none; padding: 14px 32px; border-radius: 50px; 
                    font-size: 15px; font-weight: 600; box-shadow: 0 8px 24px rgba(217, 70, 239, 0.3);">
            ⭐ Leave a Quick Review
          </a>
        </div>
        
        <!-- Secondary text -->
        <p style="color: #666; margin: 24px 0 0; font-size: 12px; text-align: center; line-height: 1.5;">
          Even a few words make a huge difference for us!<br>
          It only takes 30 seconds.
        </p>
        
        <!-- Divider -->
        <div style="border-top: 1px solid #333; margin: 24px 0;"></div>
        
        <!-- Future booking prompt -->
        <div style="background-color: #1f1f1f; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 12px; color: #888; font-size: 12px;">Planning another event?</p>
          <a href="https://popndroprentals.com/bookings" 
             style="color: #22d3ee; text-decoration: none; font-size: 14px; font-weight: 500;">
            Book your next party →
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0 0 8px; color: #666; font-size: 12px;">
          Thanks for choosing Pop and Drop! 💜
        </p>
        <p style="margin: 0; color: #444; font-size: 11px;">
          Questions? Reply to this email or call <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none;">(352) 445-3723</a>
        </p>
      </div>
      
    </div>
    
    <!-- Unsubscribe footer -->
    <p style="margin: 20px 0 0; text-align: center; color: #444; font-size: 10px;">
      Pop and Drop Party Rentals • Ocala, FL<br>
      Booking #${data.bookingNumber}
    </p>
  </div>
</body>
</html>
  `;
}
