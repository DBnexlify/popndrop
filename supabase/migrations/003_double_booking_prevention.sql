-- ============================================================================
-- DOUBLE BOOKING PREVENTION
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- First, enable the btree_gist extension (required for exclusion constraints)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- OPTION 1: EXCLUSION CONSTRAINT (Recommended - PostgreSQL native)
-- This prevents any two bookings for the same unit with overlapping date ranges
-- ============================================================================

-- Add exclusion constraint to bookings table
-- This will FAIL if any overlapping bookings already exist
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  unit_id WITH =,
  daterange(delivery_date, pickup_date, '[]') WITH &&
)
WHERE (status NOT IN ('cancelled'));

-- ============================================================================
-- EXPLANATION:
-- - unit_id WITH = : same unit
-- - daterange(delivery_date, pickup_date, '[]') WITH && : overlapping dates
--   '[]' means inclusive on both ends (delivery through pickup)
-- - WHERE (status NOT IN ('cancelled')) : only applies to active bookings
-- 
-- If two requests try to insert overlapping bookings simultaneously,
-- PostgreSQL will allow one and reject the other with error code 23P01
-- ============================================================================


-- ============================================================================
-- OPTION 2: UNIQUE INDEX ON DATE RANGES (Alternative approach)
-- If the exclusion constraint doesn't work with your setup
-- ============================================================================

-- Uncomment this if you prefer a simpler approach (less flexible but works)
-- This creates a unique index on unit + each date in the range
-- 
-- CREATE UNIQUE INDEX IF NOT EXISTS bookings_unit_date_unique
-- ON bookings (unit_id, delivery_date)
-- WHERE status NOT IN ('cancelled');


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if constraint exists
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND conname = 'bookings_no_overlap';

-- Test for existing overlapping bookings (run BEFORE adding constraint)
SELECT 
  b1.booking_number as booking_1,
  b2.booking_number as booking_2,
  b1.unit_id,
  b1.delivery_date as b1_delivery,
  b1.pickup_date as b1_pickup,
  b2.delivery_date as b2_delivery,
  b2.pickup_date as b2_pickup
FROM bookings b1
JOIN bookings b2 ON b1.unit_id = b2.unit_id
  AND b1.id < b2.id  -- avoid duplicates
  AND b1.status NOT IN ('cancelled')
  AND b2.status NOT IN ('cancelled')
  AND daterange(b1.delivery_date, b1.pickup_date, '[]') && 
      daterange(b2.delivery_date, b2.pickup_date, '[]');


-- ============================================================================
-- IF YOU HAVE EXISTING OVERLAPPING BOOKINGS
-- You'll need to fix them before the constraint can be added
-- ============================================================================

-- Find and list conflicts:
-- (Use the query above)

-- Option A: Cancel one of the conflicting bookings
-- UPDATE bookings SET status = 'cancelled' WHERE id = 'conflicting_booking_id';

-- Option B: Adjust dates on one booking
-- UPDATE bookings SET pickup_date = '2024-01-15' WHERE id = 'conflicting_booking_id';


-- ============================================================================
-- ALSO: Update find_available_unit function with locking (belt + suspenders)
-- ============================================================================

CREATE OR REPLACE FUNCTION find_available_unit(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  -- Find an available unit with row-level locking
  -- FOR UPDATE SKIP LOCKED: if another transaction is checking this unit, skip it
  SELECT u.id INTO v_unit_id
  FROM units u
  WHERE u.product_id = p_product_id
    AND u.status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.unit_id = u.id
        AND b.status NOT IN ('cancelled')
        AND daterange(b.delivery_date, b.pickup_date, '[]') && 
            daterange(p_start_date, p_end_date, '[]')
    )
    AND NOT EXISTS (
      SELECT 1 FROM blackout_dates bd
      WHERE bd.product_id = p_product_id
        AND daterange(bd.start_date, bd.end_date, '[]') &&
            daterange(p_start_date, p_end_date, '[]')
    )
  ORDER BY u.id  -- Consistent ordering for predictability
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;  -- KEY: Lock the unit row during selection
  
  RETURN v_unit_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_available_unit(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION find_available_unit(UUID, DATE, DATE) TO anon;
