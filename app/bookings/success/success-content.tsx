"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, Mail, Check, MapPin, Clock } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { AddToCalendar } from "@/components/ui/add-to-calendar";
import { createDateTime, CalendarEvent } from "@/lib/calendar";

/* ---------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------- */
interface BookingData {
  id: string;
  rental_name: string;
  event_date: string;
  pickup_date: string;
  booking_type: "daily" | "weekend";
  delivery_time: string;
  pickup_time: string;
  address: string;
  city: string;
  customer_name: string;
  customer_email: string;
  total_price: number;
  deposit_amount: number;
  balance_due: number;
}

interface Styles {
  sectionCard: string;
  sectionCardInner: string;
  nestedCard: string;
  nestedCardInner: string;
  pageTitle: string;
  sectionHeading: string;
  cardHeading: string;
  bodyText: string;
  smallBody: string;
  label: string;
  helperText: string;
  primaryButton: string;
  iconCyan: string;
  iconFuchsia: string;
  iconPurple: string;
}

interface SuccessContentProps {
  booking: BookingData;
  eventDate: string;
  pickupDate: string;
  styles: Styles;
}

/* ---------------------------------------------------------------------------
 * Animated Success Checkmark (SVG with draw animation)
 * Respects prefers-reduced-motion
 * --------------------------------------------------------------------------- */
function AnimatedCheckmark() {
  return (
    <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
      {/* Gradient glow ring */}
      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 blur-xl motion-reduce:animate-none" />

      {/* Outer ring with gradient */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20" />

      {/* Inner circle */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-background/80 backdrop-blur-sm sm:h-24 sm:w-24">
        {/* Animated SVG checkmark */}
        <svg
          className="h-10 w-10 sm:h-12 sm:w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="url(#checkGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <path
            d="M4 12l5 5L20 6"
            className="motion-reduce:[stroke-dashoffset:0]"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: "check-draw 0.5s ease-out 0.3s forwards",
            }}
          />
        </svg>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Detail Row Component
 * --------------------------------------------------------------------------- */
interface DetailRowProps {
  icon: React.ReactNode;
  iconStyle: string;
  label: string;
  value: string;
  labelClass: string;
  valueClass: string;
}

function DetailRow({ icon, iconStyle, label, value, labelClass, valueClass }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={iconStyle}>{icon}</div>
      <div className="pt-2">
        <p className={labelClass}>{label}</p>
        <p className={`mt-0.5 font-medium text-foreground ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Next Steps Item Component
 * --------------------------------------------------------------------------- */
interface NextStepProps {
  icon: React.ReactNode;
  iconStyle: string;
  children: React.ReactNode;
  smallBody: string;
}

function NextStep({ icon, iconStyle, children, smallBody }: NextStepProps) {
  return (
    <li className="flex items-start gap-4">
      <div className={iconStyle}>{icon}</div>
      <span className={`pt-2.5 ${smallBody}`}>{children}</span>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * Main Content Component
 * --------------------------------------------------------------------------- */
export function SuccessContent({ booking, eventDate, pickupDate, styles }: SuccessContentProps) {
  // Build calendar event
  const calendarEvent: CalendarEvent = {
    title: `🎉 ${booking.rental_name} - Party Day!`,
    description: `Your bounce house rental from Pop and Drop Party Rentals!\n\nDelivery: ${booking.delivery_time}\nPickup: ${pickupDate} at ${booking.pickup_time}\n\nBalance due on delivery: $${booking.balance_due}\n\nQuestions? Call 352-445-3723`,
    location: `${booking.address}, ${booking.city}`,
    startDate: createDateTime(booking.event_date, booking.delivery_time),
    endDate: createDateTime(booking.pickup_date, booking.pickup_time),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Confetti burst */}
      <Confetti />

      {/* Success Header */}
      <div className="text-center">
        <AnimatedCheckmark />

        <h1 className={styles.pageTitle}>You&apos;re All Set!</h1>
        <p className={`mx-auto mt-3 max-w-md ${styles.bodyText}`}>
          Your deposit has been received and your date is locked in. Get ready for an amazing party!
        </p>
      </div>

      {/* Booking Summary Card */}
      <div className={`mt-8 sm:mt-10 ${styles.sectionCard}`}>
        <div className="p-5 sm:p-6 lg:p-8">
          <h2 className={styles.sectionHeading}>{booking.rental_name}</h2>
          <p className={`mt-1 ${styles.smallBody}`}>
            {booking.booking_type === "weekend" ? "Weekend Package" : "Daily Rental"}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconFuchsia}
              label="Event Date"
              value={eventDate}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
            <DetailRow
              icon={<Clock className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconCyan}
              label="Delivery Time"
              value={booking.delivery_time}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
            <DetailRow
              icon={<MapPin className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconPurple}
              label="Delivery Address"
              value={`${booking.address}, ${booking.city}`}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconCyan}
              label="Pickup"
              value={`${pickupDate} at ${booking.pickup_time}`}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
          </div>

          {/* Pricing Summary */}
          <div className={`mt-6 p-4 sm:p-5 ${styles.nestedCard}`}>
            <div className="flex items-center justify-between">
              <span className={styles.smallBody}>Total</span>
              <span className="font-semibold text-foreground">${booking.total_price}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={styles.smallBody}>Deposit paid</span>
              <span className="text-sm text-green-400">-${booking.deposit_amount}</span>
            </div>
            <div className="mt-3 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Balance due on delivery</span>
                <span className="text-lg font-semibold text-foreground">${booking.balance_due}</span>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>
        </div>

        <div className={styles.sectionCardInner} />
      </div>

      {/* What Happens Next Card */}
      <div className={`mt-6 ${styles.sectionCard}`}>
        <div className="p-5 sm:p-6 lg:p-8">
          <h2 className={styles.cardHeading}>What happens next?</h2>

          <ul className="mt-5 space-y-4">
            <NextStep
              icon={<Mail className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconCyan}
              smallBody={styles.smallBody}
            >
              Check your email for a confirmation with all the details
            </NextStep>

            <NextStep
              icon={<Phone className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconFuchsia}
              smallBody={styles.smallBody}
            >
              We&apos;ll text you the morning of delivery to confirm our arrival window
            </NextStep>

            <NextStep
              icon={<Check className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconPurple}
              smallBody={styles.smallBody}
            >
              Have the setup area clear and a power outlet within 50 feet ready
            </NextStep>
          </ul>

          {/* Payment reminder */}
          <div className={`mt-6 p-4 sm:p-5 ${styles.nestedCard}`}>
            <p className={styles.smallBody}>
              <strong className="text-foreground">Payment on delivery:</strong> We accept cash, card,
              Venmo, or Zelle for the remaining ${booking.balance_due} balance.
            </p>
            <div className={styles.nestedCardInner} />
          </div>
        </div>

        <div className={styles.sectionCardInner} />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
        <Button asChild className={styles.primaryButton}>
          <Link href="/">Back to Home</Link>
        </Button>

        <AddToCalendar event={calendarEvent} />
      </div>

      {/* Contact Section */}
      <div className={`mt-8 p-4 sm:p-5 ${styles.nestedCard}`}>
        <p className={`text-center ${styles.smallBody}`}>
          Questions or need to make changes? We&apos;re here to help!
        </p>
        <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <a
            href="tel:3524453723"
            className="flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            <Phone className="h-4 w-4" />
            352-445-3723
          </a>
          <a
            href="mailto:bookings@popanddroprentals.com"
            className="flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            <Mail className="h-4 w-4" />
            bookings@popanddroprentals.com
          </a>
        </div>
        <div className={styles.nestedCardInner} />
      </div>

      {/* Subtle footer encouragement */}
      <p className={`mt-8 text-center ${styles.helperText}`}>
        Thank you for choosing Pop and Drop Party Rentals! 🎈
      </p>
    </main>
  );
}