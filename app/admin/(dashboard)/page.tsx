// =============================================================================
// ADMIN DASHBOARD PAGE
// app/admin/page.tsx
// Uses pre-built database views for optimal performance
// =============================================================================

import Link from 'next/link';
import {
  getDashboardStats,
  getTodaysDeliveries,
  getTodaysPickups,
  getUpcomingSchedule,
} from '@/lib/admin-queries';
import {
  formatCurrency,
  formatDate,
  getDeliveryWindowLabel,
  getPickupWindowLabel,
  getStatusColor,
  getStatusLabel,
} from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Package,
  Clock,
  DollarSign,
  Phone,
  MapPin,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';

// Styles following the design system
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
} as const;

export default async function AdminDashboardPage() {
  // Fetch all data in parallel using pre-built views
  const [stats, deliveries, pickups, schedule] = await Promise.all([
    getDashboardStats(),
    getTodaysDeliveries(),
    getTodaysPickups(),
    getUpcomingSchedule(),
  ]);
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-foreground/70">{today}</p>
      </div>
      
      {/* Stats Grid */}
      <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="Today's Deliveries"
          value={stats.todaysDeliveries}
          icon={Truck}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10"
        />
        <StatCard
          label="Today's Pickups"
          value={stats.todaysPickups}
          icon={Package}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          label="Pending Bookings"
          value={stats.pendingBookings}
          icon={Clock}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          href="/admin/bookings?status=pending"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(stats.monthRevenue)}
          icon={DollarSign}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
        />
      </div>
      
      {/* Today's Schedule */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Deliveries */}
        <section className={styles.card}>
          <div className="border-b border-white/5 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10">
                  <Truck className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold sm:text-base">Today's Deliveries</h2>
                  <p className="text-xs text-foreground/50">{deliveries.length} scheduled</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-white/5">
            {deliveries.length === 0 ? (
              <EmptyState message="No deliveries scheduled for today" />
            ) : (
              deliveries.map((delivery) => (
                <Link
                  key={delivery.booking_number}
                  href={`/admin/bookings?search=${delivery.booking_number}`}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-white/[0.02] sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground/90">
                        {delivery.booking_number}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {getDeliveryWindowLabel(delivery.delivery_window).split(' ')[0]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground/70">
                      {delivery.product_name}
                      {delivery.unit_number > 1 && ` (Unit ${delivery.unit_number})`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/50">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {delivery.delivery_address}, {delivery.delivery_city}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/60">
                      {delivery.customer_name}
                      <span className="ml-1 flex items-center gap-1 text-cyan-400">
                        <Phone className="h-3 w-3" />
                        {delivery.customer_phone}
                      </span>
                    </p>
                    {delivery.delivery_notes && (
                      <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                        📝 {delivery.delivery_notes}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              ))
            )}
          </div>
          <div className={styles.cardInner} />
        </section>
        
        {/* Pickups */}
        <section className={styles.card}>
          <div className="border-b border-white/5 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10">
                  <Package className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold sm:text-base">Today's Pickups</h2>
                  <p className="text-xs text-foreground/50">{pickups.length} scheduled</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-white/5">
            {pickups.length === 0 ? (
              <EmptyState message="No pickups scheduled for today" />
            ) : (
              pickups.map((pickup) => (
                <Link
                  key={pickup.booking_number}
                  href={`/admin/bookings?search=${pickup.booking_number}`}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-white/[0.02] sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground/90">
                        {pickup.booking_number}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {getPickupWindowLabel(pickup.pickup_window).split(' ')[0]}
                      </Badge>
                      {!pickup.balance_paid && pickup.balance_due > 0 && (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                          ${pickup.balance_due} due
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground/70">
                      {pickup.product_name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/50">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {pickup.delivery_address}, {pickup.delivery_city}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/60">
                      {pickup.customer_name}
                      <span className="ml-1 flex items-center gap-1 text-cyan-400">
                        <Phone className="h-3 w-3" />
                        {pickup.customer_phone}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              ))
            )}
          </div>
          <div className={styles.cardInner} />
        </section>
      </div>
      
      {/* Upcoming Week Schedule */}
      <section className={`mt-6 sm:mt-8 ${styles.card}`}>
        <div className="border-b border-white/5 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-500/10">
                <Calendar className="h-4 w-4 text-fuchsia-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold sm:text-base">Upcoming Week</h2>
                <p className="text-xs text-foreground/50">{schedule.length} events</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/bookings">View All</Link>
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-white/5">
          {schedule.length === 0 ? (
            <EmptyState message="No events scheduled for the next 7 days" />
          ) : (
            schedule.slice(0, 10).map((item, index) => (
              <div
                key={`${item.booking_number}-${item.event_type}-${index}`}
                className="flex items-center gap-4 p-4 sm:p-5"
              >
                <div className="text-center">
                  <p className="text-xs text-foreground/50">
                    {new Date(item.event_date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-semibold text-foreground/90">
                    {new Date(item.event_date).getDate()}
                  </p>
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        item.event_type === 'delivery'
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                          : 'border-purple-500/30 bg-purple-500/10 text-purple-300'
                      }
                    >
                      {item.event_type === 'delivery' ? '🚚 Delivery' : '📦 Pickup'}
                    </Badge>
                    <span className="font-mono text-xs text-foreground/50">
                      {item.booking_number}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/70">
                    {item.product_name} · {item.customer_name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {item.address}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-foreground/50">
                    {item.event_type === 'delivery'
                      ? getDeliveryWindowLabel(item.time_window)
                      : getPickupWindowLabel(item.time_window)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className={styles.cardInner} />
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAT CARD COMPONENT
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {href && <ChevronRight className="h-4 w-4 text-foreground/30" />}
      </div>
      <div className="mt-3">
        <p className="text-xs text-foreground/50">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </div>
      <div className={styles.cardInner} />
    </>
  );
  
  if (href) {
    return (
      <Link href={href} className={`${styles.card} block p-4 transition-colors hover:bg-white/[0.02]`}>
        {content}
      </Link>
    );
  }
  
  return <div className={`${styles.card} p-4`}>{content}</div>;
}

// -----------------------------------------------------------------------------
// EMPTY STATE COMPONENT
// -----------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-foreground/20" />
      <p className="mt-2 text-sm text-foreground/50">{message}</p>
    </div>
  );
}
