// =============================================================================
// FINANCIAL EXPORT API
// app/api/admin/financials/export/route.ts
// Export financial data to CSV
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase';
import { exportFinancialDataCSV } from '@/lib/financial-queries';
import { getTimePeriodDates } from '@/lib/financial-types';
import type { TimePeriod, DateRange } from '@/lib/financial-types';

// =============================================================================
// GET - Export financial data as CSV
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all_time') as TimePeriod;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Build date range
    let dateRange: DateRange;
    if (period === 'custom' && startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    } else {
      dateRange = getTimePeriodDates(period);
    }

    // Generate CSV
    const csvContent = await exportFinancialDataCSV(dateRange);

    // Return as downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="financial-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
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
