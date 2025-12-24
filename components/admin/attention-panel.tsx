// =============================================================================
// ATTENTION PANEL COMPONENT
// components/admin/attention-panel.tsx
// Dashboard panel showing bookings that need admin action
// =============================================================================

import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  BellOff,
  ChevronRight,
  Clock,
  DollarSign,
  Package,
  Phone,
  Truck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTimeShort } from '@/lib/timezone';
import type { AttentionItemWithBooking, AttentionType, AttentionPriority } from '@/lib/automation-types';

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

// =============================================================================
// HELPERS
// =============================================================================

function getTypeIcon(type: AttentionType) {
  switch (type) {
    case 'delivery_confirmation':
      return Truck;
    case 'pickup_confirmation':
      return Package;
    case 'payment_collection':
      return DollarSign;
    case 'issue_reported':
      return AlertTriangle;
    case 'booking_closure':
      return CheckCircle2;
    case 'cancellation_request':
      return XCircle;
    default:
      return Bell;
  }
}

function getTypeLabel(type: AttentionType): string {
  switch (type) {
    case 'delivery_confirmation':
      return 'Confirm Delivery';
    case 'pickup_confirmation':
      return 'Confirm Pickup';
    case 'payment_collection':
      return 'Collect Payment';
    case 'booking_closure':
      return 'Complete Booking';
    case 'issue_reported':
      return 'Issue Reported';
    case 'manual_review':
      return 'Review Needed';
    case 'cancellation_request':
      return 'Cancellation Request';
    default:
      return 'Action Needed';
  }
}

function getPriorityColor(priority: AttentionPriority) {
  switch (priority) {
    case 'urgent':
      return {
        badge: 'border-red-500/30 bg-red-500/20 text-red-400',
        icon: 'text-red-400',
        bg: 'bg-red-500/10',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      };
    case 'high':
      return {
        badge: 'border-amber-500/30 bg-amber-500/20 text-amber-400',
        icon: 'text-amber-400',
        bg: 'bg-amber-500/10',
        glow: '',
      };
    case 'medium':
      return {
        badge: 'border-blue-500/30 bg-blue-500/20 text-blue-400',
        icon: 'text-blue-400',
        bg: 'bg-blue-500/10',
        glow: '',
      };
    case 'low':
    default:
      return {
        badge: 'border-slate-500/30 bg-slate-500/20 text-slate-400',
        icon: 'text-slate-400',
        bg: 'bg-slate-500/10',
        glow: '',
      };
  }
}

// =============================================================================
// ATTENTION ITEM ROW
// =============================================================================

function AttentionItemRow({ item }: { item: AttentionItemWithBooking }) {
  const Icon = getTypeIcon(item.attention_type);
  const colors = getPriorityColor(item.priority);
  const customerName = item.booking?.customer?.[0]
    ? `${item.booking.customer[0].first_name} ${item.booking.customer[0].last_name}`
    : 'Unknown';
  const customerPhone = item.booking?.customer?.[0]?.phone || '';
  const productName = item.booking?.product_snapshot?.name || 'Unknown Product';
  const balanceDue = item.booking?.balance_due || 0;
  const isBalancePaid = item.booking?.balance_paid;

  return (
    <Link
      href={`/admin/bookings/${item.booking_id}`}
      className={cn(
        'flex items-start gap-3 p-4 transition-all hover:bg-white/[0.03] sm:p-5',
        item.priority === 'urgent' && 'bg-red-500/[0.03]'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        colors.bg,
        colors.glow
      )}>
        <Icon className={cn('h-5 w-5', colors.icon)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium text-foreground/90">
            {item.booking?.booking_number || 'Unknown'}
          </span>
          <Badge className={cn('text-[10px]', colors.badge)}>
            {item.priority.toUpperCase()}
          </Badge>
          {!isBalancePaid && balanceDue > 0 && (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
              💰 ${balanceDue.toFixed(0)} due
            </Badge>
          )}
        </div>

        {/* Action type */}
        <p className="mt-1 text-sm font-medium text-foreground/80">
          {getTypeLabel(item.attention_type)}
        </p>

        {/* Product & customer */}
        <p className="mt-1 text-xs text-foreground/50">
          {productName}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/60">
          {customerName}
          {customerPhone && (
            <span className="ml-1 flex items-center gap-1 text-cyan-400">
              <Phone className="h-3 w-3" />
              {customerPhone}
            </span>
          )}
        </p>

        {/* Timestamp */}
        <p className="mt-2 flex items-center gap-1 text-[10px] text-foreground/40">
          <Clock className="h-3 w-3" />
          {formatRelativeTimeShort(item.created_at)}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30 self-center" />
    </Link>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function AllCaughtUpState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
        <BellOff className="h-7 w-7 text-green-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground/80">All caught up!</p>
      <p className="mt-1 text-xs text-foreground/50">
        No pending actions right now
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface AttentionPanelProps {
  items: AttentionItemWithBooking[];
  showViewAll?: boolean;
}

export function AttentionPanel({ items, showViewAll = true }: AttentionPanelProps) {
  // Sort by priority (urgent first) then by creation date
  const sortedItems = [...items].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 3;
    const bPriority = priorityOrder[b.priority] ?? 3;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const urgentCount = items.filter(i => i.priority === 'urgent').length;
  const highCount = items.filter(i => i.priority === 'high').length;

  return (
    <section className={cn(
      styles.card,
      urgentCount > 0 && 'border-red-500/30 shadow-[0_14px_50px_rgba(239,68,68,0.1)]'
    )}>
      {/* Header */}
      <div className="border-b border-white/5 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              urgentCount > 0 ? 'bg-red-500/20' : 'bg-amber-500/10'
            )}>
              {urgentCount > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : items.length > 0 ? (
                <Bell className="h-4 w-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold sm:text-base">
                {items.length === 0 ? 'All Caught Up' : 'Attention Needed'}
              </h2>
              <p className="text-xs text-foreground/50">
                {items.length === 0 ? (
                  'No actions required'
                ) : (
                  <>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                    {urgentCount > 0 && (
                      <span className="ml-1 text-red-400">
                        ({urgentCount} urgent)
                      </span>
                    )}
                    {highCount > 0 && urgentCount === 0 && (
                      <span className="ml-1 text-amber-400">
                        ({highCount} high priority)
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          
          {showViewAll && items.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/bookings?filter=needs_action">View All</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-white/5">
        {sortedItems.length === 0 ? (
          <AllCaughtUpState />
        ) : (
          sortedItems.slice(0, 5).map((item) => (
            <AttentionItemRow key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Show more indicator */}
      {sortedItems.length > 5 && (
        <div className="border-t border-white/5 p-3">
          <Link
            href="/admin/bookings?filter=needs_action"
            className="flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            View {sortedItems.length - 5} more
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className={styles.cardInner} />
    </section>
  );
}

// =============================================================================
// COMPACT VERSION FOR SIDEBAR
// =============================================================================

export function AttentionPanelCompact({ items }: { items: AttentionItemWithBooking[] }) {
  const urgentCount = items.filter(i => i.priority === 'urgent').length;
  const highCount = items.filter(i => i.priority === 'high').length;

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-xs text-green-400">All caught up!</span>
      </div>
    );
  }

  return (
    <Link
      href="/admin/bookings?filter=needs_action"
      className={cn(
        'flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-white/5',
        urgentCount > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'
      )}
    >
      <div className="flex items-center gap-2">
        {urgentCount > 0 ? (
          <AlertTriangle className="h-4 w-4 text-red-400" />
        ) : (
          <Bell className="h-4 w-4 text-amber-400" />
        )}
        <span className={cn(
          'text-xs font-medium',
          urgentCount > 0 ? 'text-red-400' : 'text-amber-400'
        )}>
          {items.length} action{items.length !== 1 ? 's' : ''} needed
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-foreground/30" />
    </Link>
  );
}
