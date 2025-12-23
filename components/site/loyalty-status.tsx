// =============================================================================
// LOYALTY STATUS COMPONENT
// components/site/loyalty-status.tsx
// Shows customer's loyalty progress and available rewards at checkout
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Gift, Star, ChevronRight, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerLoyaltyStatus, AvailableLoyaltyReward } from '@/lib/loyalty-types';
import { 
  getTierBadgeClasses, 
  getProgressBarColor, 
  formatExpirationDate,
  getProgressMessage,
} from '@/lib/loyalty-types';

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  // Container card
  container: cn(
    'relative overflow-hidden rounded-xl',
    'border border-white/10 bg-background/50',
    'shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl',
    'sm:rounded-2xl'
  ),
  containerInner: cn(
    'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl',
    '[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]'
  ),
  
  // Header
  header: 'flex items-center justify-between p-4 sm:p-5',
  headerTitle: 'flex items-center gap-2 text-sm font-semibold sm:text-base',
  headerIcon: 'h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5',
  
  // Progress section
  progressSection: 'px-4 pb-4 sm:px-5 sm:pb-5',
  progressBar: 'h-2 overflow-hidden rounded-full bg-white/10',
  progressFill: 'h-full rounded-full transition-all duration-500 ease-out',
  progressText: 'mt-2 text-xs text-foreground/60 sm:text-sm',
  
  // Available reward card
  rewardCard: cn(
    'relative overflow-hidden rounded-lg',
    'border border-fuchsia-500/30 bg-fuchsia-500/10',
    'p-4 sm:rounded-xl'
  ),
  rewardCardInner: cn(
    'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl',
    '[box-shadow:inset_0_0_0_1px_rgba(217,70,239,0.15),inset_0_0_35px_rgba(0,0,0,0.12)]'
  ),
  rewardHeader: 'flex items-center gap-2 mb-2',
  rewardBadge: cn(
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
    'bg-fuchsia-500/20 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-300'
  ),
  rewardDiscount: 'text-2xl font-semibold text-fuchsia-300 sm:text-3xl',
  rewardCode: cn(
    'mt-3 rounded-lg bg-black/30 p-3',
    'border border-dashed border-fuchsia-500/40',
    'text-center'
  ),
  rewardCodeLabel: 'text-[10px] font-medium uppercase tracking-wide text-foreground/50',
  rewardCodeValue: 'mt-1 font-mono text-lg font-semibold text-cyan-300 tracking-wider',
  rewardExpiry: 'mt-2 text-center text-xs text-foreground/50',
  
  // Apply button
  applyButton: cn(
    'mt-3 w-full rounded-lg py-2.5',
    'bg-gradient-to-r from-fuchsia-500 to-purple-600',
    'text-sm font-semibold text-white',
    'shadow-lg shadow-fuchsia-500/20',
    'transition-all hover:shadow-xl hover:shadow-fuchsia-500/30',
    'flex items-center justify-center gap-2'
  ),
  
  // Applied state
  appliedBadge: cn(
    'flex items-center justify-center gap-2 rounded-lg py-2.5',
    'bg-green-500/20 border border-green-500/30',
    'text-sm font-semibold text-green-300'
  ),
  
  // New customer teaser
  teaserSection: 'px-4 pb-4 sm:px-5 sm:pb-5',
  teaserCard: cn(
    'relative overflow-hidden rounded-lg',
    'border border-white/5 bg-white/[0.03]',
    'p-4 sm:rounded-xl'
  ),
  teaserCardInner: cn(
    'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl',
    '[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]'
  ),
  teaserTitle: 'flex items-center gap-2 text-sm font-semibold text-foreground/80',
  teaserText: 'mt-2 text-xs leading-relaxed text-foreground/60 sm:text-sm',
  teaserHighlight: 'text-fuchsia-400 font-semibold',
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface LoyaltyStatusProps {
  email: string;
  onApplyCode?: (code: string) => void;
  appliedCode?: string | null;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LoyaltyStatus({ 
  email, 
  onApplyCode, 
  appliedCode,
  className 
}: LoyaltyStatusProps) {
  const [status, setStatus] = useState<CustomerLoyaltyStatus | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fetch loyalty status when email changes
  useEffect(() => {
    const fetchStatus = async () => {
      if (!email || !email.includes('@')) {
        setStatus(null);
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`/api/loyalty?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
          setIsNewCustomer(data.isNewCustomer);
        }
      } catch (error) {
        console.error('Error fetching loyalty status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the fetch
    const timeoutId = setTimeout(fetchStatus, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);
  
  // Don't render if no email or still loading
  if (!email || loading) {
    return null;
  }
  
  // Get available reward (if any)
  const availableReward = status?.available_rewards?.[0];
  const hasAppliedLoyaltyCode = appliedCode && availableReward && 
    appliedCode.toUpperCase() === availableReward.promo_code.toUpperCase();
  
  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.containerInner} />
      
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          <Gift className={styles.headerIcon} />
          Loyalty Rewards
        </h3>
        {status?.current_tier_name && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border',
            getTierBadgeClasses(status.current_tier_name === 'bronze' ? 'amber' : 'cyan')
          )}>
            {status.current_tier_name}
          </span>
        )}
      </div>
      
      {/* Available Reward */}
      {availableReward && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className={styles.rewardCard}>
            <div className={styles.rewardCardInner} />
            
            <div className={styles.rewardHeader}>
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
              <span className={styles.rewardBadge}>Reward Available</span>
            </div>
            
            <p className={styles.rewardDiscount}>
              {availableReward.discount_percent}% OFF
            </p>
            
            <div className={styles.rewardCode}>
              <p className={styles.rewardCodeLabel}>Your Code</p>
              <p className={styles.rewardCodeValue}>{availableReward.promo_code}</p>
            </div>
            
            <p className={styles.rewardExpiry}>
              {formatExpirationDate(availableReward.expires_at)} • 
              Min order ${availableReward.min_order} • 
              Max savings ${availableReward.max_discount}
            </p>
            
            {hasAppliedLoyaltyCode ? (
              <div className={styles.appliedBadge}>
                <Check className="h-4 w-4" />
                Reward Applied!
              </div>
            ) : onApplyCode && (
              <button
                onClick={() => onApplyCode(availableReward.promo_code)}
                className={styles.applyButton}
              >
                <Gift className="h-4 w-4" />
                Apply My Reward
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Progress Section (if no available reward) */}
      {!availableReward && status && (
        <div className={styles.progressSection}>
          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div 
              className={cn(
                styles.progressFill,
                'bg-gradient-to-r',
                getProgressBarColor(status.progress_percent)
              )}
              style={{ width: `${status.progress_percent}%` }}
            />
          </div>
          
          {/* Progress Text */}
          <p className={styles.progressText}>
            {getProgressMessage(
              status.current_bookings,
              status.next_tier_name ? status.bookings_until_next + status.current_bookings : null,
              status.next_tier_name
            )}
          </p>
        </div>
      )}
      
      {/* New Customer Teaser */}
      {isNewCustomer && (
        <div className={styles.teaserSection}>
          <div className={styles.teaserCard}>
            <div className={styles.teaserCardInner} />
            
            <h4 className={styles.teaserTitle}>
              <Star className="h-4 w-4 text-amber-400" />
              Join Our Loyalty Program
            </h4>
            
            <p className={styles.teaserText}>
              Book with us and earn rewards! After just{' '}
              <span className={styles.teaserHighlight}>3 rentals</span>, you'll unlock{' '}
              <span className={styles.teaserHighlight}>10% off</span> your next booking.
              Keep going to unlock even bigger discounts!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VERSION (for mobile wizard)
// =============================================================================

export function LoyaltyStatusCompact({ 
  email, 
  onApplyCode, 
  appliedCode,
}: Omit<LoyaltyStatusProps, 'className'>) {
  const [status, setStatus] = useState<CustomerLoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Fetch loyalty status when email changes
  useEffect(() => {
    const fetchStatus = async () => {
      if (!email || !email.includes('@')) {
        setStatus(null);
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`/api/loyalty?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching loyalty status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(fetchStatus, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);
  
  const availableReward = status?.available_rewards?.[0];
  const hasAppliedLoyaltyCode = appliedCode && availableReward && 
    appliedCode.toUpperCase() === availableReward.promo_code.toUpperCase();
  
  if (!email || loading || !availableReward) {
    return null;
  }
  
  return (
    <div className={cn(
      'rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-3',
      'flex items-center justify-between gap-3'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <Gift className="h-4 w-4 shrink-0 text-fuchsia-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fuchsia-300">
            {availableReward.discount_percent}% OFF Available
          </p>
          <p className="truncate text-xs text-foreground/50">
            Code: {availableReward.promo_code}
          </p>
        </div>
      </div>
      
      {hasAppliedLoyaltyCode ? (
        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-400">
          <Check className="h-3 w-3" />
          Applied
        </span>
      ) : onApplyCode && (
        <button
          onClick={() => onApplyCode(availableReward.promo_code)}
          className={cn(
            'shrink-0 rounded-md px-3 py-1.5',
            'bg-fuchsia-500 text-xs font-semibold text-white',
            'transition-colors hover:bg-fuchsia-600'
          )}
        >
          Apply
        </button>
      )}
    </div>
  );
}
