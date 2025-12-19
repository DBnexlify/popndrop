import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'bookings@popndroprentals.com';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error('No booking ID in session metadata');
      return NextResponse.json({ received: true });
    }

    const supabase = createServerClient();

    // Update booking status to confirmed
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        stripe_payment_intent: session.payment_intent as string,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError || !booking) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Format date for emails
    const eventDate = new Date(booking.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const pickupDate = new Date(booking.pickup_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    // Send confirmation email to customer
    try {
      await resend.emails.send({
        from: 'Pop and Drop Party Rentals <noreply@popndroprentals.com>',
        to: booking.customer_email,
        subject: `Booking Confirmed - ${booking.rental_name} on ${eventDate}`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Booking Confirmed! 🎉</h1>
            
            <p>Hi ${booking.customer_name},</p>
            
            <p>Great news! Your rental is confirmed. Here are your booking details:</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">${booking.rental_name}</h2>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Type:</strong> ${booking.booking_type === 'weekend' ? 'Weekend Package' : 'Daily Rental'}</p>
              <p><strong>Delivery:</strong> ${booking.delivery_time}</p>
              <p><strong>Pickup:</strong> ${pickupDate} at ${booking.pickup_time}</p>
              <p><strong>Address:</strong> ${booking.address}, ${booking.city}</p>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2e7d32;">Payment Summary</h3>
              <p><strong>Total Rental:</strong> $${booking.total_price}</p>
              <p><strong>Deposit Paid:</strong> $${booking.deposit_amount}</p>
              <p><strong>Balance Due on Delivery:</strong> $${booking.balance_due}</p>
            </div>
            
            ${booking.notes ? `<p><strong>Your Notes:</strong> ${booking.notes}</p>` : ''}
            
            <h3>What's Next?</h3>
            <ul>
              <li>We'll text you the morning of delivery to confirm our arrival window</li>
              <li>Please ensure the setup area is clear and accessible</li>
              <li>Have a standard outdoor power outlet available within 50ft</li>
              <li>Balance of $${booking.balance_due} is due on delivery (cash or card)</li>
            </ul>
            
            <p>Questions? Reply to this email or call/text us at <strong>352-445-3723</strong>.</p>
            
            <p>Thanks for choosing Pop and Drop Party Rentals!</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Pop and Drop Party Rentals<br>
              Ocala, Marion County, and surrounding areas<br>
              352-445-3723 | bookings@popndroprentals.com
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending customer email:', emailError);
    }

    // Send notification email to owner
    try {
      await resend.emails.send({
        from: 'Pop and Drop Bookings <noreply@popndroprentals.com>',
        to: OWNER_EMAIL,
        subject: `🎉 New Booking: ${booking.rental_name} - ${eventDate}`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">New Booking Received!</h1>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">${booking.rental_name}</h2>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Type:</strong> ${booking.booking_type === 'weekend' ? 'Weekend Package' : 'Daily Rental'}</p>
              <p><strong>Delivery:</strong> ${booking.delivery_time}</p>
              <p><strong>Pickup:</strong> ${pickupDate} at ${booking.pickup_time}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1565c0;">Customer Info</h3>
              <p><strong>Name:</strong> ${booking.customer_name}</p>
              <p><strong>Phone:</strong> <a href="tel:${booking.customer_phone}">${booking.customer_phone}</a></p>
              <p><strong>Email:</strong> <a href="mailto:${booking.customer_email}">${booking.customer_email}</a></p>
              <p><strong>Address:</strong> ${booking.address}, ${booking.city}</p>
            </div>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2e7d32;">Payment</h3>
              <p><strong>Total:</strong> $${booking.total_price}</p>
              <p><strong>Deposit Collected:</strong> $${booking.deposit_amount} ✓</p>
              <p><strong>Balance to Collect:</strong> $${booking.balance_due}</p>
            </div>
            
            ${booking.notes ? `
              <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #e65100;">Customer Notes</h3>
                <p>${booking.notes}</p>
              </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Booking ID: ${booking.id}<br>
              Stripe Payment: ${session.payment_intent}
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending owner email:', emailError);
    }
  }

  // Handle expired checkout sessions - delete pending booking
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      const supabase = createServerClient();
      await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .eq('status', 'pending');
    }
  }

  return NextResponse.json({ received: true });
}