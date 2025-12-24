// =============================================================================
// CHECK CANCELLATION REQUEST API
// app/api/admin/cancellations/check/route.ts
// Check if a booking has a pending cancellation request
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAdminUser } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find pending cancellation request for this booking
    const { data: request_data, error } = await supabase
      .from('cancellation_requests')
      .select(`
        id,
        status,
        reason,
        cancellation_type,
        days_before_event,
        policy_refund_percent,
        original_paid,
        suggested_refund,
        approved_refund,
        processing_fee,
        admin_notes,
        created_at,
        reviewed_at
      `)
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - no pending request
        return NextResponse.json({ request: null });
      }
      throw error;
    }

    return NextResponse.json({ request: request_data });

  } catch (error) {
    console.error('[Admin Cancellation Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check cancellation status' },
      { status: 500 }
    );
  }
}
