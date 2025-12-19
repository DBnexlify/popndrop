import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';

// Email template helper - creates consistent branded wrapper
function createEmailWrapper(content: string, previewText: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Pop and Drop Party Rentals</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <!-- Email container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main content card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%); border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
          
          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <img src="https://popndroprentals.com/brand/logo.png" alt="Pop and Drop Party Rentals" width="180" style="display: block; max-width: 180px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none; font-size: 14px; font-weight: 600;">
                      📞 (352) 445-3723
                    </a>
                    <span style="color: rgba(255,255,255,0.3); margin: 0 12px;">|</span>
                    <a href="mailto:bookings@popndroprentals.com" style="color: #22d3ee; text-decoration: none; font-size: 14px; font-weight: 600;">
                      ✉️ bookings@popndroprentals.com
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.5;">
                    Pop and Drop Party Rentals<br>
                    Ocala, FL &amp; Marion County
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Bottom text -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 24px 20px; color: rgba(255,255,255,0.3); font-size: 11px; line-height: 1.5;">
              You're receiving this email because you made a booking at popndroprentals.com.<br>
              © ${new Date().getFullYear()} Pop and Drop Party Rentals. All rights reserved.
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Customer confirmation email content
function createCustomerEmailContent({
  customerName,
  rentalName,
  formattedDate,
  bookingType,
  deliveryTime,
  pickupTime,
  address,
  city,
  totalPrice,
  notes,
}: {
  customerName: string;
  rentalName: string;
  formattedDate: string;
  bookingType: string;
  deliveryTime: string;
  pickupTime: string;
  address: string;
  city: string;
  totalPrice: number;
  notes: string | null;
}) {
  return `
<!-- Success badge -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center" style="padding-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; padding: 16px;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </td>
  </tr>
</table>

<!-- Headline -->
<h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.2;">
  You're All Set! 🎉
</h1>
<p style="margin: 0 0 32px 0; font-size: 16px; color: rgba(255,255,255,0.7); text-align: center; line-height: 1.5;">
  Get ready for an amazing party, ${customerName.split(' ')[0]}!
</p>

<!-- Booking details card -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 24px;">
  <tr>
    <td style="padding: 24px;">
      
      <!-- Rental name highlight -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(217,70,239,0.15) 0%, rgba(34,211,238,0.15) 100%); border-radius: 12px; padding: 16px; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px;">
              Your Rental
            </p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">
              ${rentalName}
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Details grid -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5);">📅 Date</p>
            <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${formattedDate}</p>
          </td>
          <td width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5);">📦 Package</p>
            <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${bookingType === 'weekend' ? 'Weekend Special' : 'Daily Rental'}</p>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5);">🚚 Delivery</p>
            <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${deliveryTime}</p>
          </td>
          <td width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5);">🏠 Pickup</p>
            <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${pickupTime}</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 8px 0 0 0; vertical-align: top;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5);">📍 Location</p>
            <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${address}, ${city}</p>
          </td>
        </tr>
      </table>
      
    </td>
  </tr>
</table>

<!-- Total -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(34,211,238,0.1); border-radius: 12px; margin-bottom: 24px;">
  <tr>
    <td style="padding: 16px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="color: rgba(255,255,255,0.7); font-size: 14px;">Total (due on delivery)</td>
          <td align="right" style="color: #22d3ee; font-size: 24px; font-weight: 700;">$${totalPrice}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${notes ? `
<!-- Customer notes -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td style="padding: 12px 16px; background-color: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid #a855f7;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.5);">Your Notes</p>
      <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.5;">${notes}</p>
    </td>
  </tr>
</table>
` : ''}

<!-- What happens next -->
<h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #ffffff;">
  What Happens Next?
</h2>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="32" style="vertical-align: top;">
            <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%); border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: white; font-weight: 600;">1</span>
          </td>
          <td style="padding-left: 12px; vertical-align: top;">
            <p style="margin: 0 0 2px 0; font-size: 14px; color: #ffffff; font-weight: 500;">Day Before Confirmation</p>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.5);">We'll text you to confirm our arrival window</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="32" style="vertical-align: top;">
            <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%); border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: white; font-weight: 600;">2</span>
          </td>
          <td style="padding-left: 12px; vertical-align: top;">
            <p style="margin: 0 0 2px 0; font-size: 14px; color: #ffffff; font-weight: 500;">Delivery Day</p>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.5);">We'll set everything up and do a safety check</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="32" style="vertical-align: top;">
            <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%); border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; color: white; font-weight: 600;">3</span>
          </td>
          <td style="padding-left: 12px; vertical-align: top;">
            <p style="margin: 0 0 2px 0; font-size: 14px; color: #ffffff; font-weight: 500;">Party Time! 🎈</p>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.5);">Enjoy your event - we'll handle the rest</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Prep tips -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(168,85,247,0.1); border-radius: 12px; margin-bottom: 24px;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #a855f7;">💡 Quick Prep Tips</p>
      <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6;">
        Clear a flat area at least 5 feet larger than the rental. Make sure there's access to a power outlet within 100 feet. Remove any sharp objects from the setup area.
      </p>
    </td>
  </tr>
</table>

<!-- Questions CTA -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: rgba(255,255,255,0.6);">
        Questions? We're here to help!
      </p>
      <a href="tel:3524453723" style="display: inline-block; background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 100px;">
        Call Us: (352) 445-3723
      </a>
    </td>
  </tr>
</table>
`;
}

// Business notification email content
function createBusinessEmailContent({
  customerName,
  customerEmail,
  customerPhone,
  rentalName,
  formattedDate,
  bookingType,
  deliveryTime,
  pickupTime,
  address,
  city,
  totalPrice,
  depositAmount,
  balanceDue,
  notes,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  rentalName: string;
  formattedDate: string;
  bookingType: string;
  deliveryTime: string;
  pickupTime: string;
  address: string;
  city: string;
  totalPrice: number;
  depositAmount: number;
  balanceDue: number;
  notes: string | null;
}) {
  return `
<!-- Alert badge -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center" style="padding-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%); border-radius: 50%; padding: 16px;">
        <span style="font-size: 32px;">🎯</span>
      </div>
    </td>
  </tr>
</table>

<!-- Headline -->
<h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.2;">
  New Booking! 💰
</h1>
<p style="margin: 0 0 32px 0; font-size: 16px; color: rgba(255,255,255,0.7); text-align: center; line-height: 1.5;">
  ${rentalName} on ${formattedDate}
</p>

<!-- Quick action buttons -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td align="center">
      <a href="tel:${customerPhone.replace(/\D/g, '')}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px; margin: 0 8px 8px 0;">
        📞 Call Customer
      </a>
      <a href="mailto:${customerEmail}" style="display: inline-block; background: rgba(255,255,255,0.1); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 100px; margin: 0 0 8px 0; border: 1px solid rgba(255,255,255,0.2);">
        ✉️ Email Customer
      </a>
    </td>
  </tr>
</table>

<!-- Customer info card -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(6,182,212,0.15) 100%); border-radius: 16px; border: 1px solid rgba(34,211,238,0.2); margin-bottom: 24px;">
  <tr>
    <td style="padding: 20px 24px;">
      <p style="margin: 0 0 12px 0; font-size: 12px; color: #22d3ee; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        👤 Customer Information
      </p>
      <p style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff; font-weight: 600;">${customerName}</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: rgba(255,255,255,0.8);">📱 ${customerPhone}</p>
      <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8);">✉️ ${customerEmail}</p>
    </td>
  </tr>
</table>

<!-- Booking details -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 24px;">
  <tr>
    <td style="padding: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        📋 Booking Details
      </p>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.5); font-size: 13px;">Rental</td>
                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${rentalName}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.5); font-size: 13px;">Date</td>
                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${formattedDate}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.5); font-size: 13px;">Package</td>
                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${bookingType === 'weekend' ? 'Weekend Special' : 'Daily Rental'}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.5); font-size: 13px;">Delivery</td>
                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${deliveryTime}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.5); font-size: 13px;">Pickup</td>
                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${pickupTime}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.5); font-size: 13px;">Address</td>
                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${address}, ${city}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Pricing -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.15) 100%); border-radius: 16px; border: 1px solid rgba(34,197,94,0.2); margin-bottom: 24px;">
  <tr>
    <td style="padding: 20px 24px;">
      <p style="margin: 0 0 12px 0; font-size: 12px; color: #22c55e; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        💵 Pricing
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 4px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.7); font-size: 14px;">Total</td>
                <td align="right" style="color: #ffffff; font-size: 14px;">$${totalPrice}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: rgba(255,255,255,0.7); font-size: 14px;">Deposit Paid</td>
                <td align="right" style="color: #ffffff; font-size: 14px;">$${depositAmount}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0 0 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 8px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="color: #22c55e; font-size: 16px; font-weight: 600;">Balance Due</td>
                <td align="right" style="color: #22c55e; font-size: 20px; font-weight: 700;">$${balanceDue}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${notes ? `
<!-- Customer notes -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(168,85,247,0.1); border-radius: 12px; border-left: 4px solid #a855f7; margin-bottom: 24px;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #a855f7; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        📝 Customer Notes
      </p>
      <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.6;">${notes}</p>
    </td>
  </tr>
</table>
` : ''}

<!-- Action checklist -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0 0 12px 0; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
        ✅ Action Items
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.8);">☐ Add to calendar</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.8);">☐ Confirm availability of ${rentalName}</p>
      <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8);">☐ Text customer day before</p>
    </td>
  </tr>
</table>
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      rentalId,
      rentalName,
      eventDate,
      bookingType,
      pickupDate,
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      deliveryTime,
      pickupTime,
      notes,
      totalPrice,
      depositAmount,
      balanceDue,
    } = body;

    // Validate required fields
    if (!rentalId || !eventDate || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if date is still available (prevent race conditions)
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('rental_id', rentalId)
      .eq('event_date', eventDate)
      .in('status', ['pending', 'confirmed']);

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { error: 'This date is no longer available. Please choose another date.' },
        { status: 409 }
      );
    }

    // For weekend bookings, also check Sunday
    if (bookingType === 'weekend') {
      const eventDateObj = new Date(eventDate);
      const sunday = new Date(eventDateObj);
      sunday.setDate(sunday.getDate() + 1);
      const sundayStr = sunday.toISOString().split('T')[0];

      const { data: sundayBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('rental_id', rentalId)
        .eq('event_date', sundayStr)
        .in('status', ['pending', 'confirmed']);

      if (sundayBookings && sundayBookings.length > 0) {
        return NextResponse.json(
          { error: 'Sunday is not available for a weekend booking. Please choose another date.' },
          { status: 409 }
        );
      }
    }

    // Create booking in database
    const bookingData = {
      rental_id: rentalId,
      rental_name: rentalName,
      event_date: eventDate,
      booking_type: bookingType,
      pickup_date: pickupDate,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      address: address,
      city: city,
      delivery_time: deliveryTime,
      pickup_time: pickupTime,
      notes: notes || null,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      balance_due: balanceDue,
      status: 'confirmed',
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Send confirmation email to customer
    try {
      const customerContent = createCustomerEmailContent({
        customerName,
        rentalName,
        formattedDate,
        bookingType,
        deliveryTime,
        pickupTime,
        address,
        city,
        totalPrice,
        notes,
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `🎉 You're booked! ${rentalName} on ${formattedDate}`,
        html: createEmailWrapper(
          customerContent,
          `Your ${rentalName} rental is confirmed for ${formattedDate}. We can't wait to help make your party amazing!`
        ),
      });
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError);
    }

    // Send notification email to business
    try {
      const businessContent = createBusinessEmailContent({
        customerName,
        customerEmail,
        customerPhone,
        rentalName,
        formattedDate,
        bookingType,
        deliveryTime,
        pickupTime,
        address,
        city,
        totalPrice,
        depositAmount,
        balanceDue,
        notes,
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `🎯 New Booking: ${rentalName} - ${formattedDate} - $${totalPrice}`,
        html: createEmailWrapper(
          businessContent,
          `New booking from ${customerName} for ${rentalName} on ${formattedDate}. Total: $${totalPrice}`
        ),
      });
    } catch (emailError) {
      console.error('Failed to send business notification:', emailError);
    }

    // Return success
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      redirectUrl: `/bookings/success?booking_id=${booking.id}`,
    });
  } catch (error) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}