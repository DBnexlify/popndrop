import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    // Create pending booking in database
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
      status: 'pending',
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

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      metadata: {
        booking_id: booking.id,
        rental_id: rentalId,
        rental_name: rentalName,
        event_date: eventDate,
        booking_type: bookingType,
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${rentalName} - Deposit`,
              description: `Booking for ${new Date(eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} (${bookingType === 'weekend' ? 'Weekend Package' : 'Daily Rental'})`,
            },
            unit_amount: depositAmount * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings?cancelled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // Update booking with Stripe session ID
    await supabase
      .from('bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', booking.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      bookingId: booking.id,
    });
  } catch (error) {
    console.error('Error in booking creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}