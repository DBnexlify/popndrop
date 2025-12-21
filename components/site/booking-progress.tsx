// =============================================================================
// BOOKING PROGRESS INDICATOR
// components/site/booking-progress.tsx
// Clean, Apple-level progress stepper with proper geometry
// =============================================================================

"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingProgressProps {
  currentStep: number;
  steps: {
    label: string;
    shortLabel?: string;
  }[];
}

// =============================================================================
// DESKTOP PROGRESS BAR
// Proper geometry: line sits BEHIND circles, connects between centers
// =============================================================================

export function BookingProgress({ currentStep, steps }: BookingProgressProps) {
  // Progress percentage: 0% at step 1, 100% at final step
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="relative">
      {/* 
        TRACK LAYER - sits behind everything (z-0)
        Positioned to span from center of first circle to center of last circle
        Circle is 44px (w-11), so center offset is 22px from each edge
      */}
      <div className="absolute left-[22px] right-[22px] top-[22px] z-0">
        {/* Track container - this is the full track width */}
        <div className="relative h-[2px] w-full rounded-full bg-white/10">
          {/* Progress fill - percentage of track width */}
          <div 
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* CIRCLES LAYER - sits above the track (z-10) */}
      <div className="relative z-10 flex items-start justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          const isPending = currentStep < stepNumber;

          return (
            <div key={step.label} className="flex flex-col items-center">
              {/* Circle with SOLID background to fully cover the track behind it */}
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                  // Completed: gradient fill with glow
                  isCompleted && "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25",
                  // Active: solid dark background with colored border
                  isActive && "border-2 border-fuchsia-500 bg-neutral-950 text-fuchsia-400",
                  // Pending: solid dark background with subtle border
                  isPending && "border-2 border-white/20 bg-neutral-950 text-foreground/40"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  stepNumber
                )}
              </div>

              {/* Label below circle */}
              <span
                className={cn(
                  "mt-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors duration-300",
                  isCompleted && "text-fuchsia-400",
                  isActive && "text-foreground",
                  isPending && "text-foreground/40"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT PROGRESS BAR (Mobile + Sticky states)
// Horizontal bar with step indicator - clean and minimal
// =============================================================================

export function BookingProgressCompact({
  currentStep,
  totalSteps,
  stepLabel,
}: {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
}) {
  // Progress: 0% at step 1, 100% at final step
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="flex items-center gap-4">
      {/* Step indicator */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/20">
        {currentStep}
      </div>
      
      {/* Progress section */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80">
            {stepLabel || `Step ${currentStep}`}
          </span>
          <span className="text-foreground/50">
            {currentStep} of {totalSteps}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FLOATING PRICE PILL
// Shows when user scrolls past the summary card
// =============================================================================

interface FloatingPricePillProps {
  price: number;
  label?: string;
  visible: boolean;
}

export function FloatingPricePill({ price, label, visible }: FloatingPricePillProps) {
  return (
    <div
      className={cn(
        "fixed right-4 z-40 transition-all duration-300",
        // Position below header on mobile, sidebar area on desktop
        "bottom-24 sm:bottom-auto sm:right-6 sm:top-24",
        visible 
          ? "translate-y-0 opacity-100" 
          : "pointer-events-none translate-y-4 opacity-0 sm:-translate-y-4"
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-background/90 px-4 py-2.5 shadow-xl backdrop-blur-xl">
        <span className="text-xs font-medium text-foreground/60">
          {label || "Total"}
        </span>
        <span className="text-lg font-semibold text-cyan-400">
          ${price}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// MINIMAL DOT PROGRESS (for very tight spaces)
// =============================================================================

export function BookingProgressDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1;
        const isCompleted = currentStep > step;
        const isActive = currentStep === step;

        return (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              isCompleted && "w-2 bg-fuchsia-500",
              isActive && "w-6 bg-gradient-to-r from-fuchsia-500 to-purple-600",
              !isCompleted && !isActive && "w-2 bg-white/20"
            )}
          />
        );
      })}
    </div>
  );
}
