// =============================================================================
// ADMIN PROMO CODES PAGE
// app/admin/(dashboard)/promo-codes/page.tsx
// Manage promo codes - create, edit, disable
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import { PromoCodesClient } from './promo-codes-client';
import type { PromoCode } from '@/lib/promo-code-types';

export default async function PromoCodesPage() {
  const supabase = createServerClient();

  // Fetch all promo codes with usage info
  const { data: promoCodes, error } = await supabase
    .from('promo_codes')
    .select(`
      *,
      customer:customers (
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching promo codes:', error);
  }

  // Fetch products for restriction dropdowns
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name');

  return (
    <PromoCodesClient 
      initialCodes={promoCodes || []} 
      products={products || []}
    />
  );
}
