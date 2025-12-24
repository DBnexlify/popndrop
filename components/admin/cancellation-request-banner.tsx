// =============================================================================
// CANCELLATION REQUEST BANNER
// components/admin/cancellation-request-banner.tsx
// Shows prominent alert when a booking has a pending cancellation request
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  XCircle, 
  ChevronRight, 
  Clock,
  DollarSign,
  User,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTimeShort } from '@/lib/timezone';

// =============================================================================
// TYPES
// =============================================================================

interface CancellationRequest {
  id: string;
  status: 'pending' | 'approved' | 'denied' | 'refunded';
  reason: string | null;
  cancellation_type: string;
  days_before_event: number;
  policy_refund_percent: number;
  original_paid: number;
  suggested_refund: number;
  created_at: string;
}

interface CancellationRequestBannerProps {
  bookingId: string;
  bookingNumber: string;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  banner: "relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/50 via-red-900/30 to-red-950/50 shadow-[0_20px_70px_rgba(220,38,38,0.15)] backdrop-blur-xl sm:rounded-3xl",
  bannerInner: "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(239,68,68,0.15),inset_0_0_70px_rgba(0,0,0,0.2)]",
  nestedCard: "relative overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5 sm:rounded-xl",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(239,68,68,0.1),inset_0_0_35px_rgba(0,0,0,0.12)]",
} as const;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CancellationRequestBanner({ 
  bookingId, 
  bookingNumber 
}: CancellationRequestBannerProps) {
  const [request, setRequest] = useState<CancellationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCancellationRequest() {
      try {
        const response = await fetch(`/api/admin/cancellations/check?bookingId=${bookingId}`);
        if (!response.ok) {
          if (response.status === 404) {
            // No cancellation request found - that's fine
            setRequest(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to check cancellation status');
        }
        
        const data = await response.json();
        setRequest(data.request || null);
      } catch (err) {
        console.error('Error fetching cancellation request:', err);
        setError('Failed to check cancellation status');
      } finally {
        setLoading(false);
      }
    }

    fetchCancellationRequest();
  }, [bookingId]);

  // Don't show anything if loading, error, or no request
  if (loading) {
    return null; // Don't show loading state to avoid layout shift
  }

  if (error || !request) {
    return null;
  }

  // Only show for pending requests
  if (request.status !== 'pending') {
    return null;
  }

  const getCancellationTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      customer_request: 'Customer Request',
      weather: 'Weather/Safety',
      emergency: 'Emergency',
      admin_initiated: 'Admin Initiated',
    };
    return labels[type] || type;
  };

  return (
    <div className={styles.banner}>
      <div className="p-4 sm:p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Animated warning icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 sm:h-14 sm:w-14">
            <XCircle className="h-6 w-6 text-red-400 sm:h-7 sm:w-7 animate-pulse" />
          </div>
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-red-300 sm:text-xl">
                Cancellation Requested
              </h2>
              <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-300">
                Action Required
              </span>
            </div>
            
            <p className="mt-1 text-sm text-foreground/70">
              This booking has a pending cancellation request that needs your attention.
            </p>
          </div>
        </div>

        {/* Request Details */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Requested */}
          <div className={styles.nestedCard}>
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <Clock className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                  Requested
                </p>
                <p className="text-sm font-medium text-foreground/90">
                  {formatRelativeTimeShort(request.created_at)}
                </p>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Type */}
          <div className={styles.nestedCard}>
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <User className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                  Type
                </p>
                <p className="text-sm font-medium text-foreground/90">
                  {getCancellationTypeLabel(request.cancellation_type)}
                </p>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Days Notice */}
          <div className={styles.nestedCard}>
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                  Days Notice
                </p>
                <p className={cn(
                  "text-sm font-medium",
                  request.days_before_event <= 2 ? "text-red-400" :
                  request.days_before_event <= 6 ? "text-amber-400" :
                  "text-green-400"
                )}>
                  {request.days_before_event} day{request.days_before_event !== 1 ? 's' : ''} before
                </p>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Suggested Refund */}
          <div className={styles.nestedCard}>
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                  Suggested Refund
                </p>
                <p className="text-sm font-medium text-green-400">
                  ${request.suggested_refund.toFixed(2)}
                </p>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="mt-4">
            <div className={styles.nestedCard}>
              <div className="flex items-start gap-3 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                    Customer&apos;s Reason
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                    &ldquo;{request.reason}&rdquo;
                  </p>
                </div>
              </div>
              <div className={styles.nestedCardInner} />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/50">
            Policy: {request.policy_refund_percent}% refund • ${request.original_paid.toFixed(2)} paid
          </p>
          
          <Link href="/admin/cancellations">
            <Button className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/30 sm:w-auto">
              Process Cancellation
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className={styles.bannerInner} />
    </div>
  );
}
