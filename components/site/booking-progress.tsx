// =============================================================================
// BOOKING PROGRESS INDICATOR
// components/site/booking-progress.tsx
// Visual step-by-step progress with CSS animations (no framer-motion needed)
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
  const progressPercentage = Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute left-4 right-4 top-4 h-0.5 bg-white/10 sm:left-5 sm:right-5" />
      
      {/* Animated progress fill */}
      <div 
        className="absolute left-4 top-4 h-0.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out sm:left-5"
        style={{ width: `calc(${progressPercentage}% - 2rem)` }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          const isPending = currentStep < stepNumber;

          return (
            <div key={step.label} className="flex flex-col items-center">
              {/* Step circle */}
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300 sm:h-10 sm:w-10 sm:text-sm",
                  isCompleted && "border-transparent bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white scale-100",
                  isActive && "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-400 scale-110",
                  isPending && "border-white/20 bg-background/50 text-foreground/40 scale-100"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 animate-in zoom-in-50 duration-200 sm:h-5 sm:w-5" />
                ) : (
                  stepNumber
                )}
                
                {/* Active pulse ring */}
                {isActive && (
                  <span className="absolute inset-0 animate-ping rounded-full border-2 border-fuchsia-500 opacity-30" />
                )}
              </div>

              {/* Step label */}
              <span
                className={cn(
                  "mt-2 text-center text-[9px] font-medium uppercase tracking-wide transition-all duration-300 sm:text-[10px]",
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
// COMPACT VERSION FOR MOBILE HEADER
// =============================================================================

export function BookingProgressCompact({ 
  currentStep, 
  totalSteps,
  stepLabel 
}: { 
  currentStep: number; 
  totalSteps: number;
  stepLabel?: string;
}) {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground/70">
          {stepLabel || `Step ${currentStep} of ${totalSteps}`}
        </span>
        <span className="text-fuchsia-400">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// MINIMAL DOT PROGRESS FOR VERY TIGHT SPACES
// =============================================================================

export function BookingProgressDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
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
