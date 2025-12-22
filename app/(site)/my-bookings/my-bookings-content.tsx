// =============================================================================
// MY BOOKINGS PAGE - CLIENT COMPONENT
// app/(site)/my-bookings/my-bookings-content.tsx
// Email-based booking lookup with no account required
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSavedCustomerInfo } from "@/lib/use-customer-autofill";
import { buildCustomerCalendarEvent, type CustomerCalendarData } from "@/lib/calendar";
import { AddToCalendar } from "@/components/ui/add-to-calendar";
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Loader2,
  PartyPopper,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  History,
  Sparkles,
  Ban,
} from "lucide-react";
import { CancellationModal } from "@/components/site/cancellation-modal";

// =============================================================================
// DESIGN SYSTEM STYLES
// =============================================================================

const styles = {
  // Tier 1: Section Cards
  sectionCard:
    "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",

  // Tier 2: Standard Cards
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl",
  cardInner:
    "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",

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

  // Form inputs
  input:
    "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",

  // Buttons
  primaryButton:
    "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30",
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface Booking {
  id: string;
  booking_number: string;
  status: string;
  booking_type: string;
  event_date: string;
  delivery_date: string;
  pickup_date: string;
  delivery_window: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  deposit_paid: boolean;
  balance_paid: boolean;
  customer_notes: string | null;
  product_snapshot: {
    slug: string;
    name: string;
  };
  created_at: string;
  confirmed_at: string | null;
}

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LookupResponse {
  success: boolean;
  customer: Customer | null;
  bookings: Booking[];
  upcoming: Booking[];
  past: Booking[];
  stats: {
    total: number;
    upcoming: number;
    past: number;
  };
  message?: string;
  error?: string;
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    confirmed: {
      label: "Confirmed",
      className: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: CheckCircle2,
    },
    pending: {
      label: "Pending",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: AlertCircle,
    },
    pending_cancellation: {
      label: "Cancellation Pending",
      className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: AlertCircle,
    },
    completed: {
      label: "Completed",
      className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      icon: CheckCircle2,
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: XCircle,
    },
  };

  const { label, className, icon: Icon } = config[status] || config.pending;

  return (
    <Badge className={cn("gap-1 border", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// =============================================================================
// BOOKING CARD COMPONENT
// =============================================================================

function BookingCard({ 
  booking, 
  isUpcoming,
  customerEmail,
  onCancelled,
}: { 
  booking: Booking; 
  isUpcoming: boolean;
  customerEmail: string;
  onCancelled: () => void;
}) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const eventDate = new Date(booking.event_date + "T12:00:00");
  const isPaid = booking.balance_paid;
  
  // Can cancel if upcoming and status is confirmed or pending
  const canCancel = isUpcoming && 
    (booking.status === "confirmed" || booking.status === "pending");

  // Build calendar event data using the proper calendar utility
  const calendarData: CustomerCalendarData = {
    productName: booking.product_snapshot.name,
    bookingNumber: booking.booking_number,
    eventDate: booking.event_date,
    pickupDate: booking.pickup_date,
    deliveryWindow: booking.delivery_window,
    pickupWindow: booking.pickup_window,
    address: booking.delivery_address,
    city: booking.delivery_city,
    totalPrice: booking.subtotal,
    balanceDue: booking.balance_due,
    isPaidInFull: booking.balance_paid,
    notes: booking.customer_notes || undefined,
  };
  
  const calendarEvent = buildCustomerCalendarEvent(calendarData);

  return (
    <div className={cn(styles.card, "transition-all hover:border-white/20")}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{booking.product_snapshot.name}</p>
            <p className={cn(styles.helperText, "mt-0.5")}>
              #{booking.booking_number}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Date & Location */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{format(eventDate, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <MapPin className="h-4 w-4 shrink-0 text-foreground/40" />
            <span>{booking.delivery_address}, {booking.delivery_city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Clock className="h-4 w-4 shrink-0 text-foreground/40" />
            <span>Delivery: {booking.delivery_window}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] p-3">
          <div>
            <p className={styles.helperText}>Total</p>
            <p className="text-lg font-semibold">${booking.subtotal}</p>
          </div>
          <div className="text-right">
            {isPaid ? (
              <Badge className="border-0 bg-green-500/20 text-green-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Paid in Full
              </Badge>
            ) : booking.deposit_paid ? (
              <div>
                <p className={styles.helperText}>Balance Due</p>
                <p className="font-semibold text-amber-400">${booking.balance_due}</p>
              </div>
            ) : (
              <Badge className="border-0 bg-amber-500/20 text-amber-400">
                Payment Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Calendar Actions */}
        {isUpcoming && booking.status === "confirmed" && (
          <div className="mt-4">
            <AddToCalendar event={calendarEvent} usePortal />
          </div>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCancelModal(true)}
              className="w-full text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel Booking
            </Button>
          </div>
        )}

        {/* Pending Cancellation Notice */}
        {booking.status === "pending_cancellation" && (
          <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-950/20 p-3">
            <p className="text-xs text-orange-400">
              Your cancellation request is being reviewed. We&apos;ll email you once it&apos;s processed.
            </p>
          </div>
        )}

        {/* Notes */}
        {booking.customer_notes && (
          <div className="mt-4 rounded-lg border-l-2 border-fuchsia-500/50 bg-fuchsia-500/5 px-3 py-2">
            <p className={cn(styles.helperText, "text-fuchsia-400")}>Your Notes</p>
            <p className="mt-0.5 text-sm text-foreground/70">{booking.customer_notes}</p>
          </div>
        )}
      </div>
      <div className={styles.cardInner} />

      {/* Cancellation Modal */}
      <CancellationModal
        bookingId={booking.id}
        email={customerEmail}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={onCancelled}
      />
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

function EmptyState({ type }: { type: "no-email" | "no-bookings" }) {
  if (type === "no-email") {
    return (
      <div className={styles.sectionCard}>
        <div className="p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20">
            <Search className="h-8 w-8 text-fuchsia-400" />
          </div>
          <h2 className={styles.sectionHeading}>Find Your Bookings</h2>
          <p className={cn(styles.bodyText, "mx-auto mt-2 max-w-sm")}>
            Enter the email address you used when booking to see all your rentals.
          </p>
        </div>
        <div className={styles.sectionCardInner} />
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className="p-8 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
          <Package className="h-8 w-8 text-cyan-400" />
        </div>
        <h2 className={styles.sectionHeading}>No Bookings Found</h2>
        <p className={cn(styles.bodyText, "mx-auto mt-2 max-w-sm")}>
          We couldn&apos;t find any bookings with this email. Ready to plan your party?
        </p>
        <Button asChild className={cn(styles.primaryButton, "mt-6")}>
          <Link href="/rentals">
            <Sparkles className="mr-2 h-4 w-4" />
            Browse Rentals
          </Link>
        </Button>
      </div>
      <div className={styles.sectionCardInner} />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MyBookingsContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [data, setData] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email from saved customer info
  useEffect(() => {
    const saved = getSavedCustomerInfo();
    if (saved?.email) {
      setEmail(saved.email);
    }
  }, []);

  const fetchBookings = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/lookup?email=${encodeURIComponent(email.trim())}`);
      const result: LookupResponse = await response.json();

      if (!response.ok) {
        setError(result.error || "Something went wrong");
        setData(null);
      } else {
        setData(result);
        setError(null);
      }
    } catch (err) {
      setError("Failed to look up bookings. Please try again.");
      setData(null);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const hasBookings = data?.stats?.total && data.stats.total > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className={styles.pageTitle}>My Bookings</h1>
        <p className={cn(styles.bodyText, "mt-2")}>
          View and manage your bounce house rentals
        </p>
      </div>

      {/* Search Form */}
      <div className={cn(styles.sectionCard, "mb-8")}>
        <form onSubmit={handleSearch} className="p-4 sm:p-6">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="mt-2 flex gap-3">
            <Input
              id="email"
              type="email"
              placeholder="Enter the email you used to book"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(styles.input, "flex-1")}
              required
            />
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className={styles.primaryButton}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Look Up
                </>
              )}
            </Button>
          </div>
          <p className={cn(styles.helperText, "mt-2")}>
            No account needed — just enter your email to see your bookings
          </p>
        </form>
        <div className={styles.sectionCardInner} />
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 rounded-xl border border-red-500/30 bg-red-950/30 p-4">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {!hasSearched && <EmptyState type="no-email" />}

      {hasSearched && !hasBookings && !error && <EmptyState type="no-bookings" />}

      {hasSearched && hasBookings && data && (
        <div className="space-y-8">
          {/* Welcome Back */}
          {data.customer && (
            <div className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600">
                <PartyPopper className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold">
                  Welcome back, {data.customer.firstName}!
                </p>
                <p className={styles.smallBody}>
                  You have {data.stats.upcoming} upcoming {data.stats.upcoming === 1 ? "booking" : "bookings"}
                </p>
              </div>
            </div>
          )}

          {/* Upcoming Bookings */}
          {data.upcoming.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                <h2 className={styles.sectionHeading}>Upcoming</h2>
                <Badge variant="secondary" className="ml-auto">
                  {data.upcoming.length}
                </Badge>
              </div>
              <div className="space-y-4">
                {data.upcoming.map((booking) => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    isUpcoming 
                    customerEmail={email}
                    onCancelled={fetchBookings}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Bookings */}
          {data.past.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-foreground/50" />
                <h2 className={cn(styles.sectionHeading, "text-foreground/70")}>
                  Past Bookings
                </h2>
                <Badge variant="secondary" className="ml-auto">
                  {data.past.length}
                </Badge>
              </div>
              <div className="space-y-4 opacity-70">
                {data.past.map((booking) => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    isUpcoming={false}
                    customerEmail={email}
                    onCancelled={fetchBookings}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Book Again CTA */}
          <div className={cn(styles.nestedCard, "p-6 text-center")}>
            <Sparkles className="mx-auto h-8 w-8 text-fuchsia-400" />
            <h3 className="mt-3 font-semibold">Ready for another party?</h3>
            <p className={cn(styles.bodyText, "mt-1")}>
              Your info will be saved for faster checkout
            </p>
            <Button asChild className={cn(styles.primaryButton, "mt-4")}>
              <Link href="/rentals">
                Browse Rentals
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <div className={styles.nestedCardInner} />
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 text-center">
        <p className={styles.bodyText}>
          Questions about a booking?{" "}
          <a href="tel:3524453723" className="font-medium text-cyan-400 hover:underline">
            <Phone className="mr-1 inline h-3.5 w-3.5" />
            (352) 445-3723
          </a>
        </p>
      </div>
    </main>
  );
}
