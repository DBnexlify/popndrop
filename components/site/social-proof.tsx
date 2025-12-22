// =============================================================================
// SOCIAL PROOF COMPONENTS
// components/site/social-proof.tsx
// HONEST trust signals only - no fake data
// =============================================================================

"use client";

import { CheckCircle2, Star, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TRUST BADGE ROW
// Compact, honest trust signals for booking form
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
// LOW STOCK INDICATOR
// Shows REAL scarcity based on actual inventory count
// Only displays when inventory is genuinely limited
// =============================================================================

interface LowStockIndicatorProps {
  availableUnits: number;
  productName?: string;
  className?: string;
}

export function LowStockIndicator({ 
  availableUnits, 
  productName,
  className 
}: LowStockIndicatorProps) {
  // Only show when there's genuine scarcity (1 unit left)
  if (availableUnits !== 1) return null;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs",
        "animate-in fade-in duration-300",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="text-amber-300">
        Only 1 {productName || "unit"} available
      </span>
    </div>
  );
}

// =============================================================================
// URGENCY INDICATOR
// Shows limited availability for a specific date
// Only displays when inventory is genuinely limited for that date
// =============================================================================

interface UrgencyIndicatorProps {
  availableUnits: number;
  selectedDate?: Date;
  className?: string;
}

export function UrgencyIndicator({ 
  availableUnits, 
  selectedDate, 
  className 
}: UrgencyIndicatorProps) {
  // Only show if availability is limited AND a date is selected
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
