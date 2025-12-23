// =============================================================================
// PROMO CODE INPUT COMPONENT
// components/site/promo-code-input.tsx
// Input field for applying promo codes at checkout
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tag,
  X,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { AppliedPromoCode, ValidatePromoCodeResponse } from '@/lib/promo-code-types';

// =============================================================================
// STYLES (following design system)
// =============================================================================

const styles = {
  input: 'border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10 uppercase',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
} as const;

// =============================================================================
// PROPS
// =============================================================================

interface PromoCodeInputProps {
  orderAmount: number;
  customerEmail?: string;
  productSlug?: string;
  appliedCode: AppliedPromoCode | null;
  onApply: (promo: AppliedPromoCode) => void;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PromoCodeInput({
  orderAmount,
  customerEmail,
  productSlug,
  appliedCode,
  onApply,
  onRemove,
  disabled = false,
  className,
}: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle code validation
  const handleApply = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          orderAmount,
          customerEmail,
          productSlug,
        }),
      });

      const data: ValidatePromoCodeResponse = await response.json();

      if (!data.valid || !data.discount) {
        setError(data.error || 'Invalid code');
        return;
      }

      // Success! Apply the code
      onApply({
        code: data.discount.code,
        promoCodeId: '', // Will be set server-side during booking
        discountType: data.discount.type,
        discountAmount: data.discount.amount,
        calculatedDiscount: data.discount.calculatedDiscount,
        description: data.discount.description,
      });

      // Clear input
      setCode('');
      setIsExpanded(false);

    } catch (err) {
      console.error('Error validating promo code:', err);
      setError('Unable to validate code. Please try again.');
    } finally {
      setIsValidating(false);
    }
  }, [code, orderAmount, customerEmail, productSlug, onApply]);

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // If code is already applied, show applied state
  if (appliedCode) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className={cn(styles.nestedCard, 'border-green-500/30 bg-green-500/5')}>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                <Tag className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">
                  {appliedCode.code}
                </p>
                {appliedCode.description && (
                  <p className="text-xs text-foreground/50">{appliedCode.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-green-400">
                -${appliedCode.calculatedDiscount.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
                aria-label="Remove promo code"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className={styles.nestedCardInner} />
        </div>
      </div>
    );
  }

  // Show collapsed or expanded input
  return (
    <div className={cn('space-y-2', className)}>
      {!isExpanded ? (
        // Collapsed state - just a link to expand
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-foreground/60 transition-colors hover:text-cyan-400 disabled:opacity-50"
        >
          <Tag className="h-4 w-4" />
          Have a promo code?
        </button>
      ) : (
        // Expanded state - input field
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter code"
                disabled={disabled || isValidating}
                className={cn(
                  styles.input,
                  'pr-10',
                  error && 'border-red-500/50 focus:border-red-500/50'
                )}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              {code && !isValidating && (
                <button
                  type="button"
                  onClick={() => {
                    setCode('');
                    setError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleApply}
              disabled={disabled || isValidating || !code.trim()}
              className="shrink-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30 disabled:opacity-50"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cancel link */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setCode('');
              setError(null);
            }}
            className="text-xs text-foreground/40 hover:text-foreground/60"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VERSION (for mobile wizard)
// =============================================================================

export function PromoCodeInputCompact({
  orderAmount,
  customerEmail,
  productSlug,
  appliedCode,
  onApply,
  onRemove,
  disabled = false,
}: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleApply = useCallback(async () => {
    if (!code.trim()) return;

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          orderAmount,
          customerEmail,
          productSlug,
        }),
      });

      const data: ValidatePromoCodeResponse = await response.json();

      if (!data.valid || !data.discount) {
        setError(data.error || 'Invalid code');
        return;
      }

      onApply({
        code: data.discount.code,
        promoCodeId: '',
        discountType: data.discount.type,
        discountAmount: data.discount.amount,
        calculatedDiscount: data.discount.calculatedDiscount,
        description: data.discount.description,
      });

      setCode('');
      setShowInput(false);
    } catch {
      setError('Unable to validate');
    } finally {
      setIsValidating(false);
    }
  }, [code, orderAmount, customerEmail, productSlug, onApply]);

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">{appliedCode.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-green-400">
            -${appliedCode.calculatedDiscount.toFixed(0)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-foreground/50 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-cyan-400"
      >
        <Tag className="h-3.5 w-3.5" />
        Add promo code
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Code"
          disabled={disabled || isValidating}
          className={cn(styles.input, 'h-9 text-sm')}
          autoFocus
          autoCapitalize="characters"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          disabled={disabled || isValidating || !code.trim()}
          className="h-9 bg-gradient-to-r from-fuchsia-500 to-purple-600"
        >
          {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
