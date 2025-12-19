import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';

// Configuration
const SITE_URL = "https://popndroprentals.com";
const LOGO_URL = "https://popndroprentals.com/brand/logo.png";
const POWER_OUTLET_DISTANCE = "50"; // feet - update to match your actual policy

// Email wrapper with clean, email-safe HTML
function createEmailWrapper(content: string, previewText: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pop and Drop Party Rentals</title>
</head>
<body style="margin: 0; padding: 0; background-color: #111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
  <!-- Main container -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #111111;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        
        <!-- Content card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #1a1a1a; border-radius: 16px;">
          
          <!-- Logo header -->
          <tr>
            <td align="center" style="padding: 28px 24px 20px 24px; border-bottom: 1px solid #2a2a2a;">
              <a href="${SITE_URL}" style="text-decoration: none; display: block;">
                <!--[if mso]>
                <table cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td align="center">
                <![endif]-->
                <img 
                  src="${LOGO_URL}" 
                  alt="Pop and Drop Party Rentals" 
                  width="160" 
                  height="160"
                  style="display: block; width: 160px; height: auto; max-width: 100%; border: 0; border-radius: 12px;"
                />
                <!--[if mso]>
                    </td>
                  </tr>
                </table>
                <![endif]-->
              </a>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 28px 24px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; border-radius: 0 0 16px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="tel:3524453723" style="color: #22d3ee; text-decoration: none; font-size: 13px; font-weight: 500;">(352) 445-3723</a>
                    <span style="color: #444444; margin: 0 8px;">•</span>
                    <a href="mailto:bookings@popndroprentals.com" style="color: #22d3ee; text-decoration: none; font-size: 13px; font-weight: 500;">bookings@popndroprentals.com</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-size: 12px; color: #555555;">Pop and Drop Party Rentals • Ocala, FL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Bottom disclaimer -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px;">
          <tr>
            <td align="center" style="padding: 20px 16px;">
              <span style="font-size: 11px; color: #444444; line-height: 1.5;">
                You received this email because you booked at <a href="${SITE_URL}" style="color: #555555;">popndroprentals.com</a><br>
                © ${new Date().getFullYear()} Pop and Drop Party Rentals
              </span>
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

// Customer email content
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
  const firstName = customerName.split(' ')[0];
  
  return `
<!-- Success icon - perfectly round -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding-bottom: 20px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:56px;v-text-anchor:middle;width:56px;" arcsize="50%" fillcolor="#22c55e" stroke="f">
        <w:anchorlock/>
        <center style="color:#ffffff;font-size:28px;">✓</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #22c55e; border-radius: 50%; text-align: center; font-size: 28px; color: #ffffff;">✓</div>
      <!--<![endif]-->
    </td>
  </tr>
</table>

<!-- Heading -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding-bottom: 6px;">
      <span style="font-size: 24px; font-weight: 700; color: #ffffff;">You're All Set!</span>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-bottom: 24px;">
      <span style="font-size: 15px; color: #888888;">Get ready for an amazing party, ${firstName}!</span>
    </td>
  </tr>
</table>

<!-- Rental highlight -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #581c87 0%, #0e7490 100%); border-radius: 12px; margin-bottom: 20px;">
  <tr>
    <td align="center" style="padding: 16px 20px;">
      <span style="font-size: 11px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Your Rental</span>
      <span style="font-size: 18px; font-weight: 600; color: #ffffff;">${rentalName}</span>
    </td>
  </tr>
</table>

<!-- Booking details -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #222222; border-radius: 12px; margin-bottom: 20px;">
  <tr>
    <td style="padding: 16px 20px;">
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <!-- Date & Package row -->
        <tr>
          <td width="50%" style="padding: 6px 0; vertical-align: top;">
            <span style="font-size: 11px; color: #666666; display: block;">📅 Date</span>
            <span style="font-size: 14px; color: #ffffff; font-weight: 500;">${formattedDate}</span>
          </td>
          <td width="50%" style="padding: 6px 0; vertical-align: top;">
            <span style="font-size: 11px; color: #666666; display: block;">📦 Package</span>
            <span style="font-size: 14px; color: #ffffff; font-weight: 500;">${bookingType === 'weekend' ? 'Weekend Special' : 'Daily Rental'}</span>
          </td>
        </tr>
        <!-- Times row -->
        <tr>
          <td width="50%" style="padding: 6px 0; vertical-align: top;">
            <span style="font-size: 11px; color: #666666; display: block;">🚚 Delivery</span>
            <span style="font-size: 14px; color: #ffffff; font-weight: 500;">${deliveryTime}</span>
          </td>
          <td width="50%" style="padding: 6px 0; vertical-align: top;">
            <span style="font-size: 11px; color: #666666; display: block;">📍 Pickup</span>
            <span style="font-size: 14px; color: #ffffff; font-weight: 500;">${pickupTime}</span>
          </td>
        </tr>
        <!-- Address row -->
        <tr>
          <td colspan="2" style="padding: 6px 0; padding-top: 12px; border-top: 1px solid #333333; margin-top: 8px;">
            <span style="font-size: 11px; color: #666666; display: block;">🏠 Location</span>
            <span style="font-size: 14px; color: #ffffff; font-weight: 500;">${address}, ${city}</span>
          </td>
        </tr>
      </table>
      
    </td>
  </tr>
</table>

<!-- Total -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(34, 211, 238, 0.1); border-radius: 10px; margin-bottom: 24px;">
  <tr>
    <td style="padding: 14px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="color: #888888; font-size: 14px;">Total (due on delivery)</td>
          <td align="right" style="color: #22d3ee; font-size: 22px; font-weight: 700;">$${totalPrice}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${notes ? `
<!-- Notes -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
  <tr>
    <td style="padding: 12px 16px; background-color: #222222; border-left: 3px solid #a855f7; border-radius: 0 8px 8px 0;">
      <span style="font-size: 11px; color: #666666; display: block; margin-bottom: 4px;">Your Notes</span>
      <span style="font-size: 13px; color: #cccccc; line-height: 1.5;">${notes}</span>
    </td>
  </tr>
</table>
` : ''}

<!-- What's next section -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
  <tr>
    <td style="padding-bottom: 14px;">
      <span style="font-size: 16px; font-weight: 600; color: #ffffff;">What Happens Next?</span>
    </td>
  </tr>
</table>

<!-- Steps -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
  <!-- Step 1 -->
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #2a2a2a;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="28" valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="22" height="22" align="center" valign="middle" style="background-color: #a855f7; border-radius: 11px; font-size: 11px; color: #ffffff; font-weight: 600;">1</td>
              </tr>
            </table>
          </td>
          <td style="padding-left: 10px;">
            <span style="font-size: 14px; color: #ffffff; font-weight: 500; display: block;">Day Before Confirmation</span>
            <span style="font-size: 12px; color: #666666;">We'll text you to confirm our arrival window</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Step 2 -->
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #2a2a2a;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="28" valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="22" height="22" align="center" valign="middle" style="background-color: #a855f7; border-radius: 11px; font-size: 11px; color: #ffffff; font-weight: 600;">2</td>
              </tr>
            </table>
          </td>
          <td style="padding-left: 10px;">
            <span style="font-size: 14px; color: #ffffff; font-weight: 500; display: block;">Delivery Day</span>
            <span style="font-size: 12px; color: #666666;">We set up everything and do a safety walkthrough</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Step 3 -->
  <tr>
    <td style="padding: 10px 0;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="28" valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="22" height="22" align="center" valign="middle" style="background-color: #a855f7; border-radius: 11px; font-size: 11px; color: #ffffff; font-weight: 600;">3</td>
              </tr>
            </table>
          </td>
          <td style="padding-left: 10px;">
            <span style="font-size: 14px; color: #ffffff; font-weight: 500; display: block;">Party Time! 🎈</span>
            <span style="font-size: 12px; color: #666666;">Enjoy your event — we handle the rest</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Prep tips -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1f1a2e; border-radius: 10px; margin-bottom: 24px;">
  <tr>
    <td style="padding: 14px 18px;">
      <span style="font-size: 13px; font-weight: 600; color: #c084fc; display: block; margin-bottom: 6px;">💡 Quick Prep Tips</span>
      <span style="font-size: 13px; color: #a0a0a0; line-height: 1.5;">Clear a flat area at least 5 feet larger than the unit. Have a power outlet within ${POWER_OUTLET_DISTANCE} feet. Remove sharp objects from the setup area.</span>
    </td>
  </tr>
</table>

<!-- CTA -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding-bottom: 8px;">
      <span style="font-size: 13px; color: #666666;">Questions? We're here to help!</span>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="tel:3524453723" style="display: inline-block; background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 50px;">Call Us: (352) 445-3723</a>
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
<!-- Alert header -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding-bottom: 8px;">
      <span style="font-size: 28px;">🎯</span>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-bottom: 4px;">
      <span style="font-size: 22px; font-weight: 700; color: #ffffff;">New Booking!</span>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-bottom: 24px;">
      <span style="font-size: 14px; color: #888888;">${rentalName} • ${formattedDate}</span>
    </td>
  </tr>
</table>

<!-- Quick actions -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
  <tr>
    <td align="center">
      <a href="tel:${customerPhone.replace(/\D/g, '')}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 50px; margin-right: 8px;">📞 Call</a>
      <a href="mailto:${customerEmail}" style="display: inline-block; background-color: #333333; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 50px;">✉️ Email</a>
    </td>
  </tr>
</table>

<!-- Customer info -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #164e63 0%, #0e7490 100%); border-radius: 12px; margin-bottom: 16px;">
  <tr>
    <td style="padding: 16px 20px;">
      <span style="font-size: 10px; color: #67e8f9; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Customer</span>
      <span style="font-size: 17px; color: #ffffff; font-weight: 600; display: block; margin-bottom: 6px;">${customerName}</span>
      <span style="font-size: 13px; color: #cccccc; display: block; margin-bottom: 2px;">📱 ${customerPhone}</span>
      <span style="font-size: 13px; color: #cccccc;">✉️ ${customerEmail}</span>
    </td>
  </tr>
</table>

<!-- Booking details -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #222222; border-radius: 12px; margin-bottom: 16px;">
  <tr>
    <td style="padding: 16px 20px;">
      <span style="font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 12px;">Booking Details</span>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #888888;">Rental</span>
          </td>
          <td align="right" style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #ffffff; font-weight: 500;">${rentalName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #888888;">Date</span>
          </td>
          <td align="right" style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #ffffff; font-weight: 500;">${formattedDate}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #888888;">Package</span>
          </td>
          <td align="right" style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #ffffff; font-weight: 500;">${bookingType === 'weekend' ? 'Weekend' : 'Daily'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #888888;">Delivery</span>
          </td>
          <td align="right" style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #ffffff; font-weight: 500;">${deliveryTime}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #888888;">Pickup</span>
          </td>
          <td align="right" style="padding: 6px 0; border-bottom: 1px solid #333333;">
            <span style="font-size: 13px; color: #ffffff; font-weight: 500;">${pickupTime}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="font-size: 13px; color: #888888;">Address</span>
          </td>
          <td align="right" style="padding: 6px 0;">
            <span style="font-size: 13px; color: #ffffff; font-weight: 500;">${address}, ${city}</span>
          </td>
        </tr>
      </table>
      
    </td>
  </tr>
</table>

<!-- Pricing -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #14532d; border-radius: 12px; margin-bottom: 16px;">
  <tr>
    <td style="padding: 16px 20px;">
      <span style="font-size: 10px; color: #86efac; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 10px;">Pricing</span>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 4px 0;">
            <span style="font-size: 13px; color: #a7f3d0;">Total</span>
          </td>
          <td align="right" style="padding: 4px 0;">
            <span style="font-size: 13px; color: #ffffff;">$${totalPrice}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">
            <span style="font-size: 13px; color: #a7f3d0;">Deposit</span>
          </td>
          <td align="right" style="padding: 4px 0;">
            <span style="font-size: 13px; color: #ffffff;">$${depositAmount}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0 0 0; border-top: 1px solid #166534;">
            <span style="font-size: 14px; color: #4ade80; font-weight: 600;">Balance Due</span>
          </td>
          <td align="right" style="padding: 8px 0 0 0; border-top: 1px solid #166534;">
            <span style="font-size: 18px; color: #4ade80; font-weight: 700;">$${balanceDue}</span>
          </td>
        </tr>
      </table>
      
    </td>
  </tr>
</table>

${notes ? `
<!-- Customer notes -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1f1a2e; border-left: 3px solid #a855f7; border-radius: 0 8px 8px 0; margin-bottom: 16px;">
  <tr>
    <td style="padding: 14px 18px;">
      <span style="font-size: 10px; color: #c084fc; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Customer Notes</span>
      <span style="font-size: 13px; color: #cccccc; line-height: 1.5;">${notes}</span>
    </td>
  </tr>
</table>
` : ''}

<!-- Checklist -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #222222; border-radius: 10px;">
  <tr>
    <td style="padding: 14px 18px;">
      <span style="font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 10px;">Action Items</span>
      <span style="font-size: 13px; color: #aaaaaa; display: block; margin-bottom: 6px;">☐ Add to calendar</span>
      <span style="font-size: 13px; color: #aaaaaa; display: block; margin-bottom: 6px;">☐ Confirm ${rentalName} availability</span>
      <span style="font-size: 13px; color: #aaaaaa; display: block;">☐ Text customer day before</span>
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

    // Check if date is still available
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

    // For weekend bookings, check Sunday too
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

    // Create booking
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

    // Send customer email
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
        subject: `You're booked! ${rentalName} on ${formattedDate}`,
        html: createEmailWrapper(
          customerContent,
          `Your ${rentalName} rental is confirmed for ${formattedDate}. We can't wait to make your party amazing!`
        ),
      });
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError);
    }

    // Send business notification
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
        subject: `New Booking: ${rentalName} - ${formattedDate} - $${totalPrice}`,
        html: createEmailWrapper(
          businessContent,
          `New booking from ${customerName} for ${rentalName} on ${formattedDate}. Total: $${totalPrice}`
        ),
      });
    } catch (emailError) {
      console.error('Failed to send business notification:', emailError);
    }

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