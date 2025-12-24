// =============================================================================
// FINANCIAL DATA API
// app/api/admin/financials/route.ts
// Fetch financial dashboard data with period filtering
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase';
import { 
  getFinancialDashboardData,
  getFinancialComparison,
} from '@/lib/financial-queries';
import type { TimePeriod, DateRange } from '@/lib/financial-types';

// =============================================================================
// GET - Fetch financial dashboard data
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

    // Build custom range if provided
    let customRange: DateRange | undefined;
    if (period === 'custom' && startDate && endDate) {
      customRange = { start: startDate, end: endDate };
    }

    // Fetch data
    const [dashboardData, comparison] = await Promise.all([
      getFinancialDashboardData(period, customRange),
      getFinancialComparison(period),
    ]);

    return NextResponse.json({
      ...dashboardData,
      comparison,
    });

  } catch (error) {
    console.error('Financial API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
