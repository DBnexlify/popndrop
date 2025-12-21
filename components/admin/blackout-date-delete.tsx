// =============================================================================
// BLACKOUT DATE DELETE BUTTON COMPONENT
// components/admin/blackout-date-delete.tsx
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteBlackoutDate } from '@/lib/admin-actions';
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
import { Trash2, Loader2 } from 'lucide-react';

interface BlackoutDateDeleteButtonProps {
  id: string;
}

export function BlackoutDateDeleteButton({ id }: BlackoutDateDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteBlackoutDate(id);
      
      if (result.success) {
        setIsOpen(false);
        router.refresh();
      }
    });
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground/50 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-white/10 bg-neutral-900">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Blackout Date?</AlertDialogTitle>
          <AlertDialogDescription>
            This will allow bookings for these dates again. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
