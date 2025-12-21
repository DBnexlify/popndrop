-- ============================================================================
-- PERFORMANCE INDEXES
-- supabase/migrations/005_performance_indexes.sql
-- Run this in Supabase SQL Editor to optimize query performance
-- ============================================================================

-- ============================================================================
-- BOOKINGS TABLE INDEXES
-- ============================================================================

-- Fast lookup by booking number (customer lookups)
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number 
ON bookings (booking_number);

-- Fast lookup by customer (my-bookings page)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id 
ON bookings (customer_id);

-- Event date queries (calendars, availability, countdown emails)
CREATE INDEX IF NOT EXISTS idx_bookings_event_date 
ON bookings (event_date);

-- Status filtering (admin dashboards)
CREATE INDEX IF NOT EXISTS idx_bookings_status 
ON bookings (status);

-- Composite index for availability checks (most critical query)
CREATE INDEX IF NOT EXISTS idx_bookings_unit_dates_status 
ON bookings (unit_id, delivery_date, pickup_date, status)
WHERE status NOT IN ('cancelled');

-- Composite for customer booking history
CREATE INDEX IF NOT EXISTS idx_bookings_customer_event 
ON bookings (customer_id, event_date DESC);

-- Countdown email query optimization
-- Note: Using 'confirmed' status (bookings become 'confirmed' after payment)
CREATE INDEX IF NOT EXISTS idx_bookings_countdown_pending 
ON bookings (event_date) 
WHERE countdown_sent_at IS NULL AND status = 'confirmed';

-- Recent bookings for admin
CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
ON bookings (created_at DESC);


-- ============================================================================
-- CUSTOMERS TABLE INDEXES
-- ============================================================================

-- Fast lookup by email (booking flow, login)
CREATE INDEX IF NOT EXISTS idx_customers_email 
ON customers (email);

-- Phone lookup (admin search)
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers (phone);

-- Name search (admin search)
CREATE INDEX IF NOT EXISTS idx_customers_name 
ON customers (last_name, first_name);


-- ============================================================================
-- PRODUCTS TABLE INDEXES
-- ============================================================================

-- Slug lookup (product pages, booking)
CREATE INDEX IF NOT EXISTS idx_products_slug 
ON products (slug);

-- Active products (rentals page)
CREATE INDEX IF NOT EXISTS idx_products_active 
ON products (is_active, sort_order)
WHERE is_active = true;


-- ============================================================================
-- UNITS TABLE INDEXES
-- ============================================================================

-- Units by product (availability checks)
CREATE INDEX IF NOT EXISTS idx_units_product_status 
ON units (product_id, status)
WHERE status = 'available';


-- ============================================================================
-- BLACKOUT DATES INDEXES
-- ============================================================================

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_blackout_dates_range 
ON blackout_dates (date);

-- Product-specific blackouts (if product_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blackout_dates' AND column_name = 'product_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_blackout_product_date 
    ON blackout_dates (product_id, date);
  END IF;
END
$$;


-- ============================================================================
-- CANCELLATION REQUESTS INDEXES
-- ============================================================================

-- Pending requests (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status 
ON cancellation_requests (status, created_at DESC);

-- Booking lookup
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_booking 
ON cancellation_requests (booking_id);


-- ============================================================================
-- ADMIN USERS INDEXES
-- ============================================================================

-- Email lookup (login)
CREATE INDEX IF NOT EXISTS idx_admin_users_email 
ON admin_users (email);


-- ============================================================================
-- PUSH SUBSCRIPTIONS INDEXES (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_push_subscriptions_admin ON push_subscriptions (admin_user_id)';
  END IF;
END
$$;


-- ============================================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================

ANALYZE bookings;
ANALYZE customers;
ANALYZE products;
ANALYZE units;
ANALYZE blackout_dates;

-- Only analyze if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cancellation_requests') THEN
    ANALYZE cancellation_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    ANALYZE admin_users;
  END IF;
END
$$;


-- ============================================================================
-- VERIFICATION: Check all indexes exist
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
