'use client';

// =============================================================================
// FINANCIAL DASHBOARD CLIENT COMPONENT
// app/admin/(dashboard)/financials/financial-dashboard.tsx
// Interactive financial tracking with charts, tables, and exports
// =============================================================================

import { useState, useTransition } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Search,
  Calendar,
  CreditCard,
  Wallet,
  PiggyBank,
  Receipt,
  BarChart3,
  PieChart,
  Table as TableIcon,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  FinancialDashboardData,
  FinancialComparison,
  TimePeriod,
  BookingFinancialRecord,
} from '@/lib/financial-types';
import {
  getTimePeriodLabel,
  getPaymentStatusLabel,
  getPaymentStatusColor,
} from '@/lib/financial-types';

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  sectionCard: "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner: "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl",
  cardInner: "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface FinancialDashboardProps {
  initialData: FinancialDashboardData;
  comparison: FinancialComparison | null;
}

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'all_time', label: 'All Time' },
  { value: 'this_year', label: 'This Year' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FinancialDashboard({ initialData, comparison }: FinancialDashboardProps) {
  const [data, setData] = useState(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [isPending, startTransition] = useTransition();

  // Fetch new data when period changes
  const handlePeriodChange = async (period: TimePeriod) => {
    setSelectedPeriod(period);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/financials?period=${period}`);
        if (response.ok) {
          const newData = await response.json();
          setData(newData);
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }
    });
  };

  // Export handler
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/admin/financials/export?period=${selectedPeriod}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  // Filter transactions
  const filteredTransactions = data.recentTransactions.filter(t => {
    const matchesSearch = !searchQuery || 
      t.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className={styles.card}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(v) => handlePeriodChange(v as TimePeriod)}>
              <SelectTrigger className="w-[180px] border-white/10 bg-white/5">
                <Calendar className="mr-2 h-4 w-4 text-foreground/50" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isPending && (
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              className="border-white/10 hover:bg-white/5"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        <div className={styles.cardInner} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Gross Revenue"
          value={data.summary.grossRevenue}
          icon={DollarSign}
          iconColor="green"
          comparison={comparison?.grossRevenue}
          format="currency"
        />
        <SummaryCard
          title="Refunds Issued"
          value={data.summary.refundsIssued}
          icon={Receipt}
          iconColor="red"
          format="currency"
          subtitle={`${data.summary.cancelledBookings} cancelled`}
        />
        <SummaryCard
          title="Net Revenue"
          value={data.summary.netRevenue}
          icon={TrendingUp}
          iconColor="cyan"
          comparison={comparison?.netRevenue}
          format="currency"
          highlighted
        />
        <SummaryCard
          title="Outstanding"
          value={data.summary.outstandingBalances + data.summary.outstandingDeposits}
          icon={Clock}
          iconColor="amber"
          format="currency"
          subtitle="Pending collection"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat 
          label="Total Bookings" 
          value={data.summary.totalBookings} 
          icon={BarChart3}
        />
        <MiniStat 
          label="Completed" 
          value={data.summary.completedBookings} 
          icon={CheckCircle2}
          color="green"
        />
        <MiniStat 
          label="Avg. Booking Value" 
          value={data.summary.averageBookingValue} 
          format="currency"
          icon={PiggyBank}
        />
        <MiniStat 
          label="Collection Rate" 
          value={data.summary.collectionRate} 
          format="percent"
          icon={Wallet}
          color="cyan"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'overview' 
              ? "bg-white/10 text-foreground" 
              : "text-foreground/60 hover:text-foreground"
          )}
        >
          <PieChart className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'transactions' 
              ? "bg-white/10 text-foreground" 
              : "text-foreground/60 hover:text-foreground"
          )}
        >
          <TableIcon className="h-4 w-4" />
          All Transactions
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment Methods */}
            <div className={styles.sectionCard}>
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/10">
                    <CreditCard className="h-5 w-5 text-fuchsia-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Payment Methods</h3>
                    <p className="text-xs text-foreground/50">Revenue by payment type</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.byPaymentMethod.length > 0 ? (
                    data.byPaymentMethod.map(method => (
                      <PaymentMethodBar key={method.method} data={method} />
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-foreground/50">
                      No payment data for this period
                    </p>
                  )}
                </div>
              </div>
              <div className={styles.sectionCardInner} />
            </div>

            {/* Product Revenue */}
            <div className={styles.sectionCard}>
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Revenue by Product</h3>
                    <p className="text-xs text-foreground/50">Top performing rentals</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.byProduct.length > 0 ? (
                    data.byProduct.slice(0, 5).map(product => (
                      <ProductRevenueBar key={product.productId} data={product} />
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-foreground/50">
                      No product data for this period
                    </p>
                  )}
                </div>
              </div>
              <div className={styles.sectionCardInner} />
            </div>
          </div>

          {/* Monthly Trend */}
          <div className={styles.sectionCard}>
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Monthly Trend</h3>
                  <p className="text-xs text-foreground/50">Revenue over time</p>
                </div>
              </div>

              {data.monthlyTrend.length > 0 ? (
                <div className="mt-6">
                  <MonthlyChart data={data.monthlyTrend} />
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-foreground/50">
                  Not enough data to show monthly trend
                </p>
              )}
            </div>
            <div className={styles.sectionCardInner} />
          </div>
        </>
      ) : (
        /* Transactions Table */
        <div className={styles.sectionCard}>
          <div className="p-5 sm:p-6">
            {/* Table Controls */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold">All Transactions</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[200px] border-white/10 bg-white/5 pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] border-white/10 bg-white/5">
                    <Filter className="mr-2 h-4 w-4 text-foreground/50" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wide text-foreground/50">
                    <th className="pb-3 pr-4">Booking</th>
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Event Date</th>
                    <th className="pb-3 pr-4 text-right">Subtotal</th>
                    <th className="pb-3 pr-4 text-right">Paid</th>
                    <th className="pb-3 pr-4 text-right">Refund</th>
                    <th className="pb-3 pr-4 text-right">Net</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTransactions.map(t => (
                    <TransactionRow key={t.bookingId} transaction={t} />
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm text-foreground/50">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-sm text-foreground/50">
              <span>Showing {filteredTransactions.length} of {data.recentTransactions.length} transactions</span>
              <span>
                Total Net: <span className="font-semibold text-green-400">
                  ${filteredTransactions.reduce((sum, t) => sum + t.netRevenue, 0).toLocaleString()}
                </span>
              </span>
            </div>
          </div>
          <div className={styles.sectionCardInner} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  comparison, 
  format = 'number',
  subtitle,
  highlighted,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: 'green' | 'red' | 'cyan' | 'amber' | 'purple' | 'fuchsia';
  comparison?: { change: number; changePercent: number; trend: 'up' | 'down' | 'flat' };
  format?: 'currency' | 'number' | 'percent';
  subtitle?: string;
  highlighted?: boolean;
}) {
  const colorClasses = {
    green: { bg: 'bg-green-500/10', text: 'text-green-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    fuchsia: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400' },
  };

  const formatValue = (v: number) => {
    if (format === 'currency') return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (format === 'percent') return `${v.toFixed(1)}%`;
    return v.toLocaleString();
  };

  return (
    <div className={cn(
      styles.card,
      highlighted && "ring-1 ring-cyan-500/30"
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", colorClasses[iconColor].bg)}>
            <Icon className={cn("h-5 w-5", colorClasses[iconColor].text)} />
          </div>
          {comparison && comparison.trend !== 'flat' && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              comparison.trend === 'up' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}>
              {comparison.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(comparison.changePercent).toFixed(0)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">{title}</p>
          <p className={cn("mt-1 text-2xl font-semibold", highlighted && "text-cyan-400")}>
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-foreground/50">{subtitle}</p>
          )}
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

function MiniStat({ 
  label, 
  value, 
  icon: Icon,
  format = 'number',
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  format?: 'currency' | 'number' | 'percent';
  color?: 'green' | 'cyan';
}) {
  const formatValue = (v: number) => {
    if (format === 'currency') return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (format === 'percent') return `${v.toFixed(1)}%`;
    return v.toLocaleString();
  };

  return (
    <div className={styles.nestedCard}>
      <div className="flex items-center gap-3 p-4">
        <Icon className="h-4 w-4 text-foreground/40" />
        <div>
          <p className="text-xs text-foreground/50">{label}</p>
          <p className={cn(
            "text-lg font-semibold",
            color === 'green' && "text-green-400",
            color === 'cyan' && "text-cyan-400"
          )}>
            {formatValue(value)}
          </p>
        </div>
      </div>
      <div className={styles.nestedCardInner} />
    </div>
  );
}

function PaymentMethodBar({ data }: { data: FinancialDashboardData['byPaymentMethod'][0] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/80">{data.methodLabel}</span>
        <span className="font-medium">${data.totalAmount.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
          style={{ width: `${Math.min(data.percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-foreground/50">
        <span>{data.transactionCount} transactions</span>
        <span>{data.percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function ProductRevenueBar({ data }: { data: FinancialDashboardData['byProduct'][0] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/80">{data.productName}</span>
        <span className="font-medium text-green-400">${data.netRevenue.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          style={{ width: `${Math.min(data.percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-foreground/50">
        <span>{data.bookingCount} bookings</span>
        <span>{data.percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function MonthlyChart({ data }: { data: FinancialDashboardData['monthlyTrend'] }) {
  const maxRevenue = Math.max(...data.map(d => d.netRevenue), 1);

  return (
    <div className="space-y-2">
      {data.slice(-12).map((month, i) => (
        <div key={month.month} className="flex items-center gap-3">
          <span className="w-20 text-xs text-foreground/50">{month.monthLabel}</span>
          <div className="flex-1">
            <div className="h-6 overflow-hidden rounded-lg bg-white/5">
              <div 
                className="flex h-full items-center rounded-lg bg-gradient-to-r from-purple-500/80 to-cyan-500/80 px-2"
                style={{ width: `${(month.netRevenue / maxRevenue) * 100}%`, minWidth: month.netRevenue > 0 ? '60px' : '0' }}
              >
                {month.netRevenue > 0 && (
                  <span className="text-xs font-medium text-white">
                    ${month.netRevenue.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="w-16 text-right text-xs text-foreground/50">
            {month.bookingCount} bookings
          </span>
        </div>
      ))}
    </div>
  );
}

function TransactionRow({ transaction: t }: { transaction: BookingFinancialRecord }) {
  return (
    <tr className="text-sm hover:bg-white/[0.02]">
      <td className="py-3 pr-4">
        <a 
          href={`/admin/bookings/${t.bookingId}`}
          className="font-medium text-cyan-400 hover:underline"
        >
          {t.bookingNumber}
        </a>
      </td>
      <td className="py-3 pr-4">
        <div>
          <p className="text-foreground/90">{t.customerName}</p>
          <p className="text-xs text-foreground/50">{t.customerEmail}</p>
        </div>
      </td>
      <td className="py-3 pr-4 text-foreground/70">{t.productName}</td>
      <td className="py-3 pr-4 text-foreground/70">
        {new Date(t.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="py-3 pr-4 text-right text-foreground/70">${t.subtotal}</td>
      <td className="py-3 pr-4 text-right">
        <span className={t.totalPaid > 0 ? "text-green-400" : "text-foreground/50"}>
          ${t.totalPaid}
        </span>
      </td>
      <td className="py-3 pr-4 text-right">
        {t.refundAmount ? (
          <span className="text-red-400">-${t.refundAmount}</span>
        ) : (
          <span className="text-foreground/30">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-right font-medium">
        <span className={t.netRevenue > 0 ? "text-green-400" : t.netRevenue < 0 ? "text-red-400" : "text-foreground/50"}>
          ${t.netRevenue}
        </span>
      </td>
      <td className="py-3">
        <Badge className={cn("text-[10px]", getPaymentStatusColor(t.paymentStatus))}>
          {getPaymentStatusLabel(t.paymentStatus)}
        </Badge>
      </td>
    </tr>
  );
}
