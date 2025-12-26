// =============================================================================
// ADMIN TIME SLOTS PAGE
// app/admin/(dashboard)/time-slots/page.tsx
// Manage booking time slots for slot-based products (Party House)
// =============================================================================

import { Metadata } from 'next';
import { createServerClient, getAdminUser } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { TimeSlotsClient } from './time-slots-client';

export const metadata: Metadata = {
  title: 'Time Slots | Admin',
  description: 'Manage booking time slots for slot-based products',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Define types for the data
interface BookingBlock {
  block_id: string;
  product_id: string;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface SlotBasedProduct {
  id: string;
  name: string;
  slug: string;
  scheduling_mode: string;
}

export default async function TimeSlotsPage() {
  // Verify admin auth
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/admin/login');
  }

  const supabase = createServerClient();

  // Fetch slot-based products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, scheduling_mode')
    .eq('scheduling_mode', 'slot_based')
    .eq('active', true)
    .order('name');

  if (productsError) {
    console.error('Error fetching products:', productsError);
  }

  // Fetch all booking blocks for slot-based products
  const productIds = products?.map(p => p.id) || [];
  
  let blocks: BookingBlock[] = [];
  if (productIds.length > 0) {
    const { data: blocksData, error: blocksError } = await supabase
      .from('booking_blocks')
      .select('*')
      .in('product_id', productIds)
      .order('display_order', { ascending: true });

    if (blocksError) {
      console.error('Error fetching booking blocks:', blocksError);
    } else {
      blocks = blocksData || [];
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Time Slots</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Manage booking time slots for slot-based products like Party House
        </p>
      </div>

      {/* Client Component */}
      <TimeSlotsClient 
        products={products || []} 
        initialBlocks={blocks}
      />
    </div>
  );
}
