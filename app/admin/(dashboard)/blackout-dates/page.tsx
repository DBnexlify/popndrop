// =============================================================================
// ADMIN BLACKOUT DATES PAGE
// app/admin/blackout-dates/page.tsx
// Powerful blocking: global, per-product, or per-unit
// =============================================================================

import { getActiveBlackoutDates, getProducts, getUnits } from '@/lib/admin-queries';
import { formatDate } from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BlackoutDateForm } from '@/components/admin/blackout-date-form';
import { BlackoutDateDeleteButton } from '@/components/admin/blackout-date-delete';
import {
  CalendarOff,
  Globe,
  Package,
  Box,
  Calendar,
  Repeat,
  AlertCircle,
} from 'lucide-react';

// Styles
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

export default async function AdminBlackoutDatesPage() {
  const [blackoutDates, products, units] = await Promise.all([
    getActiveBlackoutDates(),
    getProducts(true), // Only active products
    getUnits(),
  ]);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Blackout Dates
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Block dates for all rentals, specific products, or individual units.
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add New Blackout Date */}
        <section className={styles.card}>
          <div className="border-b border-white/5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10">
                <CalendarOff className="h-4 w-4 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold sm:text-base">Add Blackout Date</h2>
            </div>
          </div>
          
          <div className="p-4 sm:p-5">
            <BlackoutDateForm products={products} units={units} />
          </div>
          
          <div className={styles.cardInner} />
        </section>
        
        {/* Info Card */}
        <section className={styles.card}>
          <div className="border-b border-white/5 p-4 sm:p-5">
            <h2 className="text-sm font-semibold sm:text-base">How Blocking Works</h2>
          </div>
          
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <Globe className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/90">Block All Rentals</p>
                <p className="text-xs text-foreground/60">
                  Use for holidays, maintenance days, or when you're unavailable.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                <Package className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/90">Block Specific Product</p>
                <p className="text-xs text-foreground/60">
                  Blocks all units of a product (e.g., all Glitch Combos).
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                <Box className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/90">Block Specific Unit</p>
                <p className="text-xs text-foreground/60">
                  Blocks just one unit (e.g., Unit #1 for repairs).
                </p>
              </div>
            </div>
            
            <div className="mt-4 rounded-lg bg-amber-500/10 p-3">
              <div className="flex gap-2 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>
                  Blackout dates prevent new bookings but don't affect existing ones.
                  Cancel existing bookings manually if needed.
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardInner} />
        </section>
      </div>
      
      {/* Current Blackout Dates */}
      <section className={`mt-6 sm:mt-8 ${styles.card}`}>
        <div className="border-b border-white/5 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold sm:text-base">Active Blackout Dates</h2>
            <Badge variant="outline">{blackoutDates.length} active</Badge>
          </div>
        </div>
        
        <div className="divide-y divide-white/5">
          {blackoutDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-foreground/20" />
              <p className="mt-3 text-sm text-foreground/50">No blackout dates set</p>
              <p className="mt-1 text-xs text-foreground/40">
                All dates are currently available for booking.
              </p>
            </div>
          ) : (
            blackoutDates.map((blackout) => {
              // Determine the scope
              let scope: 'global' | 'product' | 'unit' = 'global';
              let scopeLabel = 'All Rentals';
              let scopeIcon = Globe;
              let scopeColor = 'text-amber-400 bg-amber-500/10';
              
              if (blackout.unit_id && blackout.unit) {
                scope = 'unit';
                scopeLabel = `${blackout.unit.product?.name || 'Product'} - Unit #${blackout.unit.unit_number}`;
                scopeIcon = Box;
                scopeColor = 'text-cyan-400 bg-cyan-500/10';
              } else if (blackout.product_id && blackout.product) {
                scope = 'product';
                scopeLabel = blackout.product.name;
                scopeIcon = Package;
                scopeColor = 'text-purple-400 bg-purple-500/10';
              }
              
              const ScopeIcon = scopeIcon;
              const isSingleDay = blackout.start_date === blackout.end_date;
              
              return (
                <div
                  key={blackout.id}
                  className="flex items-center gap-4 p-4 sm:p-5"
                >
                  {/* Scope icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${scopeColor}`}>
                    <ScopeIcon className="h-5 w-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground/90">
                        {isSingleDay 
                          ? formatDate(blackout.start_date)
                          : `${formatDate(blackout.start_date)} – ${formatDate(blackout.end_date)}`}
                      </span>
                      {blackout.is_recurring && (
                        <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                          <Repeat className="mr-1 h-3 w-3" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                    
                    <p className="mt-1 text-sm text-foreground/60">{scopeLabel}</p>
                    
                    {blackout.reason && (
                      <p className="mt-1 text-xs text-foreground/50">
                        {blackout.reason}
                      </p>
                    )}
                  </div>
                  
                  {/* Delete button */}
                  <BlackoutDateDeleteButton id={blackout.id} />
                </div>
              );
            })
          )}
        </div>
        
        <div className={styles.cardInner} />
      </section>
    </div>
  );
}
