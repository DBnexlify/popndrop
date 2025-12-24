// =============================================================================
// FINANCIALS PAGE - Admin financial dashboard
// =============================================================================

import { Suspense } from 'react';
import { getFinancialDashboardStats } from '@/lib/financial-queries';
import { FinancialsClient } from './financials-client';
import { DollarSign } from 'lucide-react';

export const metadata = {
  title: 'Financials | Pop and Drop Admin',
};

export const dynamic = 'force-dynamic';

export default async function FinancialsPage() {
  const stats = await getFinancialDashboardStats();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 sm:mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
          <DollarSign className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Financial Dashboard
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Revenue, expenses, and profit tracking
          </p>
        </div>
      </div>

      <Suspense fallback={<FinancialsSkeleton />}>
        <FinancialsClient initialStats={stats} />
      </Suspense>
    </div>
  );
}

function FinancialsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-white/5" />
    </div>
  );
}
