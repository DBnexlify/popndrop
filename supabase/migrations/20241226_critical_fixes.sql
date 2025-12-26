-- =============================================================================
-- CRITICAL FIXES MIGRATION
-- 20241226_critical_fixes.sql
-- 
-- Fixes identified in production audit:
-- 1. Pending booking cleanup function
-- 2. Include pending bookings in availability checks
-- 3. Add cleaning buffer support
-- =============================================================================

-- =============================================================================
-- FIX 1: PENDING BOOKING CLEANUP
-- Cleans up abandoned pending bookings and their blocks
-- =============================================================================

-- Drop existing function if it exists (handles return type change)
DROP FUNCTION IF EXISTS cleanup_expired_pending_bookings();

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_pending_bookings(
  p_expiry_minutes INTEGER DEFAULT 45
)
RETURNS TABLE (
  deleted_bookings INTEGER,
  deleted_blocks INTEGER,
  booking_numbers TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_bookings INTEGER := 0;
  v_deleted_blocks INTEGER := 0;
  v_booking_numbers TEXT[] := '{}';
  v_cutoff TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff time
  v_cutoff := NOW() - (p_expiry_minutes || ' minutes')::INTERVAL;
  
  -- Get booking numbers for logging
  SELECT ARRAY_AGG(booking_number) INTO v_booking_numbers
  FROM bookings
  WHERE status = 'pending'
    AND created_at < v_cutoff;
  
  -- Count blocks to be deleted
  SELECT COUNT(*) INTO v_deleted_blocks
  FROM booking_blocks bb
  WHERE bb.booking_id IN (
    SELECT id FROM bookings 
    WHERE status = 'pending' 
    AND created_at < v_cutoff
  );
  
  -- Delete blocks first (foreign key constraint)
  DELETE FROM booking_blocks
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE status = 'pending' 
    AND created_at < v_cutoff
  );
  
  -- Delete pending bookings
  WITH deleted AS (
    DELETE FROM bookings 
    WHERE status = 'pending' 
    AND created_at < v_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_bookings FROM deleted;
  
  -- Return results
  RETURN QUERY SELECT v_deleted_bookings, v_deleted_blocks, COALESCE(v_booking_numbers, '{}');
END;
$$;

COMMENT ON FUNCTION cleanup_expired_pending_bookings IS 
'Cleans up abandoned pending bookings older than specified minutes. Returns count of deleted bookings and blocks.';

-- =============================================================================
-- FIX 2: ADD CLEANING BUFFER TO PRODUCTS
-- =============================================================================

-- Add cleaning_minutes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cleaning_minutes'
  ) THEN
    ALTER TABLE products ADD COLUMN cleaning_minutes INTEGER DEFAULT 15;
    COMMENT ON COLUMN products.cleaning_minutes IS 'Minutes needed between rentals for cleaning/reset';
  END IF;
END $$;

-- =============================================================================
-- FIX 3: UPDATE AVAILABILITY FUNCTIONS TO INCLUDE PENDING BOOKINGS
-- =============================================================================

-- Update ops_resource_available to include pending bookings
CREATE OR REPLACE FUNCTION ops_resource_available(
  p_resource_id UUID,
  p_start_ts TIMESTAMPTZ,
  p_end_ts TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_conflict BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM booking_blocks bb
    JOIN bookings b ON b.id = bb.booking_id
    WHERE bb.resource_type = 'ops'
      AND bb.resource_id = p_resource_id
      -- FIXED: Now includes 'pending' status to prevent double-booking during checkout
      AND b.status IN ('pending', 'confirmed', 'delivered', 'picked_up', 'completed')
      AND (p_exclude_booking_id IS NULL OR bb.booking_id != p_exclude_booking_id)
      AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(p_start_ts, p_end_ts)
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$;

-- Update find_available_ops_resource to include pending bookings
CREATE OR REPLACE FUNCTION find_available_ops_resource(
  p_resource_type TEXT,
  p_start_ts TIMESTAMPTZ,
  p_end_ts TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource_id UUID;
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_start_ts AT TIME ZONE 'America/New_York')::INTEGER;
  v_start_time := (p_start_ts AT TIME ZONE 'America/New_York')::TIME;
  v_end_time := (p_end_ts AT TIME ZONE 'America/New_York')::TIME;
  
  SELECT r.id INTO v_resource_id
  FROM ops_resources r
  LEFT JOIN ops_resource_availability ra ON ra.resource_id = r.id AND ra.day_of_week = v_day_of_week
  WHERE r.resource_type = p_resource_type
    AND r.is_active = true
    AND (ra.id IS NULL OR (ra.is_available = true AND v_start_time >= ra.start_time AND v_end_time <= ra.end_time))
    AND NOT EXISTS (
      SELECT 1 
      FROM booking_blocks bb
      JOIN bookings b ON b.id = bb.booking_id
      WHERE bb.resource_type = 'ops'
        AND bb.resource_id = r.id
        -- FIXED: Now includes 'pending' status
        AND b.status IN ('pending', 'confirmed', 'delivered', 'picked_up', 'completed')
        AND (p_exclude_booking_id IS NULL OR bb.booking_id != p_exclude_booking_id)
        AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(p_start_ts, p_end_ts)
    )
  ORDER BY r.name
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;
  
  RETURN v_resource_id;
END;
$$;

-- Update count_available_ops_resources to include pending bookings
CREATE OR REPLACE FUNCTION count_available_ops_resources(
  p_resource_type TEXT,
  p_start_ts TIMESTAMPTZ,
  p_end_ts TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_start_ts AT TIME ZONE 'America/New_York')::INTEGER;
  v_start_time := (p_start_ts AT TIME ZONE 'America/New_York')::TIME;
  v_end_time := (p_end_ts AT TIME ZONE 'America/New_York')::TIME;
  
  SELECT COUNT(*) INTO v_count
  FROM ops_resources r
  LEFT JOIN ops_resource_availability ra ON ra.resource_id = r.id AND ra.day_of_week = v_day_of_week
  WHERE r.resource_type = p_resource_type
    AND r.is_active = true
    AND (ra.id IS NULL OR (ra.is_available = true AND v_start_time >= ra.start_time AND v_end_time <= ra.end_time))
    AND NOT EXISTS (
      SELECT 1 
      FROM booking_blocks bb
      JOIN bookings b ON b.id = bb.booking_id
      WHERE bb.resource_type = 'ops'
        AND bb.resource_id = r.id
        -- FIXED: Now includes 'pending' status
        AND b.status IN ('pending', 'confirmed', 'delivered', 'picked_up', 'completed')
        AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(p_start_ts, p_end_ts)
    );
  
  RETURN v_count;
END;
$$;

-- Update get_available_slots_for_date to include pending bookings and cleaning buffer
CREATE OR REPLACE FUNCTION get_available_slots_for_date(
  p_product_id UUID,
  p_date DATE,
  p_lead_time_hours INTEGER DEFAULT 18
)
RETURNS TABLE (
  slot_id UUID,
  start_time_local TIME,
  end_time_local TIME,
  label TEXT,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,
  service_start TIMESTAMPTZ,
  service_end TIMESTAMPTZ,
  is_available BOOLEAN,
  unavailable_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_setup_minutes INTEGER;
  v_teardown_minutes INTEGER;
  v_travel_buffer INTEGER;
  v_cleaning_minutes INTEGER;
  v_now TIMESTAMPTZ := now();
  v_lead_time_cutoff TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_setup_minutes := COALESCE(v_product.setup_minutes, 60);
  v_teardown_minutes := COALESCE(v_product.teardown_minutes, 30);
  v_travel_buffer := COALESCE(v_product.travel_buffer_minutes, 30);
  v_cleaning_minutes := COALESCE(v_product.cleaning_minutes, 15);
  v_lead_time_cutoff := v_now + (p_lead_time_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    ps.id AS slot_id,
    ps.start_time_local,
    ps.end_time_local,
    ps.label,
    (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' AS event_start,
    (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' AS event_end,
    (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
      - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL AS service_start,
    (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
      + ((v_teardown_minutes + v_travel_buffer + v_cleaning_minutes) || ' minutes')::INTERVAL AS service_end,
    CASE
      -- Lead time check
      WHEN (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
           - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL < v_lead_time_cutoff
        THEN false
      -- Blackout date check
      WHEN EXISTS (
        SELECT 1 FROM blackout_dates bd 
        WHERE bd.product_id = p_product_id 
          AND p_date BETWEEN bd.start_date AND bd.end_date
      ) THEN false
      -- Asset availability check (FIXED: includes pending)
      WHEN EXISTS (
        SELECT 1 
        FROM booking_blocks bb
        JOIN bookings b ON b.id = bb.booking_id
        JOIN units u ON u.id = bb.resource_id
        WHERE bb.resource_type = 'asset'
          AND u.product_id = p_product_id
          AND b.status IN ('pending', 'confirmed', 'delivered', 'picked_up', 'completed')
          AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(
            (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
              - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
            (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
              + ((v_teardown_minutes + v_travel_buffer + v_cleaning_minutes) || ' minutes')::INTERVAL
          )
      ) THEN false
      -- Delivery crew check
      WHEN count_available_ops_resources(
        'delivery_crew',
        (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
          - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
        (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
      ) = 0 THEN false
      -- Pickup crew check
      WHEN count_available_ops_resources(
        'delivery_crew',
        (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York',
        (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
          + ((v_teardown_minutes + v_travel_buffer) || ' minutes')::INTERVAL
      ) = 0 THEN false
      ELSE true
    END AS is_available,
    CASE
      WHEN (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
           - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL < v_lead_time_cutoff
        THEN 'Requires ' || p_lead_time_hours || ' hours advance booking'
      WHEN EXISTS (
        SELECT 1 FROM blackout_dates bd 
        WHERE bd.product_id = p_product_id 
          AND p_date BETWEEN bd.start_date AND bd.end_date
      ) THEN 'Date not available'
      WHEN EXISTS (
        SELECT 1 
        FROM booking_blocks bb
        JOIN bookings b ON b.id = bb.booking_id
        JOIN units u ON u.id = bb.resource_id
        WHERE bb.resource_type = 'asset'
          AND u.product_id = p_product_id
          AND b.status IN ('pending', 'confirmed', 'delivered', 'picked_up', 'completed')
          AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(
            (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
              - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
            (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
              + ((v_teardown_minutes + v_travel_buffer + v_cleaning_minutes) || ' minutes')::INTERVAL
          )
      ) THEN 'Already booked'
      WHEN count_available_ops_resources(
        'delivery_crew',
        (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
          - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
        (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
      ) = 0 THEN 'No delivery crew available'
      WHEN count_available_ops_resources(
        'delivery_crew',
        (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York',
        (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
          + ((v_teardown_minutes + v_travel_buffer) || ' minutes')::INTERVAL
      ) = 0 THEN 'No pickup crew available'
      ELSE NULL
    END AS unavailable_reason
  FROM product_slots ps
  WHERE ps.product_id = p_product_id
    AND ps.is_active = true
  ORDER BY ps.display_order, ps.start_time_local;
END;
$$;

-- Update check_day_rental_availability to include pending bookings
CREATE OR REPLACE FUNCTION check_day_rental_availability(
  p_product_id UUID,
  p_delivery_date DATE,
  p_pickup_date DATE,
  p_lead_time_hours INTEGER DEFAULT 18
)
RETURNS TABLE (
  is_available BOOLEAN,
  unavailable_reason TEXT,
  unit_id UUID,
  service_start TIMESTAMPTZ,
  service_end TIMESTAMPTZ,
  same_day_pickup_possible BOOLEAN,
  delivery_crew_id UUID,
  pickup_crew_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_unit_id UUID;
  v_delivery_start TIMESTAMPTZ;
  v_delivery_end TIMESTAMPTZ;
  v_pickup_start TIMESTAMPTZ;
  v_pickup_end TIMESTAMPTZ;
  v_service_start TIMESTAMPTZ;
  v_service_end TIMESTAMPTZ;
  v_delivery_crew_id UUID;
  v_pickup_crew_id UUID;
  v_now TIMESTAMPTZ := now();
  v_lead_time_cutoff TIMESTAMPTZ;
  v_same_day BOOLEAN;
  v_cleaning_minutes INTEGER;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Product not found'::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  v_same_day := (p_delivery_date = p_pickup_date);
  v_lead_time_cutoff := v_now + (p_lead_time_hours || ' hours')::INTERVAL;
  v_cleaning_minutes := COALESCE(v_product.cleaning_minutes, 15);
  
  v_delivery_start := (p_delivery_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  v_delivery_end := (p_delivery_date || ' 11:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  
  IF v_same_day THEN
    v_pickup_start := (p_pickup_date || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
    v_pickup_end := (p_pickup_date || ' 20:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  ELSE
    v_pickup_start := (p_pickup_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
    v_pickup_end := (p_pickup_date || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  END IF;
  
  v_service_start := v_delivery_start - INTERVAL '30 minutes';
  v_service_end := v_pickup_end + INTERVAL '30 minutes' + (v_cleaning_minutes || ' minutes')::INTERVAL;
  
  -- Lead time check
  IF v_delivery_start < v_lead_time_cutoff THEN
    RETURN QUERY SELECT false, 'Requires ' || p_lead_time_hours || ' hours advance booking'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Blackout check
  IF EXISTS (
    SELECT 1 FROM blackout_dates bd 
    WHERE bd.product_id = p_product_id 
      AND (p_delivery_date BETWEEN bd.start_date AND bd.end_date
           OR p_pickup_date BETWEEN bd.start_date AND bd.end_date)
  ) THEN
    RETURN QUERY SELECT false, 'Date not available'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Find available unit (FIXED: includes pending bookings)
  SELECT u.id INTO v_unit_id
  FROM units u
  WHERE u.product_id = p_product_id
    AND u.status = 'available'
    AND NOT EXISTS (
      SELECT 1 
      FROM booking_blocks bb
      JOIN bookings b ON b.id = bb.booking_id
      WHERE bb.resource_type = 'asset'
        AND bb.resource_id = u.id
        AND b.status IN ('pending', 'confirmed', 'delivered', 'picked_up', 'completed')
        AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(v_service_start, v_service_end)
    )
  ORDER BY u.unit_number
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;
  
  IF v_unit_id IS NULL THEN
    RETURN QUERY SELECT false, 'No units available for these dates'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Find delivery crew
  SELECT find_available_ops_resource('delivery_crew', v_delivery_start - INTERVAL '30 minutes', v_delivery_end)
    INTO v_delivery_crew_id;
  
  IF v_delivery_crew_id IS NULL THEN
    RETURN QUERY SELECT false, 'No delivery crew available'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Find pickup crew
  SELECT find_available_ops_resource('delivery_crew', v_pickup_start, v_pickup_end + INTERVAL '30 minutes')
    INTO v_pickup_crew_id;
  
  IF v_pickup_crew_id IS NULL THEN
    IF v_same_day THEN
      -- Try next day pickup
      v_pickup_start := (p_pickup_date + 1 || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
      v_pickup_end := (p_pickup_date + 1 || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
      v_service_end := v_pickup_end + INTERVAL '30 minutes' + (v_cleaning_minutes || ' minutes')::INTERVAL;
      
      SELECT find_available_ops_resource('delivery_crew', v_pickup_start, v_pickup_end + INTERVAL '30 minutes')
        INTO v_pickup_crew_id;
      
      IF v_pickup_crew_id IS NULL THEN
        RETURN QUERY SELECT false, 'No pickup crew available'::TEXT, 
          NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
        RETURN;
      END IF;
      
      v_same_day := false;
    ELSE
      RETURN QUERY SELECT false, 'No pickup crew available'::TEXT, 
        NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    NULL::TEXT, 
    v_unit_id, 
    v_service_start, 
    v_service_end, 
    v_same_day,
    v_delivery_crew_id,
    v_pickup_crew_id;
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION cleanup_expired_pending_bookings(INTEGER) TO authenticated, service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== CRITICAL FIXES APPLIED ===';
  RAISE NOTICE '1. cleanup_expired_pending_bookings() - Created';
  RAISE NOTICE '2. cleaning_minutes column - Added to products';
  RAISE NOTICE '3. All availability functions - Now include pending bookings';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '- Deploy cron endpoint: /api/cron/cleanup-pending';
  RAISE NOTICE '- Add cron job in vercel.json';
END $$;
