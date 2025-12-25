import {
  formatEventDateShort,
  formatTimestampShort,
  EASTERN_TIMEZONE,
} from './timezone';

// =============================================================================
// DATABASE TYPES - Single Source of Truth
// Consolidated from database-types.ts + database_types.ts
// Matches actual Supabase schema as of Dec 2024
// =============================================================================

// =============================================================================
// ENUMS (matching PostgreSQL custom types)
// =============================================================================

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'delivered'
  | 'picked_up'
  | 'completed'
  | 'cancelled';

export type BookingType = 'daily' | 'weekend' | 'sunday';

export type UnitStatus = 'available' | 'maintenance' | 'retired';

export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partial_refund';

export type WetDryOption = 'wet' | 'dry' | 'both';

export type DeliveryWindow = 'morning' | 'midday' | 'afternoon' | 'saturday-evening';
export type PickupWindow = 'evening' | 'next-morning' | 'monday-morning' | 'monday-afternoon';

// =============================================================================
// TABLE TYPES (matching actual database columns)
// =============================================================================

// -----------------------------------------------------------------------------
// PRODUCTS
// -----------------------------------------------------------------------------

export interface Product {
  id: string;
  slug: string;
  name: string;
  series: string | null;
  subtitle: string | null;
  description: string | null;
  price_daily: number;
  price_weekend: number;
  price_sunday: number;
  dimensions: string | null;
  footprint: string | null;
  max_players: number | null;
  max_weight_per_player: number | null;
  total_weight_limit: number | null;
  height_range: string | null;
  wet_or_dry: WetDryOption | null;
  power_required: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  features: string[] | null;
  safety_notes: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductInsert {
  slug: string;
  name: string;
  series?: string | null;
  subtitle?: string | null;
  description?: string | null;
  price_daily: number;
  price_weekend: number;
  price_sunday: number;
  dimensions?: string | null;
  footprint?: string | null;
  max_players?: number | null;
  max_weight_per_player?: number | null;
  total_weight_limit?: number | null;
  height_range?: string | null;
  wet_or_dry?: WetDryOption;
  power_required?: string | null;
  image_url?: string | null;
  gallery_urls?: string[];
  features?: string[];
  safety_notes?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
  sort_order?: number;
}

export interface ProductUpdate extends Partial<ProductInsert> {}

// -----------------------------------------------------------------------------
// UNITS (Individual inventory items)
// -----------------------------------------------------------------------------

export interface Unit {
  id: string;
  product_id: string;
  unit_number: number;
  nickname: string | null;
  serial_number: string | null;
  status: UnitStatus;
  status_notes: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitInsert {
  product_id: string;
  unit_number: number;
  nickname?: string | null;
  serial_number?: string | null;
  status?: UnitStatus;
  status_notes?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  last_inspection_date?: string | null;
  next_inspection_date?: string | null;
  notes?: string | null;
}

export interface UnitUpdate extends Partial<UnitInsert> {}

export interface UnitWithProduct extends Unit {
  product: Product;
}

// -----------------------------------------------------------------------------
// CUSTOMERS
// -----------------------------------------------------------------------------

export interface Customer {
  id: string;
  email: string;
  phone: string;
  phone_normalized: string | null;
  first_name: string;
  last_name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  merged_into_id: string | null;
  booking_count: number;  // Total confirmed+ bookings (incremented on payment)
  completed_bookings_count: number;  // Only completed rentals (for loyalty/metrics)
  total_spent: number;
  internal_notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  last_booking_at: string | null;
}

export interface CustomerInsert {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  internal_notes?: string | null;
  tags?: string[] | null;
}

export interface CustomerUpdate extends Partial<CustomerInsert> {}

// Helper function
export function getCustomerFullName(customer: Customer): string {
  return `${customer.first_name} ${customer.last_name}`;
}

// -----------------------------------------------------------------------------
// PRODUCT SNAPSHOT (stored in bookings.product_snapshot JSONB)
// -----------------------------------------------------------------------------

export interface ProductSnapshot {
  id: string;
  name: string;
  slug: string;
  price_daily: number;
  price_weekend: number;
  price_sunday: number;
  dimensions?: string;
  image_url?: string;
}

// -----------------------------------------------------------------------------
// BOOKINGS
// -----------------------------------------------------------------------------

export interface Booking {
  id: string;
  booking_number: string;
  unit_id: string;
  customer_id: string;
  product_snapshot: ProductSnapshot;
  booking_type: BookingType;
  event_date: string;
  delivery_date: string;
  pickup_date: string;
  delivery_window: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string | null;
  delivery_zip: string | null;
  delivery_notes: string | null;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_refunded: boolean;
  deposit_refund_reason: string | null;
  deposit_refunded_at: string | null;
  balance_paid: boolean;
  balance_paid_at: string | null;
  balance_payment_method: string | null;
  final_amount_collected: number | null;
  status: BookingStatus;
  customer_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  refund_processed_at: string | null;
  stripe_refund_id: string | null;
  delivered_by: string | null;
  picked_up_by: string | null;
  followup_sent_at: string | null;
  // ACH/Async payment tracking
  payment_method_type: string | null;
  is_async_payment: boolean;
  async_payment_status: string | null;
  async_payment_initiated_at: string | null;
  async_payment_completed_at: string | null;
  async_payment_failed_at: string | null;
  async_payment_failure_reason: string | null;
  stripe_payment_intent_id: string | null;
  needs_attention: boolean;
  attention_reason: string | null;
}

export interface BookingInsert {
  unit_id: string;
  customer_id: string;
  product_snapshot: ProductSnapshot;
  booking_type: BookingType;
  event_date: string;
  delivery_date: string;
  pickup_date: string;
  delivery_window: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state?: string | null;
  delivery_zip?: string | null;
  delivery_notes?: string | null;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  customer_notes?: string | null;
  internal_notes?: string | null;
  status?: BookingStatus;
}

export interface BookingUpdate extends Partial<Omit<BookingInsert, 'unit_id' | 'customer_id'>> {
  deposit_paid?: boolean;
  deposit_paid_at?: string | null;
  deposit_refunded?: boolean;
  deposit_refund_reason?: string | null;
  deposit_refunded_at?: string | null;
  balance_paid?: boolean;
  balance_paid_at?: string | null;
  balance_payment_method?: string | null;
  final_amount_collected?: number | null;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  picked_up_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  refund_processed_at?: string | null;
  stripe_refund_id?: string | null;
  delivered_by?: string | null;
  picked_up_by?: string | null;
  followup_sent_at?: string | null;
}

// Booking with joined relations
export interface BookingWithRelations extends Booking {
  customer: Customer;
  unit: UnitWithProduct;
}

// -----------------------------------------------------------------------------
// PAYMENTS
// -----------------------------------------------------------------------------

export interface Payment {
  id: string;
  booking_id: string;
  payment_type: string; // 'deposit' | 'balance' | 'refund'
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  card_brand: string | null;
  card_last_four: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Stripe fee tracking
  stripe_fee: number | null;
  // ACH/Async payment tracking
  payment_method_type: string | null;
  bank_name: string | null;
  bank_last_four: string | null;
  is_async: boolean;
  async_status: string | null;
  async_completed_at: string | null;
  async_failed_at: string | null;
  async_failure_reason: string | null;
  is_manual_entry: boolean;
  notes: string | null;
}

export interface PaymentInsert {
  booking_id: string;
  payment_type: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  payment_method?: string | null;
  card_brand?: string | null;
  card_last_four?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PaymentUpdate extends Partial<PaymentInsert> {
  stripe_refund_id?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  completed_at?: string | null;
}

// -----------------------------------------------------------------------------
// BLACKOUT DATES
// -----------------------------------------------------------------------------

export interface BlackoutDate {
  id: string;
  product_id: string | null;
  unit_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  created_at: string;
  created_by: string | null;
}

export interface BlackoutDateInsert {
  product_id?: string | null;
  unit_id?: string | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  created_by?: string | null;
}

export interface BlackoutDateWithRelations extends BlackoutDate {
  product?: Product | null;
  unit?: UnitWithProduct | null;
}

// -----------------------------------------------------------------------------
// ADMIN USERS
// -----------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// -----------------------------------------------------------------------------
// AUDIT LOG
// -----------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'ERROR';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  performed_by: string | null;
  performed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
}

// =============================================================================
// VIEW TYPES (Pre-built database views)
// =============================================================================

export interface TodaysDelivery {
  booking_number: string;
  delivery_window: string;
  delivery_address: string;
  delivery_city: string;
  delivery_notes: string | null;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  unit_number: number;
  status: BookingStatus;
}

export interface TodaysPickup {
  booking_number: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  unit_number: number;
  balance_due: number;
  balance_paid: boolean;
  status: BookingStatus;
}

export interface UpcomingScheduleItem {
  event_type: 'delivery' | 'pickup';
  event_date: string;
  time_window: string;
  booking_number: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  product_name: string;
  status: BookingStatus;
}

export interface CustomerLeaderboardEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_bookings: number;  // All confirmed+ bookings
  completed_bookings: number;  // Only completed rentals (used for tier)
  total_spent: number;
  last_booking_at: string | null;
  customer_tier: 'VIP' | 'Loyal' | 'Returning' | 'New';
}

// =============================================================================
// DASHBOARD STATS (computed)
// =============================================================================

export interface DashboardStats {
  todaysDeliveries: number;
  todaysPickups: number;
  pendingBookings: number;
  weekRevenue: number;
  monthRevenue: number;
}

// =============================================================================
// FRONTEND DISPLAY TYPES
// =============================================================================

/**
 * Product formatted for frontend display
 * (matches the old Rental interface structure for easier migration)
 */
export interface ProductDisplay {
  id: string;
  slug: string;
  name: string;
  series?: string;
  subtitle: string;
  description: string;
  pricing: {
    daily: number;
    weekend: number;
    sunday: number;
  };
  specs: {
    dimensions: string;
    footprint: string;
    maxPlayers: number;
    maxWeightPerPlayer: number;
    totalWeightLimit: number;
    heightRange: string;
    wetOrDry: WetDryOption | null;
    powerRequired: string;
  };
  features: string[];
  image: string;
  gallery: string[];
  safetyNotes?: string[];
  isActive: boolean;
}

/**
 * Convert database Product to frontend ProductDisplay
 */
export function toProductDisplay(product: Product): ProductDisplay {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    series: product.series ?? undefined,
    subtitle: product.subtitle ?? '',
    description: product.description ?? '',
    pricing: {
      daily: Number(product.price_daily),
      weekend: Number(product.price_weekend),
      sunday: Number(product.price_sunday),
    },
    specs: {
      dimensions: product.dimensions ?? '',
      footprint: product.footprint ?? '',
      maxPlayers: product.max_players ?? 0,
      maxWeightPerPlayer: product.max_weight_per_player ?? 0,
      totalWeightLimit: product.total_weight_limit ?? 0,
      heightRange: product.height_range ?? '',
      wetOrDry: product.wet_or_dry,
      powerRequired: product.power_required ?? '',
    },
    features: product.features ?? [],
    image: product.image_url ?? '',
    gallery: product.gallery_urls ?? [],
    safetyNotes: product.safety_notes ?? undefined,
    isActive: product.is_active,
  };
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateBookingRequest {
  productSlug: string;
  eventDate: string;
  bookingType: BookingType;
  deliveryWindow: string;
  pickupWindow: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export interface CreateBookingResponse {
  success: boolean;
  bookingId?: string;
  bookingNumber?: string;
  redirectUrl?: string;
  error?: string;
}

export interface AvailabilityRequest {
  productSlug: string;
}

export interface AvailabilityResponse {
  unavailableDates: string[];
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function formatBookingNumber(booking: Booking | { booking_number: string }): string {
  return booking.booking_number;
}

export function getStatusColor(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    delivered: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    picked_up: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    completed: 'bg-green-500/10 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return colors[status];
}

export function getStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    delivered: 'Delivered',
    picked_up: 'Picked Up',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

export function getBookingTypeLabel(type: BookingType): string {
  const labels: Record<BookingType, string> = {
    daily: 'Daily',
    weekend: 'Weekend',
    sunday: 'Sunday',
  };
  return labels[type];
}

/**
 * Get delivery window as actual time display
 * @example getDeliveryWindowLabel('morning') => "8–11 AM"
 */
export function getDeliveryWindowLabel(window: string): string {
  const labels: Record<string, string> = {
    'morning': '8–11 AM',
    'midday': '11 AM–2 PM',
    'afternoon': '2–5 PM',
    'saturday-evening': '5–7 PM',
  };
  return labels[window] || window;
}

/**
 * Get pickup window as actual time display
 * @example getPickupWindowLabel('evening') => "6–8 PM"
 */
export function getPickupWindowLabel(window: string): string {
  const labels: Record<string, string> = {
    'evening': '6–8 PM',
    'next-morning': 'By 10 AM',
    'monday-morning': 'By 10 AM',
    'monday-afternoon': '2–5 PM',
  };
  return labels[window] || window;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  // Use timezone-aware formatting for Eastern Time
  return formatEventDateShort(date);
}

export function formatDateTime(date: string): string {
  // Use timezone-aware formatting for Eastern Time
  return formatTimestampShort(date);
}

// Status transition validation
export function canTransitionTo(current: BookingStatus, target: BookingStatus): boolean {
  const transitions: Record<BookingStatus, BookingStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['delivered', 'cancelled'],
    delivered: ['picked_up', 'cancelled'],
    picked_up: ['completed'],
    completed: [],
    cancelled: [],
  };
  return transitions[current]?.includes(target) ?? false;
}

export function getNextStatus(current: BookingStatus): BookingStatus | null {
  const next: Record<BookingStatus, BookingStatus | null> = {
    pending: 'confirmed',
    confirmed: 'delivered',
    delivered: 'picked_up',
    picked_up: 'completed',
    completed: null,
    cancelled: null,
  };
  return next[current];
}

// =============================================================================
// SUPABASE DATABASE TYPE (for createClient generic)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      units: {
        Row: Unit;
        Insert: UnitInsert;
        Update: UnitUpdate;
      };
      customers: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      bookings: {
        Row: Booking;
        Insert: BookingInsert;
        Update: BookingUpdate;
      };
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      blackout_dates: {
        Row: BlackoutDate;
        Insert: BlackoutDateInsert;
        Update: Partial<BlackoutDateInsert>;
      };
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>>;
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: never;
        Update: never;
      };
    };
    Views: {
      todays_deliveries: {
        Row: TodaysDelivery;
      };
      todays_pickups: {
        Row: TodaysPickup;
      };
      upcoming_week_schedule: {
        Row: UpcomingScheduleItem;
      };
      customer_leaderboard: {
        Row: CustomerLeaderboardEntry;
      };
    };
    Functions: {
      find_available_unit: {
        Args: { product_uuid: string; start_date: string; end_date: string };
        Returns: string | null;
      };
      cleanup_expired_pending_bookings: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}