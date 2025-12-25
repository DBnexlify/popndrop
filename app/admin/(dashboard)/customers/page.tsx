// =============================================================================
// ADMIN CUSTOMERS LIST PAGE
// app/admin/(dashboard)/customers/page.tsx
// =============================================================================

import Link from 'next/link';
import { getCustomers, getCustomerLeaderboard } from '@/lib/admin-queries';
import {
  formatCurrency,
  formatDate,
  getCustomerFullName,
} from '@/lib/database-types';
import type { Customer, CustomerLeaderboardEntry } from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  ChevronRight,
  Users,
  Crown,
  Star,
  Phone,
  Mail,
  Calendar,
  DollarSign,
} from 'lucide-react';

// Styles matching design system
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

// Customer tier badge styles
function getTierBadge(tier: CustomerLeaderboardEntry['customer_tier'] | string) {
  switch (tier) {
    case 'VIP':
      return {
        className: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30',
        icon: Crown,
      };
    case 'Loyal':
      return {
        className: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        icon: Star,
      };
    case 'Returning':
      return {
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        icon: null,
      };
    default:
      return {
        className: 'bg-white/5 text-foreground/60 border-white/10',
        icon: null,
      };
  }
}

// Calculate tier from COMPLETED bookings count (not total bookings)
function getCustomerTier(customer: Customer): CustomerLeaderboardEntry['customer_tier'] {
  const completedBookings = customer.completed_bookings_count ?? 0;
  if (customer.total_spent >= 1000 || completedBookings >= 10) return 'VIP';
  if (completedBookings >= 5) return 'Loyal';
  if (completedBookings >= 2) return 'Returning';
  return 'New';
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchQuery = params.search || '';
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  
  const [{ customers, count }, leaderboard] = await Promise.all([
    getCustomers({
      search: searchQuery || undefined,
      limit,
      offset,
    }),
    getCustomerLeaderboard(),
  ]);
  
  const totalPages = Math.ceil(count / limit);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Customers
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            {count} total customer{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {/* Top Customers - Quick Stats */}
      {leaderboard.length > 0 && !searchQuery && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/70">
            <Crown className="h-4 w-4 text-amber-400" />
            Top Customers
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {leaderboard.slice(0, 4).map((customer, index) => {
              const tierBadge = getTierBadge(customer.customer_tier);
              return (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className={`${styles.card} p-4 transition-transform hover:scale-[1.02]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                        {index + 1}
                      </span>
                      <Badge className={tierBadge.className}>
                        {tierBadge.icon && <tierBadge.icon className="mr-1 h-3 w-3" />}
                        {customer.customer_tier}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-green-400">
                      {formatCurrency(customer.total_spent)}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-foreground/90 truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {customer.completed_bookings} completed rental{customer.completed_bookings !== 1 ? 's' : ''}
                  </p>
                  <div className={styles.cardInner} />
                </Link>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Search */}
      <form className="relative mb-4 sm:mb-6 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        <Input
          name="search"
          placeholder="Search by name, email, phone..."
          defaultValue={searchQuery}
          className="border-white/10 bg-white/5 pl-9 placeholder:text-foreground/40"
        />
      </form>
      
      {/* Customers List */}
      <div className={styles.card}>
        <div className="divide-y divide-white/5">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-foreground/20" />
              <p className="mt-3 text-sm text-foreground/50">No customers found</p>
              {searchQuery && (
                <Button asChild variant="link" className="mt-2">
                  <Link href="/admin/customers">Clear search</Link>
                </Button>
              )}
            </div>
          ) : (
            customers.map((customer) => {
              const tier = getCustomerTier(customer);
              const tierBadge = getTierBadge(tier);
              
              return (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02] sm:p-5"
                >
                  {/* Avatar placeholder */}
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-sm font-semibold text-foreground/70 sm:flex">
                    {customer.first_name[0]}{customer.last_name[0]}
                  </div>
                  
                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground/90">
                        {getCustomerFullName(customer)}
                      </span>
                      <Badge className={tierBadge.className}>
                        {tierBadge.icon && <tierBadge.icon className="mr-1 h-3 w-3" />}
                        {tier}
                      </Badge>
                    </div>
                    
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </span>
                    </div>
                    
                    {/* Tags */}
                    {customer.tags && customer.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="text-[10px] text-foreground/40">
                            +{customer.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-foreground/90">
                      {customer.completed_bookings_count ?? 0} completed
                    </p>
                    <p className="text-xs text-green-400">
                      {formatCurrency(customer.total_spent)} lifetime
                    </p>
                    {customer.last_booking_at && (
                      <p className="mt-1 text-xs text-foreground/40">
                        Last: {formatDate(customer.last_booking_at)}
                      </p>
                    )}
                  </div>
                  
                  {/* Mobile stats */}
                  <div className="text-right sm:hidden">
                    <p className="text-sm font-medium text-foreground/90">
                      {customer.completed_bookings_count ?? 0}
                    </p>
                    <p className="text-[10px] text-foreground/50">completed</p>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              );
            })
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
                    href={`/admin/customers?page=${page - 1}${searchQuery ? `&search=${searchQuery}` : ''}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/customers?page=${page + 1}${searchQuery ? `&search=${searchQuery}` : ''}`}
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
