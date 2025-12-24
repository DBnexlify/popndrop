// =============================================================================
// FINANCIAL QUERIES
// lib/financial-queries.ts
// Comprehensive financial data queries for accounting dashboard
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import type {
  FinancialSummary,
  PaymentMethodBreakdown,
  ProductRevenueBreakdown,
  MonthlySummary,
  BookingFinancialRecord,
  FinancialDashboardData,
  DateRange,
  TimePeriod,
  FinancialComparison,
  PeriodComparison,
} from './financial-types';
import { getTimePeriodDates, getTimePeriodLabel } from './financial-types';

// =============================================================================
// MAIN DASHBOARD QUERY
// =============================================================================

export async function getFinancialDashboardData(
  period: TimePeriod = 'all_time',
  customRange?: DateRange
): Promise<FinancialDashboardData> {
  const dateRange = period === 'custom' && customRange 
    ? customRange 
    : getTimePeriodDates(period);

  const [summary, byPaymentMethod, byProduct, monthlyTrend, recentTransactions] = await Promise.all([
    getFinancialSummary(dateRange, period),
    getPaymentMethodBreakdown(dateRange),
    getProductRevenueBreakdown(dateRange),
    getMonthlyTrend(dateRange),
    getBookingFinancialRecords({ dateRange, limit: 50 }),
  ]);

  return {
    summary,
    byPaymentMethod,
    byProduct,
    monthlyTrend,
    recentTransactions,
  };
}

// =============================================================================
// FINANCIAL SUMMARY
// =============================================================================

export async function getFinancialSummary(
  dateRange: DateRange,
  period: TimePeriod = 'custom'
): Promise<FinancialSummary> {
  const supabase = createServerClient();

  // Get all payments in date range
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, payment_type, status, refund_amount')
    .gte('created_at', `${dateRange.start}T00:00:00`)
    .lte('created_at', `${dateRange.end}T23:59:59`);

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // Calculate payment totals
  let grossRevenue = 0;
  let depositRevenue = 0;
  let balanceRevenue = 0;
  let refundsIssued = 0;

  (payments || []).forEach(payment => {
    if (payment.status === 'succeeded' || payment.status === 'partial_refund') {
      const amount = Number(payment.amount) || 0;
      grossRevenue += amount;
      
      if (payment.payment_type === 'deposit') {
        depositRevenue += amount;
      } else if (payment.payment_type === 'balance') {
        balanceRevenue += amount;
      }
    }
    
    // Track refunds
    if (payment.status === 'refunded' || payment.status === 'partial_refund') {
      refundsIssued += Number(payment.refund_amount) || 0;
    }
  });

  // Also get refunds from booking records (for manual refunds not in payments table)
  const { data: refundedBookings } = await supabase
    .from('bookings')
    .select('refund_amount')
    .not('refund_amount', 'is', null)
    .gte('refund_processed_at', `${dateRange.start}T00:00:00`)
    .lte('refund_processed_at', `${dateRange.end}T23:59:59`);

  (refundedBookings || []).forEach(booking => {
    // Only add if not already counted in payments
    if (booking.refund_amount) {
      // Check if this refund is already in our payments count
      // For safety, we'll track booking refunds separately
      const refundAmount = Number(booking.refund_amount) || 0;
      // Avoid double-counting - the payments table should be primary source
      // Only add if significantly different from payment refunds
    }
  });

  // Get booking counts
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, status, subtotal, balance_due, deposit_paid, balance_paid')
    .gte('created_at', `${dateRange.start}T00:00:00`)
    .lte('created_at', `${dateRange.end}T23:59:59`);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
  }

  const totalBookings = bookings?.length || 0;
  const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;

  // Calculate outstanding amounts
  let outstandingDeposits = 0;
  let outstandingBalances = 0;

  (bookings || []).forEach(booking => {
    if (booking.status !== 'cancelled' && booking.status !== 'completed') {
      if (!booking.deposit_paid) {
        outstandingDeposits += 50; // Standard deposit amount
      }
      if (!booking.balance_paid && booking.balance_due > 0) {
        outstandingBalances += Number(booking.balance_due) || 0;
      }
    }
  });

  const netRevenue = grossRevenue - refundsIssued;
  const averageBookingValue = completedBookings > 0 ? netRevenue / completedBookings : 0;
  const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
  
  // Expected revenue = sum of all non-cancelled booking subtotals
  const expectedRevenue = (bookings || [])
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (Number(b.subtotal) || 0), 0);
  const collectionRate = expectedRevenue > 0 ? (grossRevenue / expectedRevenue) * 100 : 0;

  return {
    grossRevenue,
    refundsIssued,
    netRevenue,
    depositRevenue,
    balanceRevenue,
    outstandingDeposits,
    outstandingBalances,
    totalBookings,
    completedBookings,
    cancelledBookings,
    averageBookingValue,
    cancellationRate,
    collectionRate,
    periodStart: dateRange.start,
    periodEnd: dateRange.end,
    periodLabel: getTimePeriodLabel(period),
  };
}

// =============================================================================
// PAYMENT METHOD BREAKDOWN
// =============================================================================

export async function getPaymentMethodBreakdown(
  dateRange: DateRange
): Promise<PaymentMethodBreakdown[]> {
  const supabase = createServerClient();

  // Get payments with method info
  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, payment_method, card_brand')
    .in('status', ['succeeded', 'partial_refund'])
    .gte('created_at', `${dateRange.start}T00:00:00`)
    .lte('created_at', `${dateRange.end}T23:59:59`);

  if (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }

  // Also get balance payment methods from bookings (for cash, venmo, zelle)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('balance_due, balance_payment_method')
    .eq('balance_paid', true)
    .not('balance_payment_method', 'is', null)
    .gte('balance_paid_at', `${dateRange.start}T00:00:00`)
    .lte('balance_paid_at', `${dateRange.end}T23:59:59`);

  // Group by payment method
  const methodTotals = new Map<string, { count: number; amount: number }>();

  // Process Stripe payments
  (payments || []).forEach(payment => {
    const method = payment.payment_method || payment.card_brand || 'card';
    const normalizedMethod = normalizePaymentMethod(method);
    
    const current = methodTotals.get(normalizedMethod) || { count: 0, amount: 0 };
    current.count++;
    current.amount += Number(payment.amount) || 0;
    methodTotals.set(normalizedMethod, current);
  });

  // Process balance payments (cash, venmo, zelle)
  (bookings || []).forEach(booking => {
    const method = booking.balance_payment_method;
    if (method) {
      const normalizedMethod = normalizePaymentMethod(method);
      const current = methodTotals.get(normalizedMethod) || { count: 0, amount: 0 };
      current.count++;
      current.amount += Number(booking.balance_due) || 0;
      methodTotals.set(normalizedMethod, current);
    }
  });

  // Calculate total for percentages
  const totalAmount = Array.from(methodTotals.values())
    .reduce((sum, m) => sum + m.amount, 0);

  // Convert to array and sort
  const result: PaymentMethodBreakdown[] = Array.from(methodTotals.entries())
    .map(([method, data]) => ({
      method,
      methodLabel: getPaymentMethodLabel(method),
      transactionCount: data.count,
      totalAmount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return result;
}

function normalizePaymentMethod(method: string): string {
  const normalized = method.toLowerCase().trim();
  if (normalized.includes('card') || normalized.includes('visa') || 
      normalized.includes('mastercard') || normalized.includes('amex')) {
    return 'card';
  }
  if (normalized.includes('cash')) return 'cash';
  if (normalized.includes('venmo')) return 'venmo';
  if (normalized.includes('zelle')) return 'zelle';
  if (normalized.includes('stripe')) return 'card';
  return normalized || 'other';
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    card: 'Credit/Debit Card',
    cash: 'Cash',
    venmo: 'Venmo',
    zelle: 'Zelle',
    other: 'Other',
  };
  return labels[method] || method;
}

// =============================================================================
// PRODUCT REVENUE BREAKDOWN
// =============================================================================

export async function getProductRevenueBreakdown(
  dateRange: DateRange
): Promise<ProductRevenueBreakdown[]> {
  const supabase = createServerClient();

  // Get bookings with product info and payment status
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      subtotal,
      deposit_paid,
      balance_paid,
      refund_amount,
      product_snapshot
    `)
    .gte('created_at', `${dateRange.start}T00:00:00`)
    .lte('created_at', `${dateRange.end}T23:59:59`)
    .neq('status', 'pending'); // Exclude pending (not confirmed)

  if (error) {
    console.error('Error fetching product revenue:', error);
    return [];
  }

  // Group by product
  const productTotals = new Map<string, {
    productId: string;
    productName: string;
    productSlug: string;
    bookingCount: number;
    grossRevenue: number;
    refunds: number;
  }>();

  (bookings || []).forEach(booking => {
    const snapshot = booking.product_snapshot as { id?: string; name?: string; slug?: string } | null;
    const productId = snapshot?.id || 'unknown';
    const productName = snapshot?.name || 'Unknown Product';
    const productSlug = snapshot?.slug || 'unknown';

    const current = productTotals.get(productId) || {
      productId,
      productName,
      productSlug,
      bookingCount: 0,
      grossRevenue: 0,
      refunds: 0,
    };

    current.bookingCount++;
    
    // Add revenue if paid
    if (booking.status !== 'cancelled') {
      if (booking.deposit_paid) {
        current.grossRevenue += 50; // Standard deposit
      }
      if (booking.balance_paid) {
        current.grossRevenue += Number(booking.subtotal) - 50; // Balance portion
      }
    }

    // Track refunds
    if (booking.refund_amount) {
      current.refunds += Number(booking.refund_amount);
    }

    productTotals.set(productId, current);
  });

  // Calculate total for percentages
  const totalNet = Array.from(productTotals.values())
    .reduce((sum, p) => sum + (p.grossRevenue - p.refunds), 0);

  // Convert to array
  const result: ProductRevenueBreakdown[] = Array.from(productTotals.values())
    .map(data => ({
      productId: data.productId,
      productName: data.productName,
      productSlug: data.productSlug,
      bookingCount: data.bookingCount,
      grossRevenue: data.grossRevenue,
      refunds: data.refunds,
      netRevenue: data.grossRevenue - data.refunds,
      percentage: totalNet > 0 ? ((data.grossRevenue - data.refunds) / totalNet) * 100 : 0,
    }))
    .sort((a, b) => b.netRevenue - a.netRevenue);

  return result;
}

// =============================================================================
// MONTHLY TREND
// =============================================================================

export async function getMonthlyTrend(
  dateRange: DateRange
): Promise<MonthlySummary[]> {
  const supabase = createServerClient();

  // Get all bookings in range
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      subtotal,
      deposit_paid,
      balance_paid,
      refund_amount,
      created_at
    `)
    .gte('created_at', `${dateRange.start}T00:00:00`)
    .lte('created_at', `${dateRange.end}T23:59:59`);

  if (error) {
    console.error('Error fetching monthly trend:', error);
    return [];
  }

  // Group by month
  const monthlyData = new Map<string, MonthlySummary>();

  (bookings || []).forEach(booking => {
    const date = new Date(booking.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const current = monthlyData.get(monthKey) || {
      month: monthKey,
      monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      bookingCount: 0,
      grossRevenue: 0,
      refunds: 0,
      netRevenue: 0,
      cancelledCount: 0,
    };

    current.bookingCount++;

    if (booking.status === 'cancelled') {
      current.cancelledCount++;
    } else {
      // Calculate revenue
      if (booking.deposit_paid) {
        current.grossRevenue += 50;
      }
      if (booking.balance_paid) {
        current.grossRevenue += Number(booking.subtotal) - 50;
      }
    }

    if (booking.refund_amount) {
      current.refunds += Number(booking.refund_amount);
    }

    current.netRevenue = current.grossRevenue - current.refunds;
    monthlyData.set(monthKey, current);
  });

  // Sort by month
  return Array.from(monthlyData.values())
    .sort((a, b) => a.month.localeCompare(b.month));
}

// =============================================================================
// BOOKING FINANCIAL RECORDS (Detailed Table)
// =============================================================================

export async function getBookingFinancialRecords(options: {
  dateRange?: DateRange;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'event_date' | 'netRevenue' | 'status';
  sortOrder?: 'asc' | 'desc';
}): Promise<BookingFinancialRecord[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      status,
      booking_type,
      event_date,
      created_at,
      completed_at,
      cancelled_at,
      subtotal,
      deposit_amount,
      balance_due,
      deposit_paid,
      deposit_paid_at,
      balance_paid,
      balance_paid_at,
      balance_payment_method,
      refund_amount,
      refund_processed_at,
      product_snapshot,
      customer:customers(id, first_name, last_name, email)
    `)
    .order(options.sortBy || 'created_at', { ascending: options.sortOrder === 'asc' });

  // Apply date range filter
  if (options.dateRange) {
    query = query
      .gte('created_at', `${options.dateRange.start}T00:00:00`)
      .lte('created_at', `${options.dateRange.end}T23:59:59`);
  }

  // Apply status filter
  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  // Apply search filter
  if (options.search) {
    query = query.or(`booking_number.ilike.%${options.search}%`);
  }

  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error('Error fetching booking financial records:', error);
    return [];
  }

  // Get payments for these bookings to calculate actual amounts paid
  const bookingIds = (bookings || []).map(b => b.id);
  
  const { data: payments } = await supabase
    .from('payments')
    .select('booking_id, amount, status, payment_type')
    .in('booking_id', bookingIds)
    .in('status', ['succeeded', 'partial_refund']);

  // Create payment totals map
  const paymentsByBooking = new Map<string, number>();
  (payments || []).forEach(payment => {
    const current = paymentsByBooking.get(payment.booking_id) || 0;
    paymentsByBooking.set(payment.booking_id, current + Number(payment.amount));
  });

  // Transform bookings
  return (bookings || []).map(booking => {
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    const snapshot = booking.product_snapshot as { id?: string; name?: string } | null;
    
    const totalPaid = paymentsByBooking.get(booking.id) || 
      ((booking.deposit_paid ? Number(booking.deposit_amount) || 50 : 0) +
       (booking.balance_paid ? Number(booking.balance_due) || 0 : 0));
    
    const refundAmount = Number(booking.refund_amount) || 0;
    const netRevenue = totalPaid - refundAmount;
    
    // Calculate outstanding
    let outstandingBalance = 0;
    if (booking.status !== 'cancelled' && booking.status !== 'completed') {
      if (!booking.deposit_paid) outstandingBalance += 50;
      if (!booking.balance_paid) outstandingBalance += Number(booking.balance_due) || 0;
    }

    // Determine payment status
    let paymentStatus: BookingFinancialRecord['paymentStatus'] = 'unpaid';
    if (refundAmount > 0 && refundAmount >= totalPaid) {
      paymentStatus = 'refunded';
    } else if (refundAmount > 0) {
      paymentStatus = 'partial_refund';
    } else if (booking.deposit_paid && booking.balance_paid) {
      paymentStatus = 'paid_in_full';
    } else if (booking.deposit_paid) {
      paymentStatus = 'deposit_only';
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      status: booking.status,
      bookingType: booking.booking_type,
      eventDate: booking.event_date,
      createdAt: booking.created_at,
      completedAt: booking.completed_at,
      cancelledAt: booking.cancelled_at,
      customerName: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
      customerEmail: customer?.email || '',
      customerId: customer?.id || '',
      productName: snapshot?.name || 'Unknown',
      productId: snapshot?.id || '',
      subtotal: Number(booking.subtotal) || 0,
      depositAmount: Number(booking.deposit_amount) || 50,
      balanceDue: Number(booking.balance_due) || 0,
      depositPaid: booking.deposit_paid || false,
      depositPaidAt: booking.deposit_paid_at,
      balancePaid: booking.balance_paid || false,
      balancePaidAt: booking.balance_paid_at,
      balancePaymentMethod: booking.balance_payment_method,
      totalPaid,
      refundAmount: refundAmount || null,
      refundProcessedAt: booking.refund_processed_at,
      netRevenue,
      outstandingBalance,
      paymentStatus,
    };
  });
}

// =============================================================================
// ALL BOOKINGS COUNT (for pagination)
// =============================================================================

export async function getBookingFinancialCount(options: {
  dateRange?: DateRange;
  status?: string;
  search?: string;
}): Promise<number> {
  const supabase = createServerClient();

  let query = supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true });

  if (options.dateRange) {
    query = query
      .gte('created_at', `${options.dateRange.start}T00:00:00`)
      .lte('created_at', `${options.dateRange.end}T23:59:59`);
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.search) {
    query = query.or(`booking_number.ilike.%${options.search}%`);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting bookings:', error);
    return 0;
  }

  return count || 0;
}

// =============================================================================
// PERIOD COMPARISON
// =============================================================================

export async function getFinancialComparison(
  currentPeriod: TimePeriod
): Promise<FinancialComparison | null> {
  const currentRange = getTimePeriodDates(currentPeriod);
  
  // Calculate previous period range
  const currentStart = new Date(currentRange.start);
  const currentEnd = new Date(currentRange.end);
  const periodLength = currentEnd.getTime() - currentStart.getTime();
  
  const previousEnd = new Date(currentStart.getTime() - 1); // Day before current start
  const previousStart = new Date(previousEnd.getTime() - periodLength);
  
  const previousRange: DateRange = {
    start: previousStart.toISOString().split('T')[0],
    end: previousEnd.toISOString().split('T')[0],
  };

  const [currentSummary, previousSummary] = await Promise.all([
    getFinancialSummary(currentRange, currentPeriod),
    getFinancialSummary(previousRange, 'custom'),
  ]);

  function createComparison(current: number, previous: number): PeriodComparison {
    const change = current - previous;
    const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return {
      current,
      previous,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    };
  }

  return {
    grossRevenue: createComparison(currentSummary.grossRevenue, previousSummary.grossRevenue),
    netRevenue: createComparison(currentSummary.netRevenue, previousSummary.netRevenue),
    bookingCount: createComparison(currentSummary.totalBookings, previousSummary.totalBookings),
    averageBookingValue: createComparison(
      currentSummary.averageBookingValue, 
      previousSummary.averageBookingValue
    ),
  };
}

// =============================================================================
// QUICK STATS FOR MAIN DASHBOARD (Updated to use actual payments)
// =============================================================================

export async function getQuickFinancialStats(): Promise<{
  thisMonth: { gross: number; net: number; refunds: number };
  thisWeek: { gross: number; net: number };
  outstanding: number;
}> {
  const monthRange = getTimePeriodDates('this_month');
  const weekRange = getTimePeriodDates('this_week');

  const [monthSummary, weekSummary] = await Promise.all([
    getFinancialSummary(monthRange, 'this_month'),
    getFinancialSummary(weekRange, 'this_week'),
  ]);

  return {
    thisMonth: {
      gross: monthSummary.grossRevenue,
      net: monthSummary.netRevenue,
      refunds: monthSummary.refundsIssued,
    },
    thisWeek: {
      gross: weekSummary.grossRevenue,
      net: weekSummary.netRevenue,
    },
    outstanding: monthSummary.outstandingBalances + monthSummary.outstandingDeposits,
  };
}

// =============================================================================
// EXPORT TO CSV
// =============================================================================

export async function exportFinancialDataCSV(
  dateRange: DateRange
): Promise<string> {
  const records = await getBookingFinancialRecords({ 
    dateRange, 
    limit: 10000,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // CSV header
  const headers = [
    'Booking Number',
    'Status',
    'Event Date',
    'Created Date',
    'Customer Name',
    'Customer Email',
    'Product',
    'Booking Type',
    'Subtotal',
    'Deposit Paid',
    'Balance Paid',
    'Total Paid',
    'Refund Amount',
    'Net Revenue',
    'Outstanding',
    'Payment Status',
    'Payment Method',
  ];

  // CSV rows
  const rows = records.map(r => [
    r.bookingNumber,
    r.status,
    r.eventDate,
    r.createdAt.split('T')[0],
    r.customerName,
    r.customerEmail,
    r.productName,
    r.bookingType,
    r.subtotal.toFixed(2),
    r.depositPaid ? 'Yes' : 'No',
    r.balancePaid ? 'Yes' : 'No',
    r.totalPaid.toFixed(2),
    (r.refundAmount || 0).toFixed(2),
    r.netRevenue.toFixed(2),
    r.outstandingBalance.toFixed(2),
    r.paymentStatus,
    r.balancePaymentMethod || 'Stripe',
  ]);

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
