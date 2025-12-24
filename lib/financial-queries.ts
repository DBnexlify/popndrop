// =============================================================================
// FINANCIAL QUERIES - Pop and Drop Party Rentals
// Server-side database operations for financial tracking
// =============================================================================

import { createServerClient } from './supabase';
import type {
  ExpenseCategory,
  Expense,
  ExpenseInsert,
  ExpenseUpdate,
  ExpenseWithCategory,
  ExpenseWithBooking,
  Refund,
  RefundInsert,
  RefundWithRelations,
  FinancialMetrics,
  FinancialPeriod,
  DailyFinancialSummary,
  ExpenseSummaryByCategory,
  BookingFinancials,
  DateRange,
} from './financial-types';

// =============================================================================
// EXPENSE CATEGORIES
// =============================================================================

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('[FINANCIAL] Error fetching expense categories:', error);
    throw error;
  }
  
  return data || [];
}

// =============================================================================
// EXPENSES CRUD
// =============================================================================

export async function getExpenses(options: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  bookingId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ expenses: ExpenseWithBooking[]; total: number }> {
  const supabase = createServerClient();
  const { startDate, endDate, categoryId, bookingId, limit = 50, offset = 0 } = options;
  
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      booking:bookings(booking_number, event_date, delivery_address, delivery_city)
    `, { count: 'exact' });
  
  if (startDate) {
    query = query.gte('expense_date', startDate);
  }
  if (endDate) {
    query = query.lte('expense_date', endDate);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (bookingId) {
    query = query.eq('booking_id', bookingId);
  }
  
  const { data, error, count } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('[FINANCIAL] Error fetching expenses:', error);
    throw error;
  }
  
  return {
    expenses: data || [],
    total: count || 0,
  };
}

export async function getExpenseById(id: string): Promise<ExpenseWithBooking | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      booking:bookings(booking_number, event_date, delivery_address, delivery_city)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[FINANCIAL] Error fetching expense:', error);
    return null;
  }
  
  return data;
}

export async function createExpense(expense: ExpenseInsert): Promise<Expense> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();
  
  if (error) {
    console.error('[FINANCIAL] Error creating expense:', error);
    throw error;
  }
  
  return data;
}

export async function updateExpense(id: string, updates: ExpenseUpdate): Promise<Expense> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[FINANCIAL] Error updating expense:', error);
    throw error;
  }
  
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[FINANCIAL] Error deleting expense:', error);
    throw error;
  }
}

// =============================================================================
// REFUNDS
// =============================================================================

export async function getRefunds(options: {
  startDate?: string;
  endDate?: string;
  bookingId?: string;
  status?: string;
  limit?: number;
}): Promise<RefundWithRelations[]> {
  const supabase = createServerClient();
  const { startDate, endDate, bookingId, status, limit = 50 } = options;
  
  let query = supabase
    .from('refunds')
    .select(`
      *,
      booking:bookings(booking_number, customer_id),
      payment:payments(amount, stripe_fee)
    `);
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  if (bookingId) {
    query = query.eq('booking_id', bookingId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[FINANCIAL] Error fetching refunds:', error);
    throw error;
  }
  
  return data || [];
}

export async function createRefund(refund: RefundInsert): Promise<Refund> {
  const supabase = createServerClient();
  
  // Get original payment to calculate lost fees
  const { data: payment } = await supabase
    .from('payments')
    .select('amount, stripe_fee')
    .eq('id', refund.payment_id)
    .single();
  
  const originalFee = payment?.stripe_fee || 0;
  
  const { data, error } = await supabase
    .from('refunds')
    .insert({
      ...refund,
      original_stripe_fee_lost: originalFee,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[FINANCIAL] Error creating refund:', error);
    throw error;
  }
  
  return data;
}

export async function updateRefundStatus(
  id: string, 
  status: 'completed' | 'failed',
  stripeRefundId?: string
): Promise<Refund> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('refunds')
    .update({
      status,
      stripe_refund_id: stripeRefundId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[FINANCIAL] Error updating refund status:', error);
    throw error;
  }
  
  return data;
}

// =============================================================================
// FINANCIAL METRICS
// =============================================================================

export async function getFinancialMetrics(
  period: FinancialPeriod = 'this_month',
  customStart?: string,
  customEnd?: string
): Promise<FinancialMetrics> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase.rpc('get_financial_metrics', {
    p_period: period,
    p_start_date: customStart || null,
    p_end_date: customEnd || null,
  });
  
  if (error) {
    console.error('[FINANCIAL] Error fetching metrics:', error);
    // Return zeros instead of throwing
    return {
      gross_revenue: 0,
      stripe_fees: 0,
      net_revenue: 0,
      total_expenses: 0,
      total_refunds: 0,
      net_profit: 0,
      booking_count: 0,
      avg_booking_value: 0,
    };
  }
  
  // RPC returns an array with one row
  const metrics = data?.[0] || {};
  
  return {
    gross_revenue: Number(metrics.gross_revenue) || 0,
    stripe_fees: Number(metrics.stripe_fees) || 0,
    net_revenue: Number(metrics.net_revenue) || 0,
    total_expenses: Number(metrics.total_expenses) || 0,
    total_refunds: Number(metrics.total_refunds) || 0,
    net_profit: Number(metrics.net_profit) || 0,
    booking_count: Number(metrics.booking_count) || 0,
    avg_booking_value: Number(metrics.avg_booking_value) || 0,
  };
}

export async function getDailyFinancialSummary(
  days: number = 30
): Promise<DailyFinancialSummary[]> {
  const supabase = createServerClient();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('financial_daily_summary')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });
  
  if (error) {
    console.error('[FINANCIAL] Error fetching daily summary:', error);
    return [];
  }
  
  return data || [];
}

export async function getExpenseSummaryByCategory(
  year?: number
): Promise<ExpenseSummaryByCategory[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('expense_summary_by_category')
    .select('*');
  
  // Note: This view doesn't filter by year by default
  // You may want to create a function for year filtering
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[FINANCIAL] Error fetching category summary:', error);
    return [];
  }
  
  return data || [];
}

// =============================================================================
// BOOKING FINANCIALS
// =============================================================================

export async function getBookingFinancials(bookingId: string): Promise<BookingFinancials | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase.rpc('get_booking_financials', {
    p_booking_id: bookingId,
  });
  
  if (error) {
    console.error('[FINANCIAL] Error fetching booking financials:', error);
    return null;
  }
  
  const row = data?.[0];
  if (!row) return null;
  
  return {
    booking_number: row.booking_number,
    total_amount: Number(row.total_amount) || 0,
    amount_paid: Number(row.amount_paid) || 0,
    stripe_fees_paid: Number(row.stripe_fees_paid) || 0,
    net_received: Number(row.net_received) || 0,
    amount_refunded: Number(row.amount_refunded) || 0,
    fees_lost_to_refunds: Number(row.fees_lost_to_refunds) || 0,
    related_expenses: Number(row.related_expenses) || 0,
    net_profit: Number(row.net_profit) || 0,
    payment_methods: row.payment_methods || [],
  };
}

// =============================================================================
// QUICK EXPENSE HELPERS
// =============================================================================

/**
 * Log a delivery-related expense quickly
 */
export async function logDeliveryExpense(
  bookingId: string,
  categoryName: 'Fuel/Gas' | 'Meals' | 'Other',
  amount: number,
  description: string
): Promise<Expense> {
  const supabase = createServerClient();
  
  // Get category ID
  const { data: category } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('name', categoryName)
    .single();
  
  if (!category) {
    throw new Error(`Category not found: ${categoryName}`);
  }
  
  return createExpense({
    booking_id: bookingId,
    category_id: category.id,
    amount,
    description,
    prompt_source: 'delivery_prompt',
  });
}

/**
 * Get expenses for a specific booking
 */
export async function getBookingExpenses(bookingId: string): Promise<ExpenseWithCategory[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*)
    `)
    .eq('booking_id', bookingId)
    .order('expense_date', { ascending: false });
  
  if (error) {
    console.error('[FINANCIAL] Error fetching booking expenses:', error);
    return [];
  }
  
  return data || [];
}

// =============================================================================
// PAYMENT ENHANCEMENTS
// =============================================================================

/**
 * Update payment with Stripe fee information
 */
export async function updatePaymentWithFees(
  paymentId: string,
  stripeFee: number
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('payments')
    .update({ stripe_fee: stripeFee })
    .eq('id', paymentId);
  
  if (error) {
    console.error('[FINANCIAL] Error updating payment fees:', error);
    throw error;
  }
}

/**
 * Record a manual payment (cash, Zelle, Venmo, etc.)
 */
export async function recordManualPayment(params: {
  bookingId: string;
  amount: number;
  paymentMethod: 'cash' | 'zelle' | 'venmo' | 'cashapp' | 'check';
  paymentType: 'deposit' | 'balance' | 'full';
  notes?: string;
}): Promise<void> {
  const supabase = createServerClient();
  
  const { bookingId, amount, paymentMethod, paymentType, notes } = params;
  
  // Create payment record
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      amount,
      payment_type: paymentType,
      payment_method: paymentMethod,
      status: 'succeeded',
      stripe_fee: 0, // No fee for manual payments
      is_manual_entry: true,
      notes,
      completed_at: new Date().toISOString(),
    });
  
  if (paymentError) {
    console.error('[FINANCIAL] Error recording manual payment:', paymentError);
    throw paymentError;
  }
  
  // Update booking payment status
  const updateData: Record<string, unknown> = {};
  
  if (paymentType === 'deposit') {
    updateData.deposit_paid = true;
    updateData.deposit_paid_at = new Date().toISOString();
  } else if (paymentType === 'balance' || paymentType === 'full') {
    updateData.balance_paid = true;
    updateData.balance_paid_at = new Date().toISOString();
    updateData.balance_payment_method = paymentMethod;
    updateData.final_amount_collected = amount;
    
    if (paymentType === 'full') {
      updateData.deposit_paid = true;
      updateData.deposit_paid_at = new Date().toISOString();
    }
  }
  
  const { error: bookingError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId);
  
  if (bookingError) {
    console.error('[FINANCIAL] Error updating booking payment status:', bookingError);
    throw bookingError;
  }
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

export async function getFinancialDashboardStats(): Promise<FinancialDashboardStats> {
  const [
    today,
    thisWeek,
    thisMonth,
    thisYear,
    recentExpensesResult,
    topExpenseCategories,
  ] = await Promise.all([
    getFinancialMetrics('today'),
    getFinancialMetrics('this_week'),
    getFinancialMetrics('this_month'),
    getFinancialMetrics('this_year'),
    getExpenses({ limit: 5 }),
    getExpenseSummaryByCategory(),
  ]);
  
  return {
    today,
    thisWeek,
    thisMonth,
    thisYear,
    recentExpenses: recentExpensesResult.expenses,
    topExpenseCategories: topExpenseCategories.slice(0, 5),
  };
}

// =============================================================================
// CSV EXPORT
// =============================================================================

export async function exportFinancialDataCSV(dateRange: DateRange): Promise<string> {
  const supabase = createServerClient();
  
  // Get payments in date range
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(booking_number, event_date, customer_id)
    `)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59Z')
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false });

  // Get expenses in date range
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(name)
    `)
    .gte('expense_date', dateRange.start)
    .lte('expense_date', dateRange.end)
    .order('expense_date', { ascending: false });

  // Build CSV
  const lines: string[] = [];
  
  // Header
  lines.push('Type,Date,Description,Category,Amount,Stripe Fee,Net Amount,Booking Number');
  
  // Revenue entries
  for (const payment of payments || []) {
    const date = new Date(payment.created_at).toISOString().split('T')[0];
    const bookingNum = payment.booking?.booking_number || '';
    const stripeFee = payment.stripe_fee || 0;
    const netAmount = payment.amount - stripeFee;
    lines.push(
      `Revenue,${date},Payment received,Income,${payment.amount.toFixed(2)},${stripeFee.toFixed(2)},${netAmount.toFixed(2)},${bookingNum}`
    );
  }
  
  // Expense entries
  for (const expense of expenses || []) {
    const categoryName = expense.category?.name || 'Other';
    lines.push(
      `Expense,${expense.expense_date},${expense.description.replace(/,/g, ';')},${categoryName},-${expense.amount.toFixed(2)},0.00,-${expense.amount.toFixed(2)},`
    );
  }
  
  return lines.join('\n');
}
