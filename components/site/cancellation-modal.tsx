// =============================================================================
// CANCELLATION MODAL COMPONENT
// components/site/cancellation-modal.tsx
// Smart modal that nudges reschedule FIRST, then allows cancellation
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  X,
  Loader2,
  Check,
  DollarSign,
  Calendar,
  CalendarDays,
  ArrowRight,
  Info,
  Sparkles,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

// =============================================================================
// TYPES
// =============================================================================

interface RescheduleOption {
  date: string;
  formatted: string;
  dayOfWeek: string;
}

interface CancellationPreview {
  booking: {
    id: string;
    bookingNumber: string;
    eventDate: string;
    eventDateFormatted: string;
    productName: string;
    status: string;
    deliveryWindow: string;
  };
  refund: {
    daysUntilEvent: number;
    refundPercent: number;
    refundAmount: number;
    processingFee: number;
    policyLabel: string;
    isEligible: boolean;
    amountPaid: number;
    hasPayment: boolean;
    canCancel: boolean;
  };
  policy: {
    name: string;
    rules: Array<{
      min_days: number;
      max_days: number | null;
      refund_percent: number;
      label: string;
    }>;
    processingFee: number;
    allowReschedule: boolean;
  };
  reschedule: {
    available: boolean;
    message: string | null;
    suggestedDates: RescheduleOption[];
    moreAvailable: boolean;
  };
}

interface CancellationModalProps {
  bookingId: string;
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// =============================================================================
// DESIGN SYSTEM STYLES
// =============================================================================

const styles = {
  overlay: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
  modal: "relative overflow-hidden rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl sm:rounded-3xl",
  modalInner: "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  nestedCard: "relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
  input: "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
} as const;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CancellationModal({
  bookingId,
  email,
  isOpen,
  onClose,
  onSuccess,
}: CancellationModalProps) {
  // Steps: loading → reschedule (nudge) → cancel-preview → confirm → success
  const [step, setStep] = useState<
    "loading" | "reschedule" | "rescheduling" | "reschedule-success" | 
    "cancel-preview" | "confirm" | "success" | "error"
  >("loading");
  
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [selectedDate, setSelectedDate] = useState<RescheduleOption | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cancellation preview when modal opens
  useEffect(() => {
    if (isOpen && bookingId && email) {
      fetchPreview();
    }
  }, [isOpen, bookingId, email]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("loading");
      setPreview(null);
      setSelectedDate(null);
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  const fetchPreview = async () => {
    setStep("loading");
    setError(null);

    try {
      const res = await fetch(
        `/api/cancellations/request?bookingId=${bookingId}&email=${encodeURIComponent(email)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load cancellation details");
        setStep("error");
        return;
      }

      setPreview(data);
      
      // If reschedule is available, show reschedule nudge FIRST
      if (data.reschedule?.available && data.reschedule.suggestedDates.length > 0) {
        setStep("reschedule");
      } else {
        // No reschedule options, go straight to cancel preview
        setStep("cancel-preview");
      }
    } catch (err) {
      console.error("Error fetching cancellation preview:", err);
      setError("Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const handleReschedule = async () => {
    if (!preview || !selectedDate) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          email,
          newEventDate: selectedDate.date,
          deliveryWindow: preview.booking.deliveryWindow,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reschedule booking");
        setIsSubmitting(false);
        return;
      }

      setStep("reschedule-success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Error rescheduling:", err);
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSubmitCancellation = async () => {
    if (!preview) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/cancellations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          email,
          reason: reason.trim() || null,
          cancellationType: "customer_request",
          declinedReschedule: preview.reschedule?.available ?? false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit cancellation request");
        setIsSubmitting(false);
        return;
      }

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Error submitting cancellation:", err);
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={cn(styles.modal, "w-full max-w-lg max-h-[90vh] overflow-auto")}>
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background/95 px-5 py-4 backdrop-blur-xl">
            <h2 className="text-lg font-semibold">
              {step === "reschedule" || step === "rescheduling" ? "Change Your Date?" : 
               step === "reschedule-success" ? "Booking Updated!" :
               step === "success" ? "Request Submitted" : "Cancel Booking"}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Loading State */}
            {step === "loading" && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
                <p className="mt-3 text-sm text-foreground/60">
                  Loading your options...
                </p>
              </div>
            )}

            {/* Error State */}
            {step === "error" && (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <p className="mt-4 text-red-300">{error}</p>
                <Button
                  onClick={fetchPreview}
                  variant="outline"
                  className="mt-4 border-white/10"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* ============================================================= */}
            {/* RESCHEDULE NUDGE - Show this FIRST */}
            {/* ============================================================= */}
            {step === "reschedule" && preview && (
              <div className="space-y-5">
                {/* Friendly Header */}
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                    <CalendarDays className="h-7 w-7 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Can&apos;t make it?</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    No problem! We have other dates available. Pick a new date and 
                    keep your booking — no extra fees!
                  </p>
                </div>

                {/* Current Booking Info */}
                <div className={cn(styles.nestedCard, "border-white/10")}>
                  <div className="p-4">
                    <p className="text-xs text-foreground/50 uppercase tracking-wide">Current Booking</p>
                    <p className="mt-1 font-semibold">{preview.booking.productName}</p>
                    <p className="mt-1 text-sm text-foreground/60 line-through">
                      {preview.booking.eventDateFormatted}
                    </p>
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>

                {/* Available Dates */}
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-fuchsia-400" />
                    Available Dates
                  </p>
                  <div className="space-y-2">
                    {preview.reschedule.suggestedDates.map((option) => (
                      <button
                        key={option.date}
                        onClick={() => setSelectedDate(option)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl p-4 transition-all",
                          selectedDate?.date === option.date
                            ? "bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border-2 border-fuchsia-500/50"
                            : "bg-white/[0.03] border border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium">{option.dayOfWeek}</p>
                          <p className="text-sm text-foreground/60">{option.formatted}</p>
                        </div>
                        {selectedDate?.date === option.date ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <ChevronRight className="h-5 w-5 text-foreground/30" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {preview.reschedule.moreAvailable && (
                    <p className="mt-3 text-xs text-foreground/50 text-center">
                      More dates available — contact us for other options
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-3">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleReschedule}
                    disabled={!selectedDate || isSubmitting}
                    className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rescheduling...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reschedule to {selectedDate ? selectedDate.dayOfWeek : "New Date"}
                      </>
                    )}
                  </Button>
                  
                  <button
                    onClick={() => setStep("cancel-preview")}
                    className="w-full text-center text-sm text-foreground/50 hover:text-foreground/70 py-2"
                  >
                    I still want to cancel →
                  </button>
                </div>
              </div>
            )}

            {/* Reschedule Success */}
            {step === "reschedule-success" && preview && selectedDate && (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-7 w-7 text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-green-400">
                  You&apos;re All Set!
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                  Your <strong>{preview.booking.productName}</strong> is now 
                  scheduled for <strong>{selectedDate.formatted}</strong>
                </p>
                <p className="mt-4 text-xs text-foreground/40">
                  Check your email for confirmation
                </p>
              </div>
            )}

            {/* ============================================================= */}
            {/* CANCEL PREVIEW - Only shown after declining reschedule */}
            {/* ============================================================= */}
            {step === "cancel-preview" && preview && (
              <div className="space-y-5">
                {/* Booking Info */}
                <div className={styles.nestedCard}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{preview.booking.productName}</p>
                        <p className="mt-1 text-sm text-foreground/60">
                          Booking #{preview.booking.bookingNumber}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {preview.refund.daysUntilEvent} days away
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-foreground/60">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(preview.booking.eventDate + "T12:00:00"), "EEE, MMM d")}
                      </span>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>

                {/* Refund Preview */}
                <div className={cn(
                  styles.nestedCard,
                  preview.refund.isEligible 
                    ? "border-green-500/20 bg-green-950/10" 
                    : "border-amber-500/20 bg-amber-950/10"
                )}>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className={cn(
                        "h-5 w-5",
                        preview.refund.isEligible ? "text-green-400" : "text-amber-400"
                      )} />
                      <span className="font-semibold">
                        {preview.refund.isEligible ? "Refund Eligible" : "No Refund Available"}
                      </span>
                    </div>
                    
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Amount paid</span>
                        <span>${preview.refund.amountPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Policy ({preview.refund.policyLabel})</span>
                        <span>{preview.refund.refundPercent}% refund</span>
                      </div>
                      {preview.refund.processingFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-foreground/60">Processing fee</span>
                          <span>-${preview.refund.processingFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-white/10 pt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Your refund</span>
                          <span className={preview.refund.isEligible ? "text-green-400" : "text-amber-400"}>
                            ${preview.refund.refundAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>

                {/* Reschedule Reminder */}
                {preview.reschedule?.available && (
                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
                    <div className="flex items-start gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                      <div>
                        <p className="text-cyan-300 font-medium">
                          Remember: You can reschedule instead!
                        </p>
                        <p className="text-foreground/60 text-xs mt-1">
                          Keep your booking and pick a new date — no fees.{" "}
                          <button 
                            onClick={() => setStep("reschedule")}
                            className="text-cyan-400 hover:underline"
                          >
                            View dates →
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Policy Info */}
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 text-xs text-foreground/50">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground/70">Cancellation Policy</p>
                      <ul className="mt-1 space-y-0.5">
                        {preview.policy.rules.map((rule, i) => (
                          <li key={i}>
                            {rule.label}: {rule.refund_percent}% refund
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for cancellation (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Let us know why you're cancelling..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={cn(styles.input, "min-h-[80px]")}
                  />
                </div>

                {/* Warning */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <p className="text-foreground/70">
                      {preview.refund.refundAmount > 0 ? (
                        <>
                          Your cancellation request will be reviewed by our team. 
                          If approved, your refund of <strong className="text-amber-300">
                          ${preview.refund.refundAmount.toFixed(2)}</strong> will be processed 
                          within 5-10 business days.
                        </>
                      ) : (
                        <>
                          Based on our policy, this booking is not eligible for a refund. 
                          Your cancellation request will still be reviewed.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-white/10"
                  >
                    Keep Booking
                  </Button>
                  <Button
                    onClick={() => setStep("confirm")}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                  >
                    Request Cancellation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* CONFIRM STATE */}
            {/* ============================================================= */}
            {step === "confirm" && preview && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                    <AlertTriangle className="h-7 w-7 text-red-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Confirm Cancellation</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Are you sure you want to cancel your booking for{" "}
                    <strong>{preview.booking.productName}</strong> on{" "}
                    <strong>{format(new Date(preview.booking.eventDate + "T12:00:00"), "MMMM d, yyyy")}</strong>?
                  </p>
                </div>

                {preview.refund.refundAmount > 0 && (
                  <div className={cn(styles.nestedCard, "border-green-500/20")}>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm text-foreground/70">Expected refund</span>
                      <span className="text-lg font-semibold text-green-400">
                        ${preview.refund.refundAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className={styles.nestedCardInner} />
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-3">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("cancel-preview")}
                    disabled={isSubmitting}
                    className="flex-1 border-white/10"
                  >
                    Go Back
                  </Button>
                  <Button
                    onClick={handleSubmitCancellation}
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Confirm Cancellation"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SUCCESS STATE */}
            {/* ============================================================= */}
            {step === "success" && (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-7 w-7 text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-green-400">
                  Request Submitted!
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                  We&apos;ve received your cancellation request. You&apos;ll receive 
                  an email confirmation shortly, and we&apos;ll notify you once 
                  it&apos;s been reviewed.
                </p>
                <p className="mt-4 text-xs text-foreground/40">
                  Closing automatically...
                </p>
              </div>
            )}
          </div>

          {/* Inner feather */}
          <div className={styles.modalInner} />
        </div>
      </div>
    </>
  );
}
