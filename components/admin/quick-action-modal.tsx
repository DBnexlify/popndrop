// =============================================================================
// QUICK ACTION MODAL
// components/admin/quick-action-modal.tsx
// Mini-checklist modal for completing booking actions from notifications
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Truck, 
  Package, 
  DollarSign, 
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Loader2,
  Check,
  CreditCard,
  Banknote,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { updateBookingStatus, markBalancePaid } from '@/lib/admin-actions';
import type { 
  AttentionType, 
  SuggestedAction 
} from '@/lib/automation-types';
import type { BookingStatus } from '@/lib/database-types';

// =============================================================================
// TYPES
// =============================================================================

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
  attentionType: AttentionType;
  notificationId: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  balanceDue: number;
  suggestedActions?: SuggestedAction[];
}

// =============================================================================
// QUICK ACTION CONFIGS
// =============================================================================

interface ActionConfig {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  primaryAction: {
    id: string;
    label: string;
    variant: 'primary' | 'secondary' | 'destructive' | 'outline';
    icon?: React.ElementType;
  };
  secondaryActions: Array<{
    id: string;
    label: string;
    variant: 'primary' | 'secondary' | 'destructive' | 'outline';
    icon?: React.ElementType;
  }>;
}

function getModalConfig(type: AttentionType, balanceDue: number): ActionConfig {
  switch (type) {
    case 'delivery_confirmation':
      return {
        icon: Truck,
        iconColor: 'text-cyan-400',
        iconBg: 'bg-cyan-500/20',
        title: 'Confirm Delivery',
        description: 'Was this delivery completed successfully?',
        primaryAction: {
          id: 'mark_delivered',
          label: 'Yes, Delivered',
          variant: 'primary',
          icon: Check,
        },
        secondaryActions: [
          { id: 'delay', label: 'Delayed', variant: 'outline' },
          { id: 'contact', label: 'Contact Customer', variant: 'outline', icon: Phone },
        ],
      };

    case 'pickup_confirmation':
      return {
        icon: Package,
        iconColor: 'text-purple-400',
        iconBg: 'bg-purple-500/20',
        title: 'Confirm Pickup',
        description: balanceDue > 0 
          ? `Confirm pickup and collect $${balanceDue.toFixed(2)} balance`
          : 'Was this pickup completed successfully?',
        primaryAction: {
          id: 'mark_picked_up',
          label: 'Yes, Picked Up',
          variant: 'primary',
          icon: Check,
        },
        secondaryActions: balanceDue > 0 
          ? [
              { id: 'cash_collected', label: 'Cash Collected', variant: 'secondary', icon: Banknote },
              { id: 'card_collected', label: 'Card Payment', variant: 'secondary', icon: CreditCard },
            ]
          : [
              { id: 'contact', label: 'Contact Customer', variant: 'outline', icon: Phone },
            ],
      };

    case 'payment_collection':
      return {
        icon: DollarSign,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-500/20',
        title: 'Collect Payment',
        description: `Collect $${balanceDue.toFixed(2)} balance due`,
        primaryAction: {
          id: 'cash_collected',
          label: 'Cash Collected',
          variant: 'primary',
          icon: Banknote,
        },
        secondaryActions: [
          { id: 'card_collected', label: 'Card Payment', variant: 'secondary', icon: CreditCard },
          { id: 'other_payment', label: 'Other', variant: 'outline', icon: MoreHorizontal },
        ],
      };

    case 'booking_closure':
      return {
        icon: CheckCircle2,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-500/20',
        title: 'Complete Booking',
        description: 'Ready to close this booking?',
        primaryAction: {
          id: 'complete_booking',
          label: 'Complete Booking',
          variant: 'primary',
          icon: Check,
        },
        secondaryActions: [
          { id: 'report_issue', label: 'Report Issue', variant: 'destructive', icon: AlertTriangle },
        ],
      };

    case 'issue_reported':
      return {
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-500/20',
        title: 'Resolve Issue',
        description: 'Has this issue been resolved?',
        primaryAction: {
          id: 'resolve_issue',
          label: 'Mark Resolved',
          variant: 'primary',
          icon: Check,
        },
        secondaryActions: [
          { id: 'escalate', label: 'Escalate', variant: 'destructive' },
          { id: 'contact', label: 'Contact Customer', variant: 'outline', icon: Phone },
        ],
      };

    case 'manual_review':
    default:
      return {
        icon: Clock,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-500/20',
        title: 'Review Needed',
        description: 'Please review this booking',
        primaryAction: {
          id: 'approve',
          label: 'Approve',
          variant: 'primary',
          icon: Check,
        },
        secondaryActions: [
          { id: 'dismiss', label: 'Dismiss', variant: 'outline' },
        ],
      };
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QuickActionModal({
  isOpen,
  onClose,
  onActionComplete,
  attentionType,
  notificationId,
  bookingId,
  bookingNumber,
  customerName,
  customerPhone,
  balanceDue,
}: QuickActionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const config = getModalConfig(attentionType, balanceDue);
  const Icon = config.icon;

  const handleAction = async (actionId: string) => {
    setLoading(actionId);
    setError(null);

    try {
      // Execute the appropriate action
      let success = false;
      
      switch (actionId) {
        case 'mark_delivered': {
          const result = await updateBookingStatus(bookingId, 'delivered' as BookingStatus);
          success = result.success;
          if (!success) throw new Error(result.error);
          break;
        }
        
        case 'mark_picked_up': {
          const result = await updateBookingStatus(bookingId, 'picked_up' as BookingStatus);
          success = result.success;
          if (!success) throw new Error(result.error);
          break;
        }
        
        case 'complete_booking': {
          const result = await updateBookingStatus(bookingId, 'completed' as BookingStatus);
          success = result.success;
          if (!success) throw new Error(result.error);
          break;
        }
        
        case 'cash_collected': {
          const result = await markBalancePaid(bookingId, 'cash', balanceDue);
          success = result.success;
          if (!success) throw new Error(result.error);
          break;
        }
        
        case 'card_collected': {
          const result = await markBalancePaid(bookingId, 'card', balanceDue);
          success = result.success;
          if (!success) throw new Error(result.error);
          break;
        }
        
        case 'other_payment': {
          const result = await markBalancePaid(bookingId, 'other', balanceDue);
          success = result.success;
          if (!success) throw new Error(result.error);
          break;
        }
        
        case 'delay':
        case 'resolve_issue':
        case 'approve':
        case 'dismiss':
          // These just resolve the notification
          success = true;
          break;
        
        case 'contact':
          // Just open phone, don't close modal
          handleCall();
          setLoading(null);
          return;
        
        default:
          success = true;
      }

      // Resolve the notification
      if (success) {
        await fetch('/api/admin/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'resolve', 
            notificationId,
            data: { resolutionAction: actionId },
          }),
        });

        // Callback if provided
        onActionComplete?.();
        
        // Refresh and close
        router.refresh();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setLoading(null);
    }
  };

  const handleCall = () => {
    window.location.href = `tel:${customerPhone.replace(/\D/g, '')}`;
  };

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 top-auto z-50 mx-auto max-w-md sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="relative border-b border-white/10 px-5 py-4">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                config.iconBg
              )}>
                <Icon className={cn("h-6 w-6", config.iconColor)} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{config.title}</h2>
                <p className="text-sm text-foreground/60">{bookingNumber}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            {/* Customer info */}
            <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{customerName}</p>
                  <p className="text-xs text-foreground/50">{customerPhone}</p>
                </div>
                <button
                  onClick={handleCall}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-400 transition-colors hover:bg-fuchsia-500/30"
                >
                  <Phone className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-sm text-foreground/70">
              {config.description}
            </p>

            {/* Balance due highlight */}
            {balanceDue > 0 && attentionType !== 'payment_collection' && (
              <div className="mb-4 rounded-lg bg-amber-500/10 p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-medium text-amber-300">
                    ${balanceDue.toFixed(2)} balance due
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Primary action */}
            <Button
              onClick={() => handleAction(config.primaryAction.id)}
              disabled={loading !== null}
              className="mb-3 w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30"
            >
              {loading === config.primaryAction.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : config.primaryAction.icon ? (
                <config.primaryAction.icon className="mr-2 h-4 w-4" />
              ) : null}
              {config.primaryAction.label}
            </Button>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-2">
              {config.secondaryActions.map((action) => (
                <Button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={loading !== null && action.id !== 'contact'}
                  variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex-1",
                    action.variant === 'outline' && "border-white/10 hover:bg-white/5",
                    action.variant === 'secondary' && "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {loading === action.id ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : action.icon ? (
                    <action.icon className="mr-1.5 h-3 w-3" />
                  ) : null}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Footer hint */}
          <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3">
            <p className="text-center text-[11px] text-foreground/40">
              Tap outside or press Escape to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
