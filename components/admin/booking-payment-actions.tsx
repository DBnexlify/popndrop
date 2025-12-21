// =============================================================================
// BOOKING PAYMENT ACTIONS COMPONENT
// components/admin/booking-payment-actions.tsx
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markBalancePaid } from '@/lib/admin-actions';
import { formatCurrency } from '@/lib/database-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
} from 'lucide-react';

interface BookingPaymentActionsProps {
  bookingId: string;
  balanceDue: number;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'venmo', label: 'Venmo', icon: Smartphone },
  { value: 'zelle', label: 'Zelle', icon: Smartphone },
];

export function BookingPaymentActions({
  bookingId,
  balanceDue,
}: BookingPaymentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amount, setAmount] = useState(balanceDue.toString());
  const [error, setError] = useState<string | null>(null);
  
  const handleMarkPaid = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setError(null);
    
    startTransition(async () => {
      const result = await markBalancePaid(bookingId, paymentMethod, parsedAmount);
      
      if (!result.success) {
        setError(result.error || 'Failed to record payment');
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-green-600 text-white hover:bg-green-700">
          <DollarSign className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      
      <DialogContent className="border-white/10 bg-neutral-900">
        <DialogHeader>
          <DialogTitle>Record Balance Payment</DialogTitle>
          <DialogDescription>
            Record the balance payment of {formatCurrency(balanceDue)} collected on delivery.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="border-white/10 bg-white/5">
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-neutral-900">
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <span className="flex items-center gap-2">
                      <method.icon className="h-4 w-4" />
                      {method.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount Collected</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-white/10 bg-white/5 pl-9"
              />
            </div>
            <p className="text-xs text-foreground/50">
              Expected: {formatCurrency(balanceDue)}
            </p>
          </div>
          
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMarkPaid}
            disabled={isPending}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="mr-2 h-4 w-4" />
            )}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
