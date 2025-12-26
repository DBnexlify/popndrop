// =============================================================================
// NOTIFICATION BELL WITH DROPDOWN
// components/admin/notification-bell.tsx
// Bell icon with badge count, Apple-like ring animation, and dropdown panel
// =============================================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  BellRing,
  X, 
  Clock, 
  Truck, 
  Package, 
  DollarSign, 
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  BellOff,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTimeShort } from '@/lib/timezone';
import { playNewBookingSound } from '@/lib/admin-sounds';
import type { 
  NotificationItem, 
  NotificationCounts, 
  AttentionType,
  AttentionPriority,
} from '@/lib/automation-types';

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const POLL_INTERVAL = 30000; // 30 seconds
const RING_ANIMATION_INTERVAL = 4000; // Ring animation every 4 seconds

function getNotificationIcon(type: AttentionType) {
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

function getPriorityStyles(priority: AttentionPriority) {
  switch (priority) {
    case 'urgent':
      return {
        badge: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: 'text-red-400',
        ring: 'ring-red-500/30',
      };
    case 'high':
      return {
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: 'text-amber-400',
        ring: 'ring-amber-500/30',
      };
    case 'medium':
      return {
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: 'text-blue-400',
        ring: 'ring-blue-500/30',
      };
    case 'low':
    default:
      return {
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        icon: 'text-slate-400',
        ring: 'ring-slate-500/30',
      };
  }
}

function getActionLabel(type: AttentionType): string {
  switch (type) {
    case 'delivery_confirmation':
      return 'Confirm delivery';
    case 'pickup_confirmation':
      return 'Confirm pickup';
    case 'payment_collection':
      return 'Collect payment';
    case 'booking_closure':
      return 'Complete booking';
    case 'issue_reported':
      return 'Resolve issue';
    case 'manual_review':
      return 'Review needed';
    case 'cancellation_request':
      return 'Review cancellation';
    default:
      return 'Take action';
  }
}

/**
 * Get the appropriate link destination for a notification
 * Cancellation requests link to cancellations page, others to booking
 */
function getNotificationLink(notification: NotificationItem): string {
  if (notification.attention_type === 'cancellation_request') {
    return `/admin/cancellations`;
  }
  return `/admin/bookings/${notification.booking_id}`;
}

// =============================================================================
// NOTIFICATION CARD COMPONENT
// =============================================================================

function NotificationCard({
  notification,
  onSnooze,
  onDismiss,
  onClose,
}: {
  notification: NotificationItem;
  onSnooze: (id: string, duration: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const Icon = getNotificationIcon(notification.attention_type);
  const styles = getPriorityStyles(notification.priority);
  const isUnread = !notification.viewed_at;
  const isCancellation = notification.attention_type === 'cancellation_request';

  return (
    <div 
      className={cn(
        "relative rounded-xl border bg-white/[0.03] p-3 transition-all",
        isUnread 
          ? "border-white/10 bg-white/[0.05]" 
          : "border-white/5",
        isCancellation && isUnread && "border-red-500/30 bg-red-500/5"
      )}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-xl",
          isCancellation 
            ? "bg-gradient-to-b from-red-500 to-red-600" 
            : "bg-gradient-to-b from-fuchsia-500 to-purple-500"
        )} />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          isCancellation ? "bg-red-500/20" : styles.badge
        )}>
          <Icon className={cn("h-4 w-4", isCancellation ? "text-red-400" : styles.icon)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={cn(
                "truncate text-sm font-medium",
                isCancellation ? "text-red-300" : "text-foreground/90"
              )}>
                {notification.booking_number}
              </p>
              <p className="truncate text-xs text-foreground/50">
                {notification.customer_name} • {notification.product_name}
              </p>
            </div>
            
            {/* Priority badge */}
            {(notification.priority === 'urgent' || notification.priority === 'high') && (
              <span className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase",
                styles.badge
              )}>
                {notification.priority}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
            {notification.title}
          </p>

          {/* Balance due indicator */}
          {notification.balance_due > 0 && !isCancellation && (
            <p className="mt-1 text-xs font-medium text-amber-400">
              💰 ${notification.balance_due.toFixed(2)} balance due
            </p>
          )}

          {/* Cancellation-specific indicator */}
          {isCancellation && (
            <p className="mt-1 text-xs font-medium text-red-400">
              🚨 Customer wants to cancel — action required
            </p>
          )}

          {/* Actions row */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* View booking link - now uses correct destination */}
              <Link
                href={getNotificationLink(notification)}
                onClick={onClose}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  isCancellation
                    ? "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 hover:from-red-500/30 hover:to-red-600/30"
                    : "bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 text-fuchsia-300 hover:from-fuchsia-500/30 hover:to-purple-500/30"
                )}
              >
                {getActionLabel(notification.attention_type)}
                <ChevronRight className="h-3 w-3" />
              </Link>

              {/* Snooze dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground/70"
                >
                  <Clock className="h-3 w-3" />
                  Snooze
                </button>

                {showSnoozeMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowSnoozeMenu(false)} 
                    />
                    <div className="absolute bottom-full left-0 z-20 mb-1 w-32 rounded-lg border border-white/10 bg-neutral-900 py-1 shadow-xl">
                      {[
                        { label: '1 hour', value: '1 hour' },
                        { label: '4 hours', value: '4 hours' },
                        { label: 'Tomorrow', value: '1 day' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onSnooze(notification.id, option.value);
                            setShowSnoozeMenu(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Timestamp & dismiss */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-foreground/40">
                {formatRelativeTimeShort(notification.created_at)}
              </span>
              <button
                onClick={() => onDismiss(notification.id)}
                className="rounded p-1 text-foreground/30 transition-colors hover:bg-white/5 hover:text-foreground/50"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DROPDOWN CONTENT COMPONENT
// =============================================================================

function DropdownContent({
  notifications,
  counts,
  loading,
  error,
  onRefresh,
  onSnooze,
  onDismiss,
  onClose,
}: {
  notifications: NotificationItem[];
  counts: NotificationCounts;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSnooze: (id: string, duration: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  // Sort notifications with cancellations first
  const sortedNotifications = [...notifications].sort((a, b) => {
    // Cancellations first
    if (a.attention_type === 'cancellation_request' && b.attention_type !== 'cancellation_request') return -1;
    if (a.attention_type !== 'cancellation_request' && b.attention_type === 'cancellation_request') return 1;
    // Then by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });

  const cancellationCount = notifications.filter(n => n.attention_type === 'cancellation_request').length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {counts.total > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-foreground/60">
              {counts.total}
            </span>
          )}
          {cancellationCount > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              {cancellationCount} cancel
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg p-1.5 text-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground/70 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto overscroll-contain p-3">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="mb-2 h-6 w-6 text-amber-400" />
            <p className="text-sm text-foreground/60">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 text-xs text-fuchsia-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-green-500/10 p-3">
              <BellOff className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-sm font-medium text-foreground/80">All caught up!</p>
            <p className="mt-1 text-xs text-foreground/50">
              No pending actions right now
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onSnooze={onSnooze}
                onDismiss={onDismiss}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-white/10 p-3">
          <Link
            href="/admin/bookings?filter=needs_action"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            View all actions
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </>
  );
}

// =============================================================================
// MAIN NOTIFICATION BELL COMPONENT - WITH APPLE-LIKE RING ANIMATION
// =============================================================================

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    unviewed: 0,
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevCountRef = useRef<number>(0); // Track previous count to detect new notifications

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/notifications?limit=10');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setCounts(data.counts || { total: 0, unviewed: 0, urgent: 0, high: 0, medium: 0, low: 0 });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch counts only (lighter weight for polling)
  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications?counts=true');
      if (!response.ok) return;
      
      const data = await response.json();
      setCounts(data.counts || { total: 0, unviewed: 0, urgent: 0, high: 0, medium: 0, low: 0 });
    } catch (err) {
      // Silent fail for count polling
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Play sound when new notifications arrive (count increases)
  useEffect(() => {
    // Only play sound if count increased (not on initial load when prevCount is 0)
    if (counts.total > prevCountRef.current && prevCountRef.current > 0) {
      playNewBookingSound();
    }
    // Update ref for next comparison
    prevCountRef.current = counts.total;
  }, [counts.total]);

  // Ring animation when there are notifications
  useEffect(() => {
    if (counts.total > 0 && !isOpen) {
      // Start ring animation interval
      const triggerRing = () => {
        setIsRinging(true);
        setTimeout(() => setIsRinging(false), 800); // Animation duration
      };

      // Initial ring
      triggerRing();

      // Repeat every RING_ANIMATION_INTERVAL
      ringIntervalRef.current = setInterval(triggerRing, RING_ANIMATION_INTERVAL);

      return () => {
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
        }
      };
    } else {
      // Clear interval when no notifications or dropdown is open
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      setIsRinging(false);
    }
  }, [counts.total, isOpen]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  // Mark as viewed when opening dropdown
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      const unviewed = notifications.filter(n => !n.viewed_at);
      unviewed.forEach(n => {
        fetch('/api/admin/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_viewed', notificationId: n.id }),
        }).catch(() => {});
      });
    }
  }, [isOpen, notifications]);

  // Handle snooze
  const handleSnooze = async (id: string, duration: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'snooze', notificationId: id, data: { duration } }),
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setCounts(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      console.error('Error snoozing notification:', err);
    }
  };

  // Handle dismiss
  const handleDismiss = async (id: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', notificationId: id }),
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setCounts(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const handleClose = () => setIsOpen(false);

  // Badge count
  const badgeCount = counts.urgent > 0 ? counts.urgent : counts.total;
  const hasUrgent = counts.urgent > 0;
  const hasCancellation = notifications.some(n => n.attention_type === 'cancellation_request');

  // Show placeholder until mounted
  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center">
        <Bell className="h-5 w-5 text-foreground/50" />
      </div>
    );
  }

  return (
    <>
      {/* Bell Button Container - position:relative for badge positioning */}
      <div className="relative">
        {/* Bell Button */}
        <button
          ref={bellRef}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full transition-all",
            isOpen 
              ? "bg-white/10" 
              : "hover:bg-white/5"
          )}
          aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount})` : ''}`}
        >
          {/* Bell Icon with animation */}
          <div 
            className={cn(
              "origin-top transition-transform",
              isRinging && "animate-bell-ring"
            )}
          >
            {hasUrgent || hasCancellation ? (
              <BellRing className={cn(
                "h-5 w-5",
                hasCancellation ? "text-red-400" : "text-amber-400"
              )} />
            ) : (
              <Bell className={cn(
                "h-5 w-5",
                counts.total > 0 ? "text-foreground/80" : "text-foreground/50"
              )} />
            )}
          </div>

          {/* Pulsate glow effect when ringing */}
          {isRinging && counts.total > 0 && (
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-30",
              hasCancellation ? "bg-red-400" : hasUrgent ? "bg-amber-400" : "bg-fuchsia-400"
            )} />
          )}
        </button>

        {/* Badge - positioned outside bell animation, won't move */}
        {badgeCount > 0 && (
          <span className={cn(
            "absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold pointer-events-none",
            hasCancellation
              ? "bg-red-500 text-white"
              : hasUrgent 
                ? "bg-red-500 text-white" 
                : "bg-fuchsia-500 text-white"
          )}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>

      {/* CSS Keyframes for bell ring animation */}
      <style jsx global>{`
        @keyframes bell-ring {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-12deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-8deg); }
          50% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          70% { transform: rotate(2deg); }
          80% { transform: rotate(-1deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-bell-ring {
          animation: bell-ring 0.8s ease-in-out;
        }
      `}</style>

      {/* Portal-based dropdown - renders at document body level to escape any overflow:hidden containers */}
      {isOpen && mounted && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Desktop: Centered modal */}
          <div className="fixed inset-0 z-[101] hidden items-center justify-center p-4 lg:flex">
            <div 
              className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownContent
                notifications={notifications}
                counts={counts}
                loading={loading}
                error={error}
                onRefresh={() => fetchNotifications(true)}
                onSnooze={handleSnooze}
                onDismiss={handleDismiss}
                onClose={handleClose}
              />
            </div>
          </div>

          {/* Mobile: Bottom sheet */}
          <div 
            className="fixed inset-x-0 bottom-0 z-[101] lg:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-t-2xl border-t border-white/10 bg-neutral-900 shadow-2xl animate-in slide-in-from-bottom duration-200">
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              
              <DropdownContent
                notifications={notifications}
                counts={counts}
                loading={loading}
                error={error}
                onRefresh={() => fetchNotifications(true)}
                onSnooze={handleSnooze}
                onDismiss={handleDismiss}
                onClose={handleClose}
              />
              
              {/* Safe area padding for iPhone home indicator */}
              <div className="h-[env(safe-area-inset-bottom,8px)]" />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// =============================================================================
// EXPORT BADGE COUNT HOOK (for other components)
// =============================================================================

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch('/api/admin/notifications?counts=true');
        if (response.ok) {
          const data = await response.json();
          setCount(data.counts?.total || 0);
        }
      } catch {
        // Silent fail
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return count;
}
