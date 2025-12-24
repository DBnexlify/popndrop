// =============================================================================
// FINANCIAL TYPES
// lib/financial-types.ts
// Types for the comprehensive financial tracking system
// =============================================================================

// =============================================================================
// TIME PERIOD OPTIONS
// =============================================================================

export type TimePeriod = 
  | 'all_time'
  | 'this_year'
  | 'this_quarter'
  | 'this_month'
  | 'last_month'
  | 'this_week'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom';

export interface DateRange {
  start: string; // ISO date string
  end: string;   // ISO date string
}

// =============================================================================
// FINANCIAL SUMMARY
// =============================================================================

export interface FinancialSummary {
  // Core revenue metrics
  grossRevenue: number;        // All successful payments received
  refundsIssued: number;       // Total refunds processed
  netRevenue: number;          // Gross - Refunds
  
  // Breakdown by payment type
  depositRevenue: number;      // Deposit payments only
  balanceRevenue: number;      // Balance payments only
  
  // Outstanding
  outstandingDeposits: number; // Bookings without deposit paid
  outstandingBalances: number; // Confirmed+ bookings with balance due
  
  // Booking metrics
  totalBookings: number;       // All bookings in period
  completedBookings: number;   // Completed bookings
  cancelledBookings: number;   // Cancelled bookings
  
  // Calculated
  averageBookingValue: number; // Net / Completed bookings
  cancellationRate: number;    // Cancelled / Total (percentage)
  collectionRate: number;      // Net / Expected (percentage)
  
  // Period info
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
}

// =============================================================================
// PAYMENT METHOD BREAKDOWN
// =============================================================================

export interface PaymentMethodBreakdown {
  method: string;              // 'card', 'cash', 'venmo', 'zelle', 'other'
  methodLabel: string;         // Display label
  transactionCount: number;
  totalAmount: number;
  percentage: number;          // Of total revenue
}

// =============================================================================
// PRODUCT REVENUE BREAKDOWN
// =============================================================================

export interface ProductRevenueBreakdown {
  productId: string;
  productName: string;
  productSlug: string;
  bookingCount: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  percentage: number;          // Of total revenue
}

// =============================================================================
// MONTHLY SUMMARY
// =============================================================================

export interface MonthlySummary {
  month: string;               // 'YYYY-MM' format
  monthLabel: string;          // 'Jan 2024' format
  bookingCount: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  cancelledCount: number;
}

// =============================================================================
// BOOKING FINANCIAL RECORD
// =============================================================================

export interface BookingFinancialRecord {
  // Booking info
  bookingId: string;
  bookingNumber: string;
  status: string;
  bookingType: string;
  
  // Dates
  eventDate: string;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  
  // Customer info
  customerName: string;
  customerEmail: string;
  customerId: string;
  
  // Product info
  productName: string;
  productId: string;
  
  // Financial - Quoted
  subtotal: number;            // Original quoted price
  depositAmount: number;       // Deposit portion
  balanceDue: number;          // Balance portion
  
  // Financial - Actual
  depositPaid: boolean;
  depositPaidAt: string | null;
  balancePaid: boolean;
  balancePaidAt: string | null;
  balancePaymentMethod: string | null;
  
  // Payments received
  totalPaid: number;           // Sum of all successful payments
  
  // Refunds
  refundAmount: number | null;
  refundProcessedAt: string | null;
  
  // Calculated
  netRevenue: number;          // Total paid - refunds
  outstandingBalance: number;  // What's still owed
  paymentStatus: 'unpaid' | 'deposit_only' | 'paid_in_full' | 'refunded' | 'partial_refund';
}

// =============================================================================
// FULL FINANCIAL DASHBOARD DATA
// =============================================================================

export interface FinancialDashboardData {
  summary: FinancialSummary;
  byPaymentMethod: PaymentMethodBreakdown[];
  byProduct: ProductRevenueBreakdown[];
  monthlyTrend: MonthlySummary[];
  recentTransactions: BookingFinancialRecord[];
}

// =============================================================================
// COMPARISON DATA (for showing change vs previous period)
// =============================================================================

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;              // Absolute change
  changePercent: number;       // Percentage change
  trend: 'up' | 'down' | 'flat';
}

export interface FinancialComparison {
  grossRevenue: PeriodComparison;
  netRevenue: PeriodComparison;
  bookingCount: PeriodComparison;
  averageBookingValue: PeriodComparison;
}

// =============================================================================
// EXPORT OPTIONS
// =============================================================================

export interface ExportOptions {
  format: 'csv' | 'json';
  includeCustomerDetails: boolean;
  includePaymentDetails: boolean;
  dateRange: DateRange;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getTimePeriodLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    all_time: 'All Time',
    this_year: 'This Year',
    this_quarter: 'This Quarter',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_week: 'This Week',
    last_7_days: 'Last 7 Days',
    last_30_days: 'Last 30 Days',
    custom: 'Custom Range',
  };
  return labels[period];
}

export function getTimePeriodDates(period: TimePeriod): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'all_time':
      return {
        start: '2020-01-01',
        end: today.toISOString().split('T')[0],
      };
    
    case 'this_year':
      return {
        start: `${now.getFullYear()}-01-01`,
        end: today.toISOString().split('T')[0],
      };
    
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      return {
        start: quarterStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }
    
    case 'this_month':
      return {
        start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        end: today.toISOString().split('T')[0],
      };
    
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonth.toISOString().split('T')[0],
        end: lastMonthEnd.toISOString().split('T')[0],
      };
    }
    
    case 'this_week': {
      const dayOfWeek = now.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }
    
    case 'last_7_days': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return {
        start: weekAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }
    
    case 'last_30_days': {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return {
        start: monthAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }
    
    default:
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
  }
}

export function formatPaymentMethod(method: string | null): string {
  if (!method) return 'Unknown';
  const labels: Record<string, string> = {
    card: 'Credit Card',
    cash: 'Cash',
    venmo: 'Venmo',
    zelle: 'Zelle',
    stripe: 'Stripe',
    other: 'Other',
  };
  return labels[method.toLowerCase()] || method;
}

export function getPaymentStatusLabel(status: BookingFinancialRecord['paymentStatus']): string {
  const labels: Record<typeof status, string> = {
    unpaid: 'Unpaid',
    deposit_only: 'Deposit Only',
    paid_in_full: 'Paid in Full',
    refunded: 'Refunded',
    partial_refund: 'Partial Refund',
  };
  return labels[status];
}

export function getPaymentStatusColor(status: BookingFinancialRecord['paymentStatus']): string {
  const colors: Record<typeof status, string> = {
    unpaid: 'bg-red-500/10 text-red-400 border-red-500/30',
    deposit_only: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    paid_in_full: 'bg-green-500/10 text-green-400 border-green-500/30',
    refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    partial_refund: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  };
  return colors[status];
}
