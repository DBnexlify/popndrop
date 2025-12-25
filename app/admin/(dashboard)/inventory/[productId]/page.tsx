// =============================================================================
// ADMIN INVENTORY PRODUCT DETAIL PAGE
// app/admin/(dashboard)/inventory/[productId]/page.tsx
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProductById, getUnits } from '@/lib/admin-queries';
import { formatCurrency, formatDate } from '@/lib/database-types';
import type { UnitStatus } from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Check,
  Wrench,
  XCircle,
  AlertTriangle,
  Calendar,
  Hash,
  FileText,
  DollarSign,
} from 'lucide-react';
import { UnitActions } from './unit-actions';

// Styles matching design system
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

interface PageProps {
  params: Promise<{ productId: string }>;
}

function getStatusBadge(status: UnitStatus) {
  switch (status) {
    case 'available':
      return {
        className: 'bg-green-500/10 text-green-400 border-green-500/30',
        icon: Check,
        label: 'Available',
      };
    case 'maintenance':
      return {
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: Wrench,
        label: 'Maintenance',
      };
    case 'retired':
      return {
        className: 'bg-red-500/10 text-red-400 border-red-500/30',
        icon: XCircle,
        label: 'Retired',
      };
    default:
      return {
        className: 'bg-white/10 text-foreground/60 border-white/20',
        icon: Package,
        label: status,
      };
  }
}

export default async function InventoryProductPage({ params }: PageProps) {
  const { productId } = await params;
  
  const [product, units] = await Promise.all([
    getProductById(productId),
    getUnits(productId),
  ]);
  
  if (!product) {
    notFound();
  }
  
  // Calculate stats
  const stats = {
    total: units.length,
    available: units.filter(u => u.status === 'available').length,
    maintenance: units.filter(u => u.status === 'maintenance').length,
    retired: units.filter(u => u.status === 'retired').length,
  };
  
  // Check for inspection alerts
  const today = new Date();
  const unitsNeedingInspection = units.filter(u => {
    if (!u.next_inspection_date) return false;
    return new Date(u.next_inspection_date) <= today;
  });
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-foreground/60">
        <Link href="/admin/inventory">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Link>
      </Button>
      
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Product Image */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-32 sm:w-32">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-8 w-8 text-foreground/20" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {product.name}
              </h1>
              {!product.is_active && (
                <Badge variant="outline" className="text-foreground/50">
                  Inactive
                </Badge>
              )}
            </div>
            
            {product.series && (
              <p className="mt-1 text-sm text-foreground/50">{product.series}</p>
            )}
            
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground/70">
              {product.same_day_pickup_only ? (
                /* Event-based rental: single event price */
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-foreground/40" />
                  {formatCurrency(product.price_daily)}/event
                </span>
              ) : (
                /* Standard rental: day + weekend + Sunday */
                <>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-foreground/40" />
                    {formatCurrency(product.price_daily)}/day
                  </span>
                  <span>
                    {formatCurrency(product.price_weekend)}/weekend
                  </span>
                  <span>
                    {formatCurrency(product.price_sunday)}/Sunday
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className={styles.card}>
          <div className="p-4 text-center">
            <p className="text-2xl font-semibold text-foreground/90">{stats.total}</p>
            <p className="text-xs text-foreground/50">Total Units</p>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        <div className={styles.card}>
          <div className="p-4 text-center">
            <p className="text-2xl font-semibold text-green-400">{stats.available}</p>
            <p className="text-xs text-foreground/50">Available</p>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        <div className={styles.card}>
          <div className="p-4 text-center">
            <p className="text-2xl font-semibold text-amber-400">{stats.maintenance}</p>
            <p className="text-xs text-foreground/50">Maintenance</p>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        <div className={styles.card}>
          <div className="p-4 text-center">
            <p className="text-2xl font-semibold text-red-400">{stats.retired}</p>
            <p className="text-xs text-foreground/50">Retired</p>
          </div>
          <div className={styles.cardInner} />
        </div>
      </div>
      
      {/* Inspection Alert */}
      {unitsNeedingInspection.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium text-amber-300">Inspection Required</p>
              <p className="mt-1 text-sm text-amber-300/70">
                {unitsNeedingInspection.length} unit{unitsNeedingInspection.length !== 1 ? 's need' : ' needs'} inspection:
                {' '}
                {unitsNeedingInspection.map((u, i) => (
                  <span key={u.id}>
                    {i > 0 && ', '}
                    Unit #{u.unit_number}
                    {u.nickname && ` (${u.nickname})`}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Units List */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground/70">
          Units ({units.length})
        </h2>
        
        <div className={styles.card}>
          {units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-foreground/20" />
              <p className="mt-3 text-sm text-foreground/50">No units for this product</p>
              <p className="mt-1 text-xs text-foreground/40">Add units in Supabase to track inventory</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {units.map((unit) => {
                const statusBadge = getStatusBadge(unit.status);
                const inspectionDue = unit.next_inspection_date && new Date(unit.next_inspection_date) <= today;
                
                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-4 p-4 sm:p-5"
                  >
                    {/* Unit Number */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                      <span className="text-lg font-semibold text-foreground/70">
                        #{unit.unit_number}
                      </span>
                    </div>
                    
                    {/* Unit Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {unit.nickname ? (
                          <span className="font-medium text-foreground/90">
                            {unit.nickname}
                          </span>
                        ) : (
                          <span className="font-medium text-foreground/70">
                            Unit #{unit.unit_number}
                          </span>
                        )}
                        <Badge className={statusBadge.className}>
                          <statusBadge.icon className="mr-1 h-3 w-3" />
                          {statusBadge.label}
                        </Badge>
                        {inspectionDue && (
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Inspection due
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
                        {unit.serial_number && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {unit.serial_number}
                          </span>
                        )}
                        {unit.purchase_date && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Purchased {formatDate(unit.purchase_date)}
                          </span>
                        )}
                        {unit.last_inspection_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Inspected {formatDate(unit.last_inspection_date)}
                          </span>
                        )}
                      </div>
                      
                      {unit.status_notes && (
                        <p className="mt-2 flex items-start gap-1 text-xs text-foreground/50">
                          <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                          {unit.status_notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <UnitActions unit={unit} />
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.cardInner} />
        </div>
      </div>
    </div>
  );
}
