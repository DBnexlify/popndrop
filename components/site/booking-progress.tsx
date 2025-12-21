// =============================================================================
// BOOKING PROGRESS INDICATOR
// components/site/booking-progress.tsx
// Visual step-by-step progress with clean Apple-level design
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

export function BookingProgress({ currentStep, steps }: BookingProgressProps) {
  // Calculate progress percentage - starts at 0% on step 1
  // Step 1 = 0%, Step 2 = 33%, Step 3 = 66%, Step 4 = 100%
  const progressPercentage = Math.max(
    0,
    ((currentStep - 1) / (steps.length - 1)) * 100
  );

  return (
    <div className="relative py-2">
      {/* Background track */}
      <div className="absolute left-6 right-6 top-[22px] h-[2px] rounded-full bg-white/10 sm:left-8 sm:right-8 sm:top-[26px]" />

      {/* Animated progress fill */}
      <div
        className="absolute left-6 top-[22px] h-[2px] rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out sm:left-8 sm:top-[26px]"
        style={{
          width: `calc(${progressPercentage}% - ${progressPercentage > 0 ? "3rem" : "0rem"})`,
        }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          const isPending = currentStep < stepNumber;

          return (
            <div
              key={step.label}
              className="flex flex-col items-center"
            >
              {/* Step circle */}
              <div
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 sm:h-11 sm:w-11 sm:text-sm",
                  isCompleted &&
                    "border-2 border-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25",
                  isActive &&
                    "border-2 border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-400 shadow-lg shadow-fuchsia-500/20",
                  isPending &&
                    "border-2 border-white/10 bg-background/80 text-foreground/40"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 animate-in zoom-in-50 duration-200 sm:h-5 sm:w-5" />
                ) : (
                  <span className={cn(isActive && "animate-in fade-in duration-300")}>
                    {stepNumber}
                  </span>
                )}

                {/* Active pulse ring - subtle, not overwhelming */}
                {isActive && (
                  <span className="absolute inset-0 animate-ping rounded-full border border-fuchsia-500/40 opacity-40" />
                )}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  "mt-2.5 text-center text-[10px] font-medium uppercase tracking-wide transition-colors duration-300 sm:text-[11px]",
                  isCompleted && "text-fuchsia-400",
                  isActive && "text-foreground",
                  isPending && "text-foreground/40"
                )}
              >
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel || step.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT VERSION FOR MOBILE
// Now uses the SAME formula as desktop for consistency (0% on step 1)
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
  // FIXED: Use same formula as desktop - starts at 0% on step 1
  // This is honest and matches user expectations
  // Step 1 = 0%, Step 2 = 33%, Step 3 = 66%, Step 4 = 100%
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Step indicator dot */}
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-[10px] font-semibold text-white">
            {currentStep}
          </div>
          <span className="text-xs font-medium text-foreground/80">
            {stepLabel || `Step ${currentStep}`}
          </span>
        </div>
        <span className="text-xs font-medium text-foreground/50">
          {currentStep} of {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}

// =============================================================================
// MINIMAL DOT PROGRESS FOR VERY TIGHT SPACES
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
              isActive &&
                "w-6 bg-gradient-to-r from-fuchsia-500 to-purple-600",
              !isCompleted && !isActive && "w-2 bg-white/20"
            )}
          />
        );
      })}
    </div>
  );
}
