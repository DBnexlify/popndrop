// =============================================================================
// FINANCIAL ACCOUNTING TYPES - Pop and Drop Party Rentals
// Single source of truth for all financial tracking
// =============================================================================

// =============================================================================
// EXPENSE CATEGORIES
// =============================================================================

export interface ExpenseCategory {
  id: string;
  name: string;
  irs_category: string | null;
  description: string | null;
  is_tax_deductible: boolean;
  deduction_percent: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  schedule_c_line: string | null;
}

// =============================================================================
// EXPENSES
// =============================================================================

export type ExpensePromptSource = 
  | 'delivery_prompt' 
  | 'pickup_prompt' 
  | 'manual' 
  | 'recurring_auto';

export type RecurrenceInterval = 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'yearly';

export interface Expense {
  id: string;
  booking_id: string | null;
  category_id: string;
  amount: number;
  vendor_name: string | null;
  description: string;
  expense_date: string;
  is_tax_deductible: boolean;
  tax_year: number;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  parent_recurring_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  prompt_source: ExpensePromptSource;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ExpenseInsert {
  booking_id?: string | null;
  category_id: string;
  amount: number;
  vendor_name?: string | null;
  description: string;
  expense_date?: string;
  is_tax_deductible?: boolean;
  is_recurring?: boolean;
  recurrence_interval?: RecurrenceInterval | null;
  parent_recurring_id?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  prompt_source?: ExpensePromptSource;
}

export interface ExpenseUpdate extends Partial<ExpenseInsert> {}

export interface ExpenseWithCategory extends Expense {
  category: ExpenseCategory;
}

export interface ExpenseWithBooking extends ExpenseWithCategory {
  booking?: {
    booking_number: string;
    event_date: string;
    delivery_address: string;
    delivery_city: string;
  } | null;
}

// =============================================================================
// REFUNDS
// =============================================================================

export type RefundType = 
  | 'full_refund' 
  | 'partial_refund' 
  | 'deposit_return' 
  | 'damage_adjustment'
  | 'weather_cancellation';

export type RefundStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export interface Refund {
  id: string;
  payment_id: string;
  booking_id: string;
  amount: number;
  refund_type: RefundType;
  reason: string;
  stripe_refund_id: string | null;
  original_stripe_fee_lost: number;
  status: RefundStatus;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  notes: string | null;
}

export interface RefundInsert {
  payment_id: string;
  booking_id: string;
  amount: number;
  refund_type: RefundType;
  reason: string;
  stripe_refund_id?: string | null;
  original_stripe_fee_lost?: number;
  status?: RefundStatus;
  notes?: string | null;
}

export interface RefundWithRelations extends Refund {
  booking: {
    booking_number: string;
    customer_id: string;
  };
  payment: {
    amount: number;
    stripe_fee: number | null;
  };
}

// =============================================================================
// FINANCIAL METRICS
// =============================================================================

export type FinancialPeriod = 
  | 'today'
  | 'this_week'
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'this_quarter'
  | 'this_year'
  | 'all_time'
  | 'custom';

// Alias for backward compatibility
export type TimePeriod = FinancialPeriod;

export interface DateRange {
  start: string;
  end: string;
}

export interface FinancialMetrics {
  gross_revenue: number;
  stripe_fees: number;
  net_revenue: number;
  total_expenses: number;
  total_refunds: number;
  net_profit: number;
  booking_count: number;
  avg_booking_value: number;
}

export interface DailyFinancialSummary {
  date: string;
  bookings: number;
  gross_revenue: number;
  stripe_fees: number;
  net_revenue: number;
  expenses: number;
  refunds: number;
  net_profit: number;
}

export interface ExpenseSummaryByCategory {
  category_id: string;
  category_name: string;
  irs_category: string | null;
  schedule_c_line: string | null;
  deduction_percent: number;
  transaction_count: number;
  total_amount: number;
  deductible_amount: number;
  first_expense: string | null;
  last_expense: string | null;
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================

export interface FinancialDashboardStats {
  today: FinancialMetrics;
  thisWeek: FinancialMetrics;
  thisMonth: FinancialMetrics;
  thisYear: FinancialMetrics;
  recentExpenses: ExpenseWithCategory[];
  topExpenseCategories: ExpenseSummaryByCategory[];
}

// =============================================================================
// BOOKING FINANCIALS
// =============================================================================

export interface BookingFinancials {
  booking_number: string;
  total_amount: number;
  amount_paid: number;
  stripe_fees_paid: number;
  net_received: number;
  amount_refunded: number;
  fees_lost_to_refunds: number;
  related_expenses: number;
  net_profit: number;
  payment_methods: string[];
}

// =============================================================================
// ENHANCED PAYMENT (with Stripe fee tracking)
// =============================================================================

export interface EnhancedPayment {
  id: string;
  booking_id: string;
  payment_type: string;
  amount: number;
  stripe_fee: number | null;
  stripe_fee_rate: number;
  stripe_fixed_fee: number;
  net_amount: number | null;
  is_manual_entry: boolean;
  recorded_by: string | null;
  notes: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate Stripe fee for a given amount
 * Standard rate: 2.9% + $0.30
 */
export function calculateStripeFee(
  amount: number,
  isInternational = false,
  isManualEntry = false
): number {
  let rate = 0.029;
  if (isInternational) rate += 0.015;
  if (isManualEntry) rate += 0.005;
  return Math.round((amount * rate + 0.30) * 100) / 100;
}

/**
 * Calculate net amount after Stripe fees
 */
export function calculateNetAmount(amount: number, stripeFee?: number): number {
  const fee = stripeFee ?? calculateStripeFee(amount);
  return Math.round((amount - fee) * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get period label for display
 */
export function getPeriodLabel(period: FinancialPeriod): string {
  const labels: Record<FinancialPeriod, string> = {
    today: 'Today',
    this_week: 'This Week',
    last_7_days: 'Last 7 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    last_30_days: 'Last 30 Days',
    this_quarter: 'This Quarter',
    this_year: 'This Year',
    all_time: 'All Time',
    custom: 'Custom Range',
  };
  return labels[period];
}

/**
 * Get expense category icon name (for Lucide icons)
 */
export function getCategoryIcon(categoryName: string): string {
  const icons: Record<string, string> = {
    'Fuel/Gas': 'Fuel',
    'Vehicle Maintenance': 'Wrench',
    'Equipment Repairs': 'Hammer',
    'Equipment Purchases': 'Package',
    'Cleaning Supplies': 'Sparkles',
    'Insurance': 'Shield',
    'Storage/Warehouse': 'Warehouse',
    'Marketing': 'Megaphone',
    'Website/Software': 'Globe',
    'Contract Labor': 'Users',
    'Meals': 'Utensils',
    'Licenses/Permits': 'FileText',
    'Professional Services': 'Briefcase',
    'Office Supplies': 'Paperclip',
    'Bank/Processing Fees': 'CreditCard',
    'Other': 'MoreHorizontal',
  };
  return icons[categoryName] || 'Receipt';
}

/**
 * Get color for profit/loss display
 */
export function getProfitColor(amount: number): string {
  if (amount > 0) return 'text-green-400';
  if (amount < 0) return 'text-red-400';
  return 'text-foreground/70';
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(netProfit: number, grossRevenue: number): number {
  if (grossRevenue === 0) return 0;
  return (netProfit / grossRevenue) * 100;
}

/**
 * Get date range for a time period
 */
export function getTimePeriodDates(period: FinancialPeriod): DateRange {
  const today = new Date();
  const end = today.toISOString().split('T')[0];
  let start: string;

  switch (period) {
    case 'today':
      start = end;
      break;
    case 'this_week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      start = weekStart.toISOString().split('T')[0];
      break;
    }
    case 'last_7_days': {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      start = last7.toISOString().split('T')[0];
      break;
    }
    case 'this_month': {
      start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    }
    case 'last_month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = lastMonth.toISOString().split('T')[0];
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end: lastMonthEnd.toISOString().split('T')[0] };
    }
    case 'last_30_days': {
      const last30 = new Date(today);
      last30.setDate(today.getDate() - 30);
      start = last30.toISOString().split('T')[0];
      break;
    }
    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      start = `${today.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
      break;
    }
    case 'this_year': {
      start = `${today.getFullYear()}-01-01`;
      break;
    }
    case 'all_time':
    default:
      start = '2020-01-01';
      break;
  }

  return { start, end };
}
