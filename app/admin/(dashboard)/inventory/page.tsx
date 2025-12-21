// =============================================================================
// ADMIN INVENTORY PAGE
// app/admin/(dashboard)/inventory/page.tsx
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import { getProductsWithUnitCounts } from '@/lib/admin-queries';
import { formatCurrency } from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  ChevronRight,
  Check,
  Wrench,
  XCircle,
  Plus,
  AlertTriangle,
} from 'lucide-react';

// Styles matching design system
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

export default async function AdminInventoryPage() {
  const products = await getProductsWithUnitCounts();
  
  // Calculate totals
  const totals = products.reduce(
    (acc, p) => ({
      products: acc.products + 1,
      units: acc.units + p.unitCounts.total,
      available: acc.available + p.unitCounts.available,
      maintenance: acc.maintenance + p.unitCounts.maintenance,
      retired: acc.retired + p.unitCounts.retired,
    }),
    { products: 0, units: 0, available: 0, maintenance: 0, retired: 0 }
  );
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            {totals.products} product{totals.products !== 1 ? 's' : ''}, {totals.units} total unit{totals.units !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-green-400">{totals.available}</p>
              <p className="text-xs text-foreground/50">Available</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <Wrench className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-400">{totals.maintenance}</p>
              <p className="text-xs text-foreground/50">In Maintenance</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-red-400">{totals.retired}</p>
              <p className="text-xs text-foreground/50">Retired</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
      </div>
      
      {/* Products List */}
      <div className={styles.card}>
        <div className="divide-y divide-white/5">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-foreground/20" />
              <p className="mt-3 text-sm text-foreground/50">No products found</p>
              <p className="mt-1 text-xs text-foreground/40">Add products in Supabase to get started</p>
            </div>
          ) : (
            products.map((product) => {
              const hasIssues = product.unitCounts.maintenance > 0;
              const noUnits = product.unitCounts.total === 0;
              
              return (
                <Link
                  key={product.id}
                  href={`/admin/inventory/${product.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02] sm:p-5"
                >
                  {/* Product Image */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5 sm:h-20 sm:w-20">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-foreground/20" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground/90">
                        {product.name}
                      </span>
                      {!product.is_active && (
                        <Badge variant="outline" className="text-[10px] text-foreground/50">
                          Inactive
                        </Badge>
                      )}
                      {noUnits && (
                        <Badge className="border-red-500/30 bg-red-500/10 text-[10px] text-red-300">
                          No units
                        </Badge>
                      )}
                      {hasIssues && (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                          <Wrench className="mr-1 h-3 w-3" />
                          {product.unitCounts.maintenance} in maintenance
                        </Badge>
                      )}
                    </div>
                    
                    {product.series && (
                      <p className="text-xs text-foreground/50">{product.series}</p>
                    )}
                    
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
                      <span>
                        {formatCurrency(product.price_daily)}/day
                      </span>
                      <span>
                        {formatCurrency(product.price_weekend)}/weekend
                      </span>
                    </div>
                  </div>
                  
                  {/* Unit Counts */}
                  <div className="hidden text-right sm:block">
                    <div className="flex items-center justify-end gap-3">
                      {/* Available */}
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-400">
                          {product.unitCounts.available}
                        </p>
                        <p className="text-[10px] text-foreground/40">available</p>
                      </div>
                      
                      {/* Total */}
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground/70">
                          {product.unitCounts.total}
                        </p>
                        <p className="text-[10px] text-foreground/40">total</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile unit count */}
                  <div className="text-right sm:hidden">
                    <p className="text-sm font-medium text-foreground/90">
                      {product.unitCounts.available}/{product.unitCounts.total}
                    </p>
                    <p className="text-[10px] text-foreground/50">units</p>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              );
            })
          )}
        </div>
        <div className={styles.cardInner} />
      </div>
    </div>
  );
}
