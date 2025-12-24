// =============================================================================
// CANCELLATION EMAIL TEMPLATES
// lib/emails/cancellation-emails.ts
// Customer-facing emails for cancellation flow - matches brand style
// =============================================================================

import { resend, FROM_EMAIL } from '@/lib/resend';

// =============================================================================
// TYPES
// =============================================================================

interface CancellationEmailData {
  customerEmail: string;
  customerFirstName: string;
  bookingNumber: string;
  productName: string;
  eventDate: string;
  refundAmount?: number;
  refundMethod?: string;
}

interface RefundEmailData extends CancellationEmailData {
  refundAmount: number;
  refundMethod?: string;
}

interface RescheduleEmailData extends CancellationEmailData {
  newEventDate: string;
  newDeliveryWindow: string;
}

// =============================================================================
// SHARED EMAIL WRAPPER - Matches confirmation email brand style
// =============================================================================

function emailWrapper(content: string, footerText: string = 'Questions? We\'re here to help!'): string {
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
      ${content}
      
      <!-- Footer -->
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0 0 8px; color: #888; font-size: 13px;">${footerText}</p>
        <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none; font-weight: 500;">(352) 445-3723</a>
      </div>
    </div>
    
    <p style="margin: 20px 0 0; text-align: center; color: #444; font-size: 11px;">
      Pop and Drop Party Rentals • Ocala, FL
    </p>
  </div>
</body>
</html>
  `;
}

// =============================================================================
// HELPER: Get refund method display text
// =============================================================================

function getRefundMethodDisplay(method?: string): string {
  if (!method || method === 'stripe') return 'to your original payment card';
  const methods: Record<string, string> = {
    venmo: 'via Venmo',
    zelle: 'via Zelle',
    cash: 'in cash',
    check: 'via check',
  };
  return methods[method] || 'via your preferred method';
}

function getRefundTimeline(method?: string): string {
  if (!method || method === 'stripe') {
    return 'Refunds typically appear in 5-10 business days, depending on your bank.';
  }
  const timelines: Record<string, string> = {
    venmo: 'You should receive your Venmo payment within 24 hours.',
    zelle: 'You should receive your Zelle payment within 24 hours.',
    cash: 'Please coordinate with us to arrange pickup of your cash refund.',
    check: 'Your check will be mailed within 3-5 business days.',
  };
  return timelines[method] || 'Your refund will be processed shortly.';
}

// =============================================================================
// CANCELLATION APPROVED (with optional refund info)
// =============================================================================

export async function sendCancellationApprovedEmail(data: CancellationEmailData) {
  const { customerEmail, customerFirstName, bookingNumber, productName, eventDate, refundAmount, refundMethod } = data;
  
  // If there's a refund amount, show the refund info
  const refundSection = refundAmount && refundAmount > 0 ? `
    <!-- Refund Info -->
    <div style="background: linear-gradient(135deg, #14532d, #166534); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px; color: rgba(255,255,255,0.6); font-size: 11px; text-transform: uppercase;">Refund Amount</p>
      <p style="margin: 0; color: white; font-size: 28px; font-weight: 700;">$${refundAmount.toFixed(2)}</p>
      <p style="margin: 8px 0 0; color: #86efac; font-size: 12px;">
        Coming ${getRefundMethodDisplay(refundMethod)}
      </p>
    </div>
  ` : '';
  
  const content = `
    <!-- Header -->
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
      <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #374151; border-radius: 50%; line-height: 56px; text-align: center;">
        <span style="color: white; font-size: 28px;">✓</span>
      </div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Booking Cancelled</h1>
      <p style="margin: 8px 0 0; color: #888;">Booking ${bookingNumber}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <p style="color: #ccc; margin: 0 0 20px;">Hey ${customerFirstName}! Your cancellation has been processed.</p>
      
      ${refundSection}
      
      <!-- Cancelled Booking -->
      <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; vertical-align: top;">
              <p style="margin: 0; color: #666; font-size: 11px;">Cancelled Rental</p>
              <p style="margin: 4px 0 0; color: white; font-weight: 500;">${productName}</p>
            </td>
            <td style="padding: 8px 0; vertical-align: top;">
              <p style="margin: 0; color: #666; font-size: 11px;">Original Date</p>
              <p style="margin: 4px 0 0; color: #888; font-weight: 500; text-decoration: line-through;">${eventDate}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
        We're sorry things didn't work out this time. We hope to bounce with you at a future event! 🎈
      </p>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0 0;">
        <a href="https://popndroprentals.com/bookings" 
           style="display: inline-block; background: linear-gradient(135deg, #d946ef, #9333ea); 
                  color: white; text-decoration: none; padding: 14px 28px; border-radius: 50px; 
                  font-size: 14px; font-weight: 600;">
          Book Again
        </a>
      </div>
    </div>
  `;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Booking ${bookingNumber} Cancelled`,
      html: emailWrapper(content),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send cancellation approved email:', error);
    return { success: false, error };
  }
}

// =============================================================================
// CANCELLATION WITH REFUND
// =============================================================================

export async function sendCancellationRefundEmail(data: RefundEmailData) {
  const { customerEmail, customerFirstName, bookingNumber, productName, eventDate, refundAmount, refundMethod } = data;
  
  const isManualRefund = refundMethod && refundMethod !== 'stripe';
  const refundDisplay = getRefundMethodDisplay(refundMethod);
  const timeline = getRefundTimeline(refundMethod);
  
  const content = `
    <!-- Header -->
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
      <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #22c55e; border-radius: 50%; line-height: 56px; text-align: center;">
        <span style="color: white; font-size: 28px;">💸</span>
      </div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Refund ${isManualRefund ? 'on the Way' : 'Processed'}</h1>
      <p style="margin: 8px 0 0; color: #888;">Booking ${bookingNumber}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <p style="color: #ccc; margin: 0 0 20px;">Hey ${customerFirstName}! Good news — your refund ${isManualRefund ? 'is being sent' : 'has been processed'}.</p>
      
      <!-- Refund Amount Card -->
      <div style="background: linear-gradient(135deg, #14532d, #166534); border-radius: 12px; padding: 20px; margin-bottom: 16px; text-align: center;">
        <p style="margin: 0 0 4px; color: rgba(255,255,255,0.6); font-size: 11px; text-transform: uppercase;">Refund Amount</p>
        <p style="margin: 0; color: white; font-size: 36px; font-weight: 700;">$${refundAmount.toFixed(2)}</p>
        <p style="margin: 8px 0 0; color: #86efac; font-size: 13px;">${refundDisplay}</p>
      </div>
      
      <!-- Timeline -->
      <div style="background-color: rgba(34, 197, 94, 0.15); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; color: #22c55e; font-weight: 600; font-size: 13px;">⏱ When will I see it?</p>
        <p style="margin: 0; color: #86efac; font-size: 13px;">${timeline}</p>
      </div>
      
      <!-- Cancelled Booking Details -->
      <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 10px; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Cancelled Booking</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #888; font-size: 13px;">Rental</td>
            <td style="padding: 4px 0; color: white; font-size: 13px; text-align: right;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #888; font-size: 13px;">Original Date</td>
            <td style="padding: 4px 0; color: #888; font-size: 13px; text-align: right; text-decoration: line-through;">${eventDate}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
        We hope to bounce with you at a future event! 🎈
      </p>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0 0;">
        <a href="https://popndroprentals.com/bookings" 
           style="display: inline-block; background: linear-gradient(135deg, #d946ef, #9333ea); 
                  color: white; text-decoration: none; padding: 14px 28px; border-radius: 50px; 
                  font-size: 14px; font-weight: 600;">
          Book Your Next Party
        </a>
      </div>
    </div>
  `;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Refund ${isManualRefund ? 'Coming' : 'Processed'} - $${refundAmount.toFixed(2)} 💸`,
      html: emailWrapper(content, 'Questions about your refund?'),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send refund email:', error);
    return { success: false, error };
  }
}

// =============================================================================
// CANCELLATION DENIED (Booking remains active)
// =============================================================================

export async function sendCancellationDeniedEmail(data: CancellationEmailData & { reason?: string }) {
  const { customerEmail, customerFirstName, bookingNumber, productName, eventDate, reason } = data;
  
  const content = `
    <!-- Header -->
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
      <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: linear-gradient(135deg, #581c87, #0e7490); border-radius: 50%; line-height: 56px; text-align: center;">
        <span style="color: white; font-size: 28px;">📋</span>
      </div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Booking Update</h1>
      <p style="margin: 8px 0 0; color: #888;">Booking ${bookingNumber}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <p style="color: #ccc; margin: 0 0 20px;">Hey ${customerFirstName}!</p>
      
      <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
        We reviewed your cancellation request for the <strong style="color: white;">${productName}</strong> 
        on <strong style="color: white;">${eventDate}</strong>.
      </p>
      
      <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
        Unfortunately, we're unable to process this cancellation request at this time.
        ${reason ? `<br><br><em style="color: #888;">"${reason}"</em>` : ''}
      </p>
      
      <!-- Booking Still Active -->
      <div style="background-color: rgba(34, 211, 238, 0.1); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; color: #22d3ee; font-weight: 600; font-size: 13px;">✓ Your booking is still active</p>
        <p style="margin: 0; color: #67e8f9; font-size: 13px;">We're looking forward to making your event awesome!</p>
      </div>
      
      <!-- Booking Details -->
      <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; vertical-align: top;">
              <p style="margin: 0; color: #666; font-size: 11px;">📅 Event Date</p>
              <p style="margin: 4px 0 0; color: white; font-weight: 500;">${eventDate}</p>
            </td>
            <td style="padding: 8px 0; vertical-align: top;">
              <p style="margin: 0; color: #666; font-size: 11px;">🎈 Rental</p>
              <p style="margin: 4px 0 0; color: white; font-weight: 500;">${productName}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
        If you have questions or need to discuss your options, please give us a call. 
        We're happy to work with you!
      </p>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0 0;">
        <a href="tel:3524453723" 
           style="display: inline-block; background: linear-gradient(135deg, #d946ef, #9333ea); 
                  color: white; text-decoration: none; padding: 14px 28px; border-radius: 50px; 
                  font-size: 14px; font-weight: 600;">
          📞 Call Us
        </a>
      </div>
    </div>
  `;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Update on Booking ${bookingNumber}`,
      html: emailWrapper(content),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send cancellation denied email:', error);
    return { success: false, error };
  }
}

// =============================================================================
// RESCHEDULE CONFIRMATION EMAIL
// =============================================================================

export async function sendRescheduleConfirmationEmail(data: RescheduleEmailData) {
  const { customerEmail, customerFirstName, bookingNumber, productName, eventDate, newEventDate, newDeliveryWindow } = data;
  
  const content = `
    <!-- Header -->
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
      <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #22c55e; border-radius: 50%; line-height: 56px; text-align: center;">
        <span style="color: white; font-size: 28px;">✓</span>
      </div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Booking Rescheduled!</h1>
      <p style="margin: 8px 0 0; color: #888;">Booking ${bookingNumber}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <p style="color: #ccc; margin: 0 0 20px;">Hey ${customerFirstName}! Great news — your booking has been rescheduled.</p>
      
      <!-- New Date Card -->
      <div style="background: linear-gradient(135deg, #581c87, #0e7490); border-radius: 12px; padding: 20px; margin-bottom: 16px; text-align: center;">
        <p style="margin: 0 0 4px; color: rgba(255,255,255,0.6); font-size: 11px; text-transform: uppercase;">New Event Date</p>
        <p style="margin: 0; color: white; font-size: 22px; font-weight: 700;">${newEventDate}</p>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Delivery: ${newDeliveryWindow}</p>
      </div>
      
      <!-- Change Summary -->
      <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; vertical-align: top;">
              <p style="margin: 0; color: #666; font-size: 11px;">🎈 Rental</p>
              <p style="margin: 4px 0 0; color: white; font-weight: 500;">${productName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; vertical-align: top; border-top: 1px solid #333;">
              <p style="margin: 0; color: #666; font-size: 11px;">📅 Original Date</p>
              <p style="margin: 4px 0 0; color: #888; text-decoration: line-through;">${eventDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; vertical-align: top; border-top: 1px solid #333;">
              <p style="margin: 0; color: #666; font-size: 11px;">✨ New Date</p>
              <p style="margin: 4px 0 0; color: #22c55e; font-weight: 600;">${newEventDate}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="color: #aaa; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
        We're excited for your party! We'll text you the morning of delivery to confirm our arrival.
      </p>
      
      <!-- Quick Tips -->
      <div style="padding: 14px; background-color: #1f1a2e; border-radius: 10px;">
        <p style="margin: 0 0 6px; color: #c084fc; font-size: 13px; font-weight: 600;">💡 Quick Prep Tips</p>
        <p style="margin: 0; color: #a0a0a0; font-size: 13px;">Clear a flat area at least 5 feet larger than the unit. Have a power outlet within 50 feet ready.</p>
      </div>
    </div>
  `;
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Booking Rescheduled to ${newEventDate} ✓`,
      html: emailWrapper(content),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send reschedule confirmation email:', error);
    return { success: false, error };
  }
}
