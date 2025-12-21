"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  DollarSign,
  Loader2,
  AlertTriangle,
  X,
  RefreshCw,
  CreditCard,
  Zap,
  Banknote,
  Edit3,
} from "lucide-react";
import {
  markBookingDelivered,
  markBookingPickedUp,
  markBookingCompleted,
  cancelBooking,
  recordPayment,
  markRefundProcessed,
  type CancelBookingData,
  type RecordPaymentData,
} from "./booking-actions";

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  primaryButton:
    "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30",
  secondaryButton: "border-white/10 hover:bg-white/5",
  input:
    "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  label: "text-sm font-medium text-foreground/70",
  modalOverlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
  modalCard:
    "relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-[0_20px_70px_rgba(0,0,0,0.4)]",
  modalCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface PaymentRecord {
  id: string;
  payment_type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

interface BookingActionsProps {
  bookingId: string;
  status: string;
  depositPaid: boolean;
  balancePaid: boolean;
  balanceDue: number;
  depositAmount: number;
  balancePaymentMethod: string | null;
  // For refund pending display
  refundStatus?: string | null;
  refundAmount?: number | null;
  // Payment records for smart detection
  payments?: PaymentRecord[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookingActions({
  bookingId,
  status,
  depositPaid,
  balancePaid,
  balanceDue,
  depositAmount,
  balancePaymentMethod,
  refundStatus,
  refundAmount,
  payments = [],
}: BookingActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which buttons to show
  const showMarkDelivered = status === "confirmed";
  const showMarkPickedUp = status === "delivered";
  const showMarkCompleted = status === "picked_up";
  const showCancel = !["cancelled", "completed"].includes(status);
  const showRecordPayment = !balancePaid && status !== "cancelled";
  const showMarkRefundProcessed = status === "cancelled" && refundStatus === "pending";

  const handleMarkDelivered = () => {
    setActiveAction("delivered");
    setError(null);
    startTransition(async () => {
      const result = await markBookingDelivered(bookingId);
      if (!result.success) {
        setError(result.error || "Failed to mark as delivered");
      }
      setActiveAction(null);
      router.refresh();
    });
  };

  const handleMarkPickedUp = () => {
    setActiveAction("picked_up");
    setError(null);
    startTransition(async () => {
      const result = await markBookingPickedUp(bookingId);
      if (!result.success) {
        setError(result.error || "Failed to mark as picked up");
      }
      setActiveAction(null);
      router.refresh();
    });
  };

  const handleMarkCompleted = () => {
    setActiveAction("completed");
    setError(null);
    startTransition(async () => {
      const result = await markBookingCompleted(bookingId);
      if (!result.success) {
        setError(result.error || "Failed to mark as completed");
      }
      setActiveAction(null);
      router.refresh();
    });
  };

  const handleMarkRefundProcessed = () => {
    setActiveAction("refund");
    setError(null);
    startTransition(async () => {
      const result = await markRefundProcessed({ bookingId });
      if (!result.success) {
        setError(result.error || "Failed to mark refund as processed");
      }
      setActiveAction(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showMarkDelivered && (
          <Button
            size="sm"
            onClick={handleMarkDelivered}
            disabled={isPending}
            className={styles.primaryButton}
          >
            {activeAction === "delivered" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Truck className="mr-2 h-4 w-4" />
            )}
            Mark Delivered
          </Button>
        )}

        {showMarkPickedUp && (
          <Button
            size="sm"
            onClick={handleMarkPickedUp}
            disabled={isPending}
            className="bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30"
          >
            {activeAction === "picked_up" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Mark Picked Up
          </Button>
        )}

        {showMarkCompleted && (
          <Button
            size="sm"
            onClick={handleMarkCompleted}
            disabled={isPending}
            className="bg-green-600 text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-700 hover:shadow-xl hover:shadow-green-500/30"
          >
            {activeAction === "completed" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Mark Completed
          </Button>
        )}

        {showRecordPayment && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPaymentModal(true)}
            disabled={isPending}
            className={styles.secondaryButton}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}

        {showMarkRefundProcessed && (
          <Button
            size="sm"
            onClick={handleMarkRefundProcessed}
            disabled={isPending}
            className="bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-700"
          >
            {activeAction === "refund" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Mark Refund Sent (${refundAmount?.toFixed(2)})
          </Button>
        )}

        {showCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            disabled={isPending}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelModal
          bookingId={bookingId}
          depositPaid={depositPaid}
          depositAmount={depositAmount}
          balancePaid={balancePaid}
          balanceDue={balanceDue}
          balancePaymentMethod={balancePaymentMethod}
          payments={payments}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          bookingId={bookingId}
          balanceDue={balanceDue}
          depositPaid={depositPaid}
          depositAmount={depositAmount}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
}

// =============================================================================
// SMART CANCEL MODAL WITH PAYMENT DETECTION & MANUAL OVERRIDE
// =============================================================================

function CancelModal({
  bookingId,
  depositPaid: dbDepositPaid,
  depositAmount,
  balancePaid: dbBalancePaid,
  balanceDue,
  balancePaymentMethod,
  payments,
  onClose,
}: {
  bookingId: string;
  depositPaid: boolean;
  depositAmount: number;
  balancePaid: boolean;
  balanceDue: number;
  balancePaymentMethod: string | null;
  payments: PaymentRecord[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [cancelledBy, setCancelledBy] = useState<CancelBookingData["cancelledBy"]>("customer");
  
  // Manual override for payment status
  const [manualOverride, setManualOverride] = useState(false);
  const [overrideDepositPaid, setOverrideDepositPaid] = useState(dbDepositPaid);
  const [overrideBalancePaid, setOverrideBalancePaid] = useState(dbBalancePaid);
  
  // Use override values if manual override is enabled, otherwise use database values
  const depositPaid = manualOverride ? overrideDepositPaid : dbDepositPaid;
  const balancePaid = manualOverride ? overrideBalancePaid : dbBalancePaid;
  
  // Refund options
  const [refundOption, setRefundOption] = useState<"none" | "deposit" | "full" | "custom">("none");
  const [customRefundAmount, setCustomRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<"stripe" | "venmo" | "zelle" | "cash" | "check">("venmo");
  const [processStripeRefund, setProcessStripeRefund] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // SMART PAYMENT DETECTION
  // =========================================================================
  
  // Find deposit payment with Stripe
  const depositPayment = payments.find(
    p => p.payment_type === "deposit" && p.status === "succeeded"
  );
  const depositStripePaymentIntentId = depositPayment?.stripe_payment_intent_id;
  const depositPaymentMethod = depositPayment?.payment_method || "unknown";
  
  // Find balance payment with Stripe
  const balancePayment = payments.find(
    p => p.payment_type === "balance" && p.status === "succeeded"
  );
  const balanceStripePaymentIntentId = balancePayment?.stripe_payment_intent_id;
  
  // Check if any payment was via Stripe (can auto-refund)
  const hasStripePayment = !!(depositStripePaymentIntentId || balanceStripePaymentIntentId);
  const canAutoRefundDeposit = !!depositStripePaymentIntentId && !manualOverride;
  const canAutoRefundBalance = !!balanceStripePaymentIntentId && !manualOverride;

  // Calculate amounts based on current state (database or override)
  const depositPaidAmount = depositPaid ? depositAmount : 0;
  const balancePaidAmount = balancePaid ? balanceDue : 0;
  const totalPaid = depositPaidAmount + balancePaidAmount;

  // Get refund amount based on selection
  const getRefundAmount = (): number => {
    switch (refundOption) {
      case "none": return 0;
      case "deposit": return depositPaidAmount;
      case "full": return totalPaid;
      case "custom": return parseFloat(customRefundAmount) || 0;
      default: return 0;
    }
  };

  // Determine what can be auto-refunded (only if not using manual override)
  const refundAmountValue = getRefundAmount();
  const canAutoRefundAmount = (() => {
    if (manualOverride) return 0; // Can't auto-refund if using manual override
    if (refundOption === "deposit" && canAutoRefundDeposit) return depositPaidAmount;
    if (refundOption === "full") {
      let autoAmount = 0;
      if (canAutoRefundDeposit) autoAmount += depositPaidAmount;
      if (canAutoRefundBalance) autoAmount += balancePaidAmount;
      return autoAmount;
    }
    return 0;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Please provide a cancellation reason");
      return;
    }

    const refundAmount = getRefundAmount();

    startTransition(async () => {
      const result = await cancelBooking({
        bookingId,
        reason: reason.trim(),
        cancelledBy,
        refundAmount,
        refundStatus: refundAmount > 0 
          ? (processStripeRefund ? "processed" : "pending") 
          : "none",
        refundMethod: refundAmount > 0 ? refundMethod : undefined,
        processStripeRefund: processStripeRefund && canAutoRefundAmount > 0,
        stripePaymentIntentId: processStripeRefund ? depositStripePaymentIntentId || undefined : undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to cancel booking");
      } else {
        router.refresh();
        onClose();
      }
    });
  };

  // Helper to get payment method display name
  const getPaymentMethodDisplay = (method: string | null): string => {
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
  };

  // Reset refund option when payment status changes
  const handleOverrideChange = (type: "deposit" | "balance", checked: boolean) => {
    if (type === "deposit") {
      setOverrideDepositPaid(checked);
    } else {
      setOverrideBalancePaid(checked);
    }
    // Reset refund option when changing what's paid
    setRefundOption("none");
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modalCard} max-h-[90vh] overflow-y-auto`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-neutral-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold">Cancel Booking</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5">
          <div className="space-y-4">
            {/* Cancelled By */}
            <div className="space-y-2">
              <Label className={styles.label}>Who initiated the cancellation?</Label>
              <Select
                value={cancelledBy}
                onValueChange={(v) => setCancelledBy(v as CancelBookingData["cancelledBy"])}
              >
                <SelectTrigger className={styles.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-neutral-900">
                  <SelectItem value="customer">Customer requested</SelectItem>
                  <SelectItem value="business">Business decision</SelectItem>
                  <SelectItem value="weather">Weather / Safety concern</SelectItem>
                  <SelectItem value="no_show">No show / Unreachable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className={styles.label}>Cancellation reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this booking is being cancelled..."
                className={`${styles.input} min-h-[80px]`}
                required
              />
            </div>

            {/* ============================================================
                PAYMENT STATUS
            ============================================================ */}
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-cyan-400" />
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    Payment Status
                  </p>
                </div>
                
                {/* Manual Override Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setManualOverride(!manualOverride);
                    if (!manualOverride) {
                      // When enabling override, start with current database values
                      setOverrideDepositPaid(dbDepositPaid);
                      setOverrideBalancePaid(dbBalancePaid);
                    }
                    setRefundOption("none");
                  }}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors ${
                    manualOverride 
                      ? "bg-amber-500/20 text-amber-300" 
                      : "bg-white/5 text-foreground/50 hover:bg-white/10"
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  {manualOverride ? "Manual Mode" : "Override"}
                </button>
              </div>
              
              {manualOverride && (
                <div className="mb-3 rounded bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300">
                  ⚠️ Manual mode: Check the boxes below to indicate what was actually collected
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                {/* Deposit Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {manualOverride && (
                      <input
                        type="checkbox"
                        checked={overrideDepositPaid}
                        onChange={(e) => handleOverrideChange("deposit", e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-green-500"
                      />
                    )}
                    <span className="text-foreground/70">Deposit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={depositPaid ? "text-green-400" : "text-foreground/40"}>
                      ${depositAmount.toFixed(2)}
                    </span>
                    {depositPaid ? (
                      <span className="flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {manualOverride ? "Collected" : `Paid via ${getPaymentMethodDisplay(depositPaymentMethod)}`}
                        {depositStripePaymentIntentId && !manualOverride && (
                          <Zap className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    ) : (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground/40">
                        Not paid
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Balance Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {manualOverride && (
                      <input
                        type="checkbox"
                        checked={overrideBalancePaid}
                        onChange={(e) => handleOverrideChange("balance", e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-green-500"
                      />
                    )}
                    <span className="text-foreground/70">Balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={balancePaid ? "text-green-400" : "text-foreground/40"}>
                      ${balanceDue.toFixed(2)}
                    </span>
                    {balancePaid ? (
                      <span className="flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {manualOverride ? "Collected" : `Paid via ${getPaymentMethodDisplay(balancePaymentMethod)}`}
                        {balanceStripePaymentIntentId && !manualOverride && (
                          <Zap className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    ) : (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground/40">
                        Not collected
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Total Row */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2 font-medium">
                  <span>Total Collected</span>
                  <span className={totalPaid > 0 ? "text-green-400" : "text-foreground/40"}>
                    ${totalPaid.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Stripe indicator */}
              {hasStripePayment && !manualOverride && (
                <div className="mt-3 flex items-center gap-2 rounded bg-cyan-500/10 px-2 py-1.5 text-xs text-cyan-300">
                  <Zap className="h-3.5 w-3.5" />
                  Stripe payment detected — automatic refund available
                </div>
              )}
            </div>

            {/* ============================================================
                REFUND DECISION (Only if money was collected)
            ============================================================ */}
            {totalPaid > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <Label className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    Refund Decision
                  </Label>
                </div>
                
                <div className="space-y-2">
                  {/* No refund */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                    <input
                      type="radio"
                      name="refund"
                      checked={refundOption === "none"}
                      onChange={() => setRefundOption("none")}
                      className="h-4 w-4 accent-fuchsia-500"
                    />
                    <div>
                      <p className="text-sm font-medium">No refund</p>
                      <p className="text-xs text-foreground/50">
                        Keep all ${totalPaid.toFixed(2)} collected
                      </p>
                    </div>
                  </label>

                  {/* Refund deposit only */}
                  {depositPaid && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                      <input
                        type="radio"
                        name="refund"
                        checked={refundOption === "deposit"}
                        onChange={() => setRefundOption("deposit")}
                        className="h-4 w-4 accent-fuchsia-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Refund deposit only</p>
                        <p className="text-xs text-foreground/50">
                          Refund ${depositAmount.toFixed(2)}
                          {canAutoRefundDeposit && (
                            <span className="ml-1 text-cyan-400">⚡ Auto-refund available</span>
                          )}
                        </p>
                      </div>
                    </label>
                  )}

                  {/* Full refund */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                    <input
                      type="radio"
                      name="refund"
                      checked={refundOption === "full"}
                      onChange={() => setRefundOption("full")}
                      className="h-4 w-4 accent-fuchsia-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Full refund</p>
                      <p className="text-xs text-foreground/50">
                        Refund ${totalPaid.toFixed(2)} (everything collected)
                        {canAutoRefundAmount > 0 && canAutoRefundAmount === totalPaid && (
                          <span className="ml-1 text-cyan-400">⚡ Auto-refund available</span>
                        )}
                      </p>
                    </div>
                  </label>

                  {/* Custom amount */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                    <input
                      type="radio"
                      name="refund"
                      checked={refundOption === "custom"}
                      onChange={() => setRefundOption("custom")}
                      className="mt-1 h-4 w-4 accent-fuchsia-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Custom amount</p>
                      {refundOption === "custom" && (
                        <div className="mt-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={totalPaid}
                              value={customRefundAmount}
                              onChange={(e) => setCustomRefundAmount(e.target.value)}
                              placeholder="0.00"
                              className={`${styles.input} pl-7`}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-foreground/40">
                            Max refund: ${totalPaid.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* ============================================================
                    REFUND METHOD & PROCESSING (Only if refunding)
                ============================================================ */}
                {refundOption !== "none" && refundAmountValue > 0 && (
                  <div className="mt-3 space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                      <DollarSign className="h-4 w-4" />
                      Refund Amount: ${refundAmountValue.toFixed(2)}
                    </div>

                    {/* Auto-refund option (if Stripe payment exists and not manual override) */}
                    {canAutoRefundAmount > 0 && !manualOverride && (
                      <div className="space-y-2">
                        <p className="text-xs text-foreground/50">How should the refund be processed?</p>
                        
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 transition-colors hover:bg-cyan-500/20">
                          <input
                            type="radio"
                            name="refundProcess"
                            checked={processStripeRefund}
                            onChange={() => {
                              setProcessStripeRefund(true);
                              setRefundMethod("stripe");
                            }}
                            className="h-4 w-4 accent-cyan-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-cyan-400" />
                              <p className="text-sm font-medium text-cyan-300">Process via Stripe (automatic)</p>
                            </div>
                            <p className="text-xs text-cyan-300/70">
                              Refund ${Math.min(canAutoRefundAmount, refundAmountValue).toFixed(2)} instantly to customer&apos;s card
                            </p>
                          </div>
                        </label>
                        
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                          <input
                            type="radio"
                            name="refundProcess"
                            checked={!processStripeRefund}
                            onChange={() => setProcessStripeRefund(false)}
                            className="h-4 w-4 accent-fuchsia-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-foreground/60" />
                              <p className="text-sm font-medium">Refund manually</p>
                            </div>
                            <p className="text-xs text-foreground/50">
                              I&apos;ll send the refund via Venmo, Zelle, cash, etc.
                            </p>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Manual refund method selection */}
                    {(manualOverride || !hasStripePayment || !processStripeRefund) && (
                      <div className="space-y-2">
                        <Label className="text-xs text-foreground/50">Refund method</Label>
                        <Select
                          value={refundMethod}
                          onValueChange={(v) => setRefundMethod(v as typeof refundMethod)}
                        >
                          <SelectTrigger className={`${styles.input} h-9`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-neutral-900">
                            <SelectItem value="venmo">Venmo</SelectItem>
                            <SelectItem value="zelle">Zelle</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            {hasStripePayment && !manualOverride && (
                              <SelectItem value="stripe">Stripe</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        
                        <p className="text-[10px] text-foreground/40">
                          Refund will be marked as &quot;Pending&quot; until you confirm it&apos;s sent
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No payment collected message */}
            {totalPaid === 0 && !manualOverride && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center">
                <p className="text-sm text-foreground/50">
                  No payment was collected for this booking.
                </p>
                <p className="text-xs text-foreground/40">
                  Click &quot;Override&quot; above if payment was collected outside the system.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10"
              disabled={isPending}
            >
              Keep Booking
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </div>
        </form>

        <div className={styles.modalCardInner} />
      </div>
    </div>
  );
}

// =============================================================================
// PAYMENT MODAL
// =============================================================================

function PaymentModal({
  bookingId,
  balanceDue,
  depositPaid,
  depositAmount,
  onClose,
}: {
  bookingId: string;
  balanceDue: number;
  depositPaid: boolean;
  depositAmount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(balanceDue.toString());
  const [method, setMethod] = useState<RecordPaymentData["method"]>("cash");
  const [paymentType, setPaymentType] = useState<RecordPaymentData["paymentType"]>(
    depositPaid ? "balance" : "deposit"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    startTransition(async () => {
      const result = await recordPayment({
        bookingId,
        amount: parsedAmount,
        method,
        paymentType,
      });

      if (!result.success) {
        setError(result.error || "Failed to record payment");
      } else {
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Record Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5">
          <div className="space-y-4">
            {/* Payment Type */}
            <div className="space-y-2">
              <Label className={styles.label}>Payment type</Label>
              <Select
                value={paymentType}
                onValueChange={(v) => {
                  setPaymentType(v as RecordPaymentData["paymentType"]);
                  if (v === "deposit") setAmount(depositAmount.toString());
                  if (v === "balance") setAmount(balanceDue.toString());
                  if (v === "full") setAmount((depositAmount + balanceDue).toString());
                }}
              >
                <SelectTrigger className={styles.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-neutral-900">
                  {!depositPaid && (
                    <SelectItem value="deposit">Deposit (${depositAmount})</SelectItem>
                  )}
                  <SelectItem value="balance">Balance (${balanceDue})</SelectItem>
                  {!depositPaid && (
                    <SelectItem value="full">
                      Full payment (${depositAmount + balanceDue})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className={styles.label}>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${styles.input} pl-7`}
                  required
                />
              </div>
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label className={styles.label}>Payment method</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as RecordPaymentData["method"])}
              >
                <SelectTrigger className={styles.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-neutral-900">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card (in person)</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="stripe">Stripe (online)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>

        <div className={styles.modalCardInner} />
      </div>
    </div>
  );
}
