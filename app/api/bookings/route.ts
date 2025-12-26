import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';
import { notifyNewBooking } from '@/lib/push-notifications';
import { stripe, dollarsToCents, DEPOSIT_AMOUNT_CENTS, DEPOSIT_AMOUNT_DOLLARS } from '@/lib/stripe';
import { validateBookingDateCutoff } from '@/lib/booking-cutoff';
import {
  getAvailableSlotsForDate,
  checkDayRentalAvailability,
  createBookingBlocks,
  validateLeadTime,
  isSlotBasedProduct,
  LEAD_TIME_HOURS,
  canHaveSameDayPickup,
} from '@/lib/booking-blocks';
import type { Product, SchedulingMode } from '@/lib/database-types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEPOSIT_AMOUNT = 50;

// Florida timezone for all time displays
const FLORIDA_TIMEZONE = 'America/New_York';

/**
 * Format a date/time for display in Florida timezone
 */
function formatFloridaTime(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    timeZone: FLORIDA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

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
  paymentType?: 'deposit' | 'full';
  promoCode?: string | null;
  // New: Slot-based booking support
  slotId?: string;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  price_daily: number;
  price_weekend: number;
  price_sunday: number;
  scheduling_mode: SchedulingMode;
  setup_minutes: number;
  teardown_minutes: number;
  travel_buffer_minutes: number;
  cleaning_minutes: number;
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
 * Used for day_rental products (bounce houses)
 */
function calculateDates(eventDate: string, bookingType: BookingType): {
  deliveryDate: string;
  pickupDate: string;
} {
  const event = new Date(eventDate + 'T12:00:00');
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
  // Daily: delivery and pickup same day (unless Party House conflict)

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
 * Format date short for Stripe description
 */
function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get price based on booking type
 */
function getPrice(product: ProductRow, bookingType: BookingType): number {
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
      paymentType = 'deposit',
      promoCode,
      slotId,
    } = body;

    // Validate required fields
    if (!productSlug || !eventDate || !customerEmail || !customerPhone || !address) {
      console.error('Missing required fields:', { productSlug, eventDate, customerEmail, customerPhone, address });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ========================================================================
    // VALIDATE BOOKING CUTOFF (Legacy - will be replaced by lead time check)
    // ========================================================================
    const cutoffValidation = validateBookingDateCutoff(eventDate);
    if (!cutoffValidation.valid) {
      console.log('Booking rejected by cutoff rule:', { eventDate, reason: cutoffValidation.reason });
      return NextResponse.json(
        { 
          success: false, 
          error: cutoffValidation.reason || 'This date is no longer available for booking.',
          earliestAvailable: cutoffValidation.earliestAvailable,
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ========================================================================
    // 1. GET PRODUCT (with scheduling mode)
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

    const productRow = product as ProductRow;
    const isSlotBased = productRow.scheduling_mode === 'slot_based';

    console.log('Booking request:', { 
      productSlug, 
      eventDate, 
      bookingType,
      schedulingMode: productRow.scheduling_mode,
      isSlotBased,
      slotId,
    });

    // ========================================================================
    // 2. HANDLE BASED ON SCHEDULING MODE
    // ========================================================================

    let unitId: string;
    let deliveryDate: string;
    let pickupDate: string;
    let eventStartTime: string | null = null;
    let eventEndTime: string | null = null;
    let serviceStartTime: string | null = null;
    let serviceEndTime: string | null = null;
    let selectedSlotId: string | null = null;
    // Crew IDs assigned during availability check (for ops resource booking blocks)
    let assignedDeliveryCrewId: string | null = null;
    let assignedPickupCrewId: string | null = null;

    if (isSlotBased) {
      // ======================================================================
      // SLOT-BASED PRODUCT (Party House)
      // ======================================================================
      
      if (!slotId) {
        return NextResponse.json(
          { success: false, error: 'Time slot selection is required for this product' },
          { status: 400 }
        );
      }

      // Get available slots for this date
      const { slots, error: slotsError } = await getAvailableSlotsForDate(
        productRow.id,
        eventDate,
        LEAD_TIME_HOURS
      );

      if (slotsError) {
        console.error('Error getting slots:', slotsError);
        return NextResponse.json(
          { success: false, error: 'Error checking availability' },
          { status: 500 }
        );
      }

      // Find the selected slot
      const selectedSlot = slots.find(s => s.slot_id === slotId);

      if (!selectedSlot) {
        return NextResponse.json(
          { success: false, error: 'Selected time slot is not valid for this date' },
          { status: 400 }
        );
      }

      if (!selectedSlot.is_available) {
        return NextResponse.json(
          { 
            success: false, 
            error: selectedSlot.unavailable_reason || 'This time slot is no longer available' 
          },
          { status: 409 }
        );
      }

      // For slot-based: delivery and pickup are same day as event
      deliveryDate = eventDate;
      pickupDate = eventDate;
      selectedSlotId = slotId;
      eventStartTime = selectedSlot.event_start;
      eventEndTime = selectedSlot.event_end;
      serviceStartTime = selectedSlot.service_start;
      serviceEndTime = selectedSlot.service_end;

      // Get the unit for this product
      const { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('product_id', productRow.id)
        .eq('status', 'available')
        .order('unit_number')
        .limit(1)
        .single();

      if (!unit) {
        return NextResponse.json(
          { success: false, error: 'No units available' },
          { status: 409 }
        );
      }

      unitId = unit.id;

      console.log('Slot-based booking:', {
        slotId,
        slotLabel: selectedSlot.label,
        eventStart: eventStartTime,
        eventEnd: eventEndTime,
        serviceStart: serviceStartTime,
        serviceEnd: serviceEndTime,
      });

    } else {
      // ======================================================================
      // DAY RENTAL PRODUCT (Bounce Houses)
      // ======================================================================
      
      // Calculate dates based on booking type
      const dates = calculateDates(eventDate, bookingType);
      deliveryDate = dates.deliveryDate;
      pickupDate = dates.pickupDate;

      // For daily bookings, check if same-day pickup is possible
      // (depends on whether Party House is booked that evening)
      if (bookingType === 'daily') {
        const sameDayPossible = await canHaveSameDayPickup(eventDate);
        
        if (!sameDayPossible) {
          // Move pickup to next day
          const nextDay = new Date(eventDate + 'T12:00:00');
          nextDay.setDate(nextDay.getDate() + 1);
          pickupDate = nextDay.toISOString().split('T')[0];
          
          console.log('Same-day pickup not possible (Party House conflict), moved to:', pickupDate);
        }
      }

      // Check availability using the new block-based system
      const availability = await checkDayRentalAvailability(
        productRow.id,
        deliveryDate,
        pickupDate,
        LEAD_TIME_HOURS
      );

      if (!availability.isAvailable) {
        console.log('Day rental not available:', availability.unavailableReason);
        return NextResponse.json(
          { 
            success: false, 
            error: availability.unavailableReason || 'This date is not available' 
          },
          { status: 409 }
        );
      }

      if (!availability.unitId) {
        return NextResponse.json(
          { success: false, error: 'No units available for the selected dates' },
          { status: 409 }
        );
      }

      unitId = availability.unitId;
      serviceStartTime = availability.serviceStart;
      serviceEndTime = availability.serviceEnd;
      // Store assigned crew IDs for booking blocks creation
      assignedDeliveryCrewId = availability.deliveryCrewId;
      assignedPickupCrewId = availability.pickupCrewId;

      // Calculate event times for day rental
      // Event starts at delivery (9 AM) and ends at pickup
      const eventStart = new Date(`${deliveryDate}T09:00:00`);
      const eventEnd = availability.sameDayPickupPossible
        ? new Date(`${deliveryDate}T18:00:00`)
        : new Date(`${pickupDate}T10:00:00`);
      
      eventStartTime = eventStart.toISOString();
      eventEndTime = eventEnd.toISOString();

      console.log('Day rental booking:', {
        deliveryDate,
        pickupDate,
        eventStart: eventStartTime,
        eventEnd: eventEndTime,
        sameDayPickup: availability.sameDayPickupPossible,
      });
    }

    // ========================================================================
    // 3. CALCULATE PRICING
    // ========================================================================
    const priceTotal = getPrice(productRow, bookingType);
    let balanceDue = priceTotal - DEPOSIT_AMOUNT;

    // ========================================================================
    // 4. VALIDATE PROMO CODE (if provided)
    // ========================================================================
    let promoCodeId: string | null = null;
    let promoDiscount = 0;
    let finalPrice = priceTotal;

    if (promoCode && promoCode.trim()) {
      console.log('Validating promo code:', promoCode);

      const { data: existingCustomerForPromo } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail.toLowerCase())
        .single();

      const customerIdForPromo = existingCustomerForPromo?.id || null;

      const { data: promoResult, error: promoError } = await supabase
        .rpc('validate_promo_code', {
          p_code: promoCode.trim().toUpperCase(),
          p_customer_id: customerIdForPromo,
          p_product_id: productRow.id,
          p_order_amount: priceTotal,
        });

      if (promoError) {
        console.error('Error validating promo code:', promoError);
        return NextResponse.json(
          { success: false, error: 'Unable to validate promo code. Please try again.' },
          { status: 500 }
        );
      }

      const validation = Array.isArray(promoResult) ? promoResult[0] : promoResult;

      if (!validation || !validation.valid) {
        const errorMsg = validation?.error_message || 'Invalid promo code';
        console.log('Promo code invalid:', errorMsg);
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 400 }
        );
      }

      promoCodeId = validation.promo_code_id;
      promoDiscount = validation.calculated_discount || 0;
      finalPrice = priceTotal - promoDiscount;
      balanceDue = finalPrice - DEPOSIT_AMOUNT;

      console.log('Promo code applied:', {
        promoCodeId,
        promoDiscount,
        originalPrice: priceTotal,
        finalPrice,
        balanceDue,
      });
    }

    // ========================================================================
    // 5. FIND OR CREATE CUSTOMER
    // ========================================================================
    const { firstName, lastName } = splitName(customerName);

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', customerEmail.toLowerCase())
      .single();

    let customerId: string;

    if (existingCustomer) {
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
    // 6. CREATE BOOKING (as PENDING)
    // ========================================================================
    const bookingData = {
      unit_id: unitId,
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
      discount_amount: promoDiscount,
      promo_code_id: promoCodeId,
      deposit_amount: DEPOSIT_AMOUNT,
      balance_due: Math.max(0, balanceDue),
      customer_notes: notes || null,
      product_snapshot: {
        id: productRow.id,
        slug: productRow.slug,
        name: productRow.name,
        price_daily: productRow.price_daily,
        price_weekend: productRow.price_weekend,
        price_sunday: productRow.price_sunday,
        promo_code: promoCodeId ? promoCode?.trim().toUpperCase() : null,
        promo_discount: promoDiscount,
      },
      // Booking blocks system fields
      slot_id: selectedSlotId,
      event_start_time: eventStartTime,
      event_end_time: eventEndTime,
      service_start_time: serviceStartTime,
      service_end_time: serviceEndTime,
      // Status
      status: 'pending',
      deposit_paid: false,
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      
      // Handle race condition (exclusion constraint violation)
      if (bookingError?.code === '23P01' || bookingError?.message?.includes('exclusion')) {
        console.log('Race condition caught by DB constraint');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Someone just booked this slot! Please choose another time.' 
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    console.log('Created pending booking:', booking.booking_number);

    // ========================================================================
    // 7. CREATE BOOKING BLOCKS (for scheduling/conflict prevention)
    // Creates: ASSET block (full rental) + OPS blocks (delivery + pickup legs)
    // ========================================================================
    if (eventStartTime && eventEndTime) {
      const blocksResult = await createBookingBlocks({
        bookingId: booking.id,
        unitId: unitId,
        productId: productRow.id,
        eventStart: eventStartTime,
        eventEnd: eventEndTime,
        // Pass crew IDs from availability check (ensures same crew is reserved)
        deliveryCrewId: assignedDeliveryCrewId,
        pickupCrewId: assignedPickupCrewId,
      });

      if (!blocksResult.success) {
        console.error('Failed to create booking blocks:', blocksResult.error);
        // Note: We continue anyway - the booking is created, blocks are for optimization
        // The database exclusion constraint is the real protection
      } else {
        console.log('Created booking blocks for:', booking.booking_number);
      }
    }

    // ========================================================================
    // 8. CREATE STRIPE CHECKOUT SESSION
    // ========================================================================
    const isFullPayment = paymentType === 'full';
    const amountCents = isFullPayment ? dollarsToCents(finalPrice) : DEPOSIT_AMOUNT_CENTS;
    const actualBalanceDue = Math.max(0, finalPrice - DEPOSIT_AMOUNT);
    
    const eventDateFormatted = formatDateShort(eventDate);
    
    let lineItemName = isFullPayment
      ? `${productRow.name} - Paid in Full`
      : `${productRow.name} - Deposit`;
    
    if (promoDiscount > 0) {
      lineItemName += ` (${promoCode?.trim().toUpperCase()} -$${promoDiscount})`;
    }
    
    // Add slot info for slot-based products
    if (isSlotBased && selectedSlotId) {
      const { data: slotData } = await supabase
        .from('product_slots')
        .select('label')
        .eq('id', selectedSlotId)
        .single();
      
      if (slotData) {
        lineItemName += ` • ${slotData.label}`;
      }
    }
    
    const lineItemDescription = isFullPayment
      ? `Booking ${booking.booking_number} • ${eventDateFormatted} • Nothing due on delivery!`
      : `Booking ${booking.booking_number} • ${eventDateFormatted} • $${actualBalanceDue} due on delivery`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        client_reference_id: booking.id,
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          payment_type: paymentType,
          customer_id: customerId,
          product_name: productRow.name,
          event_date: eventDate,
          slot_id: selectedSlotId || '',
          scheduling_mode: productRow.scheduling_mode || 'day_rental',
          promo_code_id: promoCodeId || '',
          promo_code: promoCode?.trim().toUpperCase() || '',
          promo_discount: promoDiscount.toString(),
          original_price: priceTotal.toString(),
          final_price: finalPrice.toString(),
        },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: lineItemName,
                description: lineItemDescription,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/bookings/success?booking_id=${booking.id}&payment_type=${paymentType}`,
        cancel_url: `${baseUrl}/bookings?cancelled=true&r=${productRow.slug}`,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      });

      console.log('Created Stripe session:', session.id);

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        checkoutUrl: session.url,
        paymentType,
        amount: amountCents / 100,
        // Return slot info for frontend
        slotId: selectedSlotId,
        schedulingMode: productRow.scheduling_mode,
      });

    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      // Clean up the pending booking and its blocks
      await supabase
        .from('booking_blocks')
        .delete()
        .eq('booking_id', booking.id);
      
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);
      
      return NextResponse.json(
        { success: false, error: 'Failed to create payment session. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EMAIL TEMPLATES (Called from webhook after payment)
// ============================================================================

export function createCustomerEmail(data: {
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
  paidInFull?: boolean;
  deliveryDate?: string;
  slotLabel?: string;  // New: time slot label for slot-based bookings
}): string {
  const formatDateDisplay = (dateStr: string): string => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const eventDateDisplay = formatDateDisplay(data.eventDate);
  const pickupDateDisplay = formatDateDisplay(data.pickupDate);
  
  const bookingTypeLabel = data.bookingType === 'weekend' 
    ? 'Weekend Package' 
    : data.bookingType === 'sunday' 
    ? 'Sunday Rental' 
    : 'Daily Rental';

  // Show slot info if available
  const timeSlotInfo = data.slotLabel 
    ? `<tr>
        <td style="padding: 8px 0; vertical-align: top; width: 50%;">
          <p style="margin: 0; color: #666; font-size: 11px;">⏰ Time Slot</p>
          <p style="margin: 4px 0 0; color: #c084fc; font-weight: 600;">${data.slotLabel}</p>
        </td>
      </tr>`
    : '';

  const paymentSection = data.paidInFull 
    ? `
        <div style="background-color: rgba(34, 197, 94, 0.15); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #22c55e; font-weight: 600;">✓ Paid in Full</td>
              <td style="text-align: right; color: #22c55e; font-size: 22px; font-weight: 700;">$${data.totalPrice}</td>
            </tr>
          </table>
          <p style="margin: 8px 0 0; color: #86efac; font-size: 12px;">Nothing due on delivery — you're all set!</p>
        </div>
    `
    : `
        <div style="background-color: rgba(34, 211, 238, 0.1); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #888; font-size: 13px;">Deposit paid</td>
              <td style="text-align: right; color: #22c55e; font-size: 13px;">✓ $${data.depositAmount}</td>
            </tr>
            <tr>
              <td style="color: #888; padding-top: 8px;">Balance due on delivery</td>
              <td style="text-align: right; color: #22d3ee; font-size: 22px; font-weight: 700; padding-top: 8px;">$${data.balanceDue}</td>
            </tr>
          </table>
        </div>
    `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://popndroprentals.com/brand/logo.png" alt="Pop and Drop Party Rentals" width="180" style="max-width: 180px; height: auto;" />
    </div>
    
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
          ${data.slotLabel ? `<p style="margin: 4px 0 0; color: #c084fc; font-size: 14px;">${data.slotLabel}</p>` : ''}
        </div>
        
        <!-- Details -->
        <div style="background-color: #222; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                <p style="margin: 0; color: #666; font-size: 11px;">📅 Event Date</p>
                <p style="margin: 4px 0 0; color: white; font-weight: 500;">${eventDateDisplay}</p>
              </td>
              <td style="padding: 8px 0; vertical-align: top; width: 50%;">
                <p style="margin: 0; color: #666; font-size: 11px;">📦 Package</p>
                <p style="margin: 4px 0 0; color: white; font-weight: 500;">${bookingTypeLabel}</p>
              </td>
            </tr>
            ${timeSlotInfo}
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
        
        <!-- Payment Section -->
        ${paymentSection}
        
        <!-- Add to Calendar -->
        ${(() => {
          const fullAddress = `${data.address}, ${data.city}, FL`;
          const deliveryDateStr = data.deliveryDate || data.eventDate;
          
          const parseWindow = (window: string) => {
            let startHour = 9, endHour = 11;
            if (window.toLowerCase().includes('afternoon')) { startHour = 13; endHour = 15; }
            else if (window.toLowerCase().includes('evening')) { startHour = 17; endHour = 19; }
            return { startHour, endHour };
          };
          
          const { startHour: delStart } = parseWindow(data.deliveryWindow);
          const deliveryStartDate = new Date(deliveryDateStr + 'T12:00:00');
          deliveryStartDate.setHours(delStart, 0, 0, 0);
          const deliveryEndDate = new Date(data.pickupDate + 'T12:00:00');
          const { endHour: pickEnd } = parseWindow(data.pickupWindow);
          deliveryEndDate.setHours(pickEnd, 0, 0, 0);
          
          const formatGoogleDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          
          const calDescription = `🎈 ${data.productName} Rental${data.slotLabel ? ` (${data.slotLabel})` : ''}\n\n📋 Booking: ${data.bookingNumber}\n📅 Event: ${eventDateDisplay}\n🚚 Delivery: ${data.deliveryWindow}\n📦 Pickup: ${pickupDateDisplay} at ${data.pickupWindow}\n\n${data.paidInFull ? '✓ PAID IN FULL' : `Balance due: $${data.balanceDue}`}\n\n📞 Questions? Call (352) 445-3723`;
          
          const googleParams = new URLSearchParams({
            action: 'TEMPLATE',
            text: `🎉 ${data.productName} - Party Day!`,
            dates: `${formatGoogleDate(deliveryStartDate)}/${formatGoogleDate(deliveryEndDate)}`,
            details: calDescription,
            location: fullAddress,
            ctz: 'America/New_York',
          });
          const googleUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;
          
          const outlookParams = new URLSearchParams({
            path: '/calendar/action/compose',
            rru: 'addevent',
            subject: `🎉 ${data.productName} - Party Day!`,
            body: calDescription,
            location: fullAddress,
            startdt: deliveryStartDate.toISOString(),
            enddt: deliveryEndDate.toISOString(),
          });
          const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;
          
          return `
        <div style="background-color: #1a1a2e; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <p style="margin: 0 0 10px; color: #c084fc; font-size: 13px; font-weight: 600;">📅 Don't forget your party!</p>
          <p style="margin: 0 0 12px; color: #a0a0a0; font-size: 12px;">Add to your calendar so you're ready:</p>
          <table style="width: 100%;">
            <tr>
              <td style="padding-right: 8px;">
                <a href="${googleUrl}" style="display: block; background-color: #4285f4; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; text-align: center;">📅 Google Calendar</a>
              </td>
              <td style="padding-left: 8px;">
                <a href="${outlookUrl}" style="display: block; background-color: #0078d4; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; text-align: center;">📅 Outlook</a>
              </td>
            </tr>
          </table>
        </div>`;
        })()}
        
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

export function createBusinessEmail(data: {
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
  paidInFull?: boolean;
  amountPaid: number;
  stripePaymentIntentId?: string;
  stripeReceiptUrl?: string;
  cardLast4?: string;
  cardBrand?: string;
  slotLabel?: string;  // New: time slot label
}): string {
  const bookingTypeLabel = data.bookingType === 'weekend' 
    ? 'Weekend Package' 
    : data.bookingType === 'sunday' 
    ? 'Sunday Rental' 
    : 'Daily Rental';

  const formatDateDisplay = (dateStr: string): string => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateShortFn = (dateStr: string): string => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const generateGoogleCalendarUrl = (title: string, dateStr: string, timeWindow: string, location: string, description: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    
    let startHour = 9;
    let endHour = 11;
    
    if (timeWindow.toLowerCase().includes('afternoon') || timeWindow.includes('1') || timeWindow.includes('2')) {
      startHour = 13;
      endHour = 15;
    } else if (timeWindow.toLowerCase().includes('evening') || timeWindow.includes('5') || timeWindow.includes('6')) {
      startHour = 17;
      endHour = 19;
    }
    
    const startDate = new Date(date);
    startDate.setHours(startHour, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(endHour, 0, 0, 0);
    
    const formatGoogleDate = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: description,
      location: location,
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateOutlookUrl = (title: string, dateStr: string, timeWindow: string, location: string, description: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    
    let startHour = 9;
    let endHour = 11;
    
    if (timeWindow.toLowerCase().includes('afternoon') || timeWindow.includes('1') || timeWindow.includes('2')) {
      startHour = 13;
      endHour = 15;
    } else if (timeWindow.toLowerCase().includes('evening') || timeWindow.includes('5') || timeWindow.includes('6')) {
      startHour = 17;
      endHour = 19;
    }
    
    const startDate = new Date(date);
    startDate.setHours(startHour, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(endHour, 0, 0, 0);
    
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: title,
      body: description,
      location: location,
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
    });
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const fullAddress = `${data.address}, ${data.city}, FL`;
  const deliveryDescription = `🎈 ${data.productName}${data.slotLabel ? ` (${data.slotLabel})` : ''}\n\n📋 Booking: ${data.bookingNumber}\n👤 Customer: ${data.customerName}\n📱 Phone: ${data.customerPhone}\n\n💰 ${data.paidInFull ? 'PAID IN FULL' : `Balance Due: $${data.balanceDue}`}\n\n📝 Notes: ${data.notes || 'None'}`;
  const pickupDescription = `📦 Pickup: ${data.productName}\n\n📋 Booking: ${data.bookingNumber}\n👤 Customer: ${data.customerName}\n📱 Phone: ${data.customerPhone}`;

  const deliveryGoogleUrl = generateGoogleCalendarUrl(
    `🚚 DELIVER: ${data.productName} → ${data.customerName}`,
    data.deliveryDate,
    data.deliveryWindow,
    fullAddress,
    deliveryDescription
  );

  const pickupGoogleUrl = generateGoogleCalendarUrl(
    `📦 PICKUP: ${data.productName} ← ${data.customerName}`,
    data.pickupDate,
    data.pickupWindow,
    fullAddress,
    pickupDescription
  );

  const deliveryOutlookUrl = generateOutlookUrl(
    `🚚 DELIVER: ${data.productName} → ${data.customerName}`,
    data.deliveryDate,
    data.deliveryWindow,
    fullAddress,
    deliveryDescription
  );

  const pickupOutlookUrl = generateOutlookUrl(
    `📦 PICKUP: ${data.productName} ← ${data.customerName}`,
    data.pickupDate,
    data.pickupWindow,
    fullAddress,
    pickupDescription
  );

  const cardBrandDisplay = data.cardBrand ? 
    data.cardBrand.charAt(0).toUpperCase() + data.cardBrand.slice(1) : 'Card';

  const paidAt = formatFloridaTime();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://popndroprentals.com/brand/logo.png" alt="Pop and Drop Party Rentals" width="180" style="max-width: 180px; height: auto;" />
    </div>
    
    <div style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
      
      <!-- Header -->
      <div style="padding: 28px 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
        <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; line-height: 56px; text-align: center;">
          <span style="color: white; font-size: 26px;">✓</span>
        </div>
        <h1 style="margin: 0 0 4px; color: white; font-size: 22px; font-weight: 600;">New Booking Confirmed</h1>
        <p style="margin: 0; color: #888; font-size: 13px;">Order ${data.bookingNumber}</p>
      </div>
      
      <!-- Payment Status Banner -->
      <div style="padding: 14px 24px; background-color: ${data.paidInFull ? '#14532d' : '#1e3a5f'}; text-align: center;">
        <span style="color: ${data.paidInFull ? '#4ade80' : '#38bdf8'}; font-size: 13px; font-weight: 600;">
          ${data.paidInFull ? `💰 PAID IN FULL — $${data.totalPrice}` : `💳 $${data.amountPaid} Deposit Paid — $${data.balanceDue} Due on Delivery`}
        </span>
      </div>
      
      <!-- Quick Contact Actions -->
      <div style="padding: 20px 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
        <a href="tel:${data.customerPhone.replace(/\D/g, '')}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600; margin-right: 10px;">📞 Call Customer</a>
        <a href="mailto:${data.customerEmail}" style="display: inline-block; background-color: #333; color: white; text-decoration: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 600;">✉️ Email</a>
      </div>
      
      <!-- Invoice Style Details -->
      <div style="padding: 24px;">
        
        <!-- Customer Info Card -->
        <div style="background: linear-gradient(135deg, #0c4a6e, #0369a1); border-radius: 12px; padding: 18px; margin-bottom: 16px;">
          <table style="width: 100%;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <p style="margin: 0 0 4px; color: #7dd3fc; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Customer</p>
                <p style="margin: 0; color: white; font-size: 16px; font-weight: 600;">${data.customerName}</p>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <p style="margin: 0 0 4px; color: #bae6fd; font-size: 13px;">📱 ${data.customerPhone}</p>
                <p style="margin: 0; color: #bae6fd; font-size: 13px;">✉️ ${data.customerEmail}</p>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Booking Details Table -->
        <div style="background-color: #222; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
          <p style="margin: 0 0 14px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Booking Details</p>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Rental</td>
              <td style="padding: 10px 0; color: white; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #333;">${data.productName}</td>
            </tr>
            ${data.slotLabel ? `
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Time Slot</td>
              <td style="padding: 10px 0; color: #c084fc; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #333;">${data.slotLabel}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Package</td>
              <td style="padding: 10px 0; color: white; font-size: 14px; text-align: right; border-bottom: 1px solid #333;">${bookingTypeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Event Date</td>
              <td style="padding: 10px 0; color: #fbbf24; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #333;">${formatDateDisplay(data.eventDate)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">🚚 Delivery</td>
              <td style="padding: 10px 0; color: white; font-size: 13px; text-align: right; border-bottom: 1px solid #333;">${formatDateShortFn(data.deliveryDate)}<br><span style="color: #888; font-size: 12px;">${data.deliveryWindow}</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">📦 Pickup</td>
              <td style="padding: 10px 0; color: white; font-size: 13px; text-align: right; border-bottom: 1px solid #333;">${formatDateShortFn(data.pickupDate)}<br><span style="color: #888; font-size: 12px;">${data.pickupWindow}</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px;">📍 Address</td>
              <td style="padding: 10px 0; color: white; font-size: 13px; text-align: right;">
                <a href="https://maps.google.com/?q=${encodeURIComponent(fullAddress)}" style="color: #38bdf8; text-decoration: none;">${data.address}<br>${data.city}, FL</a>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Add to Calendar Section -->
        <div style="background-color: #1a1a2e; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
          <p style="margin: 0 0 14px; color: #a78bfa; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">📅 Add to Calendar</p>
          
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 8px; color: #c4b5fd; font-size: 12px; font-weight: 600;">🚚 Delivery — ${formatDateShortFn(data.deliveryDate)}</p>
                <a href="${deliveryGoogleUrl}" style="display: inline-block; background-color: #4285f4; color: white; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-right: 8px;">Google</a>
                <a href="${deliveryOutlookUrl}" style="display: inline-block; background-color: #0078d4; color: white; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;">Outlook</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0 0 8px; color: #c4b5fd; font-size: 12px; font-weight: 600;">📦 Pickup — ${formatDateShortFn(data.pickupDate)}</p>
                <a href="${pickupGoogleUrl}" style="display: inline-block; background-color: #4285f4; color: white; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-right: 8px;">Google</a>
                <a href="${pickupOutlookUrl}" style="display: inline-block; background-color: #0078d4; color: white; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;">Outlook</a>
              </td>
            </tr>
          </table>
        </div>
        
        ${data.notes ? `
        <!-- Customer Notes -->
        <div style="background-color: #1f1a2e; border-left: 4px solid #a855f7; border-radius: 0 12px 12px 0; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; color: #c084fc; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">📝 Customer Notes</p>
          <p style="margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.5;">${data.notes}</p>
        </div>
        ` : ''}
        
        <!-- Invoice / Payment Summary -->
        <div style="background-color: #14532d; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
          <p style="margin: 0 0 14px; color: #86efac; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">💵 Payment Summary</p>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #a7f3d0; font-size: 13px;">Rental Total</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">$${data.totalPrice}.00</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #a7f3d0; font-size: 13px; border-top: 1px solid #166534;">Amount Paid</td>
              <td style="padding: 8px 0; color: #4ade80; font-size: 14px; font-weight: 600; text-align: right; border-top: 1px solid #166534;">✓ $${data.amountPaid}.00</td>
            </tr>
            ${!data.paidInFull ? `
            <tr>
              <td style="padding: 12px 0 8px; color: #fde047; font-size: 14px; font-weight: 600; border-top: 1px solid #166534;">Balance Due on Delivery</td>
              <td style="padding: 12px 0 8px; color: #fbbf24; font-size: 20px; font-weight: 700; text-align: right; border-top: 1px solid #166534;">$${data.balanceDue}.00</td>
            </tr>
            ` : `
            <tr>
              <td colspan="2" style="padding: 12px 0 0; text-align: center; border-top: 1px solid #166534;">
                <span style="color: #4ade80; font-size: 14px; font-weight: 600;">✓ Nothing due on delivery!</span>
              </td>
            </tr>
            `}
          </table>
        </div>
        
        <!-- Stripe Payment Details -->
        <div style="background-color: #222; border-radius: 12px; padding: 18px;">
          <p style="margin: 0 0 14px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">💳 Payment Details</p>
          
          <table style="width: 100%; border-collapse: collapse;">
            ${data.cardLast4 ? `
            <tr>
              <td style="padding: 6px 0; color: #888; font-size: 12px;">Card</td>
              <td style="padding: 6px 0; color: #ccc; font-size: 12px; text-align: right;">${cardBrandDisplay} •••• ${data.cardLast4}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 6px 0; color: #888; font-size: 12px;">Paid At</td>
              <td style="padding: 6px 0; color: #ccc; font-size: 12px; text-align: right;">${paidAt}</td>
            </tr>
            ${data.stripePaymentIntentId ? `
            <tr>
              <td style="padding: 6px 0; color: #888; font-size: 12px;">Payment ID</td>
              <td style="padding: 6px 0; color: #666; font-size: 11px; text-align: right; font-family: monospace;">${data.stripePaymentIntentId.slice(-12)}</td>
            </tr>
            ` : ''}
            ${data.stripeReceiptUrl ? `
            <tr>
              <td colspan="2" style="padding: 12px 0 0;">
                <a href="${data.stripeReceiptUrl}" style="display: inline-block; background-color: #333; color: #ccc; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 12px; font-weight: 500;">📄 View Stripe Receipt</a>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px 24px; background-color: #141414; border-top: 1px solid #2a2a2a; text-align: center;">
        <p style="margin: 0; color: #666; font-size: 11px;">Pop and Drop Party Rentals • Ocala, FL</p>
      </div>
      
    </div>
  </div>
</body>
</html>
  `;
}
