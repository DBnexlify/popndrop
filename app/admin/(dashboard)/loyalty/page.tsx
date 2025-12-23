// =============================================================================
// ADMIN LOYALTY DASHBOARD
// app/admin/(dashboard)/loyalty/page.tsx
// View and manage customer loyalty rewards
// =============================================================================

import { Suspense } from 'react';
import { Gift, Users, TrendingUp, Clock, Check, X, Award, Send } from 'lucide-react';
import { getLoyaltyDashboardStats, getAllLoyaltyRewards, getAllLoyaltyTiers } from '@/lib/loyalty-queries';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LoyaltyRewardsClient } from './loyalty-client';

// =============================================================================
// STYLES (Following Design System)
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
  card: cn(
    'relative overflow-hidden rounded-xl',
    'border border-white/10 bg-background/50',
    'shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl',
    'sm:rounded-2xl'
  ),
  cardInner: cn(
    'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl',
    '[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]'
  ),
  pageTitle: 'text-2xl font-semibold tracking-tight sm:text-3xl',
  pageSubtitle: 'mt-1 text-sm text-foreground/60',
  sectionHeading: 'text-lg font-semibold sm:text-xl',
  label: 'text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]',
  statValue: 'text-2xl font-semibold tracking-tight sm:text-3xl',
  bodyText: 'text-sm leading-relaxed text-foreground/70',
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'fuchsia',
  suffix,
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType;
  color?: 'fuchsia' | 'cyan' | 'green' | 'amber';
  suffix?: string;
}) {
  const colorClasses = {
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    green: 'bg-green-500/10 text-green-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };
  
  return (
    <div className={styles.card}>
      <div className={styles.cardInner} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            colorClasses[color]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className={styles.label}>{label}</p>
            <p className={styles.statValue}>
              {value}
              {suffix && <span className="text-lg text-foreground/50">{suffix}</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default async function AdminLoyaltyPage() {
  // Fetch data
  const [stats, rewardsResult, tiers] = await Promise.all([
    getLoyaltyDashboardStats(),
    getAllLoyaltyRewards({ limit: 20 }),
    getAllLoyaltyTiers(),
  ]);
  
  return (
    // FIXED: Added consistent page padding matching other admin pages
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div>
          <h1 className={styles.pageTitle}>Loyalty Rewards</h1>
          <p className={styles.pageSubtitle}>
            Manage customer loyalty program and track rewards
          </p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <StatCard
            label="Total Rewards Issued"
            value={stats?.total_rewards_issued || 0}
            icon={Gift}
            color="fuchsia"
          />
          <StatCard
            label="Rewards Redeemed"
            value={stats?.rewards_redeemed || 0}
            icon={Check}
            color="green"
          />
          <StatCard
            label="Redemption Rate"
            value={stats?.redemption_rate_percent || 0}
            icon={TrendingUp}
            color="cyan"
            suffix="%"
          />
          <StatCard
            label="Total Discount Given"
            value={`$${(stats?.total_discount_given || 0).toFixed(0)}`}
            icon={Award}
            color="amber"
          />
        </div>
        
        {/* Tiers Overview */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardInner} />
          <div className="p-5 sm:p-8">
            <h2 className={cn(styles.sectionHeading, 'mb-4')}>Loyalty Tiers</h2>
            
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div 
                  key={tier.id}
                  className={cn(
                    'relative overflow-hidden rounded-lg border p-4 sm:rounded-xl',
                    tier.tier_name === 'bronze' 
                      ? 'border-amber-500/30 bg-amber-500/5' 
                      : 'border-cyan-500/30 bg-cyan-500/5'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      tier.tier_name === 'bronze'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    )}>
                      {tier.tier_name}
                    </span>
                    <span className={cn(
                      'text-xs',
                      tier.is_active ? 'text-green-400' : 'text-foreground/40'
                    )}>
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-xl font-semibold">{tier.discount_percent}% Off</p>
                  <p className={styles.bodyText}>{tier.display_name}</p>
                  
                  <div className="mt-3 space-y-1 text-xs text-foreground/50">
                    <p>• {tier.bookings_required} bookings required</p>
                    <p>• Min order: ${tier.minimum_order_amount}</p>
                    <p>• Max savings: ${tier.max_discount_cap}</p>
                    <p>• Expires: {tier.code_expiration_days} days</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Rewards List (Client Component) */}
        <Suspense fallback={<RewardsListSkeleton />}>
          <LoyaltyRewardsClient 
            initialRewards={rewardsResult.rewards}
            totalCount={rewardsResult.total}
          />
        </Suspense>
      </div>
    </div>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function RewardsListSkeleton() {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardInner} />
      <div className="p-5 sm:p-8">
        <div className="h-7 w-40 animate-pulse rounded bg-white/10 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
