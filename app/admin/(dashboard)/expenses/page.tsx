// =============================================================================
// EXPENSES PAGE - Admin expense tracking
// =============================================================================

import { Suspense } from 'react';
import { getExpenses, getExpenseCategories } from '@/lib/financial-queries';
import { ExpensesClient } from './expenses-client';
import { Receipt } from 'lucide-react';

export const metadata = {
  title: 'Expenses | Pop and Drop Admin',
};

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const [expensesResult, categories] = await Promise.all([
    getExpenses({ limit: 50 }),
    getExpenseCategories(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/10">
            <Receipt className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Expenses
            </h1>
            <p className="mt-1 text-sm text-foreground/70">
              Track business expenses for tax reporting
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<ExpensesSkeleton />}>
        <ExpensesClient 
          initialExpenses={expensesResult.expenses}
          initialTotal={expensesResult.total}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}

function ExpensesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-64 w-full animate-pulse rounded-xl bg-white/5" />
    </div>
  );
}
