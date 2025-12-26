// =============================================================================
// SLOT PICKER COMPONENT
// components/ui/slot-picker.tsx
// Time slot selection for slot-based products (Party House)
// =============================================================================

"use client";

import { cn } from "@/lib/utils";
import { Clock, Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { AvailableSlot } from "@/lib/database-types";

// =============================================================================
// HELPER: Format time from HH:MM:SS to human-readable
// =============================================================================

function formatTimeLocal(timeStr: string): string {
  // timeStr is in "HH:MM:SS" format (e.g., "15:00:00")
  if (!timeStr) return '';
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  // Only show minutes if not :00
  if (minutes === 0) {
    return `${hour12} ${period}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate a display label for a slot
 * Always formats from actual times for consistency
 */
function getSlotDisplayLabel(slot: AvailableSlot): string {
  // Always generate from start/end times for consistent display
  const startFormatted = formatTimeLocal(slot.start_time_local);
  const endFormatted = formatTimeLocal(slot.end_time_local);
  
  if (startFormatted && endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }
  
  // Fallback to label if times aren't available
  if (slot.label && slot.label.trim()) {
    return slot.label;
  }
  
  return 'Time Slot';
}

// =============================================================================
// DESIGN SYSTEM STYLES
// =============================================================================

const styles = {
  // Tier 3: Nested Cards (Inside Other Cards)
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
  nestedCardSelected: "ring-2 ring-fuchsia-500/50 bg-fuchsia-500/5",
  
  // Typography
  smallBody: "text-xs leading-relaxed text-foreground/70 sm:text-sm",
  helperText: "text-xs text-foreground/50",
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface SlotPickerProps {
  slots: AvailableSlot[];
  selectedSlotId: string | null;
  onSelect: (slot: AvailableSlot) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  /** Price to display per slot (for slot-based products) */
  price?: number;
  /** Timestamp when slots were last fetched (for freshness indicator) */
  lastUpdated?: Date | null;
  /** Whether a background refresh is in progress */
  isRefreshing?: boolean;
  /** Callback to manually trigger refresh */
  onRefresh?: () => void;
}

// =============================================================================
// SLOT CARD COMPONENT
// =============================================================================

function SlotCard({
  slot,
  isSelected,
  onSelect,
  price,
}: {
  slot: AvailableSlot;
  isSelected: boolean;
  onSelect: () => void;
  price?: number;
}) {
  const isAvailable = slot.is_available;
  const reason = slot.unavailable_reason;

  return (
    <button
      type="button"
      onClick={() => isAvailable && onSelect()}
      disabled={!isAvailable}
      className={cn(
        styles.nestedCard,
        "w-full p-4 text-left transition-all duration-200",
        isAvailable && !isSelected && "hover:border-white/10 hover:bg-white/[0.05] active:scale-[0.98]",
        isSelected && styles.nestedCardSelected,
        !isAvailable && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Time icon and label */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
            isSelected ? "bg-fuchsia-500/20" : isAvailable ? "bg-cyan-500/10" : "bg-white/5"
          )}>
            {isSelected ? (
              <Check className="h-5 w-5 text-fuchsia-400" />
            ) : (
              <Clock className={cn(
                "h-5 w-5",
                isAvailable ? "text-cyan-400" : "text-foreground/30"
              )} />
            )}
          </div>
          
          <div>
            <p className={cn(
              "font-semibold transition-colors",
              isSelected ? "text-fuchsia-300" : isAvailable ? "text-foreground" : "text-foreground/50"
            )}>
              {getSlotDisplayLabel(slot)}
            </p>
            
            {!isAvailable && reason && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-400/80">
                <AlertCircle className="h-3 w-3" />
                {reason}
              </p>
            )}
            
            {isAvailable && (
              <p className={cn(
                styles.helperText,
                "mt-0.5",
                isSelected && "text-fuchsia-400/70"
              )}>
                4-hour event window
              </p>
            )}
          </div>
        </div>

        {/* Price (if provided) */}
        {price !== undefined && isAvailable && (
          <span className={cn(
            "shrink-0 text-lg font-semibold",
            isSelected ? "text-fuchsia-400" : "text-cyan-400"
          )}>
            ${price}
          </span>
        )}
      </div>

      {/* Inner feather overlay */}
      <div className={styles.nestedCardInner} />
    </button>
  );
}

// =============================================================================
// MAIN SLOT PICKER COMPONENT
// =============================================================================

export function SlotPicker({
  slots,
  selectedSlotId,
  onSelect,
  isLoading = false,
  error = null,
  className,
  price,
  lastUpdated = null,
  isRefreshing = false,
  onRefresh,
}: SlotPickerProps) {
  // Format "last updated" time for display
  const getLastUpdatedText = () => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
  };
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-foreground/50">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading time slots...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (slots.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-foreground/30" />
          <p className="mt-3 text-sm text-foreground/50">
            No time slots available for this date.
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            Please select a different date.
          </p>
        </div>
      </div>
    );
  }

  // Count available slots
  const availableCount = slots.filter(s => s.is_available).length;
  const allUnavailable = availableCount === 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Availability indicator with freshness */}
      {!allUnavailable && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-foreground/50">
              {availableCount} of {slots.length} slot{slots.length !== 1 ? 's' : ''} available
            </span>
            {/* Freshness indicator */}
            {lastUpdated && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-foreground/40 transition-colors hover:bg-white/10 hover:text-foreground/60 disabled:opacity-50"
              >
                <RefreshCw className={cn(
                  "h-2.5 w-2.5",
                  isRefreshing && "animate-spin"
                )} />
                {isRefreshing ? 'Updating...' : getLastUpdatedText()}
              </button>
            )}
          </div>
          {selectedSlotId && (
            <span className="flex items-center gap-1 text-fuchsia-400">
              <Check className="h-3 w-3" />
              Selected
            </span>
          )}
        </div>
      )}

      {/* All unavailable warning */}
      {allUnavailable && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            All time slots are booked for this date. Please choose another day.
          </div>
        </div>
      )}

      {/* Slot cards */}
      <div className="space-y-2">
        {slots.map((slot) => (
          <SlotCard
            key={slot.slot_id}
            slot={slot}
            isSelected={selectedSlotId === slot.slot_id}
            onSelect={() => onSelect(slot)}
            price={price}
          />
        ))}
      </div>

      {/* Helper text */}
      {!allUnavailable && (
        <p className={cn(styles.helperText, "text-center")}>
          We&apos;ll arrive ~1.5 hours early to set up
        </p>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VERSION FOR MOBILE
// =============================================================================

export function SlotPickerCompact({
  slots,
  selectedSlotId,
  onSelect,
  isLoading = false,
  error = null,
  className,
  price,
  lastUpdated = null,
  isRefreshing = false,
  onRefresh,
}: SlotPickerProps) {
  // Format "last updated" time for display
  const getLastUpdatedText = () => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-6", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("rounded-lg border border-red-500/30 bg-red-950/20 p-3", className)}>
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  // Empty state
  if (slots.length === 0) {
    return (
      <div className={cn("rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center", className)}>
        <p className="text-xs text-foreground/50">No slots available</p>
      </div>
    );
  }

  // Count available slots
  const availableCount = slots.filter(s => s.is_available).length;

  // Grid layout for mobile
  return (
    <div className={cn("space-y-2", className)}>
      {/* Freshness indicator for mobile */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground/40">
            {availableCount} slot{availableCount !== 1 ? 's' : ''} available
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-foreground/40 active:text-foreground/60 disabled:opacity-50"
          >
            <RefreshCw className={cn(
              "h-2.5 w-2.5",
              isRefreshing && "animate-spin"
            )} />
            {isRefreshing ? 'Updating...' : getLastUpdatedText()}
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.slot_id;
          const isAvailable = slot.is_available;

          return (
            <button
              key={slot.slot_id}
              type="button"
              onClick={() => isAvailable && onSelect(slot)}
              disabled={!isAvailable}
              className={cn(
                styles.nestedCard,
                "p-3 text-left transition-all active:scale-[0.98]",
                isSelected && styles.nestedCardSelected,
                !isAvailable && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Selection indicator */}
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                    isSelected 
                      ? "border-fuchsia-400 bg-fuchsia-400" 
                      : isAvailable
                      ? "border-white/30"
                      : "border-white/10"
                  )}>
                    {isSelected && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-fuchsia-300" : isAvailable ? "text-foreground" : "text-foreground/50"
                  )}>
                    {getSlotDisplayLabel(slot)}
                  </span>
                </div>

                {/* Price or unavailable reason */}
                {isAvailable ? (
                  price !== undefined && (
                    <span className={cn(
                      "text-base font-semibold",
                      isSelected ? "text-fuchsia-400" : "text-cyan-400"
                    )}>
                      ${price}
                    </span>
                  )
                ) : (
                  <span className="text-[10px] text-amber-400/80">
                    {slot.unavailable_reason || 'Unavailable'}
                  </span>
                )}
              </div>
              
              <div className={styles.nestedCardInner} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SlotPicker;
