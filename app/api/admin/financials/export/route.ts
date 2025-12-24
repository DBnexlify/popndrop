// =============================================================================
// FINANCIAL EXPORT API
// app/api/admin/financials/export/route.ts
// Export financial data to Excel (xlsx)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, createServerClient } from '@/lib/supabase';
import { generateFinancialExcel, generateSimpleExpenseExcel } from '@/lib/excel-export';
import { getFinancialMetrics, getExpenses, getExpenseSummaryByCategory } from '@/lib/financial-queries';
import { getTimePeriodDates } from '@/lib/financial-types';
import type { TimePeriod, DateRange } from '@/lib/financial-types';

// =============================================================================
// GET - Export financial data as Excel
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'this_year') as TimePeriod;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const format = searchParams.get('format') || 'full'; // 'full' or 'expenses'

    // Build date range
    let dateRange: DateRange;
    if (period === 'custom' && startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    } else {
      dateRange = getTimePeriodDates(period);
    }

    // Determine tax year from date range
    const taxYear = new Date(dateRange.end).getFullYear();

    const supabase = createServerClient();

    // Fetch all required data
    const [metrics, expensesResult, categorySummary, paymentsResult] = await Promise.all([
      getFinancialMetrics(period, dateRange.start, dateRange.end),
      getExpenses({ 
        startDate: dateRange.start, 
        endDate: dateRange.end,
        limit: 1000 
      }),
      getExpenseSummaryByCategory(taxYear),
      // Fetch payments with booking info
      supabase
        .from('payments')
        .select(`
          id,
          created_at,
          amount,
          stripe_fee,
          payment_type,
          status,
          booking:bookings(booking_number, event_date)
        `)
        .eq('status', 'succeeded')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59Z')
        .order('created_at', { ascending: false }),
    ]);

    // Simple expenses-only export
    if (format === 'expenses') {
      const buffer = await generateSimpleExpenseExcel(expensesResult.expenses, taxYear);
      
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="expenses-${taxYear}.xlsx"`,
        },
      });
    }

    // Transform payments data - Supabase returns booking as array, we need single object
    const payments = (paymentsResult.data || []).map((p) => ({
      id: p.id,
      created_at: p.created_at,
      amount: p.amount,
      stripe_fee: p.stripe_fee,
      payment_type: p.payment_type,
      status: p.status,
      booking: Array.isArray(p.booking) ? p.booking[0] || null : p.booking,
    }));

    // Full financial report
    const buffer = await generateFinancialExcel({
      payments,
      expenses: expensesResult.expenses,
      categorySummary,
      metrics,
      dateRange,
      taxYear,
    });

    // Return as downloadable file
    const filename = `pop-and-drop-financials-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Financial export error:', error);
    return NextResponse.json(
      { error: 'Failed to export financial data' },
      { status: 500 }
    );
  }
}
