'use client';

// =============================================================================
// FINANCIALS CLIENT - Interactive financial dashboard
// =============================================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  ArrowRight,
  Calendar,
  PiggyBank,
  Percent,
  ChevronDown,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  FinancialDashboardStats,
  FinancialMetrics,
  FinancialPeriod,
  ExpenseWithCategory,
  ExpenseSummaryByCategory,
} from '@/lib/financial-types';
import { formatMoney, getPeriodLabel, getProfitColor, calculateProfitMargin, getCategoryIcon } from '@/lib/financial-types';

// =============================================================================
// TYPES
// =============================================================================

interface FinancialsClientProps {
  initialStats: FinancialDashboardStats;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] p-4 sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
};

// =============================================================================
// METRIC CARD COMPONENT
// =============================================================================

function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className={styles.nestedCard}>
      <div className={styles.nestedCardInner} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-foreground/50">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      {trend && (
        <div className="relative mt-2 flex items-center gap-1">
          {trend === 'up' && (
            <>
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">Trending up</span>
            </>
          )}
          {trend === 'down' && (
            <>
              <TrendingDown className="h-3 w-3 text-red-400" />
              <span className="text-xs text-red-400">Trending down</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FinancialsClient({ initialStats }: FinancialsClientProps) {
  const [period, setPeriod] = useState<FinancialPeriod>('this_month');
  const [metrics, setMetrics] = useState<FinancialMetrics>(initialStats.thisMonth);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Export to Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/financials/export?period=${period}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financials-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch metrics when period changes
  useEffect(() => {
    // Use cached data for common periods
    if (period === 'today') {
      setMetrics(initialStats.today);
      return;
    }
    if (period === 'this_week') {
      setMetrics(initialStats.thisWeek);
      return;
    }
    if (period === 'this_month') {
      setMetrics(initialStats.thisMonth);
      return;
    }
    if (period === 'this_year') {
      setMetrics(initialStats.thisYear);
      return;
    }

    // Fetch for other periods
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/financials?action=metrics&period=${period}`);
        const data = await res.json();
        setMetrics(data.metrics);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [period, initialStats]);

  const profitMargin = calculateProfitMargin(metrics.net_profit, metrics.gross_revenue);

  return (
    <div className="space-y-6">
      {/* Period Selector & Export */}
      <div className="flex items-center justify-between gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as FinancialPeriod)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="last_7_days">Last 7 Days</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_30_days">Last 30 Days</SelectItem>
            <SelectItem value="this_quarter">This Quarter</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-foreground/50">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-fuchsia-400" />
              Loading...
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="border-white/10 hover:bg-white/5"
          >
            {isExporting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-green-400" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-400" />
                Export Excel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Top Row Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Gross Revenue"
          value={formatMoney(metrics.gross_revenue)}
          icon={DollarSign}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
          subtitle={`${metrics.booking_count} bookings`}
        />
        <MetricCard
          title="Stripe Fees"
          value={formatMoney(metrics.stripe_fees)}
          icon={CreditCard}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          subtitle={metrics.gross_revenue > 0 
            ? `${((metrics.stripe_fees / metrics.gross_revenue) * 100).toFixed(1)}% of gross`
            : undefined}
        />
        <MetricCard
          title="Expenses"
          value={formatMoney(metrics.total_expenses)}
          icon={Receipt}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
        />
        <MetricCard
          title="Net Profit"
          value={formatMoney(metrics.net_profit)}
          icon={PiggyBank}
          iconColor={metrics.net_profit >= 0 ? 'text-cyan-400' : 'text-red-400'}
          iconBg={metrics.net_profit >= 0 ? 'bg-cyan-500/10' : 'bg-red-500/10'}
          subtitle={`${profitMargin.toFixed(1)}% margin`}
        />
      </div>

      {/* Second Row - Detailed Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Breakdown */}
        <div className={styles.card}>
          <div className={styles.cardInner} />
          <div className="relative p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Revenue Breakdown
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Gross Revenue</span>
                <span className="font-semibold text-green-400">
                  {formatMoney(metrics.gross_revenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Stripe Fees</span>
                <span className="font-semibold text-amber-400">
                  -{formatMoney(metrics.stripe_fees)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Revenue</span>
                  <span className="font-semibold">
                    {formatMoney(metrics.net_revenue)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Expenses</span>
                <span className="font-semibold text-red-400">
                  -{formatMoney(metrics.total_expenses)}
                </span>
              </div>
              {metrics.total_refunds > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Refunds</span>
                  <span className="font-semibold text-red-400">
                    -{formatMoney(metrics.total_refunds)}
                  </span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`text-lg font-bold ${getProfitColor(metrics.net_profit)}`}>
                    {formatMoney(metrics.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={styles.card}>
          <div className={styles.cardInner} />
          <div className="relative p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Quick Stats
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10">
                    <DollarSign className="h-4 w-4 text-fuchsia-400" />
                  </div>
                  <span className="text-foreground/70">Avg. Booking Value</span>
                </div>
                <span className="font-semibold">
                  {formatMoney(metrics.avg_booking_value)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10">
                    <Percent className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-foreground/70">Profit Margin</span>
                </div>
                <span className={`font-semibold ${getProfitColor(profitMargin)}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-foreground/70">Fee Rate</span>
                </div>
                <span className="font-semibold text-foreground/70">
                  {metrics.gross_revenue > 0
                    ? `${((metrics.stripe_fees / metrics.gross_revenue) * 100).toFixed(2)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="text-foreground/70">Total Bookings</span>
                </div>
                <span className="font-semibold">{metrics.booking_count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Expenses & Top Categories */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Expenses */}
        <div className={styles.card}>
          <div className={styles.cardInner} />
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
                Recent Expenses
              </h3>
              <Link href="/admin/expenses">
                <Button variant="ghost" size="sm" className="text-fuchsia-400">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {initialStats.recentExpenses.length === 0 ? (
                <p className="text-center text-sm text-foreground/40">
                  No expenses recorded yet
                </p>
              ) : (
                initialStats.recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                        <Receipt className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-foreground/50">
                          {expense.category.name}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-red-400">
                      -{formatMoney(expense.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className={styles.card}>
          <div className={styles.cardInner} />
          <div className="relative p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
              Top Expense Categories
            </h3>
            <div className="mt-4 space-y-3">
              {initialStats.topExpenseCategories.length === 0 ? (
                <p className="text-center text-sm text-foreground/40">
                  No expense categories yet
                </p>
              ) : (
                initialStats.topExpenseCategories
                  .filter((cat) => cat.total_amount > 0)
                  .map((category) => {
                    const totalExpenses = initialStats.topExpenseCategories.reduce(
                      (sum, c) => sum + c.total_amount,
                      0
                    );
                    const percentage = totalExpenses > 0
                      ? (category.total_amount / totalExpenses) * 100
                      : 0;

                    return (
                      <div key={category.category_id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{category.category_name}</span>
                          <span className="font-medium">
                            {formatMoney(category.total_amount)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Link href="/admin/expenses">
          <Button variant="outline">
            <Receipt className="mr-2 h-4 w-4" />
            Manage Expenses
          </Button>
        </Link>
      </div>
    </div>
  );
}
