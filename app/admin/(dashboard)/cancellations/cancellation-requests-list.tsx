// =============================================================================
// CANCELLATION REQUESTS LIST - CLIENT COMPONENT
// app/admin/(dashboard)/cancellations/cancellation-requests-list.tsx
// Interactive list with approve/deny functionality
// =============================================================================

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
// STYLES
// =============================================================================

const styles = {
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl",
  cardInner: "pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  input: "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
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

// =============================================================================
// REQUEST CARD COMPONENT
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
  const [customRefund, setCustomRefund] = useState(request.suggested_refund.toString());
  const [adminNotes, setAdminNotes] = useState("");

  const booking = extractBooking(request.booking);
  const customer = extractCustomer(booking?.customer);
  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  const handleAction = async (action: "approve" | "deny" | "refund") => {
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/cancellations/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          action,
          refundAmount: parseFloat(customRefund) || request.suggested_refund,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed");
        setIsProcessing(false);
        return;
      }

      // Refresh the list
      onAction();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn(styles.card, "transition-all")}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">
                #{booking?.booking_number || "Unknown"}
              </p>
              <Badge className={cn("gap-1 border", statusConfig.className)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-foreground/60">
              {booking?.product_snapshot?.name || "Bounce House Rental"}
            </p>
          </div>
          
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

        {/* Summary row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/60">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {booking?.event_date
              ? format(new Date(booking.event_date + "T12:00:00"), "MMM d, yyyy")
              : "N/A"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {request.days_before_event} days before
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            ${request.original_paid.toFixed(2)} paid
          </span>
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
                    {customer?.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {customer?.phone}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {booking?.delivery_address}, {booking?.delivery_city}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Refund Details
                </p>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Amount paid</span>
                    <span>${request.original_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">
                      Policy ({request.policy_refund_percent}%)
                    </span>
                    <span>${request.suggested_refund.toFixed(2)}</span>
                  </div>
                  {request.approved_refund !== null && (
                    <div className="flex justify-between font-medium text-green-400">
                      <span>Approved refund</span>
                      <span>${request.approved_refund.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer reason */}
            {request.reason && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Customer&apos;s Reason
                </p>
                <p className="mt-1 text-sm text-foreground/70">{request.reason}</p>
              </div>
            )}

            {/* Submitted time */}
            <p className="text-xs text-foreground/40">
              Submitted {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>

            {/* Actions for pending requests */}
            {request.status === "pending" && (
              <div className="space-y-3 border-t border-white/5 pt-4">
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
                    Suggested: ${request.suggested_refund.toFixed(2)}
                  </div>
                </div>

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
                <div className="flex gap-2">
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
                        Deny
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
                    ) : (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve & Refund ${customRefund}
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

            {/* Refund info for refunded requests */}
            {request.status === "refunded" && request.stripe_refund_id && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
                <p className="text-sm text-cyan-400">
                  <DollarSign className="mr-1 inline h-4 w-4" />
                  Refund processed: ${request.approved_refund?.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-foreground/50">
                  Stripe Refund ID: {request.stripe_refund_id}
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
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
              statusFilter === tab.value
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white"
                : "bg-white/5 text-foreground/60 hover:bg-white/10 hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            )}
          </button>
        ))}

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
