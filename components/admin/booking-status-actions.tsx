// =============================================================================
// BOOKING STATUS ACTIONS COMPONENT
// components/admin/booking-status-actions.tsx
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateBookingStatus } from '@/lib/admin-actions';
import { getStatusLabel, canTransitionTo } from '@/lib/database-types';
import type { BookingStatus } from '@/lib/database-types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  Loader2,
} from 'lucide-react';

interface BookingStatusActionsProps {
  bookingId: string;
  currentStatus: BookingStatus;
  nextStatus: BookingStatus | null;
}

const statusActions: Record<BookingStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  pending: { icon: CheckCircle2, label: 'Confirm Booking', color: 'bg-blue-500 hover:bg-blue-600' },
  confirmed: { icon: Truck, label: 'Mark Delivered', color: 'bg-cyan-500 hover:bg-cyan-600' },
  delivered: { icon: Package, label: 'Mark Picked Up', color: 'bg-purple-500 hover:bg-purple-600' },
  picked_up: { icon: CheckCircle2, label: 'Complete Booking', color: 'bg-green-500 hover:bg-green-600' },
  completed: { icon: CheckCircle2, label: 'Completed', color: '' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: '' },
};

export function BookingStatusActions({
  bookingId,
  currentStatus,
  nextStatus,
}: BookingStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const handleStatusUpdate = async (newStatus: BookingStatus, notes?: string) => {
    setError(null);
    
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, newStatus, notes);
      
      if (!result.success) {
        setError(result.error || 'Failed to update status');
      } else {
        router.refresh();
      }
    });
  };
  
  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }
    
    await handleStatusUpdate('cancelled', cancelReason);
    setShowCancelDialog(false);
  };
  
  if (!nextStatus && currentStatus !== 'pending') {
    return null;
  }
  
  const action = nextStatus ? statusActions[currentStatus] : null;
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Next status action */}
      {nextStatus && action && (
        <Button
          onClick={() => handleStatusUpdate(nextStatus)}
          disabled={isPending}
          className={`${action.color} text-white`}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <action.icon className="mr-2 h-4 w-4" />
          )}
          {action.label}
        </Button>
      )}
      
      {/* Cancel action */}
      {canTransitionTo(currentStatus, 'cancelled') && (
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Booking
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-white/10 bg-neutral-900">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Please provide a reason for cancellation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <Textarea
              placeholder="Cancellation reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2 border-white/10 bg-white/5"
            />
            
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10">
                Keep Booking
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isPending}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Cancel Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {error && !showCancelDialog && (
        <p className="w-full text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
