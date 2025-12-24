// =============================================================================
// FINANCIALS API - Dashboard metrics and reporting
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getFinancialMetrics,
  getFinancialDashboardStats,
  getDailyFinancialSummary,
  getExpenseSummaryByCategory,
  getBookingFinancials,
} from '@/lib/financial-queries';
import type { FinancialPeriod } from '@/lib/financial-types';

// =============================================================================
// GET - Fetch financial metrics
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';
    
    switch (action) {
      // Get full dashboard stats
      case 'dashboard': {
        const stats = await getFinancialDashboardStats();
        return NextResponse.json(stats);
      }
      
      // Get metrics for a specific period
      case 'metrics': {
        const period = (searchParams.get('period') || 'this_month') as FinancialPeriod;
        const startDate = searchParams.get('startDate') || undefined;
        const endDate = searchParams.get('endDate') || undefined;
        
        const metrics = await getFinancialMetrics(period, startDate, endDate);
        return NextResponse.json({ metrics });
      }
      
      // Get daily summary for charts
      case 'daily': {
        const days = parseInt(searchParams.get('days') || '30', 10);
        const summary = await getDailyFinancialSummary(days);
        return NextResponse.json({ summary });
      }
      
      // Get expense breakdown by category
      case 'categories': {
        const year = searchParams.get('year') 
          ? parseInt(searchParams.get('year')!, 10) 
          : undefined;
        const categories = await getExpenseSummaryByCategory(year);
        return NextResponse.json({ categories });
      }
      
      // Get financials for a specific booking
      case 'booking': {
        const bookingId = searchParams.get('bookingId');
        if (!bookingId) {
          return NextResponse.json(
            { error: 'bookingId required' },
            { status: 400 }
          );
        }
        const financials = await getBookingFinancials(bookingId);
        return NextResponse.json({ financials });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Error in GET /api/admin/financials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
