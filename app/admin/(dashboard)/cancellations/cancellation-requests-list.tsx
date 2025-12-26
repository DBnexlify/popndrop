// =============================================================================
// CANCELLATION REQUESTS LIST - CLIENT COMPONENT
// app/admin/(dashboard)/cancellations/cancellation-requests-list.tsx
// Interactive list with approve/deny functionality, refund method selection,
// and override options
// =============================================================================

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ClientStatusFilterPills } from "@/components/admin/status-filter-pills";
import { cn } from "@/lib/utils";
import { formatEventDateShort, formatTimestamp } from "@/lib/timezone";
import {
  AlertTriangle,
  Check,
  X,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Ban,
  ExternalLink,
  Zap,
  Banknote,
  CreditCard,
  CloudRain,
  Heart,
  AlertCircle,
  Info,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CancellationRequest {
  id: string;
  booking_id: string;
  status: "pending" | "approved" | "denied" | "refunded";
  reason: string | null;
  cancellation_type: string;
  days_before_event: number;
  policy_refund_percent: number;
  original_paid: number;
  suggested_refund: number;
  approved_refund: number | null;
  processing_fee: number;
  admin_notes: string | null;
  reviewed_at: string | null;
  stripe_refund_id: string | null;
  refund_processed_at: string | null;
  refund_method: string | null;
  created_at: string;
  booking: {
    id: string;
    booking_number: string;
    event_date: string;
    status: string;
    product_snapshot: { name: string } | null;
    stripe_payment_intent_id: string | null;
    delivery_address: string;
    delivery_city: string;
    customer: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    } | {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    }[];
  } | {
    id: string;
    booking_number: string;
    event_date: string;
    status: string;
    product_snapshot: { name: string } | null;
    stripe_payment_intent_id: string | null;
    delivery_address: string;
    delivery_city: string;
    customer: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    } | {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    }[];
  }[];
}

interface CancellationRequestsListProps {
  initialRequests: CancellationRequest[];
  counts: {
    pending: number;
    approved: number;
    refunded: number;
    denied: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const OVERRIDE_REASONS = [
  { value: "none", label: "No override (use policy)", icon: null },
  { value: "weather", label: "Weather / Safety concern", icon: CloudRain },
  { value: "emergency", label: "Family emergency", icon: Heart },
  { value: "our_fault", label: "Our scheduling conflict", icon: AlertCircle },
  { value: "goodwill", label: "Customer goodwill", icon: Heart },
  { value: "other", label: "Other (explain in notes)", icon: Info },
] as const;

const REFUND_METHODS = [
  { value: "stripe", label: "Refund to card (automatic)", icon: Zap, description: "Instant refund to customer's original payment" },
  { value: "venmo", label: "Venmo (manual)", icon: Banknote, description: "You'll send via Venmo" },
  { value: "zelle", label: "Zelle (manual)", icon: Banknote, description: "You'll send via Zelle" },
  { value: "cash", label: "Cash (manual)", icon: DollarSign, description: "In-person cash refund" },
  { value: "check", label: "Check (manual)", icon: CreditCard, description: "Mail a check" },
] as const;

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl",
  cardInner: "pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  input: "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStatusConfig(status: string) {
  const configs = {
    pending: {
      label: "Pending Review",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      className: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: Check,
    },
    refunded: {
      label: "Refunded",
      className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      icon: DollarSign,
    },
    denied: {
      label: "Denied",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: X,
    },
  };
  return configs[status as keyof typeof configs] || configs.pending;
}

function extractBooking(booking: CancellationRequest["booking"]) {
  return Array.isArray(booking) ? booking[0] : booking;
}

function extractCustomer(customer: any) {
  return Array.isArray(customer) ? customer[0] : customer;
}

function getPolicyTierLabel(daysBeforeEvent: number): string {
  if (daysBeforeEvent >= 2) return "48+ hours (full refund minus deposit)";
  if (daysBeforeEvent >= 1) return "24-48 hours (50% refund minus deposit)";
  return "Less than 24 hours (no refund)";
}

function getPolicyTierColor(daysBeforeEvent: number): string {
  if (daysBeforeEvent >= 2) return "text-green-400";
  if (daysBeforeEvent >= 1) return "text-amber-400";
  return "text-red-400";
}

// =============================================================================
// REQUEST CARD COMPONENT - Enhanced with refund method selection
// =============================================================================

function RequestCard({
  request,
  onAction,
}: {
  request: CancellationRequest;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(request.status === "pending");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refund settings
  const [overrideReason, setOverrideReason] = useState<string>("none");
  const [customRefund, setCustomRefund] = useState(request.suggested_refund.toString());
  const [refundMethod, setRefundMethod] = useState<string>("stripe");
  const [adminNotes, setAdminNotes] = useState("");
  const [includeDeposit, setIncludeDeposit] = useState(false);

  const booking = extractBooking(request.booking);
  const customer = extractCustomer(booking?.customer);
  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  // Determine if Stripe refund is available
  const hasStripePayment = !!booking?.stripe_payment_intent_id;
  
  // Calculate refund amounts based on override
  const suggestedRefund = request.suggested_refund;
  const depositAmount = 50; // Standard deposit
  const fullRefundMinusDeposit = request.original_paid - depositAmount;
  const fullRefundWithDeposit = request.original_paid;
  
  // Get the active refund amount based on override
  const getActiveRefundAmount = (): number => {
    if (overrideReason === "weather") {
      return fullRefundWithDeposit; // Weather = full refund including deposit
    }
    if (overrideReason !== "none") {
      // Other overrides: include deposit if selected
      return includeDeposit ? fullRefundWithDeposit : fullRefundMinusDeposit;
    }
    // Standard policy
    return suggestedRefund;
  };

  // Update custom refund when override changes
  const handleOverrideChange = (value: string) => {
    setOverrideReason(value);
    if (value === "weather") {
      setCustomRefund(fullRefundWithDeposit.toString());
      setIncludeDeposit(true);
    } else if (value !== "none") {
      setCustomRefund(fullRefundMinusDeposit.toString());
      setIncludeDeposit(false);
    } else {
      setCustomRefund(suggestedRefund.toString());
      setIncludeDeposit(false);
    }
  };

  const handleAction = async (action: "approve" | "deny") => {
    setIsProcessing(true);
    setError(null);

    try {
      const finalRefundAmount = parseFloat(customRefund) || 0;
      const isManualRefund = refundMethod !== "stripe";
      
      const res = await fetch("/api/cancellations/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          action,
          refundAmount: action === "approve" ? finalRefundAmount : 0,
          refundMethod: action === "approve" && finalRefundAmount > 0 ? refundMethod : undefined,
          overrideReason: action === "approve" && overrideReason !== "none" ? overrideReason : undefined,
          adminNotes: adminNotes.trim() || undefined,
          processStripeRefund: action === "approve" && refundMethod === "stripe" && hasStripePayment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed");
        setIsProcessing(false);
        return;
      }

      // Success! Stop spinner first, then refresh the list
      setIsProcessing(false);
      onAction();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn(
      styles.card, 
      "transition-all",
      request.status === "pending" && "border-amber-500/30"
    )}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link 
                href={`/admin/bookings/${booking?.id}`}
                className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                #{booking?.booking_number || "Unknown"}
              </Link>
              <Badge className={cn("gap-1 border", statusConfig.className)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              {request.status === "pending" && (
                <span className="inline-flex animate-pulse items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                  🔔 Action needed
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground/60">
              {booking?.product_snapshot?.name || "Bounce House Rental"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/bookings/${booking?.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-foreground/60 transition-colors hover:bg-white/10"
              title="View booking"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-foreground/60 transition-colors hover:bg-white/10"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/60">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {booking?.event_date
              ? formatEventDateShort(booking.event_date)
              : "N/A"}
          </span>
          <span className={cn("flex items-center gap-1", getPolicyTierColor(request.days_before_event))}>
            <Clock className="h-3.5 w-3.5" />
            {request.days_before_event} days before
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            ${request.original_paid.toFixed(2)} paid
          </span>
          {hasStripePayment && (
            <span className="flex items-center gap-1 text-cyan-400">
              <Zap className="h-3.5 w-3.5" />
              Card payment
            </span>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
            {/* Customer info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Customer
                </p>
                <p className="mt-1 font-medium">
                  {customer?.first_name} {customer?.last_name}
                </p>
                <div className="mt-1 space-y-0.5 text-sm text-foreground/60">
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${customer?.email}`} className="text-cyan-400 hover:text-cyan-300">
                      {customer?.email}
                    </a>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <a href={`tel:${customer?.phone}`} className="text-cyan-400 hover:text-cyan-300">
                      {customer?.phone}
                    </a>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {booking?.delivery_address}, {booking?.delivery_city}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Policy Calculation
                </p>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Amount paid</span>
                    <span>${request.original_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn("text-foreground/60", getPolicyTierColor(request.days_before_event))}>
                      Policy tier
                    </span>
                    <span className={cn("text-xs", getPolicyTierColor(request.days_before_event))}>
                      {request.policy_refund_percent}% refund
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1">
                    <span className="text-foreground/60">Suggested refund</span>
                    <span className="font-medium text-green-400">
                      ${request.suggested_refund.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer reason */}
            {request.reason && (
              <div className={styles.nestedCard}>
                <div className="p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    Customer&apos;s Reason
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                    &ldquo;{request.reason}&rdquo;
                  </p>
                </div>
                <div className={styles.nestedCardInner} />
              </div>
            )}

            {/* Submitted time */}
            <p className="text-xs text-foreground/40">
              Submitted {formatTimestamp(request.created_at)}
            </p>

            {/* Actions for pending requests */}
            {request.status === "pending" && (
              <div className="space-y-4 border-t border-white/5 pt-4">
                {/* Policy tier info */}
                <div className={cn(
                  "rounded-lg p-3",
                  request.days_before_event >= 2 ? "bg-green-500/10 border border-green-500/20" :
                  request.days_before_event >= 1 ? "bg-amber-500/10 border border-amber-500/20" :
                  "bg-red-500/10 border border-red-500/20"
                )}>
                  <p className={cn(
                    "text-sm font-medium",
                    getPolicyTierColor(request.days_before_event)
                  )}>
                    📋 {getPolicyTierLabel(request.days_before_event)}
                  </p>
                </div>

                {/* Override reason */}
                <div className="space-y-2">
                  <Label className="text-xs">Override Policy?</Label>
                  <Select value={overrideReason} onValueChange={handleOverrideChange}>
                    <SelectTrigger className={styles.input}>
                      <SelectValue placeholder="Select override reason..." />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-neutral-900">
                      {OVERRIDE_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          <span className="flex items-center gap-2">
                            {reason.icon && <reason.icon className="h-4 w-4" />}
                            {reason.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Weather override notice */}
                  {overrideReason === "weather" && (
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2">
                      <p className="text-xs text-cyan-300">
                        <CloudRain className="mr-1 inline h-3.5 w-3.5" />
                        Weather cancellation: Full refund <strong>including $50 deposit</strong>
                      </p>
                    </div>
                  )}
                  
                  {/* Include deposit checkbox for other overrides */}
                  {overrideReason !== "none" && overrideReason !== "weather" && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDeposit}
                        onChange={(e) => {
                          setIncludeDeposit(e.target.checked);
                          const newAmount = e.target.checked 
                            ? fullRefundWithDeposit 
                            : fullRefundMinusDeposit;
                          setCustomRefund(newAmount.toString());
                        }}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-green-500"
                      />
                      <span className="text-sm text-foreground/70">
                        Include $50 deposit in refund (total: ${fullRefundWithDeposit.toFixed(2)})
                      </span>
                    </label>
                  )}
                </div>

                {/* Custom refund amount */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`refund-${request.id}`} className="text-xs">
                      Refund Amount
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50">
                        $
                      </span>
                      <Input
                        id={`refund-${request.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={request.original_paid}
                        value={customRefund}
                        onChange={(e) => setCustomRefund(e.target.value)}
                        className={cn(styles.input, "pl-7")}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-foreground/50">
                    Max: ${request.original_paid.toFixed(2)}
                  </div>
                </div>

                {/* Refund method selection */}
                {parseFloat(customRefund) > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">How will the refund be sent?</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {REFUND_METHODS.map((method) => {
                        const disabled = method.value === "stripe" && !hasStripePayment;
                        return (
                          <label
                            key={method.value}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
                              refundMethod === method.value
                                ? method.value === "stripe"
                                  ? "border-cyan-500/50 bg-cyan-500/10"
                                  : "border-green-500/50 bg-green-500/10"
                                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
                              disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <input
                              type="radio"
                              name={`refund-method-${request.id}`}
                              value={method.value}
                              checked={refundMethod === method.value}
                              onChange={(e) => setRefundMethod(e.target.value)}
                              disabled={disabled}
                              className="mt-0.5 h-4 w-4 accent-cyan-500"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <method.icon className={cn(
                                  "h-4 w-4",
                                  method.value === "stripe" ? "text-cyan-400" : "text-green-400"
                                )} />
                                <span className="text-sm font-medium">{method.label}</span>
                              </div>
                              <p className="text-xs text-foreground/50">{method.description}</p>
                              {method.value === "stripe" && !hasStripePayment && (
                                <p className="mt-1 text-xs text-amber-400">
                                  No card payment found
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    
                    {/* Manual refund notice */}
                    {refundMethod !== "stripe" && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
                        <p className="text-xs text-amber-300">
                          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                          You&apos;ll need to send the refund via {refundMethod.charAt(0).toUpperCase() + refundMethod.slice(1)} manually. 
                          The system will mark it as &quot;Refund Pending&quot; until you confirm.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <Label htmlFor={`notes-${request.id}`} className="text-xs">
                    Admin Notes (optional)
                  </Label>
                  <Textarea
                    id={`notes-${request.id}`}
                    placeholder="Internal notes about this decision..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className={cn(styles.input, "mt-1 min-h-[60px]")}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-2">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => handleAction("deny")}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1.5 h-4 w-4" />
                        Deny Request
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleAction("approve")}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : parseFloat(customRefund) > 0 ? (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve & Refund ${parseFloat(customRefund).toFixed(2)}
                      </>
                    ) : (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve (No Refund)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Admin notes for processed requests */}
            {request.admin_notes && request.status !== "pending" && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Admin Notes
                </p>
                <p className="mt-1 text-sm text-foreground/70">{request.admin_notes}</p>
              </div>
            )}

            {/* Refund info for processed requests */}
            {request.status === "refunded" && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
                <p className="text-sm text-cyan-400">
                  <DollarSign className="mr-1 inline h-4 w-4" />
                  Refund processed: ${request.approved_refund?.toFixed(2)}
                </p>
                {request.stripe_refund_id && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Stripe Refund ID: {request.stripe_refund_id}
                  </p>
                )}
                {request.refund_method && request.refund_method !== "stripe" && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Method: {request.refund_method.charAt(0).toUpperCase() + request.refund_method.slice(1)}
                  </p>
                )}
                {request.refund_processed_at && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Processed: {formatTimestamp(request.refund_processed_at)}
                  </p>
                )}
              </div>
            )}

            {/* Approved but not yet refunded */}
            {request.status === "approved" && request.approved_refund && request.approved_refund > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
                <p className="text-sm text-amber-400">
                  <RefreshCw className="mr-1 inline h-4 w-4" />
                  Refund pending: ${request.approved_refund.toFixed(2)}
                </p>
                {request.refund_method && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Method: {request.refund_method.charAt(0).toUpperCase() + request.refund_method.slice(1)}
                  </p>
                )}
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
// MAIN COMPONENT
// =============================================================================

export function CancellationRequestsList({
  initialRequests,
  counts,
}: CancellationRequestsListProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/cancellations/review?status=all");
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusTabs = [
    { value: "all", label: "All", count: requests.length },
    { value: "pending", label: "Pending", count: counts.pending },
    { value: "approved", label: "Approved", count: counts.approved },
    { value: "refunded", label: "Refunded", count: counts.refunded },
    { value: "denied", label: "Denied", count: counts.denied },
  ];

  return (
    <div className="space-y-4">
      {/* Pending alert */}
      {counts.pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-amber-300">
              {counts.pending} cancellation request{counts.pending !== 1 ? "s" : ""} need{counts.pending === 1 ? "s" : ""} your attention
            </p>
            <p className="text-sm text-amber-400/70">
              Review and process to keep customers informed
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs - using shared component */}
      <div className="flex flex-wrap items-center gap-2">
        <ClientStatusFilterPills
          options={statusTabs}
          activeValue={statusFilter}
          onChange={setStatusFilter}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-auto text-foreground/60 hover:text-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Requests list */}
      {filteredRequests.length === 0 ? (
        <div className={cn(styles.card, "p-8 text-center")}>
          <Ban className="mx-auto h-12 w-12 text-foreground/30" />
          <p className="mt-4 text-foreground/60">
            {statusFilter === "all"
              ? "No cancellation requests yet"
              : `No ${statusFilter} requests`}
          </p>
          <div className={styles.cardInner} />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onAction={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
