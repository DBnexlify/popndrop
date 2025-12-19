import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resend, FROM_EMAIL, NOTIFY_EMAIL } from '@/lib/resend';

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

    // Create booking in database (confirmed without payment for now)
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
      status: 'confirmed', // Auto-confirm for testing (no payment required)
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
      await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `Booking Confirmed - ${rentalName}`,
        html: `
          <h1>Your Booking is Confirmed!</h1>
          <p>Hi ${customerName},</p>
          <p>Thank you for booking with Pop and Drop Party Rentals!</p>
          
          <h2>Booking Details</h2>
          <ul>
            <li><strong>Rental:</strong> ${rentalName}</li>
            <li><strong>Date:</strong> ${formattedDate}</li>
            <li><strong>Type:</strong> ${bookingType === 'weekend' ? 'Weekend Package' : 'Daily Rental'}</li>
            <li><strong>Delivery Time:</strong> ${deliveryTime}</li>
            <li><strong>Pickup Time:</strong> ${pickupTime}</li>
            <li><strong>Address:</strong> ${address}, ${city}</li>
          </ul>
          
          <h2>Pricing</h2>
          <ul>
            <li><strong>Total:</strong> $${totalPrice}</li>
            <li><strong>Deposit:</strong> $${depositAmount}</li>
            <li><strong>Balance Due:</strong> $${balanceDue}</li>
          </ul>
          
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          
          <p>We'll be in touch soon to confirm delivery details.</p>
          <p>Thanks,<br>Pop and Drop Party Rentals</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError);
    }

    // Send notification email to business
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `New Booking - ${rentalName} on ${formattedDate}`,
        html: `
          <h1>New Booking Received!</h1>
          
          <h2>Customer Info</h2>
          <ul>
            <li><strong>Name:</strong> ${customerName}</li>
            <li><strong>Email:</strong> ${customerEmail}</li>
            <li><strong>Phone:</strong> ${customerPhone}</li>
          </ul>
          
          <h2>Booking Details</h2>
          <ul>
            <li><strong>Rental:</strong> ${rentalName}</li>
            <li><strong>Date:</strong> ${formattedDate}</li>
            <li><strong>Type:</strong> ${bookingType === 'weekend' ? 'Weekend Package' : 'Daily Rental'}</li>
            <li><strong>Delivery Time:</strong> ${deliveryTime}</li>
            <li><strong>Pickup Time:</strong> ${pickupTime}</li>
            <li><strong>Address:</strong> ${address}, ${city}</li>
          </ul>
          
          <h2>Pricing</h2>
          <ul>
            <li><strong>Total:</strong> $${totalPrice}</li>
            <li><strong>Deposit:</strong> $${depositAmount}</li>
            <li><strong>Balance Due:</strong> $${balanceDue}</li>
          </ul>
          
          ${notes ? `<p><strong>Customer Notes:</strong> ${notes}</p>` : ''}
        `,
      });
    } catch (emailError) {
      console.error('Failed to send business notification:', emailError);
    }

    // Return success (redirect to success page instead of Stripe)
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