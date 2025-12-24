// =============================================================================
// ADMIN QUERIES
// Data fetching functions for admin dashboard
// Uses pre-built views where available for optimal performance
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import type {
  Booking,
  BookingWithRelations,
  BookingStatus,
  Customer,
  Product,
  Unit,
  UnitWithProduct,
  BlackoutDate,
  BlackoutDateWithRelations,
  Payment,
  TodaysDelivery,
  TodaysPickup,
  UpcomingScheduleItem,
  CustomerLeaderboardEntry,
  DashboardStats,
} from '@/lib/database-types';

// -----------------------------------------------------------------------------
// DASHBOARD QUERIES (using pre-built views)
// -----------------------------------------------------------------------------

export async function getTodaysDeliveries(): Promise<TodaysDelivery[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('todays_deliveries')
    .select('*');
  
  if (error) {
    console.error('Error fetching today\'s deliveries:', error);
    return [];
  }
  return data || [];
}

export async function getTodaysPickups(): Promise<TodaysPickup[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('todays_pickups')
    .select('*');
  
  if (error) {
    console.error('Error fetching today\'s pickups:', error);
    return [];
  }
  return data || [];
}

export async function getUpcomingSchedule(): Promise<UpcomingScheduleItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('upcoming_week_schedule')
    .select('*');
  
  if (error) {
    console.error('Error fetching upcoming schedule:', error);
    return [];
  }
  return data || [];
}

export async function getCustomerLeaderboard(): Promise<CustomerLeaderboardEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customer_leaderboard')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error fetching customer leaderboard:', error);
    return [];
  }
  return data || [];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServerClient();
  
  // Get counts in parallel
  const [deliveries, pickups, pending, weekBookings, monthBookings] = await Promise.all([
    supabase.from('todays_deliveries').select('booking_number', { count: 'exact', head: true }),
    supabase.from('todays_pickups').select('booking_number', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    getWeekRevenue(),
    getMonthRevenue(),
  ]);
  
  return {
    todaysDeliveries: deliveries.count || 0,
    todaysPickups: pickups.count || 0,
    pendingBookings: pending.count || 0,
    weekRevenue: weekBookings,
    monthRevenue: monthBookings,
  };
}

async function getWeekRevenue(): Promise<number> {
  const supabase = createServerClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  // Get actual payments received (not just quoted subtotals)
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, refund_amount')
    .gte('created_at', weekAgo.toISOString())
    .in('status', ['succeeded', 'partial_refund']);
  
  let gross = 0;
  let refunds = 0;
  
  (payments || []).forEach(p => {
    gross += Number(p.amount) || 0;
    if (p.refund_amount) {
      refunds += Number(p.refund_amount) || 0;
    }
  });
  
  return gross - refunds;
}

async function getMonthRevenue(): Promise<number> {
  const supabase = createServerClient();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  
  // Get actual payments received (not just quoted subtotals)
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, refund_amount')
    .gte('created_at', monthAgo.toISOString())
    .in('status', ['succeeded', 'partial_refund']);
  
  let gross = 0;
  let refunds = 0;
  
  (payments || []).forEach(p => {
    gross += Number(p.amount) || 0;
    if (p.refund_amount) {
      refunds += Number(p.refund_amount) || 0;
    }
  });
  
  return gross - refunds;
}

// -----------------------------------------------------------------------------
// BOOKING QUERIES
// -----------------------------------------------------------------------------

export async function getBookings(options?: {
  status?: BookingStatus | BookingStatus[];
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ bookings: BookingWithRelations[]; count: number }> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      unit:units(
        *,
        product:products(*)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });
  
  // Filter by status
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status);
    } else {
      query = query.eq('status', options.status);
    }
  }
  
  // Search by booking number or customer info
  if (options?.search) {
    query = query.or(`booking_number.ilike.%${options.search}%`);
  }
  
  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching bookings:', error);
    return { bookings: [], count: 0 };
  }
  
  return { 
    bookings: (data || []) as BookingWithRelations[], 
    count: count || 0 
  };
}

export async function getBookingById(id: string): Promise<BookingWithRelations | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      unit:units(
        *,
        product:products(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
  
  return data as BookingWithRelations;
}

export async function getBookingByNumber(bookingNumber: string): Promise<BookingWithRelations | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      unit:units(
        *,
        product:products(*)
      )
    `)
    .eq('booking_number', bookingNumber)
    .single();
  
  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
  
  return data as BookingWithRelations;
}

export async function getBookingPayments(bookingId: string): Promise<Payment[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
  
  return data || [];
}

// -----------------------------------------------------------------------------
// CUSTOMER QUERIES
// -----------------------------------------------------------------------------

export async function getCustomers(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ customers: Customer[]; count: number }> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .is('merged_into_id', null) // Exclude merged customers
    .order('last_booking_at', { ascending: false, nullsFirst: false });
  
  if (options?.search) {
    query = query.or(`
      first_name.ilike.%${options.search}%,
      last_name.ilike.%${options.search}%,
      email.ilike.%${options.search}%,
      phone.ilike.%${options.search}%
    `);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching customers:', error);
    return { customers: [], count: 0 };
  }
  
  return { customers: data || [], count: count || 0 };
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
  
  return data;
}

export async function getCustomerBookings(customerId: string): Promise<BookingWithRelations[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      unit:units(
        *,
        product:products(*)
      )
    `)
    .eq('customer_id', customerId)
    .order('event_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching customer bookings:', error);
    return [];
  }
  
  return (data || []) as BookingWithRelations[];
}

// -----------------------------------------------------------------------------
// PRODUCT & UNIT QUERIES
// -----------------------------------------------------------------------------

export async function getProducts(activeOnly = true): Promise<Product[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });
  
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  
  return data || [];
}

export async function getUnits(productId?: string): Promise<UnitWithProduct[]> {
  const supabase = createServerClient();
  
  let query = supabase
    .from('units')
    .select(`
      *,
      product:products(*)
    `)
    .order('unit_number', { ascending: true });
  
  if (productId) {
    query = query.eq('product_id', productId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching units:', error);
    return [];
  }
  
  return (data || []) as UnitWithProduct[];
}

export async function getAvailableUnits(productId: string, date: string): Promise<Unit[]> {
  const supabase = createServerClient();
  
  // Get units that are available status and not booked on this date
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'available');
  
  if (unitsError || !units) {
    console.error('Error fetching units:', unitsError);
    return [];
  }
  
  // Get booked unit IDs for this date
  const { data: bookedUnits } = await supabase
    .from('bookings')
    .select('unit_id')
    .lte('delivery_date', date)
    .gte('pickup_date', date)
    .in('status', ['pending', 'confirmed', 'delivered']);
  
  const bookedUnitIds = new Set(bookedUnits?.map(b => b.unit_id) || []);
  
  // Filter out booked units
  return units.filter(u => !bookedUnitIds.has(u.id));
}

// -----------------------------------------------------------------------------
// INVENTORY QUERIES
// -----------------------------------------------------------------------------

export interface ProductWithUnitCounts extends Product {
  unitCounts: {
    total: number;
    available: number;
    maintenance: number;
    retired: number;
  };
}

export async function getProductsWithUnitCounts(): Promise<ProductWithUnitCounts[]> {
  const supabase = createServerClient();
  
  // Get all products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });
  
  if (productsError || !products) {
    console.error('Error fetching products:', productsError);
    return [];
  }
  
  // Get all units with their status
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('product_id, status');
  
  if (unitsError) {
    console.error('Error fetching units:', unitsError);
  }
  
  // Count units per product
  const unitsByProduct = new Map<string, { total: number; available: number; maintenance: number; retired: number }>();
  
  (units || []).forEach(unit => {
    const counts = unitsByProduct.get(unit.product_id) || { total: 0, available: 0, maintenance: 0, retired: 0 };
    counts.total++;
    if (unit.status === 'available') counts.available++;
    else if (unit.status === 'maintenance') counts.maintenance++;
    else if (unit.status === 'retired') counts.retired++;
    unitsByProduct.set(unit.product_id, counts);
  });
  
  return products.map(product => ({
    ...product,
    unitCounts: unitsByProduct.get(product.id) || { total: 0, available: 0, maintenance: 0, retired: 0 },
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }
  
  return data;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }
  
  return data;
}

export async function getUnitBookings(unitId: string, limit = 5): Promise<BookingWithRelations[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      unit:units(
        *,
        product:products(*)
      )
    `)
    .eq('unit_id', unitId)
    .order('event_date', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching unit bookings:', error);
    return [];
  }
  
  return (data || []) as BookingWithRelations[];
}

// -----------------------------------------------------------------------------
// BLACKOUT DATE QUERIES
// -----------------------------------------------------------------------------

export async function getBlackoutDates(): Promise<BlackoutDateWithRelations[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('blackout_dates')
    .select(`
      *,
      product:products(id, name, slug),
      unit:units(
        id, 
        unit_number,
        product:products(id, name)
      )
    `)
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching blackout dates:', error);
    return [];
  }
  
  return (data || []) as BlackoutDateWithRelations[];
}

export async function getActiveBlackoutDates(): Promise<BlackoutDateWithRelations[]> {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('blackout_dates')
    .select(`
      *,
      product:products(id, name, slug),
      unit:units(
        id, 
        unit_number,
        product:products(id, name)
      )
    `)
    .gte('end_date', today)
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching active blackout dates:', error);
    return [];
  }
  
  return (data || []) as BlackoutDateWithRelations[];
}
