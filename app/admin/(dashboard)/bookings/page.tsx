// =============================================================================
// ADMIN BOOKINGS LIST PAGE
// app/admin/bookings/page.tsx
// =============================================================================

import Link from 'next/link';
import { getBookings } from '@/lib/admin-queries';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getBookingTypeLabel,
  getCustomerFullName,
} from '@/lib/database-types';
import {
  getDayOfWeek,
  getDayNumber,
  getMonthShort,
} from '@/lib/timezone';
import type { BookingStatus } from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  ChevronRight,
  Filter,
  Calendar,
  Phone,
  MapPin,
} from 'lucide-react';

// Styles
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

const STATUS_OPTIONS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = params.status as BookingStatus | 'all' | undefined;
  const searchQuery = params.search || '';
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  
  const { bookings, count } = await getBookings({
    status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
    limit,
    offset,
  });
  
  const totalPages = Math.ceil(count / limit);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            {count} total booking{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center">
        {/* Search */}
        <form className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <Input
            name="search"
            placeholder="Search by booking #..."
            defaultValue={searchQuery}
            className="border-white/10 bg-white/5 pl-9 placeholder:text-foreground/40"
          />
        </form>
        
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const isActive = 
              (option.value === 'all' && !statusFilter) || 
              statusFilter === option.value;
            
            return (
              <Link
                key={option.value}
                href={`/admin/bookings${option.value === 'all' ? '' : `?status=${option.value}`}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-foreground/60 hover:bg-white/5 hover:text-foreground'
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Bookings List */}
      <div className={styles.card}>
        <div className="divide-y divide-white/5">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-foreground/20" />
              <p className="mt-3 text-sm text-foreground/50">No bookings found</p>
              {searchQuery && (
                <Button asChild variant="link" className="mt-2">
                  <Link href="/admin/bookings">Clear search</Link>
                </Button>
              )}
            </div>
          ) : (
            bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/admin/bookings/${booking.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02] sm:p-5"
              >
                {/* Date column */}
                <div className="hidden text-center sm:block sm:w-16">
                  <p className="text-xs text-foreground/50">
                    {getDayOfWeek(booking.event_date)}
                  </p>
                  <p className="text-xl font-semibold text-foreground/90">
                    {getDayNumber(booking.event_date)}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {getMonthShort(booking.event_date)}
                  </p>
                </div>
                
                {/* Main content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground/90">
                      {booking.booking_number}
                    </span>
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {getBookingTypeLabel(booking.booking_type)}
                    </Badge>
                  </div>
                  
                  <p className="mt-1 text-sm text-foreground/70">
                    {booking.product_snapshot.name}
                    {booking.unit.unit_number > 1 && ` (Unit ${booking.unit.unit_number})`}
                  </p>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
                    <span className="flex items-center gap-1">
                      {getCustomerFullName(booking.customer)}
                    </span>
                    <span className="hidden items-center gap-1 sm:flex">
                      <MapPin className="h-3 w-3" />
                      {booking.delivery_city}
                    </span>
                    <span className="sm:hidden">
                      {formatDate(booking.event_date)}
                    </span>
                  </div>
                  
                  {/* Payment status - don't show for cancelled bookings */}
                  {booking.status !== 'cancelled' && !booking.balance_paid && booking.balance_due > 0 && (
                    <Badge className="mt-2 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                      {formatCurrency(booking.balance_due)} balance due
                    </Badge>
                  )}
                </div>
                
                {/* Price */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground/90">
                    {formatCurrency(booking.subtotal)}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {booking.deposit_paid ? 'Deposit paid' : 'Pending deposit'}
                  </p>
                </div>
                
                <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
              </Link>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 sm:px-5">
            <p className="text-xs text-foreground/50">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/bookings?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/bookings?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div className={styles.cardInner} />
      </div>
    </div>
  );
}