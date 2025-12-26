// =============================================================================
// ADMIN BOOKING DETAIL PAGE
// app/admin/bookings/[id]/page.tsx
// Layout matches dashboard/bookings/blackout pages exactly
// =============================================================================

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Package,
  FileText,
  CheckCircle2,
  AlertCircle,
  Truck,
  ExternalLink,
  XCircle,
  RefreshCw,
  CreditCard,
  Zap,
} from "lucide-react";
import {
  formatEventDate,
  formatTimestamp,
  formatTimeWindow,
  EASTERN_TIMEZONE,
} from '@/lib/timezone';
import { Badge } from "@/components/ui/badge";
import { BookingActions, type PaymentRecord } from "./booking-actions-client";
import { AdminCalendarButtons } from "@/components/admin/admin-calendar-buttons";
import { CancellationRequestBanner } from "@/components/admin/cancellation-request-banner";
import type { OwnerCalendarData } from "@/lib/calendar";

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
  cardHeading: "text-sm font-semibold sm:text-base",
  label:
    "text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]",
  helperText: "text-xs text-foreground/50",

  // Icon Containers
  iconFuchsia:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10",
  iconCyan:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10",
  iconPurple:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10",
  iconGreen:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10",
  iconAmber:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10",
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface BookingDetail {
  id: string;
  booking_number: string;
  unit_id: string;
  customer_id: string;
  product_snapshot: {
    slug: string;
    name: string;
    price_daily: number;
    price_weekend: number;
    price_sunday: number;
  };
  booking_type: "daily" | "weekend" | "sunday";
  event_date: string;
  delivery_date: string;
  pickup_date: string;
  delivery_window: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string | null;
  delivery_zip: string | null;
  delivery_notes: string | null;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  balance_paid: boolean;
  balance_paid_at: string | null;
  balance_payment_method: string | null;
  status: "pending" | "confirmed" | "delivered" | "picked_up" | "completed" | "cancelled";
  customer_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  // New cancellation/refund fields
  cancelled_by: "customer" | "business" | "weather" | "no_show" | null;
  refund_amount: number | null;
  refund_status: "none" | "pending" | "processed" | null;
  refund_processed_at: string | null;
  stripe_refund_id: string | null;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    booking_count: number;
    total_spent: number;
  } | null;
  unit: {
    id: string;
    unit_number: number;
    nickname: string | null;
    product: {
      name: string;
      slug: string;
    };
  } | null;
}

// =============================================================================
// HELPERS - Using timezone utilities for Eastern Time display
// =============================================================================

// formatDate and formatDateTime are imported from @/lib/timezone
// (formatEventDate as formatDate, formatTimestamp as formatDateTime)

function formatDate(dateStr: string): string {
  return formatEventDate(dateStr);
}

function formatDateTime(dateStr: string): string {
  return formatTimestamp(dateStr);
}

function formatWindow(window: string): string {
  return formatTimeWindow(window);
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className:
        "border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 backdrop-blur sm:text-sm",
    },
    confirmed: {
      label: "Confirmed",
      className:
        "border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm",
    },
    delivered: {
      label: "Delivered",
      className:
        "border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 backdrop-blur sm:text-sm",
    },
    picked_up: {
      label: "Picked Up",
      className:
        "border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 backdrop-blur sm:text-sm",
    },
    completed: {
      label: "Completed",
      className:
        "border border-green-500/30 bg-green-500/10 text-xs text-green-300 backdrop-blur sm:text-sm",
    },
    cancelled: {
      label: "Cancelled",
      className:
        "border border-red-500/30 bg-red-500/10 text-xs text-red-300 backdrop-blur sm:text-sm",
    },
  };
  return configs[status] || configs.pending;
}

function getBookingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    daily: "Daily Rental",
    weekend: "Weekend Package",
    sunday: "Sunday Rental",
  };
  return labels[type] || type;
}

function getCancelledByLabel(cancelledBy: string | null): string {
  const labels: Record<string, string> = {
    customer: "Customer requested",
    business: "Business decision",
    weather: "Weather/safety",
    no_show: "No show",
  };
  return cancelledBy ? labels[cancelledBy] || cancelledBy : "Unknown";
}

function getPaymentMethodDisplay(method: string | null): string {
  if (!method) return "Unknown";
  const methods: Record<string, string> = {
    stripe: "Stripe",
    card: "Card",
    cash: "Cash",
    venmo: "Venmo",
    zelle: "Zelle",
    check: "Check",
  };
  return methods[method] || method;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getBooking(id: string): Promise<BookingDetail | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:customers (
        id,
        first_name,
        last_name,
        email,
        phone,
        booking_count,
        total_spent
      ),
      unit:units (
        id,
        unit_number,
        nickname,
        product:products (
          name,
          slug
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Error fetching booking:", error);
    return null;
  }

  return data as unknown as BookingDetail;
}

async function getBookingPayments(bookingId: string): Promise<PaymentRecord[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id, payment_type, amount, status, payment_method, stripe_payment_intent_id, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  return (data || []) as PaymentRecord[];
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  // Fetch booking and payments in parallel
  const [booking, payments] = await Promise.all([
    getBooking(id),
    getBookingPayments(id),
  ]);

  if (!booking) {
    notFound();
  }

  const customer = booking.customer;
  const statusConfig = getStatusConfig(booking.status);
  const fullAddress = [
    booking.delivery_address,
    booking.delivery_city,
    booking.delivery_state,
    booking.delivery_zip,
  ]
    .filter(Boolean)
    .join(", ");

  // Calculate payment totals
  const isCancelled = booking.status === "cancelled";
  const depositPaidAmount = booking.deposit_paid ? Number(booking.deposit_amount) : 0;
  const balancePaidAmount = booking.balance_paid ? Number(booking.balance_due) : 0;
  const totalCollected = depositPaidAmount + balancePaidAmount;
  const refundAmount = Number(booking.refund_amount) || 0;
  const netCollected = totalCollected - refundAmount;

  // Check for Stripe payments
  const depositPayment = payments.find(p => p.payment_type === "deposit" && p.status === "succeeded");
  const balancePayment = payments.find(p => p.payment_type === "balance" && p.status === "succeeded");
  const hasStripePayment = !!(depositPayment?.stripe_payment_intent_id || balancePayment?.stripe_payment_intent_id);

  return (
    <div className="min-w-0 overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* ================================================================
          HEADER
      ================================================================ */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/admin/bookings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {booking.booking_number}
              </h1>
              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-foreground/70">
              Created {formatDateTime(booking.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons - Client Component */}
        <BookingActions
          bookingId={booking.id}
          status={booking.status}
          depositPaid={booking.deposit_paid}
          balancePaid={booking.balance_paid}
          balanceDue={Number(booking.balance_due)}
          depositAmount={Number(booking.deposit_amount)}
          balancePaymentMethod={booking.balance_payment_method}
          refundStatus={booking.refund_status}
          refundAmount={refundAmount}
          payments={payments}
        />
      </div>

      {/* ================================================================
          CANCELLATION REQUEST BANNER (if pending request exists)
      ================================================================ */}
      {!isCancelled && (
        <div className="mb-6 sm:mb-8">
          <CancellationRequestBanner
            bookingId={booking.id}
            bookingNumber={booking.booking_number}
          />
        </div>
      )}

      {/* ================================================================
          MAIN GRID
      ================================================================ */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column - Main Info */}
        <div className="space-y-4 sm:space-y-6">
          {/* ============================================================
              EVENT DETAILS CARD
          ============================================================ */}
          <div className={styles.sectionCard}>
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
              <h2 className={styles.cardHeading}>Event Details</h2>
              <Badge className="border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 backdrop-blur sm:text-sm">
                {getBookingTypeLabel(booking.booking_type)}
              </Badge>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Event Date */}
                <div className="flex items-start gap-3">
                  <div className={styles.iconFuchsia}>
                    <Calendar className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="pt-1">
                    <p className={styles.label}>Event Date</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">
                      {formatDate(booking.event_date)}
                    </p>
                  </div>
                </div>

                {/* Rental */}
                <div className="flex items-start gap-3">
                  <div className={styles.iconCyan}>
                    <Package className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="pt-1">
                    <p className={styles.label}>Rental</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">
                      {booking.product_snapshot.name}
                    </p>
                  </div>
                </div>

                {/* Delivery */}
                <div className="flex items-start gap-3">
                  <div className={styles.iconGreen}>
                    <Truck className="h-4 w-4 text-green-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="pt-1">
                    <p className={styles.label}>Delivery</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">
                      {formatDate(booking.delivery_date)}
                    </p>
                    <p className={styles.helperText}>
                      {formatWindow(booking.delivery_window)}
                    </p>
                  </div>
                </div>

                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div className={styles.iconAmber}>
                    <Clock className="h-4 w-4 text-amber-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="pt-1">
                    <p className={styles.label}>Pickup</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">
                      {formatDate(booking.pickup_date)}
                    </p>
                    <p className={styles.helperText}>
                      {formatWindow(booking.pickup_window)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address - Nested Card */}
              <div className={`mt-4 ${styles.nestedCard}`}>
                <div className="flex items-start gap-3 p-4 sm:p-5">
                  <div className={styles.iconPurple}>
                    <MapPin className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="pt-1">
                    <p className={styles.label}>Delivery Address</p>
                    <p className="mt-1 text-sm font-medium sm:text-base">{fullAddress}</p>
                    {booking.delivery_notes && (
                      <p className="mt-2 text-xs text-foreground/70 sm:text-sm">
                        <span className="text-foreground/50">Note:</span>{" "}
                        {booking.delivery_notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className={styles.nestedCardInner} />
              </div>

              {/* Add to Calendar - Owner/Admin */}
              {!isCancelled && customer && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className={`mb-3 ${styles.label}`}>Add to Calendar</p>
                  <AdminCalendarButtons
                    bookingData={{
                      productName: booking.product_snapshot.name,
                      bookingNumber: booking.booking_number,
                      customerName: `${customer.first_name} ${customer.last_name}`,
                      customerPhone: customer.phone,
                      customerEmail: customer.email,
                      address: booking.delivery_address,
                      city: booking.delivery_city,
                      state: booking.delivery_state || undefined,
                      zip: booking.delivery_zip || undefined,
                      unitNumber: booking.unit?.unit_number,
                      unitNickname: booking.unit?.nickname || undefined,
                      deliveryNotes: booking.delivery_notes || undefined,
                      totalPrice: Number(booking.subtotal),
                      balanceDue: Number(booking.balance_due),
                      depositPaid: booking.deposit_paid,
                      balancePaid: booking.balance_paid,
                      isPaidInFull: booking.balance_paid || Number(booking.balance_due) === 0,
                      bookingType: booking.booking_type,
                    }}
                    deliveryDate={booking.delivery_date}
                    deliveryWindow={booking.delivery_window}
                    pickupDate={booking.pickup_date}
                    pickupWindow={booking.pickup_window}
                  />
                </div>
              )}
            </div>
            <div className={styles.sectionCardInner} />
          </div>

          {/* ============================================================
              CUSTOMER CARD
          ============================================================ */}
          {customer && (
            <div className={styles.sectionCard}>
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
                <h2 className={styles.cardHeading}>Customer</h2>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center gap-1 text-xs text-cyan-400 transition-colors hover:text-cyan-300 sm:text-sm"
                >
                  View Profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Name */}
                  <div className="flex items-start gap-3">
                    <div className={styles.iconCyan}>
                      <User className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="pt-1">
                      <p className={styles.label}>Name</p>
                      <p className="mt-1 text-sm font-medium sm:text-base">
                        {customer.first_name} {customer.last_name}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className={styles.iconFuchsia}>
                      <Phone className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="pt-1">
                      <p className={styles.label}>Phone</p>
                      <p className="mt-1 text-sm font-medium sm:text-base">
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-cyan-400 transition-colors hover:text-cyan-300"
                        >
                          {customer.phone}
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className={styles.iconPurple}>
                      <Mail className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="pt-1">
                      <p className={styles.label}>Email</p>
                      <p className="mt-1 text-sm font-medium sm:text-base">
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-cyan-400 transition-colors hover:text-cyan-300"
                        >
                          {customer.email}
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* History */}
                  <div className="flex items-start gap-3">
                    <div className={styles.iconGreen}>
                      <FileText className="h-4 w-4 text-green-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="pt-1">
                      <p className={styles.label}>History</p>
                      <p className="mt-1 text-sm font-medium sm:text-base">
                        {customer.booking_count} booking
                        {customer.booking_count !== 1 ? "s" : ""} · $
                        {Number(customer.total_spent).toFixed(0)} total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.sectionCardInner} />
            </div>
          )}

          {/* ============================================================
              NOTES CARD
          ============================================================ */}
          {(booking.customer_notes || booking.internal_notes) && (
            <div className={styles.card}>
              <div className="border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
                <h2 className={styles.cardHeading}>Notes</h2>
              </div>
              <div className="p-4 sm:p-5">
                {booking.customer_notes && (
                  <div>
                    <p className={styles.label}>Customer Notes</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                      {booking.customer_notes}
                    </p>
                  </div>
                )}
                {booking.internal_notes && (
                  <div
                    className={
                      booking.customer_notes ? "mt-4 border-t border-white/5 pt-4" : ""
                    }
                  >
                    <p className={styles.label}>Internal Notes</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                      {booking.internal_notes}
                    </p>
                  </div>
                )}
              </div>
              <div className={styles.cardInner} />
            </div>
          )}
        </div>

        {/* ================================================================
            RIGHT COLUMN - Payment & Status
        ================================================================ */}
        <div className="space-y-4 sm:space-y-6">
          {/* ============================================================
              PAYMENT SUMMARY - DIFFERENT FOR CANCELLED VS ACTIVE
          ============================================================ */}
          <div className={styles.card}>
            <div className="border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center justify-between">
                <h2 className={styles.cardHeading}>Payment</h2>
                {hasStripePayment && (
                  <div className="flex items-center gap-1 text-[10px] text-cyan-400">
                    <Zap className="h-3 w-3" />
                    Stripe
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {isCancelled ? (
                // ========== CANCELLED BOOKING PAYMENT DISPLAY ==========
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Original Total</span>
                    <span className="font-medium text-foreground/50 line-through">
                      ${Number(booking.subtotal).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Deposit</span>
                    <span className={booking.deposit_paid ? "text-green-400" : "text-foreground/50"}>
                      ${Number(booking.deposit_amount).toFixed(2)}
                      {booking.deposit_paid ? " ✓" : " (not paid)"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Balance</span>
                    <span className={booking.balance_paid ? "text-green-400" : "text-foreground/50"}>
                      ${Number(booking.balance_due).toFixed(2)}
                      {booking.balance_paid ? " ✓" : " (not paid)"}
                    </span>
                  </div>
                  
                  {/* Cancelled divider */}
                  <div className="flex items-center gap-2 py-2">
                    <div className="h-px flex-1 bg-red-500/30" />
                    <span className="text-xs font-medium text-red-400">CANCELLED</span>
                    <div className="h-px flex-1 bg-red-500/30" />
                  </div>
                  
                  {/* Total collected */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Total Collected</span>
                    <span className="font-medium">${totalCollected.toFixed(2)}</span>
                  </div>
                  
                  {/* Refund info */}
                  {refundAmount > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground/70">Refund</span>
                        <span className="font-medium text-amber-400">
                          -${refundAmount.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Refund status */}
                      <div className={`rounded-lg p-3 ${
                        booking.refund_status === "processed" 
                          ? "bg-green-500/10" 
                          : "bg-amber-500/10"
                      }`}>
                        <div className="flex items-center gap-2">
                          {booking.refund_status === "processed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-amber-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            booking.refund_status === "processed" 
                              ? "text-green-400" 
                              : "text-amber-400"
                          }`}>
                            {booking.refund_status === "processed" 
                              ? "Refund Processed" 
                              : "Refund Pending"}
                          </span>
                        </div>
                        {booking.refund_processed_at && (
                          <p className="mt-1 text-xs text-foreground/50">
                            {formatDateTime(booking.refund_processed_at)}
                          </p>
                        )}
                        {booking.stripe_refund_id && (
                          <p className="mt-1 text-xs text-foreground/40">
                            Stripe: {booking.stripe_refund_id}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Net collected */}
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Net Collected</span>
                      <span className={`text-lg font-semibold ${
                        netCollected > 0 ? "text-green-400" : "text-foreground/50"
                      }`}>
                        ${netCollected.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // ========== ACTIVE BOOKING PAYMENT DISPLAY ==========
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Subtotal</span>
                    <span className="font-medium">${Number(booking.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Deposit</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        -${Number(booking.deposit_amount).toFixed(2)}
                      </span>
                      {booking.deposit_paid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Show payment method if deposit paid */}
                  {booking.deposit_paid && depositPayment && (
                    <div className="flex items-center justify-end gap-1 text-xs text-foreground/50">
                      {depositPayment.stripe_payment_intent_id && (
                        <Zap className="h-3 w-3 text-cyan-400" />
                      )}
                      <span>via {getPaymentMethodDisplay(depositPayment.payment_method)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Balance Due</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-cyan-400 sm:text-xl">
                          ${Number(booking.balance_due).toFixed(2)}
                        </span>
                        {booking.balance_paid && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.balance_paid && booking.balance_payment_method && (
                    <p className="text-center text-xs text-foreground/50">
                      Paid via {getPaymentMethodDisplay(booking.balance_payment_method)}
                      {booking.balance_paid_at &&
                        ` on ${formatDateTime(booking.balance_paid_at)}`}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className={styles.cardInner} />
          </div>

          {/* ============================================================
              PAYMENT HISTORY (if any payments exist)
          ============================================================ */}
          {payments.length > 0 && (
            <div className={styles.card}>
              <div className="border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
                <h2 className={styles.cardHeading}>Payment History</h2>
              </div>
              <div className="divide-y divide-white/5">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-foreground/50" />
                        <span className="text-sm capitalize">{payment.payment_type}</span>
                        {payment.stripe_payment_intent_id && (
                          <Zap className="h-3 w-3 text-cyan-400" />
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        payment.status === "succeeded" ? "text-green-400" :
                        payment.status === "refunded" ? "text-amber-400" :
                        payment.status === "failed" ? "text-red-400" :
                        "text-foreground/50"
                      }`}>
                        ${Number(payment.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-foreground/50">
                      <span>{getPaymentMethodDisplay(payment.payment_method)}</span>
                      <span>{formatDateTime(payment.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.cardInner} />
            </div>
          )}

          {/* ============================================================
              STATUS TIMELINE
          ============================================================ */}
          <div className={styles.card}>
            <div className="border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
              <h2 className={styles.cardHeading}>Timeline</h2>
            </div>
            <div className="p-4 sm:p-5">
              <div className="space-y-4">
                <TimelineItem
                  label="Created"
                  date={booking.created_at}
                  completed={true}
                />
                <TimelineItem
                  label="Confirmed"
                  date={booking.confirmed_at}
                  completed={!!booking.confirmed_at || booking.status !== "pending"}
                />
                <TimelineItem
                  label="Delivered"
                  date={booking.delivered_at}
                  completed={!!booking.delivered_at}
                />
                <TimelineItem
                  label="Picked Up"
                  date={booking.picked_up_at}
                  completed={!!booking.picked_up_at}
                />
                <TimelineItem
                  label="Completed"
                  date={booking.completed_at}
                  completed={!!booking.completed_at}
                  isLast={!booking.cancelled_at}
                />
              </div>

              {/* Cancellation info */}
              {booking.cancelled_at && (
                <div className={`mt-4 ${styles.nestedCard}`}>
                  <div className="border-l-2 border-red-500/50 p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <p className="text-sm font-medium text-red-400">Cancelled</p>
                    </div>
                    <p className="mt-1 text-xs text-foreground/50">
                      {formatDateTime(booking.cancelled_at)}
                    </p>
                    {booking.cancelled_by && (
                      <p className="mt-1 text-xs text-foreground/50">
                        By: {getCancelledByLabel(booking.cancelled_by)}
                      </p>
                    )}
                    {booking.cancellation_reason && (
                      <p className="mt-2 text-xs text-foreground/70">
                        {booking.cancellation_reason}
                      </p>
                    )}
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>
              )}
            </div>
            <div className={styles.cardInner} />
          </div>

          {/* ============================================================
              UNIT INFO
          ============================================================ */}
          {booking.unit && (
            <div className={styles.card}>
              <div className="border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
                <h2 className={styles.cardHeading}>Assigned Unit</h2>
              </div>
              <div className="p-4 sm:p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={styles.label}>Unit</span>
                    <span className="text-sm font-medium sm:text-base">
                      #{booking.unit.unit_number}
                      {booking.unit.nickname && ` (${booking.unit.nickname})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={styles.label}>Product</span>
                    <span className="text-sm font-medium sm:text-base">
                      {booking.unit.product?.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.cardInner} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TIMELINE ITEM COMPONENT
// =============================================================================

function TimelineItem({
  label,
  date,
  completed,
  isLast = false,
}: {
  label: string;
  date: string | null;
  completed: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            completed
              ? "bg-green-500/20 text-green-400"
              : "bg-white/5 text-foreground/30"
          }`}
        >
          {completed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-current" />
          )}
        </div>
        {!isLast && (
          <div
            className={`h-full w-px flex-1 ${
              completed ? "bg-green-500/30" : "bg-white/10"
            }`}
            style={{ minHeight: "24px" }}
          />
        )}
      </div>
      <div className={isLast ? "" : "pb-4"}>
        <p className={`text-sm ${completed ? "font-medium" : "text-foreground/50"}`}>
          {label}
        </p>
        {date && (
          <p className="text-xs text-foreground/50">
            {formatTimestamp(date)}
          </p>
        )}
      </div>
    </div>
  );
}
