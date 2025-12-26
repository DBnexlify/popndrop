// =============================================================================
// MY BOOKINGS PAGE - CLIENT COMPONENT
// app/(site)/my-bookings/my-bookings-content.tsx
// Comprehensive customer booking dashboard with loyalty rewards
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
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
  getDeliveryWindowLabel, 
  getPickupWindowLabel,
  getCalendarDaysUntil,
  getDaysUntilLabel,
  isPastDate,
} from "@/lib/timezone";
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
  CreditCard,
  ExternalLink,
  Gift,
  Star,
  Check,
  TrendingUp,
  Truck,
  ArrowUpRight,
  RefreshCw,
  CalendarDays,
  CircleDot,
  Receipt,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Timer,
} from "lucide-react";
import { CancellationModal } from "@/components/site/cancellation-modal";
import type { CustomerLoyaltyStatus, AvailableLoyaltyReward } from "@/lib/loyalty-types";
import { 
  getTierBadgeClasses, 
  getProgressBarColor, 
  formatExpirationDate,
  getProgressMessage,
} from "@/lib/loyalty-types";

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
  delivery_zip?: string;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  deposit_paid: boolean;
  deposit_paid_at?: string;
  balance_paid: boolean;
  balance_paid_at?: string;
  customer_notes: string | null;
  product_snapshot: {
    slug: string;
    name: string;
    image_url?: string;
  };
  created_at: string;
  confirmed_at: string | null;
  delivered_at?: string;
  picked_up_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_status?: string;
  refund_processed_at?: string;
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

type FilterTab = 'all' | 'upcoming' | 'past';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getBookingStatusInfo(booking: Booking) {
  // Use timezone-aware calendar day calculation (Eastern timezone)
  const daysUntil = getCalendarDaysUntil(booking.event_date);
  const dayInfo = getDaysUntilLabel(booking.event_date);
  
  // Determine the label for confirmed bookings based on days until event
  const getConfirmedLabel = () => {
    if (dayInfo.isToday) return "Today!";
    if (dayInfo.isTomorrow) return "Tomorrow!";
    if (daysUntil <= 7 && daysUntil > 0) return "Coming Soon";
    return "Confirmed";
  };
  
  // Determine the description for confirmed bookings
  const getConfirmedDescription = () => {
    if (dayInfo.isToday) return "Your event is today!";
    if (dayInfo.isTomorrow) return "Your event is tomorrow!";
    if (daysUntil > 0) return `${daysUntil} days until your event`;
    return undefined;
  };
  
  const statusConfig: Record<string, { 
    label: string; 
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ElementType;
    description?: string;
  }> = {
    pending: {
      label: "Payment Required",
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
      icon: CreditCard,
      description: "Complete payment to confirm your booking",
    },
    confirmed: {
      label: getConfirmedLabel(),
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
      icon: CheckCircle2,
      description: getConfirmedDescription(),
    },
    delivered: {
      label: "Equipment Delivered",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
      icon: Truck,
      description: "Equipment is set up and ready for your event",
    },
    picked_up: {
      label: "Picked Up",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      icon: Package,
      description: "Equipment has been picked up",
    },
    completed: {
      label: "Completed",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      borderColor: "border-cyan-500/30",
      icon: CheckCircle2,
      description: "Thank you for renting with us!",
    },
    cancelled: {
      label: "Cancelled",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
      icon: XCircle,
      description: booking.refund_status === 'processed' ? 
        `Refund of $${booking.refund_amount} processed` : 
        booking.refund_status === 'pending' ? 'Refund pending' : undefined,
    },
    pending_cancellation: {
      label: "Cancellation Pending",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/30",
      icon: AlertCircle,
      description: "Your cancellation request is being reviewed",
    },
  };

  return statusConfig[booking.status] || statusConfig.pending;
}

function getTimelineEvents(booking: Booking) {
  const events: { label: string; date: string | null; completed: boolean; icon: React.ElementType }[] = [
    { 
      label: "Booking Created", 
      date: booking.created_at, 
      completed: true,
      icon: Receipt,
    },
  ];

  if (booking.status !== 'pending') {
    events.push({ 
      label: "Payment Confirmed", 
      date: booking.confirmed_at || booking.deposit_paid_at || null, 
      completed: booking.deposit_paid,
      icon: CreditCard,
    });
  }

  if (booking.status === 'cancelled') {
    events.push({ 
      label: "Cancelled", 
      date: booking.cancelled_at || null, 
      completed: true,
      icon: XCircle,
    });
    if (booking.refund_processed_at) {
      events.push({ 
        label: `Refunded $${booking.refund_amount}`, 
        date: booking.refund_processed_at, 
        completed: true,
        icon: DollarSign,
      });
    }
    return events;
  }

  events.push({ 
    label: "Delivery", 
    date: booking.delivered_at || null, 
    completed: !!booking.delivered_at || ['delivered', 'picked_up', 'completed'].includes(booking.status),
    icon: Truck,
  });

  events.push({ 
    label: "Pickup", 
    date: booking.picked_up_at || null, 
    completed: !!booking.picked_up_at || ['picked_up', 'completed'].includes(booking.status),
    icon: Package,
  });

  events.push({ 
    label: "Completed", 
    date: booking.completed_at || null, 
    completed: booking.status === 'completed',
    icon: CheckCircle2,
  });

  return events;
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ status, booking }: { status: string; booking: Booking }) {
  const info = getBookingStatusInfo(booking);
  const Icon = info.icon;

  return (
    <Badge className={cn("gap-1 border", info.bgColor, info.color, info.borderColor)}>
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}

// =============================================================================
// FILTER TABS COMPONENT
// =============================================================================

function FilterTabs({ 
  activeTab, 
  onChange, 
  counts 
}: { 
  activeTab: FilterTab; 
  onChange: (tab: FilterTab) => void;
  counts: { all: number; upcoming: number; past: number };
}) {
  const tabs: { value: FilterTab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { value: 'past', label: 'Past', count: counts.past },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
            activeTab === tab.value
              ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md shadow-fuchsia-500/25"
              : "bg-white/5 text-foreground/60 hover:bg-white/10 hover:text-foreground"
          )}
        >
          {tab.label}
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            activeTab === tab.value
              ? "bg-white/20 text-white"
              : "bg-white/10 text-foreground/50"
          )}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// LOYALTY DASHBOARD COMPONENT
// =============================================================================

function LoyaltyDashboard({ 
  email, 
  completedBookings 
}: { 
  email: string;
  completedBookings: number;
}) {
  const [status, setStatus] = useState<CustomerLoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const fetchStatus = async () => {
      if (!email) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/loyalty?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching loyalty status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, [email]);
  
  if (loading) {
    return (
      <div className={cn(styles.card, "p-4")}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className={styles.cardInner} />
      </div>
    );
  }
  
  const availableReward = status?.available_rewards?.[0];
  const hasProgress = status && status.progress_percent > 0;
  
  return (
    <div className={cn(styles.card, "overflow-visible")}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              availableReward ? "bg-gradient-to-br from-fuchsia-500 to-purple-600" : "bg-gradient-to-br from-cyan-500/30 to-purple-500/30"
            )}>
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Loyalty Rewards</p>
              <p className={styles.helperText}>
                {availableReward 
                  ? `${availableReward.discount_percent}% off reward available!`
                  : `${completedBookings} booking${completedBookings !== 1 ? 's' : ''} completed`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.current_tier_name && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border',
                getTierBadgeClasses(status.current_tier_name === 'bronze' ? 'amber' : 'cyan')
              )}>
                {status.current_tier_name}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-foreground/50" />
            ) : (
              <ChevronDown className="h-4 w-4 text-foreground/50" />
            )}
          </div>
        </button>
        
        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Available Reward */}
            {availableReward && (
              <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-fuchsia-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
                    Reward Available
                  </span>
                </div>
                <p className="text-2xl font-semibold text-fuchsia-300">
                  {availableReward.discount_percent}% OFF
                </p>
                <div className="mt-3 rounded-lg bg-black/30 border border-dashed border-fuchsia-500/40 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                    Your Code
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-cyan-300 tracking-wider">
                    {availableReward.promo_code}
                  </p>
                </div>
                <p className="mt-2 text-center text-xs text-foreground/50">
                  {formatExpirationDate(availableReward.expires_at)} • 
                  Min order ${availableReward.min_order} • 
                  Max savings ${availableReward.max_discount}
                </p>
                <Button asChild className={cn(styles.primaryButton, "mt-3 w-full")}>
                  <Link href="/bookings">
                    <Gift className="mr-2 h-4 w-4" />
                    Use Reward - Book Now
                  </Link>
                </Button>
              </div>
            )}
            
            {/* Progress to Next Tier */}
            {hasProgress && !availableReward && status && (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                      getProgressBarColor(status.progress_percent)
                    )}
                    style={{ width: `${status.progress_percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  {getProgressMessage(
                    status.current_bookings,
                    status.next_tier_name ? status.bookings_until_next + status.current_bookings : null,
                    status.next_tier_name
                  )}
                </p>
              </div>
            )}
            
            {/* Earned Rewards History */}
            {status?.earned_rewards && status.earned_rewards.length > 0 && (
              <div className="border-t border-white/5 pt-4">
                <p className={styles.label}>Reward History</p>
                <div className="mt-2 space-y-2">
                  {status.earned_rewards.map((reward, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Star className={cn(
                          "h-4 w-4",
                          reward.code_used ? "text-foreground/30" : "text-amber-400"
                        )} />
                        <span className={cn(
                          "text-sm",
                          reward.code_used && "text-foreground/50"
                        )}>
                          {reward.tier_name} - {reward.discount_percent}% Off
                        </span>
                      </div>
                      {reward.code_used ? (
                        <Badge className="border-0 bg-green-500/20 text-green-400 text-[10px]">
                          <Check className="mr-1 h-3 w-3" />
                          Used
                        </Badge>
                      ) : (
                        <Badge className="border-0 bg-amber-500/20 text-amber-400 text-[10px]">
                          Available
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New Customer Info */}
            {!status && (
              <div className="rounded-lg bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold">Join Our Loyalty Program</span>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Book with us and earn rewards! After just{' '}
                  <span className="text-fuchsia-400 font-semibold">3 rentals</span>, you'll unlock{' '}
                  <span className="text-fuchsia-400 font-semibold">10% off</span> your next booking.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// COMPLETE PAYMENT BUTTON COMPONENT
// =============================================================================

interface CompletePaymentButtonProps {
  bookingId: string;
  paymentType: 'deposit' | 'full';
}

function CompletePaymentButton({ bookingId, paymentType }: CompletePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompletePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, paymentType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCompletePayment}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Redirecting...' : 'Complete Payment'}
        {!isLoading && <ExternalLink className="ml-2 h-3 w-3" />}
      </Button>
      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

// =============================================================================
// PAYMENT TYPE SELECTOR FOR PENDING BOOKINGS
// =============================================================================

interface PaymentTypeSelectorProps {
  bookingId: string;
  subtotal: number;
  depositAmount: number;
}

function PaymentTypeSelector({ bookingId, subtotal, depositAmount }: PaymentTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'deposit' | 'full'>('deposit');
  const balanceDue = subtotal - depositAmount;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSelectedType('deposit')}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            selectedType === 'deposit'
              ? "border-cyan-500/50 bg-cyan-500/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          )}
        >
          <p className="text-xs font-medium text-foreground/70">Deposit</p>
          <p className="text-lg font-semibold">${depositAmount}</p>
          <p className="text-[10px] text-foreground/50">${balanceDue} due on delivery</p>
        </button>

        <button
          onClick={() => setSelectedType('full')}
          className={cn(
            "rounded-lg border p-3 text-left transition-all",
            selectedType === 'full'
              ? "border-green-500/50 bg-green-500/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          )}
        >
          <p className="text-xs font-medium text-foreground/70">Pay in Full</p>
          <p className="text-lg font-semibold">${subtotal}</p>
          <p className="text-[10px] text-green-400">Nothing due on delivery</p>
        </button>
      </div>

      <CompletePaymentButton bookingId={bookingId} paymentType={selectedType} />
    </div>
  );
}

// =============================================================================
// BOOKING TIMELINE COMPONENT
// =============================================================================

function BookingTimeline({ booking }: { booking: Booking }) {
  const events = getTimelineEvents(booking);
  
  return (
    <div className="space-y-3">
      {events.map((event, idx) => {
        const Icon = event.icon;
        const isLast = idx === events.length - 1;
        
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border",
                event.completed 
                  ? "border-green-500/30 bg-green-500/20" 
                  : "border-white/10 bg-white/5"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  event.completed ? "text-green-400" : "text-foreground/30"
                )} />
              </div>
              {!isLast && (
                <div className={cn(
                  "w-0.5 flex-1 my-1",
                  event.completed ? "bg-green-500/30" : "bg-white/10"
                )} />
              )}
            </div>
            <div className="flex-1 pb-3">
              <p className={cn(
                "text-sm font-medium",
                event.completed ? "text-foreground" : "text-foreground/50"
              )}>
                {event.label}
              </p>
              {event.date && (
                <p className="text-xs text-foreground/50">
                  {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
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
  const [showDetails, setShowDetails] = useState(false);
  
  const eventDate = new Date(booking.event_date + "T12:00:00");
  const statusInfo = getBookingStatusInfo(booking);
  const isPaid = booking.balance_paid;
  // Only show payment section for truly pending bookings (not pending_cancellation)
  const isPending = booking.status === 'pending' && !booking.deposit_paid;
  const isPendingCancellation = booking.status === 'pending_cancellation';
  const isCancelled = booking.status === 'cancelled';
  
  // Use timezone-aware calendar day calculation (Eastern timezone)
  const dayInfo = getDaysUntilLabel(booking.event_date);
  const daysUntil = dayInfo.days;
  
  // Can cancel if upcoming and status is confirmed or pending (not pending_cancellation)
  const canCancel = isUpcoming && 
    !isPendingCancellation &&
    (booking.status === "confirmed" || booking.status === "pending");

  // Build calendar event data
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
    <div className={cn(
      styles.card, 
      "transition-all",
      isPending && "border-amber-500/30",
      isCancelled && "opacity-70"
    )}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{booking.product_snapshot.name}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className={cn(styles.helperText, "font-mono")}>
                #{booking.booking_number}
              </span>
              {isUpcoming && !isPending && !isCancelled && daysUntil >= 0 && daysUntil <= 7 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                  <Timer className="h-3 w-3" />
                  {dayInfo.shortLabel}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={booking.status} booking={booking} />
        </div>

        {/* Status Description */}
        {statusInfo.description && !isPending && (
          <p className="mt-2 text-xs text-foreground/60">
            {statusInfo.description}
          </p>
        )}

        {/* Pending Payment Alert - Hide if cancellation is pending */}
        {isPending && !isPendingCancellation && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-400">Payment Required</p>
            </div>
            <p className="mb-4 text-xs text-amber-300/70">
              Your booking is reserved but not yet confirmed. Complete payment to secure your rental date.
            </p>
            <PaymentTypeSelector 
              bookingId={booking.id}
              subtotal={booking.subtotal}
              depositAmount={booking.deposit_amount}
            />
          </div>
        )}

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
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-foreground/40" />
              <span>Drop-off: {getDeliveryWindowLabel(booking.delivery_window)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-foreground/40" />
              <span>Pickup: {getPickupWindowLabel(booking.pickup_window)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status - Only show if not pending */}
        {!isPending && (
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
                  <p className="text-[10px] text-foreground/50">Due at delivery</p>
                </div>
              ) : isCancelled && booking.refund_amount ? (
                <div>
                  <p className={styles.helperText}>Refunded</p>
                  <p className="font-semibold text-green-400">${booking.refund_amount}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-white/[0.03] py-2 text-xs text-foreground/60 hover:bg-white/[0.06] hover:text-foreground/80 transition-colors"
        >
          {showDetails ? "Hide" : "View"} Timeline & Details
          {showDetails ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {showDetails && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <BookingTimeline booking={booking} />
            
            {/* Notes */}
            {booking.customer_notes && (
              <div className="mt-4 rounded-lg border-l-2 border-fuchsia-500/50 bg-fuchsia-500/5 px-3 py-2">
                <p className={cn(styles.helperText, "text-fuchsia-400")}>Your Notes</p>
                <p className="mt-0.5 text-sm text-foreground/70">{booking.customer_notes}</p>
              </div>
            )}

            {/* Cancellation Info */}
            {isCancelled && booking.cancellation_reason && (
              <div className="mt-4 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                <p className={cn(styles.helperText, "text-red-400")}>Cancellation Reason</p>
                <p className="mt-0.5 text-sm text-foreground/70">{booking.cancellation_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Actions - Only for confirmed bookings */}
        {isUpcoming && booking.status === "confirmed" && (
          <div className="mt-4">
            <AddToCalendar event={calendarEvent} usePortal />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Book Again - For completed or cancelled bookings */}
          {(booking.status === 'completed' || booking.status === 'cancelled') && (
            <Button asChild size="sm" className={styles.primaryButton}>
              <Link href={`/bookings?rental=${booking.product_snapshot.slug}`}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Book Again
              </Link>
            </Button>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel Booking
            </Button>
          )}
        </div>

        {/* Pending Cancellation Notice */}
        {booking.status === "pending_cancellation" && (
          <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-950/20 p-3">
            <p className="text-xs text-orange-400">
              Your cancellation request is being reviewed. We&apos;ll email you once it&apos;s processed.
            </p>
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

function EmptyState({ type }: { type: "no-email" | "no-bookings" | "no-results" }) {
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

  if (type === "no-results") {
    return (
      <div className="py-8 text-center">
        <Package className="mx-auto h-12 w-12 text-foreground/30" />
        <p className="mt-3 text-sm text-foreground/60">No bookings in this category</p>
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
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');

  // Pre-fill email from saved customer info
  useEffect(() => {
    const saved = getSavedCustomerInfo();
    if (saved?.email) {
      setEmail(saved.email);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
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
        // If no upcoming, show all
        if (result.upcoming.length === 0 && result.past.length > 0) {
          setActiveTab('all');
        }
      }
    } catch (err) {
      setError("Failed to look up bookings. Please try again.");
      setData(null);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, [email]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const hasBookings = data?.stats?.total && data.stats.total > 0;

  // Check for pending bookings that need attention
  const pendingBookings = data?.upcoming.filter(b => b.status === 'pending' && !b.deposit_paid) || [];
  const hasPendingPayments = pendingBookings.length > 0;

  // Get filtered bookings based on active tab
  const filteredBookings = data ? (
    activeTab === 'upcoming' ? data.upcoming :
    activeTab === 'past' ? data.past :
    data.bookings
  ) : [];

  // Count completed bookings for loyalty
  const completedBookings = data?.bookings.filter(b => b.status === 'completed').length || 0;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className={styles.pageTitle}>My Bookings</h1>
        <p className={cn(styles.bodyText, "mt-2")}>
          View and manage your bounce house rentals
        </p>
      </div>

      {/* Search Form */}
      <div className={cn(styles.sectionCard, "mb-6")}>
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
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4">
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
        <div className="space-y-6">
          {/* Welcome Back + Stats */}
          {data.customer && (
            <div className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600">
                <PartyPopper className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">
                  Welcome back, {data.customer.firstName}!
                </p>
                <p className={styles.smallBody}>
                  {data.stats.upcoming} upcoming • {data.stats.past} past • {completedBookings} completed
                </p>
              </div>
            </div>
          )}

          {/* Loyalty Dashboard */}
          <LoyaltyDashboard 
            email={email} 
            completedBookings={completedBookings}
          />

          {/* Pending Payments Alert */}
          {hasPendingPayments && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  You have {pendingBookings.length} booking{pendingBookings.length > 1 ? 's' : ''} awaiting payment
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-300/70">
                Complete payment below to confirm your rental date.
              </p>
            </div>
          )}

          {/* Filter Tabs */}
          <FilterTabs 
            activeTab={activeTab}
            onChange={setActiveTab}
            counts={{
              all: data.stats.total,
              upcoming: data.stats.upcoming,
              past: data.stats.past,
            }}
          />

          {/* Bookings List */}
          <section>
            {filteredBookings.length === 0 ? (
              <EmptyState type="no-results" />
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    isUpcoming={data.upcoming.some(u => u.id === booking.id)}
                    customerEmail={email}
                    onCancelled={fetchBookings}
                  />
                ))}
              </div>
            )}
          </section>

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
