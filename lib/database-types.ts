import {
  formatEventDateShort,
  formatTimestampShort,
  EASTERN_TIMEZONE,
} from './timezone';

// =============================================================================
// DATABASE TYPES - Single Source of Truth
// Consolidated from database-types.ts + database_types.ts
// Matches actual Supabase schema as of Dec 2024
// Updated Dec 2024: Added Booking Blocks System
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

// -----------------------------------------------------------------------------
// BOOKING BLOCKS SYSTEM ENUMS (added Dec 2024)
// -----------------------------------------------------------------------------

/** How a product is scheduled: fixed time slots or all-day rentals */
export type SchedulingMode = 'slot_based' | 'day_rental';

/** Types of time blocks created for each booking */
export type BlockType = 'event' | 'service_delivery' | 'service_pickup' | 'cleaning_buffer';

/** Resource types for booking blocks */
export type ResourceType = 'asset' | 'ops';

/** Operational resource types (crew teams, vehicles) */
export type OpsResourceType = 'crew' | 'vehicle';

/** Reasons for issuing store credits */
export type CreditReason =
  | 'weather'
  | 'customer_reschedule'
  | 'owner_override'
  | 'equipment_issue'
  | 'other';

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
  available_booking_types: BookingType[] | null;
  same_day_pickup_only: boolean;
  created_at: string;
  updated_at: string;
  // Booking blocks system fields (added Dec 2024)
  scheduling_mode: SchedulingMode;
  setup_minutes: number;
  teardown_minutes: number;
  travel_buffer_minutes: number;
  cleaning_minutes: number;
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
  available_booking_types?: BookingType[];
  same_day_pickup_only?: boolean;
  // Booking blocks system fields
  scheduling_mode?: SchedulingMode;
  setup_minutes?: number;
  teardown_minutes?: number;
  travel_buffer_minutes?: number;
  cleaning_minutes?: number;
}

export interface ProductUpdate extends Partial<ProductInsert> {}

// -----------------------------------------------------------------------------
// PRODUCT SLOTS (Fixed time windows for slot-based products)
// -----------------------------------------------------------------------------

export interface ProductSlot {
  id: string;
  product_id: string;
  label: string;                    // "3 PM – 7 PM"
  start_time_local: string;         // "15:00:00"
  end_time_local: string;           // "19:00:00"
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductSlotInsert {
  product_id: string;
  label: string;
  start_time_local: string;
  end_time_local: string;
  is_active?: boolean;
  display_order?: number;
}

export interface ProductSlotUpdate extends Partial<ProductSlotInsert> {}

// -----------------------------------------------------------------------------
// OPS RESOURCES (Crew teams, vehicles)
// -----------------------------------------------------------------------------

export interface OpsResource {
  id: string;
  name: string;                     // "Crew Team A", "Delivery Van #1"
  resource_type: OpsResourceType;
  capacity: number;                 // How many concurrent jobs (typically 1)
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsResourceInsert {
  name: string;
  resource_type: OpsResourceType;
  capacity?: number;
  is_active?: boolean;
  notes?: string | null;
}

export interface OpsResourceUpdate extends Partial<OpsResourceInsert> {}

// -----------------------------------------------------------------------------
// BOOKING BLOCKS (Time blocks for scheduling)
// -----------------------------------------------------------------------------

export interface BookingBlock {
  id: string;
  booking_id: string;
  block_type: BlockType;
  resource_type: ResourceType;
  resource_id: string;              // units.id (asset) or ops_resources.id (ops)
  units_required: number;           // For ops capacity checking
  start_ts: string;                 // ISO timestamp
  end_ts: string;                   // ISO timestamp
  time_range: string;               // PostgreSQL tstzrange (generated)
  created_at: string;
}

export interface BookingBlockInsert {
  booking_id: string;
  block_type: BlockType;
  resource_type: ResourceType;
  resource_id: string;
  units_required?: number;
  start_ts: string;
  end_ts: string;
}

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
  // Booking blocks system fields (added Dec 2024)
  slot_id: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  service_start_time: string | null;
  service_end_time: string | null;
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
  // Booking blocks system fields
  slot_id?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  service_start_time?: string | null;
  service_end_time?: string | null;
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
// CREDITS (Store credits for weather/cancellations)
// -----------------------------------------------------------------------------

export interface Credit {
  id: string;
  customer_id: string;
  booking_id_origin: string | null;
  amount_cents: number;
  remaining_cents: number;
  reason: CreditReason;
  reason_notes: string | null;
  expires_at: string;
  is_transferable: boolean;
  transferred_to_customer_id: string | null;
  transferred_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditInsert {
  customer_id: string;
  booking_id_origin?: string | null;
  amount_cents: number;
  remaining_cents: number;
  reason: CreditReason;
  reason_notes?: string | null;
  expires_at: string;
  is_transferable?: boolean;
}

export interface CreditUpdate {
  remaining_cents?: number;
  reason_notes?: string | null;
  is_transferable?: boolean;
  transferred_to_customer_id?: string | null;
  transferred_at?: string | null;
}

export interface CreditWithCustomer extends Credit {
  customer: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// -----------------------------------------------------------------------------
// CREDIT REDEMPTIONS (Track how credits are used)
// -----------------------------------------------------------------------------

export interface CreditRedemption {
  id: string;
  credit_id: string;
  booking_id_new: string;
  amount_cents: number;
  created_at: string;
}

export interface CreditRedemptionInsert {
  credit_id: string;
  booking_id_new: string;
  amount_cents: number;
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

// -----------------------------------------------------------------------------
// BOOKING SCHEDULE BLOCKS VIEW
// -----------------------------------------------------------------------------

export interface BookingScheduleBlock {
  booking_id: string;
  booking_number: string;
  booking_status: string;
  event_date: string;
  delivery_date: string;
  pickup_date: string;
  block_type: BlockType;
  resource_type: ResourceType;
  resource_id: string;
  start_ts: string;
  end_ts: string;
  resource_name: string | null;
  product_name: string | null;
  customer_name: string | null;
}

// =============================================================================
// AVAILABILITY CHECK TYPES (Booking Blocks System)
// =============================================================================

/** Result from get_available_slots_for_date function */
export interface AvailableSlot {
  slot_id: string;
  label: string;
  start_time_local: string;
  end_time_local: string;
  event_start: string;              // ISO timestamp
  event_end: string;                // ISO timestamp
  service_start: string;            // ISO timestamp
  service_end: string;              // ISO timestamp
  is_available: boolean;
  unavailable_reason: string | null;
}

/** Result from check_day_rental_availability function */
export interface DayRentalAvailability {
  is_available: boolean;
  unavailable_reason: string | null;
  unit_id: string | null;
  service_start: string | null;
  service_end: string | null;
  same_day_pickup_possible: boolean;
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
  // Booking configuration
  availableBookingTypes: BookingType[];
  sameDayPickupOnly: boolean;
  // Scheduling configuration
  schedulingMode: SchedulingMode;
  setupMinutes: number;
  teardownMinutes: number;
  travelBufferMinutes: number;
  cleaningMinutes: number;
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
    // Booking configuration - default to all types if not specified
    availableBookingTypes: product.available_booking_types ?? ['daily', 'weekend', 'sunday'],
    sameDayPickupOnly: product.same_day_pickup_only ?? false,
    // Scheduling configuration
    schedulingMode: product.scheduling_mode ?? 'day_rental',
    setupMinutes: product.setup_minutes ?? 45,
    teardownMinutes: product.teardown_minutes ?? 45,
    travelBufferMinutes: product.travel_buffer_minutes ?? 30,
    cleaningMinutes: product.cleaning_minutes ?? 30,
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

/** Request to get available slots for a date (slot-based products) */
export interface GetAvailableSlotsRequest {
  productId: string;
  date: string;                     // YYYY-MM-DD
  leadTimeHours?: number;           // Default 18
}

/** Response with available slots */
export interface GetAvailableSlotsResponse {
  slots: AvailableSlot[];
  error?: string;
}

/** Request to check day rental availability */
export interface CheckDayRentalRequest {
  productId: string;
  deliveryDate: string;             // YYYY-MM-DD
  pickupDate: string;               // YYYY-MM-DD
  leadTimeHours?: number;           // Default 18
}

/** Response for day rental availability */
export interface CheckDayRentalResponse {
  availability: DayRentalAvailability;
  error?: string;
}

/** Request to create a slot-based booking */
export interface CreateSlotBookingRequest {
  productSlug: string;
  slotId: string;
  eventDate: string;                // YYYY-MM-DD
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  state?: string;
  zip?: string;
  notes?: string;
  promoCode?: string;
}

/** Request to create a day rental booking */
export interface CreateDayRentalBookingRequest {
  productSlug: string;
  deliveryDate: string;             // YYYY-MM-DD
  pickupDate: string;               // YYYY-MM-DD
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  state?: string;
  zip?: string;
  notes?: string;
  promoCode?: string;
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

// -----------------------------------------------------------------------------
// BOOKING BLOCKS HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/** Format slot label for display */
export function formatSlotLabel(slot: ProductSlot | AvailableSlot): string {
  return slot.label;
}

/** Check if a slot is in the past */
export function isSlotInPast(slot: AvailableSlot): boolean {
  return new Date(slot.event_start) < new Date();
}

/** Format credit amount for display */
export function formatCreditAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/** Check if credit is expired */
export function isCreditExpired(credit: Credit): boolean {
  return new Date(credit.expires_at) < new Date();
}

/** Check if credit has remaining balance */
export function creditHasBalance(credit: Credit): boolean {
  return credit.remaining_cents > 0;
}

/** Check if credit is usable */
export function isCreditUsable(credit: Credit): boolean {
  return creditHasBalance(credit) && !isCreditExpired(credit);
}

/** Get credit status label */
export function getCreditStatusLabel(credit: Credit): string {
  if (credit.remaining_cents === 0) return 'Used';
  if (isCreditExpired(credit)) return 'Expired';
  return 'Available';
}

/** Get credit status color */
export function getCreditStatusColor(credit: Credit): string {
  if (credit.remaining_cents === 0) return 'bg-gray-500/10 text-gray-400';
  if (isCreditExpired(credit)) return 'bg-red-500/10 text-red-400';
  return 'bg-green-500/10 text-green-400';
}

/** Get block type label */
export function getBlockTypeLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    event: 'Event',
    service_delivery: 'Delivery',
    service_pickup: 'Pickup',
    cleaning_buffer: 'Cleaning',
  };
  return labels[type];
}

/** Get block type color */
export function getBlockTypeColor(type: BlockType): string {
  const colors: Record<BlockType, string> = {
    event: 'bg-purple-500',
    service_delivery: 'bg-blue-500',
    service_pickup: 'bg-cyan-500',
    cleaning_buffer: 'bg-amber-500',
  };
  return colors[type];
}

/** Get resource type label */
export function getResourceTypeLabel(type: ResourceType): string {
  return type === 'asset' ? 'Equipment' : 'Operations';
}

/** Get ops resource type label */
export function getOpsResourceTypeLabel(type: OpsResourceType): string {
  return type === 'crew' ? 'Crew' : 'Vehicle';
}

/** Get credit reason label */
export function getCreditReasonLabel(reason: CreditReason): string {
  const labels: Record<CreditReason, string> = {
    weather: 'Weather Cancellation',
    customer_reschedule: 'Customer Reschedule',
    owner_override: 'Owner Override',
    equipment_issue: 'Equipment Issue',
    other: 'Other',
  };
  return labels[reason];
}

// -----------------------------------------------------------------------------
// SERVICE WINDOW CALCULATION HELPERS
// -----------------------------------------------------------------------------

export interface ServiceWindowConfig {
  setupMinutes: number;
  teardownMinutes: number;
  travelBufferMinutes: number;
  cleaningMinutes: number;
}

export const DEFAULT_SERVICE_CONFIG: ServiceWindowConfig = {
  setupMinutes: 45,
  teardownMinutes: 45,
  travelBufferMinutes: 30,
  cleaningMinutes: 30,
};

/** Calculate service start time from event start */
export function calculateServiceStart(
  eventStart: Date,
  config: ServiceWindowConfig = DEFAULT_SERVICE_CONFIG
): Date {
  const totalPreMinutes = config.travelBufferMinutes + config.setupMinutes;
  return new Date(eventStart.getTime() - totalPreMinutes * 60 * 1000);
}

/** Calculate service end time from event end */
export function calculateServiceEnd(
  eventEnd: Date,
  config: ServiceWindowConfig = DEFAULT_SERVICE_CONFIG
): Date {
  const totalPostMinutes =
    config.teardownMinutes + config.travelBufferMinutes + config.cleaningMinutes;
  return new Date(eventEnd.getTime() + totalPostMinutes * 60 * 1000);
}

/** Get total service duration in minutes */
export function getTotalServiceDuration(
  eventDurationMinutes: number,
  config: ServiceWindowConfig = DEFAULT_SERVICE_CONFIG
): number {
  return (
    config.travelBufferMinutes +
    config.setupMinutes +
    eventDurationMinutes +
    config.teardownMinutes +
    config.travelBufferMinutes +
    config.cleaningMinutes
  );
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
      product_slots: {
        Row: ProductSlot;
        Insert: ProductSlotInsert;
        Update: ProductSlotUpdate;
      };
      ops_resources: {
        Row: OpsResource;
        Insert: OpsResourceInsert;
        Update: OpsResourceUpdate;
      };
      booking_blocks: {
        Row: BookingBlock;
        Insert: BookingBlockInsert;
        Update: never; // Blocks should not be updated, only deleted and recreated
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
      credits: {
        Row: Credit;
        Insert: CreditInsert;
        Update: CreditUpdate;
      };
      credit_redemptions: {
        Row: CreditRedemption;
        Insert: CreditRedemptionInsert;
        Update: never;
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
      booking_schedule_blocks: {
        Row: BookingScheduleBlock;
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
      get_available_slots_for_date: {
        Args: { p_product_id: string; p_date: string; p_lead_time_hours?: number };
        Returns: AvailableSlot[];
      };
      check_day_rental_availability: {
        Args: { p_product_id: string; p_delivery_date: string; p_pickup_date: string; p_lead_time_hours?: number };
        Returns: DayRentalAvailability[];
      };
      create_booking_blocks: {
        Args: { p_booking_id: string; p_unit_id: string; p_product_id: string; p_event_start: string; p_event_end: string };
        Returns: void;
      };
      ops_capacity_ok: {
        Args: { p_ops_resource_id: string; p_start: string; p_end: string; p_units?: number; p_exclude_booking_id?: string };
        Returns: boolean;
      };
      is_asset_available: {
        Args: { p_unit_id: string; p_start: string; p_end: string; p_exclude_booking_id?: string };
        Returns: boolean;
      };
    };
  };
}
