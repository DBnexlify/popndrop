// =============================================================================
// SOCIAL PROOF COMPONENTS
// components/site/social-proof.tsx
// Live activity indicators, booking counts, and trust signals
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { Users, TrendingUp, Clock, CheckCircle2, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// LIVE ACTIVITY INDICATOR
// Shows "X people viewing" with animated dots
// =============================================================================

interface LiveViewersProps {
  productSlug?: string;
  className?: string;
}

export function LiveViewers({ productSlug, className }: LiveViewersProps) {
  const [viewers, setViewers] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Simulate realistic viewer counts (2-7 viewers)
    // In production, you'd fetch this from analytics
    const baseViewers = Math.floor(Math.random() * 4) + 2;
    setViewers(baseViewers);
    setIsVisible(true);

    // Occasionally fluctuate the count
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + change;
        return Math.max(2, Math.min(8, newCount));
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [productSlug]);

  if (!isVisible || viewers < 2) return null;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400",
        "animate-in fade-in slide-in-from-bottom-2 duration-500",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
      </span>
      <Users className="h-3 w-3" />
      <span>{viewers} people viewing</span>
    </div>
  );
}

// =============================================================================
// RECENT BOOKINGS COUNTER
// Shows "X booked this week" or "X booked today"
// =============================================================================

interface RecentBookingsProps {
  count?: number;
  period?: "today" | "week" | "month";
  className?: string;
}

export function RecentBookings({ count, period = "week", className }: RecentBookingsProps) {
  const [displayCount, setDisplayCount] = useState(0);
  
  useEffect(() => {
    // If count provided, use it. Otherwise simulate a realistic number
    const actualCount = count ?? (period === "today" ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 8) + 5);
    
    // Animate count up
    let current = 0;
    const step = Math.ceil(actualCount / 20);
    const interval = setInterval(() => {
      current += step;
      if (current >= actualCount) {
        setDisplayCount(actualCount);
        clearInterval(interval);
      } else {
        setDisplayCount(current);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [count, period]);

  const periodLabel = {
    today: "today",
    week: "this week",
    month: "this month",
  }[period];

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-medium text-fuchsia-400",
        className
      )}
    >
      <TrendingUp className="h-3 w-3" />
      <span>{displayCount} booked {periodLabel}</span>
    </div>
  );
}

// =============================================================================
// URGENCY INDICATOR
// Shows limited availability message when appropriate
// =============================================================================

interface UrgencyIndicatorProps {
  availableUnits?: number;
  totalUnits?: number;
  selectedDate?: Date;
  className?: string;
}

export function UrgencyIndicator({ availableUnits = 1, totalUnits = 1, selectedDate, className }: UrgencyIndicatorProps) {
  // Only show if availability is limited
  if (availableUnits > 1 || !selectedDate) return null;

  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs",
        "animate-in fade-in duration-300",
        className
      )}
    >
      <Clock className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="text-amber-300">
        {isWeekend 
          ? "Weekends book fast — only 1 unit left for this date!"
          : "Last unit available for this date!"
        }
      </span>
    </div>
  );
}

// =============================================================================
// TRUST BADGE ROW
// Compact trust signals for booking form
// =============================================================================

export function TrustBadges({ className }: { className?: string }) {
  const badges = [
    { icon: CheckCircle2, label: "Free delivery", color: "text-cyan-400" },
    { icon: Star, label: "5-star rated", color: "text-amber-400" },
    { icon: Sparkles, label: "Sanitized", color: "text-fuchsia-400" },
  ];

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
      {badges.map((badge) => (
        <div 
          key={badge.label}
          className="flex items-center gap-1.5 text-xs text-foreground/60"
        >
          <badge.icon className={cn("h-3.5 w-3.5", badge.color)} />
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// RECENT BOOKING TOAST
// Animated "Someone just booked..." notification
// =============================================================================

interface RecentBookingToastProps {
  show?: boolean;
  onHide?: () => void;
}

const RECENT_BOOKINGS = [
  { name: "Sarah M.", product: "Glitch Combo", city: "Ocala", timeAgo: "2 min ago" },
  { name: "Mike T.", product: "Party Palace", city: "Belleview", timeAgo: "5 min ago" },
  { name: "Jessica L.", product: "Glitch Combo", city: "Silver Springs", timeAgo: "12 min ago" },
  { name: "David R.", product: "Party Palace", city: "Ocala", timeAgo: "18 min ago" },
];

export function RecentBookingToast({ show = false, onHide }: RecentBookingToastProps) {
  const [booking, setBooking] = useState(RECENT_BOOKINGS[0]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Pick a random recent booking
      const randomBooking = RECENT_BOOKINGS[Math.floor(Math.random() * RECENT_BOOKINGS.length)];
      setBooking(randomBooking);
      setIsVisible(true);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-24 left-4 z-50 max-w-xs sm:bottom-4",
        "rounded-xl border border-white/10 bg-background/95 p-3 shadow-xl backdrop-blur-xl",
        "animate-in slide-in-from-left-full duration-300"
      )}
    >
      <button
        onClick={() => { setIsVisible(false); onHide?.(); }}
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-foreground/60 hover:bg-white/20"
      >
        ×
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20">
          <CheckCircle2 className="h-5 w-5 text-fuchsia-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground/90">
            {booking.name} just booked!
          </p>
          <p className="text-xs text-foreground/60">
            {booking.product} · {booking.city} · {booking.timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BOOKING COUNT BANNER
// For homepage or landing pages
// =============================================================================

export function BookingCountBanner({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm",
        className
      )}
    >
      <div className="flex -space-x-2">
        {/* Simulated avatar stack */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-fuchsia-500 to-purple-600 text-[10px] font-bold text-white"
          >
            {String.fromCharCode(64 + i)}
          </div>
        ))}
      </div>
      <span className="text-foreground/70">
        <span className="font-semibold text-foreground">47+ families</span> have booked with us
      </span>
    </div>
  );
}
