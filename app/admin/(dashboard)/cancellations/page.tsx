// =============================================================================
// ADMIN CANCELLATION REQUESTS PAGE
// app/admin/(dashboard)/cancellations/page.tsx
// Review and process customer cancellation requests
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import { CancellationRequestsList } from './cancellation-requests-list';

export const dynamic = 'force-dynamic';

export default async function AdminCancellationsPage() {
  const supabase = createServerClient();

  // Fetch cancellation requests with booking details
  const { data: requests, error } = await supabase
    .from('cancellation_requests')
    .select(`
      *,
      booking:bookings (
        id,
        booking_number,
        event_date,
        status,
        product_snapshot,
        stripe_payment_intent_id,
        delivery_address,
        delivery_city,
        customer:customers (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cancellation requests:', error);
  }

  // Count by status
  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = requests?.filter(r => r.status === 'approved').length || 0;
  const refundedCount = requests?.filter(r => r.status === 'refunded').length || 0;
  const deniedCount = requests?.filter(r => r.status === 'denied').length || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cancellation Requests
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Review and process customer cancellation requests
          </p>
        </div>
        
        {/* Stats */}
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <span className="text-lg font-semibold text-amber-400">{pendingCount}</span>
              <span className="ml-1.5 text-xs text-amber-400/70">pending</span>
            </div>
          )}
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-lg font-semibold text-foreground/80">{requests?.length || 0}</span>
            <span className="ml-1.5 text-xs text-foreground/50">total</span>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <CancellationRequestsList 
        initialRequests={requests || []}
        counts={{
          pending: pendingCount,
          approved: approvedCount,
          refunded: refundedCount,
          denied: deniedCount,
        }}
      />
    </div>
  );
}
