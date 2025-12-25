-- ============================================================================
-- FIX: PENDING BOOKINGS SHOULD NOT BLOCK CALENDAR AVAILABILITY
-- Migration: 20241225_fix_availability_blocking.sql
-- 
-- PROBLEM: 
--   The find_available_unit function blocks ALL non-cancelled bookings,
--   including 'pending' bookings. This means abandoned checkouts permanently
--   block dates, causing lost revenue and customer frustration.
--
-- SOLUTION:
--   Only block dates for bookings that are actually "active" - i.e., confirmed,
--   delivered, picked_up, or completed. Pending bookings should NOT block.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- ============================================================================

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION find_available_unit(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_booking_id UUID DEFAULT NULL  -- NEW: For reschedule feature
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
    -- =========================================================================
    -- CRITICAL FIX: Only block dates for ACTIVE bookings
    -- 
    -- Status meanings:
    --   pending    = Checkout started, NOT paid yet (should NOT block)
    --   confirmed  = Payment received, date is committed (SHOULD block)
    --   delivered  = Equipment on-site (SHOULD block)
    --   picked_up  = Equipment retrieved (SHOULD block)
    --   completed  = Rental finished (SHOULD block - historical accuracy)
    --   cancelled  = Cancelled (should NOT block)
    --
    -- We use IN instead of NOT IN for explicit control over what blocks dates
    -- =========================================================================
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.unit_id = u.id
        AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
        AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
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
  FOR UPDATE OF u SKIP LOCKED;  -- Lock the unit row during selection
  
  RETURN v_unit_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_available_unit(UUID, DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_available_unit(UUID, DATE, DATE, UUID) TO anon;

-- ============================================================================
-- ALSO: Update the exclusion constraint to match
-- The constraint should ALSO only consider active bookings
-- ============================================================================

-- First, drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Recreate with correct logic - only active bookings can conflict
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  unit_id WITH =,
  daterange(delivery_date, pickup_date, '[]') WITH &&
)
WHERE (status IN ('confirmed', 'delivered', 'picked_up', 'completed'));

-- ============================================================================
-- VERIFICATION: Check for any pending bookings that might be stale
-- These can be cleaned up or left to expire naturally
-- ============================================================================

-- Optional: View pending bookings older than 24 hours (likely abandoned)
-- SELECT 
--   booking_number,
--   event_date,
--   created_at,
--   EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS hours_old
-- FROM bookings
-- WHERE status = 'pending'
--   AND created_at < NOW() - INTERVAL '24 hours'
-- ORDER BY created_at;

-- ============================================================================
-- DONE! 
-- After running this migration:
-- - Pending bookings will no longer block calendar dates
-- - Customers can book dates that were previously "held" by abandoned checkouts
-- - The exclusion constraint will only prevent conflicts for active bookings
-- ============================================================================
