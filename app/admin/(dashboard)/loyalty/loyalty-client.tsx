// =============================================================================
// ADMIN LOYALTY CLIENT COMPONENT
// app/admin/(dashboard)/loyalty/loyalty-client.tsx
// Client-side interactivity for loyalty rewards management
// =============================================================================

'use client';

import { useState } from 'react';
import { Gift, Check, X, Clock, Send, ChevronRight, Mail, AlertCircle } from 'lucide-react';
import { formatDateWithYear } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  sectionCard: cn(
    'relative overflow-hidden rounded-2xl',
    'border border-white/10 bg-background/50',
    'shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl',
    'sm:rounded-3xl'
  ),
  sectionCardInner: cn(
    'pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl',
    '[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]'
  ),
  sectionHeading: 'text-lg font-semibold sm:text-xl',
  bodyText: 'text-sm leading-relaxed text-foreground/70',
  label: 'text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]',
  filterPill: cn(
    'inline-flex items-center justify-center',
    'rounded-full px-3 py-1.5',
    'text-sm font-medium leading-none',
    'whitespace-nowrap',
    'transition-colors duration-200',
    'min-h-[32px]'
  ),
  filterPillActive: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-md shadow-fuchsia-500/25',
  filterPillInactive: 'bg-white/5 text-foreground/60 hover:bg-white/10 hover:text-foreground',
};

// =============================================================================
// TYPES
// =============================================================================

interface RewardWithDetails {
  id: string;
  customer_id: string;
  tier_id: string;
  promo_code_id: string | null;
  bookings_at_award: number;
  awarded_at: string;
  code_used: boolean;
  code_used_at: string | null;
  code_expired: boolean;
  email_sent: boolean;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  tier: {
    tier_name: string;
    discount_percent: number;
  };
  promo_code: {
    code: string;
    expiration_date: string;
  } | null;
}

interface LoyaltyRewardsClientProps {
  initialRewards: RewardWithDetails[];
  totalCount: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LoyaltyRewardsClient({ 
  initialRewards, 
  totalCount 
}: LoyaltyRewardsClientProps) {
  const [rewards, setRewards] = useState(initialRewards);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  
  // Filter rewards
  const filteredRewards = rewards.filter((reward) => {
    if (filter === 'unused') return !reward.code_used && !reward.code_expired;
    if (filter === 'used') return reward.code_used;
    if (filter === 'expired') return reward.code_expired;
    return true;
  });
  
  // Send reward email
  const handleSendEmail = async (rewardId: string) => {
    setSendingEmail(rewardId);
    try {
      const response = await fetch('/api/admin/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_reward_email', rewardId }),
      });
      
      if (response.ok) {
        // Update local state
        setRewards((prev) =>
          prev.map((r) =>
            r.id === rewardId ? { ...r, email_sent: true } : r
          )
        );
      }
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSendingEmail(null);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return formatDateWithYear(dateString);
  };
  
  // Check if code is expiring soon (within 7 days)
  const isExpiringSoon = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const now = new Date();
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 7;
  };
  
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardInner} />
      <div className="p-5 sm:p-8">
        {/* Header with filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className={styles.sectionHeading}>
            Rewards Issued ({totalCount})
          </h2>
          
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'unused', 'used', 'expired'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  styles.filterPill,
                  filter === f ? styles.filterPillActive : styles.filterPillInactive
                )}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Rewards List */}
        {filteredRewards.length === 0 ? (
          <div className="py-8 text-center">
            <Gift className="mx-auto h-12 w-12 text-foreground/20" />
            <p className="mt-3 text-foreground/50">No rewards found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRewards.map((reward) => (
              <div
                key={reward.id}
                className={cn(
                  'relative overflow-hidden rounded-lg border p-4',
                  'bg-white/[0.02] transition-colors hover:bg-white/[0.04]',
                  reward.code_used
                    ? 'border-green-500/20'
                    : reward.code_expired
                    ? 'border-red-500/20'
                    : isExpiringSoon(reward.promo_code?.expiration_date || '')
                    ? 'border-amber-500/30'
                    : 'border-white/10'
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Customer & Reward Info */}
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      reward.code_used
                        ? 'bg-green-500/10'
                        : reward.code_expired
                        ? 'bg-red-500/10'
                        : 'bg-fuchsia-500/10'
                    )}>
                      {reward.code_used ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : reward.code_expired ? (
                        <X className="h-5 w-5 text-red-400" />
                      ) : (
                        <Gift className="h-5 w-5 text-fuchsia-400" />
                      )}
                    </div>
                    
                    <div>
                      <p className="font-semibold">
                        {reward.customer.first_name} {reward.customer.last_name}
                      </p>
                      <p className="text-sm text-foreground/50">
                        {reward.customer.email}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                          reward.tier.tier_name === 'bronze'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        )}>
                          {reward.tier.tier_name} - {reward.tier.discount_percent}%
                        </span>
                        
                        {reward.promo_code && (
                          <span className="font-mono text-xs text-foreground/40">
                            {reward.promo_code.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    {/* Status Badge */}
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                      reward.code_used
                        ? 'bg-green-500/10 text-green-300'
                        : reward.code_expired
                        ? 'bg-red-500/10 text-red-300'
                        : isExpiringSoon(reward.promo_code?.expiration_date || '')
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-fuchsia-500/10 text-fuchsia-300'
                    )}>
                      {reward.code_used ? (
                        <>
                          <Check className="h-3 w-3" />
                          Used {formatDate(reward.code_used_at!)}
                        </>
                      ) : reward.code_expired ? (
                        <>
                          <X className="h-3 w-3" />
                          Expired
                        </>
                      ) : isExpiringSoon(reward.promo_code?.expiration_date || '') ? (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          Expiring Soon
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          Active
                        </>
                      )}
                    </span>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Send Email (if not used and not expired) */}
                      {!reward.code_used && !reward.code_expired && (
                        <button
                          onClick={() => handleSendEmail(reward.id)}
                          disabled={sendingEmail === reward.id}
                          className={cn(
                            'flex items-center gap-1 rounded-md px-2 py-1',
                            'text-xs font-medium transition-colors',
                            reward.email_sent
                              ? 'bg-white/5 text-foreground/40'
                              : 'bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20'
                          )}
                        >
                          {sendingEmail === reward.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-400" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          {reward.email_sent ? 'Resend' : 'Send Email'}
                        </button>
                      )}
                      
                      {/* View Customer */}
                      <Link
                        href={`/admin/customers?search=${encodeURIComponent(reward.customer.email)}`}
                        className={cn(
                          'flex items-center gap-1 rounded-md px-2 py-1',
                          'text-xs font-medium',
                          'bg-white/5 text-foreground/60 hover:bg-white/10 hover:text-foreground',
                          'transition-colors'
                        )}
                      >
                        View
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Dates Row */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/40">
                  <span>
                    Awarded: {formatDate(reward.awarded_at)}
                  </span>
                  <span>
                    At booking #{reward.bookings_at_award}
                  </span>
                  {reward.promo_code && (
                    <span>
                      Expires: {formatDate(reward.promo_code.expiration_date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
