import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase";
import { SuccessContent } from "./success-content";
import { formatEventDate, formatEventDateShort } from "@/lib/timezone";

export const metadata = {
  title: "Booking Confirmed | Pop and Drop Party Rentals",
  description: "Your bounce house rental is confirmed! Check your email for details.",
};

/* ---------------------------------------------------------------------------
 * Styles Object (Design System Compliant)
 * --------------------------------------------------------------------------- */
const styles = {
  // Tier 1: Section Cards
  sectionCard:
    "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",

  // Tier 3: Nested Cards
  nestedCard:
    "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner:
    "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",

  // Typography
  pageTitle: "text-2xl font-semibold tracking-tight sm:text-3xl",
  sectionHeading: "text-lg font-semibold sm:text-xl",
  cardHeading: "text-sm font-semibold sm:text-base",
  bodyText: "text-sm leading-relaxed text-foreground/70",
  smallBody: "text-xs leading-relaxed text-foreground/70 sm:text-sm",
  label: "text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]",
  helperText: "text-xs text-foreground/50",

  // Buttons
  primaryButton:
    "w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto",

  // Icon Containers
  iconCyan: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10",
  iconFuchsia: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10",
  iconPurple: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10",
} as const;

/* ---------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------- */
interface BookingData {
  id: string;
  booking_number: string;
  product_snapshot: {
    slug: string;
    name: string;
    price_daily: number;
    price_weekend: number;
    price_sunday: number;
  };
  event_date: string;
  pickup_date: string;
  booking_type: "daily" | "weekend" | "sunday";
  delivery_window: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  deposit_paid: boolean;
  balance_paid: boolean;
  // ACH/Async payment fields
  is_async_payment?: boolean;
  async_payment_status?: string | null;
  payment_method_type?: string | null;
  customers: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface PageProps {
  searchParams: Promise<{ 
    booking_id?: string;
    payment_type?: string;
  }>;
}

/* ---------------------------------------------------------------------------
 * Data Fetching
 * --------------------------------------------------------------------------- */
async function getBooking(bookingId: string): Promise<BookingData | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_number,
      product_snapshot,
      event_date,
      pickup_date,
      booking_type,
      delivery_window,
      pickup_window,
      delivery_address,
      delivery_city,
      subtotal,
      deposit_amount,
      balance_due,
      deposit_paid,
      balance_paid,
      is_async_payment,
      async_payment_status,
      payment_method_type,
      customers (
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    console.error("Error fetching booking:", error);
    return null;
  }

  return data as unknown as BookingData;
}

/* ---------------------------------------------------------------------------
 * Loading State
 * --------------------------------------------------------------------------- */
function LoadingState() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
        <p className={`mt-4 ${styles.bodyText}`}>Loading your booking...</p>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * No Booking Found State
 * --------------------------------------------------------------------------- */
function NoBookingState() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      <div className={styles.sectionCard}>
        <div className="p-6 text-center sm:p-8">
          <h1 className={styles.pageTitle}>Booking Not Found</h1>
          <p className={`mt-3 ${styles.bodyText}`}>
            We couldn&apos;t find that booking. If you just completed a booking, please check your
            email for confirmation.
          </p>
          <Button asChild className={`mt-6 ${styles.primaryButton}`}>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
        <div className={styles.sectionCardInner} />
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * Main Page Component
 * --------------------------------------------------------------------------- */
export default async function BookingSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bookingId = params.booking_id;
  const paymentTypeFromUrl = params.payment_type || null;

  if (!bookingId) {
    return <NoBookingState />;
  }

  const booking = await getBooking(bookingId);

  if (!booking) {
    return <NoBookingState />;
  }

  const eventDate = formatEventDate(booking.event_date);
  const pickupDate = formatEventDateShort(booking.pickup_date);

  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent
        booking={booking}
        eventDate={eventDate}
        pickupDate={pickupDate}
        styles={styles}
        paymentTypeFromUrl={paymentTypeFromUrl}
      />
    </Suspense>
  );
}
