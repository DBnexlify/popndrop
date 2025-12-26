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

// Define types for the data - matches product_slots table
interface ProductSlot {
  id: string;
  product_id: string;
  start_time_local: string;  // TIME format like "10:00:00"
  end_time_local: string;    // TIME format like "14:00:00"
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
    .eq('is_active', true)
    .order('name');

  if (productsError) {
    console.error('Error fetching products:', productsError);
  }

  // Fetch all product_slots (slot definitions) for slot-based products
  const productIds = products?.map(p => p.id) || [];
  
  let slots: ProductSlot[] = [];
  if (productIds.length > 0) {
    const { data: slotsData, error: slotsError } = await supabase
      .from('product_slots')
      .select('*')
      .in('product_id', productIds)
      .order('display_order', { ascending: true });

    if (slotsError) {
      console.error('Error fetching product slots:', slotsError);
    } else {
      slots = slotsData || [];
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Time Slots</h1>
        <p className="mt-1 text-sm leading-relaxed text-foreground/70">
          Manage booking time slots for slot-based products like Party House
        </p>
      </div>

      {/* Client Component */}
      <TimeSlotsClient 
        products={products || []} 
        initialSlots={slots}
      />
    </div>
  );
}
