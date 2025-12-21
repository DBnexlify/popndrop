// =============================================================================
// BLACKOUT DATE FORM COMPONENT
// components/admin/blackout-date-form.tsx
// Powerful form with global/product/unit scope selection
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBlackoutDate } from '@/lib/admin-actions';
import type { Product, UnitWithProduct } from '@/lib/database-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Globe,
  Package,
  Box,
  Loader2,
  CalendarPlus,
} from 'lucide-react';

interface BlackoutDateFormProps {
  products: Product[];
  units: UnitWithProduct[];
}

type BlockScope = 'global' | 'product' | 'unit';

export function BlackoutDateForm({ products, units }: BlackoutDateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [scope, setScope] = useState<BlockScope>('global');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Filter units by selected product
  const filteredUnits = selectedProduct
    ? units.filter((u) => u.product_id === selectedProduct)
    : units;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    // Validation
    if (!startDate) {
      setError('Start date is required');
      return;
    }
    
    if (scope === 'product' && !selectedProduct) {
      setError('Please select a product');
      return;
    }
    
    if (scope === 'unit' && !selectedUnit) {
      setError('Please select a unit');
      return;
    }
    
    const effectiveEndDate = endDate || startDate;
    
    startTransition(async () => {
      const result = await createBlackoutDate({
        startDate,
        endDate: effectiveEndDate,
        reason: reason || undefined,
        productId: scope === 'global' ? null : selectedProduct || null,
        unitId: scope === 'unit' ? selectedUnit : null,
        isRecurring,
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to create blackout date');
      } else {
        setSuccess(true);
        // Reset form
        setStartDate('');
        setEndDate('');
        setReason('');
        setSelectedProduct('');
        setSelectedUnit('');
        setIsRecurring(false);
        router.refresh();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Scope Selection */}
      <div className="space-y-2">
        <Label>Block Scope</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setScope('global');
              setSelectedProduct('');
              setSelectedUnit('');
            }}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
              scope === 'global'
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <Globe className={`h-5 w-5 ${scope === 'global' ? 'text-amber-400' : 'text-foreground/50'}`} />
            <span className={`text-xs font-medium ${scope === 'global' ? 'text-amber-300' : 'text-foreground/70'}`}>
              All
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setScope('product');
              setSelectedUnit('');
            }}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
              scope === 'product'
                ? 'border-purple-500/50 bg-purple-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <Package className={`h-5 w-5 ${scope === 'product' ? 'text-purple-400' : 'text-foreground/50'}`} />
            <span className={`text-xs font-medium ${scope === 'product' ? 'text-purple-300' : 'text-foreground/70'}`}>
              Product
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setScope('unit')}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
              scope === 'unit'
                ? 'border-cyan-500/50 bg-cyan-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <Box className={`h-5 w-5 ${scope === 'unit' ? 'text-cyan-400' : 'text-foreground/50'}`} />
            <span className={`text-xs font-medium ${scope === 'unit' ? 'text-cyan-300' : 'text-foreground/70'}`}>
              Unit
            </span>
          </button>
        </div>
      </div>
      
      {/* Product Selection (shown for product and unit scope) */}
      {(scope === 'product' || scope === 'unit') && (
        <div className="space-y-2">
          <Label>Product</Label>
          <Select value={selectedProduct} onValueChange={(value) => {
            setSelectedProduct(value);
            setSelectedUnit(''); // Reset unit when product changes
          }}>
            <SelectTrigger className="border-white/10 bg-white/5">
              <SelectValue placeholder="Select product..." />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-neutral-900">
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Unit Selection (shown only for unit scope) */}
      {scope === 'unit' && (
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select 
            value={selectedUnit} 
            onValueChange={setSelectedUnit}
            disabled={!selectedProduct}
          >
            <SelectTrigger className="border-white/10 bg-white/5">
              <SelectValue placeholder={selectedProduct ? "Select unit..." : "Select a product first"} />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-neutral-900">
              {filteredUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  Unit #{unit.unit_number}
                  {unit.nickname && ` (${unit.nickname})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Date Range */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="border-white/10 bg-white/5"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date (optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || new Date().toISOString().split('T')[0]}
            className="border-white/10 bg-white/5"
          />
          <p className="text-xs text-foreground/50">
            Leave empty for single day
          </p>
        </div>
      </div>
      
      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Holiday, maintenance, vacation..."
          className="border-white/10 bg-white/5"
          rows={2}
        />
      </div>
      
      {/* Recurring Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <div>
          <p className="text-sm font-medium">Recurring yearly</p>
          <p className="text-xs text-foreground/50">
            Automatically block these dates every year
          </p>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={setIsRecurring}
        />
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      
      {/* Success message */}
      {success && (
        <p className="text-sm text-green-400">Blackout date created successfully!</p>
      )}
      
      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-red-600 text-white hover:bg-red-700"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CalendarPlus className="mr-2 h-4 w-4" />
        )}
        Block Date{endDate && startDate !== endDate ? 's' : ''}
      </Button>
    </form>
  );
}
