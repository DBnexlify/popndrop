'use client';

// =============================================================================
// UNIT ACTIONS CLIENT COMPONENT
// app/admin/(dashboard)/inventory/[productId]/unit-actions.tsx
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Unit, UnitStatus } from '@/lib/database-types';
import { updateUnitStatus } from '@/lib/admin-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Check,
  Wrench,
  XCircle,
  Loader2,
} from 'lucide-react';

interface UnitActionsProps {
  unit: Unit;
}

export function UnitActions({ unit }: UnitActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<UnitStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  
  function openStatusDialog(status: UnitStatus) {
    setTargetStatus(status);
    setNotes(unit.status_notes || '');
    setError('');
    setDialogOpen(true);
  }
  
  async function handleStatusChange() {
    if (!targetStatus) return;
    
    setError('');
    startTransition(async () => {
      const result = await updateUnitStatus(unit.id, targetStatus, notes || undefined);
      if (result.success) {
        setDialogOpen(false);
        setTargetStatus(null);
        setNotes('');
        router.refresh();
      } else {
        setError(result.error || 'Failed to update status');
      }
    });
  }
  
  function getStatusInfo(status: UnitStatus) {
    switch (status) {
      case 'available':
        return {
          icon: Check,
          label: 'Mark Available',
          description: 'Unit is ready for booking',
          color: 'text-green-400',
        };
      case 'maintenance':
        return {
          icon: Wrench,
          label: 'Mark Maintenance',
          description: 'Unit needs repair or cleaning',
          color: 'text-amber-400',
        };
      case 'retired':
        return {
          icon: XCircle,
          label: 'Mark Retired',
          description: 'Unit is no longer in service',
          color: 'text-red-400',
        };
    }
  }
  
  const statusInfo = targetStatus ? getStatusInfo(targetStatus) : null;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 border-white/10 bg-neutral-900/95 backdrop-blur-xl">
          {unit.status !== 'available' && (
            <DropdownMenuItem
              onClick={() => openStatusDialog('available')}
              className="gap-2 text-green-400 focus:bg-green-500/10 focus:text-green-400"
            >
              <Check className="h-4 w-4" />
              Mark Available
            </DropdownMenuItem>
          )}
          
          {unit.status !== 'maintenance' && (
            <DropdownMenuItem
              onClick={() => openStatusDialog('maintenance')}
              className="gap-2 text-amber-400 focus:bg-amber-500/10 focus:text-amber-400"
            >
              <Wrench className="h-4 w-4" />
              Mark Maintenance
            </DropdownMenuItem>
          )}
          
          {unit.status !== 'retired' && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => openStatusDialog('retired')}
                className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <XCircle className="h-4 w-4" />
                Retire Unit
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Status Change Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusInfo && (
                <>
                  <statusInfo.icon className={`h-5 w-5 ${statusInfo.color}`} />
                  {statusInfo.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {statusInfo?.description}
              {targetStatus === 'retired' && (
                <span className="mt-2 block text-red-400">
                  Warning: Retired units cannot be booked.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes" className="text-sm text-foreground/70">
                Notes {targetStatus === 'maintenance' && <span className="text-foreground/50">(recommended)</span>}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  targetStatus === 'maintenance'
                    ? 'What needs to be fixed or cleaned?'
                    : targetStatus === 'retired'
                    ? 'Reason for retirement...'
                    : 'Add notes (optional)...'
                }
                className="mt-1.5 min-h-[80px] border-white/10 bg-white/5"
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isPending}
              className={
                targetStatus === 'available'
                  ? 'bg-green-600 hover:bg-green-700'
                  : targetStatus === 'maintenance'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : statusInfo ? (
                <statusInfo.icon className="mr-2 h-4 w-4" />
              ) : null}
              {isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
