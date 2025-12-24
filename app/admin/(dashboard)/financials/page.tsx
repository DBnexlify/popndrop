// =============================================================================
// FINANCIALS PAGE
// app/admin/(dashboard)/financials/page.tsx
// Comprehensive financial tracking and accounting dashboard
// =============================================================================

import { Suspense } from 'react';
import { getFinancialDashboardData, getFinancialComparison } from '@/lib/financial-queries';
import { FinancialDashboard } from './financial-dashboard';

export const metadata = {
  title: 'Financials | Admin Dashboard',
  description: 'Complete financial tracking, revenue analysis, and accounting overview',
};

export const dynamic = 'force-dynamic';

export default async function FinancialsPage() {
  // Default to all-time view
  const [dashboardData, comparison] = await Promise.all([
    getFinancialDashboardData('all_time'),
    getFinancialComparison('this_month'),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Financial Overview
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Complete revenue tracking, payment analysis, and accounting data
        </p>
      </div>

      <Suspense fallback={<FinancialsSkeleton />}>
        <FinancialDashboard 
          initialData={dashboardData}
          comparison={comparison}
        />
      </Suspense>
    </div>
  );
}

function FinancialsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      
      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
      </div>
      
      {/* Table Skeleton */}
      <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}
