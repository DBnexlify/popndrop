import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';
import { notifyNewBooking } from '@/lib/push-notifications';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEPOSIT_AMOUNT = 50;

// ============================================================================
// TYPES
// ============================================================================

type BookingType = 'daily' | 'weekend' | 'sunday';

interface CreateBookingRequest {
  productSlug: string;
  eventDate: string;
  bookingType: BookingType;
  deliveryWindow: string;
  pickupWindow: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  notes?: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  price_daily: number;
  price_weekend: number;
  price_sunday: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Split full name into first and last name
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Calculate delivery and pickup dates based on event date and booking type
 */
function calculateDates(eventDate: string, bookingType: BookingType): {
  deliveryDate: string;
  pickupDate: string;
} {
  const event = new Date(eventDate + 'T12:00:00'); // Noon to avoid timezone issues
  const delivery = new Date(event);
  const pickup = new Date(event);

  if (bookingType === 'sunday') {
    // Sunday event: deliver Saturday, pickup Monday
    delivery.setDate(delivery.getDate() - 1);
    pickup.setDate(pickup.getDate() + 1);
  } else if (bookingType === 'weekend') {
    // Saturday event with weekend package: pickup Monday
    pickup.setDate(pickup.getDate() + 2);
  }
  // Daily: delivery and pickup same day

  return {
    deliveryDate: delivery.toISOString().split('T')[0],
    pickupDate: pickup.toISOString().split('T')[0],
  };
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get price based on booking type
 */
function getPrice(product: Product, bookingType: BookingType): number {
  switch (bookingType) {
    case 'daily':
      return Number(product.price_daily);
    case 'weekend':
      return Number(product.price_weekend);
    case 'sunday':
      return Number(product.price_sunday);
    default:
      return Number(product.price_daily);
  }
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CreateBookingRequest = await request.json();

    const {
      productSlug,
      eventDate,
      bookingType,
      deliveryWindow,
      pickupWindow,
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      notes,
    } = body;

    // Validate required fields
    if (!productSlug || !eventDate || !customerEmail || !customerPhone || !address) {
      console.error('Missing required fields:', { productSlug, eventDate, customerEmail, customerPhone, address });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ========================================================================
    // 1. GET PRODUCT
    // ========================================================================
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('slug', productSlug)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productSlug, productError);
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // ========================================================================
    // 2. CALCULATE DATES & PRICING
    // ========================================================================
    const { deliveryDate, pickupDate } = calculateDates(eventDate, bookingType);
    const priceTotal = getPrice(product as Product, bookingType);
    const balanceDue = priceTotal - DEPOSIT_AMOUNT;

    console.log('Booking details:', { 
      productSlug, 
      eventDate, 
      deliveryDate, 
      pickupDate, 
      bookingType,
      priceTotal 
    });

    // ========================================================================
    // 3. FIND AVAILABLE UNIT
    // ========================================================================
    // Uses p_ prefixed parameters: p_product_id, p_start_date, p_end_date
    const { data: availableUnitId, error: unitError } = await supabase
      .rpc('find_available_unit', {
        p_product_id: product.id,
        p_start_date: deliveryDate,
        p_end_date: pickupDate,
      });

    if (unitError) {
      console.error('Error finding available unit:', unitError);
      return NextResponse.json(
        { success: false, error: 'Error checking availability. Please try again.' },
        { status: 500 }
      );
    }

    if (!availableUnitId) {
      console.log('No available unit found for dates:', { deliveryDate, pickupDate });
      return NextResponse.json(
        { 
          success: false, 
          error: 'This product is not available for the selected dates. Please choose another date.' 
        },
        { status: 409 }
      );
    }

    console.log('Found available unit:', availableUnitId);

    // ========================================================================
    // 4. FIND OR CREATE CUSTOMER
    // ========================================================================
    const { firstName, lastName } = splitName(customerName);

    // First, try to find existing customer by email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', customerEmail.toLowerCase())
      .single();

    let customerId: string;

    if (existingCustomer) {
      // Update existing customer with latest info
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          phone: customerPhone,
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', existingCustomer.id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
      }

      customerId = existingCustomer.id;
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          email: customerEmail.toLowerCase(),
          phone: customerPhone,
          first_name: firstName,
          last_name: lastName,
        })
        .select()
        .single();

      if (customerError || !newCustomer) {
        console.error('Error creating customer:', customerError);
        return NextResponse.json(
          { success: false, error: 'Failed to create customer record' },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // ========================================================================
    // 5. CREATE BOOKING
    // ========================================================================
    const bookingData = {
      unit_id: availableUnitId,
      customer_id: customerId,
      booking_type: bookingType,
      event_date: eventDate,
      delivery_date: deliveryDate,
      pickup_date: pickupDate,
      delivery_window: deliveryWindow,
      pickup_window: pickupWindow,
      delivery_address: address,
      delivery_city: city,
      subtotal: priceTotal,
      deposit_amount: DEPOSIT_AMOUNT,
      balance_due: balanceDue,
      customer_notes: notes || null,
      product_snapshot: {
        slug: product.slug,
        name: product.name,
        price_daily: product.price_daily,
        price_weekend: product.price_weekend,
        price_sunday: product.price_sunday,
      },
      status: 'confirmed',
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // ========================================================================
    // 6. SEND PUSH NOTIFICATION TO ADMIN
    // ========================================================================
    try {
      await notifyNewBooking(
        booking.booking_number,
        customerName,
        formatDate(eventDate)
      );
    } catch (pushError) {
      console.error('Failed to send push notification:', pushError);
      // Don't fail the booking if push notification fails
    }

    // ========================================================================
    // 7. SEND EMAILS
    // ========================================================================
    const formattedEventDate = formatDate(eventDate);
    const formattedPickupDate = formatDate(pickupDate);

    // Customer confirmation email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `Booking Confirmed: ${product.name} on ${formattedEventDate}`,
        html: createCustomerEmail({
          customerName: firstName,
          productName: product.name,
          bookingNumber: booking.booking_number,
          eventDate: formattedEventDate,
          pickupDate: formattedPickupDate,
          deliveryWindow,
          pickupWindow,
          address,
          city,
          totalPrice: priceTotal,
          depositAmount: DEPOSIT_AMOUNT,
          balanceDue,
          notes,
          bookingType,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError);
    }

    // Business notification email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `New Booking: ${booking.booking_number} - ${product.name} - ${formattedEventDate}`,
        html: createBusinessEmail({
          bookingNumber: booking.booking_number,
          customerName,
          customerEmail,
          customerPhone,
          productName: product.name,
          eventDate: formattedEventDate,
          deliveryDate: formatDate(deliveryDate),
          pickupDate: formattedPickupDate,
          deliveryWindow,
          pickupWindow,
          address,
          city,
          totalPrice: priceTotal,
          depositAmount: DEPOSIT_AMOUNT,
          balanceDue,
          notes,
          bookingType,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send business email:', emailError);
    }

    // ========================================================================
    // 8. RETURN SUCCESS
    // ========================================================================
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      redirectUrl: `/bookings/success?booking_id=${booking.id}`,
    });

  } catch (error) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function createCustomerEmail(data: {
  customerName: string;
  productName: string;
  bookingNumber: string;
  eventDate: string;
  pickupDate: string;
  deliveryWindow: string;
  pickupWindow: string;
  address: string;
  city: string;
  totalPrice: number;
  depositAmount: number;
  balanceDue: number;
  notes?: string;
  bookingType: BookingType;
}): string {
  const bookingTypeLabel = data.bookingType === 'weekend' 
    ? 'Weekend Package' 
    : data.bookingType === 'sunday' 
    ? 'Sunday Rental' 
    : 'Daily Rental';

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
      
      <!-- Header -->
      <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
        <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #22c55e; border-radius: 50%; line-height: 56px; text-align: center;">
          <span style="color: white; font-size: 28px;">✓</span>
        </div>
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">You're All Set!</h1>
        <p style="margin: 8px 0 0; color: #888;">Booking ${data.bookingNumber}</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 24px;">
        <p style="color: #ccc; margin: 0 0 20px;">Hey ${data.customerName}! Your rental is confirmed and ready to go.</p>
        
        <!-- Product -->
        <div style="background: linear-gradient(135deg, #581c87, #0e7490); border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: center;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.6); font-size: 11px; text-transform: uppercase;">Your Rental</p>
          <p style="margin: 0; color: white; font-size: 18px; font-weight: 600;">${data.productName}</p>
        </div>
        
        <!-- Details -->
        <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                <p style="margin: 0; color: #666; font-size: 11px;">📅 Event Date</p>
                <p style="margin: 4px 0 0; color: white; font-weight: 500;">${data.eventDate}</p>
              </td>
              <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                <p style="margin: 0; color: #666; font-size: 11px;">📦 Package</p>
                <p style="margin: 4px 0 0; color: white; font-weight: 500;">${bookingTypeLabel}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <p style="margin: 0; color: #666; font-size: 11px;">🚚 Delivery</p>
                <p style="margin: 4px 0 0; color: white; font-weight: 500;">${data.deliveryWindow}</p>
              </td>
              <td style="padding: 8px 0; vertical-align: top;">
                <p style="margin: 0; color: #666; font-size: 11px;">📍 Pickup</p>
                <p style="margin: 4px 0 0; color: white; font-weight: 500;">${data.pickupWindow}</p>
              </td>
            </tr>
          </table>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">
            <p style="margin: 0; color: #666; font-size: 11px;">🏠 Location</p>
            <p style="margin: 4px 0 0; color: white; font-weight: 500;">${data.address}, ${data.city}</p>
          </div>
        </div>
        
        <!-- Pricing -->
        <div style="background-color: rgba(34, 211, 238, 0.1); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #888;">Total (due on delivery)</td>
              <td style="text-align: right; color: #22d3ee; font-size: 22px; font-weight: 700;">$${data.balanceDue}</td>
            </tr>
          </table>
        </div>
        
        ${data.notes ? `
        <div style="margin-bottom: 16px; padding: 12px; background-color: #222; border-left: 3px solid #a855f7; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 4px; color: #666; font-size: 11px;">Your Notes</p>
          <p style="margin: 0; color: #ccc; font-size: 13px;">${data.notes}</p>
        </div>
        ` : ''}
        
        <!-- Quick Tips -->
        <div style="padding: 14px; background-color: #1f1a2e; border-radius: 10px;">
          <p style="margin: 0 0 6px; color: #c084fc; font-size: 13px; font-weight: 600;">💡 Quick Prep Tips</p>
          <p style="margin: 0; color: #a0a0a0; font-size: 13px;">Clear a flat area at least 5 feet larger than the unit. Have a power outlet within 50 feet. Remove sharp objects from the setup area.</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Questions? We're here to help!</p>
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

function createBusinessEmail(data: {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  eventDate: string;
  deliveryDate: string;
  pickupDate: string;
  deliveryWindow: string;
  pickupWindow: string;
  address: string;
  city: string;
  totalPrice: number;
  depositAmount: number;
  balanceDue: number;
  notes?: string;
  bookingType: BookingType;
}): string {
  const bookingTypeLabel = data.bookingType === 'weekend' 
    ? 'Weekend' 
    : data.bookingType === 'sunday' 
    ? 'Sunday' 
    : 'Daily';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
    <div style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
      
      <!-- Header -->
      <div style="padding: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 28px;">🎯</p>
        <h1 style="margin: 0; color: white; font-size: 22px;">New Booking!</h1>
        <p style="margin: 8px 0 0; color: #888;">${data.bookingNumber} • ${data.productName}</p>
      </div>
      
      <!-- Quick Actions -->
      <div style="padding: 0 24px 20px; text-align: center;">
        <a href="tel:${data.customerPhone.replace(/\D/g, '')}" style="display: inline-block; background-color: #22c55e; color: white; text-decoration: none; padding: 10px 18px; border-radius: 50px; font-size: 13px; font-weight: 600; margin-right: 8px;">📞 Call</a>
        <a href="mailto:${data.customerEmail}" style="display: inline-block; background-color: #333; color: white; text-decoration: none; padding: 10px 18px; border-radius: 50px; font-size: 13px; font-weight: 600;">✉️ Email</a>
      </div>
      
      <!-- Customer -->
      <div style="margin: 0 24px 16px; background: linear-gradient(135deg, #164e63, #0e7490); border-radius: 12px; padding: 16px;">
        <p style="margin: 0 0 8px; color: #67e8f9; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Customer</p>
        <p style="margin: 0 0 6px; color: white; font-size: 17px; font-weight: 600;">${data.customerName}</p>
        <p style="margin: 0 0 2px; color: #ccc; font-size: 13px;">📱 ${data.customerPhone}</p>
        <p style="margin: 0; color: #ccc; font-size: 13px;">✉️ ${data.customerEmail}</p>
      </div>
      
      <!-- Details -->
      <div style="margin: 0 24px 16px; background-color: #222; border-radius: 12px; padding: 16px;">
        <p style="margin: 0 0 12px; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Booking Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Rental</td><td style="padding: 6px 0; color: white; font-size: 13px; font-weight: 500; text-align: right;">${data.productName}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; border-top: 1px solid #333;">Event Date</td><td style="padding: 6px 0; color: white; font-size: 13px; font-weight: 500; text-align: right; border-top: 1px solid #333;">${data.eventDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; border-top: 1px solid #333;">Package</td><td style="padding: 6px 0; color: white; font-size: 13px; font-weight: 500; text-align: right; border-top: 1px solid #333;">${bookingTypeLabel}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; border-top: 1px solid #333;">Delivery</td><td style="padding: 6px 0; color: white; font-size: 13px; font-weight: 500; text-align: right; border-top: 1px solid #333;">${data.deliveryDate} (${data.deliveryWindow})</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; border-top: 1px solid #333;">Pickup</td><td style="padding: 6px 0; color: white; font-size: 13px; font-weight: 500; text-align: right; border-top: 1px solid #333;">${data.pickupDate} (${data.pickupWindow})</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; border-top: 1px solid #333;">Address</td><td style="padding: 6px 0; color: white; font-size: 13px; font-weight: 500; text-align: right; border-top: 1px solid #333;">${data.address}, ${data.city}</td></tr>
        </table>
      </div>
      
      <!-- Pricing -->
      <div style="margin: 0 24px 16px; background-color: #14532d; border-radius: 12px; padding: 16px;">
        <p style="margin: 0 0 10px; color: #86efac; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Pricing</p>
        <table style="width: 100%;">
          <tr><td style="padding: 4px 0; color: #a7f3d0; font-size: 13px;">Total</td><td style="text-align: right; color: white; font-size: 13px;">$${data.totalPrice}</td></tr>
          <tr><td style="padding: 4px 0; color: #a7f3d0; font-size: 13px;">Deposit</td><td style="text-align: right; color: white; font-size: 13px;">$${data.depositAmount}</td></tr>
          <tr><td style="padding: 8px 0 0 0; border-top: 1px solid #166534; color: #4ade80; font-size: 14px; font-weight: 600;">Balance Due</td><td style="text-align: right; padding: 8px 0 0 0; border-top: 1px solid #166534; color: #4ade80; font-size: 18px; font-weight: 700;">$${data.balanceDue}</td></tr>
        </table>
      </div>
      
      ${data.notes ? `
      <div style="margin: 0 24px 16px; background-color: #1f1a2e; border-left: 3px solid #a855f7; border-radius: 0 8px 8px 0; padding: 14px;">
        <p style="margin: 0 0 6px; color: #c084fc; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Customer Notes</p>
        <p style="margin: 0; color: #ccc; font-size: 13px;">${data.notes}</p>
      </div>
      ` : ''}
      
      <!-- Checklist -->
      <div style="margin: 0 24px 24px; background-color: #222; border-radius: 10px; padding: 14px;">
        <p style="margin: 0 0 10px; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Action Items</p>
        <p style="margin: 0 0 6px; color: #aaa; font-size: 13px;">☐ Add to calendar</p>
        <p style="margin: 0 0 6px; color: #aaa; font-size: 13px;">☐ Confirm unit availability</p>
        <p style="margin: 0; color: #aaa; font-size: 13px;">☐ Text customer day before</p>
      </div>
      
    </div>
  </div>
</body>
</html>
  `;
}