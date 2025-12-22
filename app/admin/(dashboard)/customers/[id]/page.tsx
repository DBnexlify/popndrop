// =============================================================================
// ADMIN CUSTOMER DETAIL PAGE
// app/admin/(dashboard)/customers/[id]/page.tsx
// =============================================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerById, getCustomerBookings } from '@/lib/admin-queries';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  getBookingTypeLabel,
  getCustomerFullName,
} from '@/lib/database-types';
import {
  formatEventDateShort,
  getDayOfWeek,
  getDayNumber,
  getMonthShort,
} from '@/lib/timezone';
import type { Customer, CustomerLeaderboardEntry } from '@/lib/database-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Crown,
  Star,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Copy,
  Tag,
} from 'lucide-react';
import { CustomerActions } from './customer-actions';

// Styles matching design system
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Calculate tier from booking count and total spent
function getCustomerTier(customer: Customer): CustomerLeaderboardEntry['customer_tier'] {
  if (customer.total_spent >= 1000 || customer.booking_count >= 10) return 'VIP';
  if (customer.booking_count >= 5) return 'Loyal';
  if (customer.booking_count >= 2) return 'Returning';
  return 'New';
}

// Customer tier badge styles
function getTierBadge(tier: CustomerLeaderboardEntry['customer_tier']) {
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

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  const [customer, bookings] = await Promise.all([
    getCustomerById(id),
    getCustomerBookings(id),
  ]);
  
  if (!customer) {
    notFound();
  }
  
  const tier = getCustomerTier(customer);
  const tierBadge = getTierBadge(tier);
  const fullName = getCustomerFullName(customer);
  
  // Calculate stats
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  const upcomingBookings = bookings.filter(b => 
    ['pending', 'confirmed'].includes(b.status) && 
    new Date(b.event_date) >= new Date()
  );
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-foreground/60">
        <Link href="/admin/customers">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Link>
      </Button>
      
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-xl font-bold text-foreground/70">
              {customer.first_name[0]}{customer.last_name[0]}
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {fullName}
                </h1>
                <Badge className={tierBadge.className}>
                  {tierBadge.icon && <tierBadge.icon className="mr-1 h-3 w-3" />}
                  {tier}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-foreground/50">
                Customer since {formatDate(customer.created_at)}
              </p>
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${customer.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${customer.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Contact & Stats */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className={styles.card}>
            <div className="p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground/70">Contact Info</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-all">{customer.email}</p>
                    <p className="text-xs text-foreground/50">Email</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                  <div>
                    <p className="text-sm font-medium">{customer.phone}</p>
                    <p className="text-xs text-foreground/50">Phone</p>
                  </div>
                </div>
                
                {(customer.address_line1 || customer.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                    <div>
                      <p className="text-sm font-medium">
                        {customer.address_line1}
                        {customer.address_line2 && <>, {customer.address_line2}</>}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {customer.city}{customer.state && `, ${customer.state}`} {customer.zip_code}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.cardInner} />
          </div>
          
          {/* Stats */}
          <div className={styles.card}>
            <div className="p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground/70">Statistics</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-foreground/90">{customer.booking_count}</p>
                  <p className="text-xs text-foreground/50">Total Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(customer.total_spent)}</p>
                  <p className="text-xs text-foreground/50">Lifetime Value</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground/90">{completedBookings}</p>
                  <p className="text-xs text-foreground/50">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground/60">{cancelledBookings}</p>
                  <p className="text-xs text-foreground/50">Cancelled</p>
                </div>
              </div>
              
              {customer.last_booking_at && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="text-xs text-foreground/50">Last booking</p>
                  <p className="text-sm font-medium">{formatDate(customer.last_booking_at)}</p>
                </div>
              )}
            </div>
            <div className={styles.cardInner} />
          </div>
          
          {/* Tags */}
          <div className={styles.card}>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground/70">Tags</h2>
              </div>
              
              {customer.tags && customer.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground/40">No tags yet</p>
              )}
            </div>
            <div className={styles.cardInner} />
          </div>
          
          {/* Notes */}
          <div className={styles.card}>
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground/70">Internal Notes</h2>
              </div>
              
              {customer.internal_notes ? (
                <p className="whitespace-pre-wrap text-sm text-foreground/70">
                  {customer.internal_notes}
                </p>
              ) : (
                <p className="text-sm text-foreground/40">No notes yet</p>
              )}
            </div>
            <div className={styles.cardInner} />
          </div>
          
          {/* Customer Actions */}
          <CustomerActions customer={customer} />
        </div>
        
        {/* Right column - Booking History */}
        <div className="lg:col-span-2">
          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/70">
                <Calendar className="h-4 w-4 text-blue-400" />
                Upcoming Bookings
              </h2>
              <div className={styles.card}>
                <div className="divide-y divide-white/5">
                  {upcomingBookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/bookings/${booking.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="text-center">
                        <p className="text-xs text-foreground/50">
                          {getDayOfWeek(booking.event_date)}
                        </p>
                        <p className="text-xl font-semibold">
                          {getDayNumber(booking.event_date)}
                        </p>
                        <p className="text-xs text-foreground/50">
                          {getMonthShort(booking.event_date)}
                        </p>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{booking.booking_number}</span>
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-foreground/70">
                          {booking.product_snapshot.name}
                        </p>
                        <p className="mt-1 text-xs text-foreground/50">
                          {booking.delivery_city}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(booking.subtotal)}</p>
                      </div>
                      
                      <ChevronRight className="h-4 w-4 text-foreground/30" />
                    </Link>
                  ))}
                </div>
                <div className={styles.cardInner} />
              </div>
            </div>
          )}
          
          {/* All Booking History */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground/70">
              Booking History ({bookings.length})
            </h2>
            <div className={styles.card}>
              {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-foreground/20" />
                  <p className="mt-3 text-sm text-foreground/50">No bookings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {bookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/bookings/${booking.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="hidden text-center sm:block sm:w-14">
                        <p className="text-xs text-foreground/50">
                          {getDayOfWeek(booking.event_date)}
                        </p>
                        <p className="text-lg font-semibold">
                          {getDayNumber(booking.event_date)}
                        </p>
                        <p className="text-xs text-foreground/50">
                          {getMonthShort(booking.event_date)}
                        </p>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm">{booking.booking_number}</span>
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {getBookingTypeLabel(booking.booking_type)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-foreground/70">
                          {booking.product_snapshot.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-foreground/50">
                          <span>{booking.delivery_city}</span>
                          <span className="sm:hidden">• {formatDate(booking.event_date)}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(booking.subtotal)}</p>
                        <p className="text-xs text-foreground/50">
                          {booking.balance_paid ? 'Paid' : 
                            booking.deposit_paid ? 'Deposit paid' : 'Unpaid'}
                        </p>
                      </div>
                      
                      <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                    </Link>
                  ))}
                </div>
              )}
              <div className={styles.cardInner} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
