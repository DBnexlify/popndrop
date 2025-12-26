-- =============================================================================
-- OPS RESOURCE SCHEDULING - FUNCTIONS ONLY
-- Run this AFTER 20241226_fix_schema_conflict.sql succeeds
-- =============================================================================

-- =============================================================================
-- FUNCTION 1: Check if ops resource is available for a time window
-- =============================================================================

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
      AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
      AND (p_exclude_booking_id IS NULL OR bb.booking_id != p_exclude_booking_id)
      AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(p_start_ts, p_end_ts)
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$;

-- =============================================================================
-- FUNCTION 2: Find an available ops resource for a time window
-- =============================================================================

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
        AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
        AND (p_exclude_booking_id IS NULL OR bb.booking_id != p_exclude_booking_id)
        AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(p_start_ts, p_end_ts)
    )
  ORDER BY r.name
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;
  
  RETURN v_resource_id;
END;
$$;

-- =============================================================================
-- FUNCTION 3: Count available ops resources for a time window
-- =============================================================================

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
        AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
        AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(p_start_ts, p_end_ts)
    );
  
  RETURN v_count;
END;
$$;

-- =============================================================================
-- FUNCTION 4: Get available slots for a slot-based product on a date
-- =============================================================================

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
      + ((v_teardown_minutes + v_travel_buffer) || ' minutes')::INTERVAL AS service_end,
    CASE
      WHEN (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
           - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL < v_lead_time_cutoff
        THEN false
      WHEN EXISTS (
        SELECT 1 FROM blackout_dates bd 
        WHERE bd.product_id = p_product_id 
          AND p_date BETWEEN bd.start_date AND bd.end_date
      ) THEN false
      WHEN EXISTS (
        SELECT 1 
        FROM booking_blocks bb
        JOIN bookings b ON b.id = bb.booking_id
        JOIN units u ON u.id = bb.resource_id
        WHERE bb.resource_type = 'asset'
          AND u.product_id = p_product_id
          AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
          AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(
            (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
              - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
            (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
              + ((v_teardown_minutes + v_travel_buffer) || ' minutes')::INTERVAL
          )
      ) THEN false
      WHEN count_available_ops_resources(
        'delivery_crew',
        (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
          - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
        (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
      ) = 0 THEN false
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
          AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
          AND tstzrange(bb.start_ts, bb.end_ts) && tstzrange(
            (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
              - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL,
            (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
              + ((v_teardown_minutes + v_travel_buffer) || ' minutes')::INTERVAL
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

-- =============================================================================
-- FUNCTION 5: Check day rental availability with ops capacity
-- =============================================================================

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
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Product not found'::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  v_same_day := (p_delivery_date = p_pickup_date);
  v_lead_time_cutoff := v_now + (p_lead_time_hours || ' hours')::INTERVAL;
  
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
  v_service_end := v_pickup_end + INTERVAL '30 minutes';
  
  IF v_delivery_start < v_lead_time_cutoff THEN
    RETURN QUERY SELECT false, 'Requires ' || p_lead_time_hours || ' hours advance booking'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
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
        AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
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
  
  SELECT find_available_ops_resource('delivery_crew', v_delivery_start - INTERVAL '30 minutes', v_delivery_end)
    INTO v_delivery_crew_id;
  
  IF v_delivery_crew_id IS NULL THEN
    RETURN QUERY SELECT false, 'No delivery crew available'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  SELECT find_available_ops_resource('delivery_crew', v_pickup_start, v_pickup_end + INTERVAL '30 minutes')
    INTO v_pickup_crew_id;
  
  IF v_pickup_crew_id IS NULL THEN
    IF v_same_day THEN
      v_pickup_start := (p_pickup_date + 1 || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
      v_pickup_end := (p_pickup_date + 1 || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
      v_service_end := v_pickup_end + INTERVAL '30 minutes';
      
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
-- FUNCTION 6: Create booking blocks (atomic transaction)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_booking_blocks(
  p_booking_id UUID,
  p_unit_id UUID,
  p_product_id UUID,
  p_event_start TIMESTAMPTZ,
  p_event_end TIMESTAMPTZ,
  p_delivery_crew_id UUID DEFAULT NULL,
  p_pickup_crew_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_service_start TIMESTAMPTZ;
  v_service_end TIMESTAMPTZ;
  v_delivery_leg_start TIMESTAMPTZ;
  v_delivery_leg_end TIMESTAMPTZ;
  v_pickup_leg_start TIMESTAMPTZ;
  v_pickup_leg_end TIMESTAMPTZ;
  v_assigned_delivery_crew UUID;
  v_assigned_pickup_crew UUID;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
  
  v_service_start := p_event_start - ((COALESCE(v_product.setup_minutes, 60) + COALESCE(v_product.travel_buffer_minutes, 30)) || ' minutes')::INTERVAL;
  v_service_end := p_event_end + ((COALESCE(v_product.teardown_minutes, 30) + COALESCE(v_product.travel_buffer_minutes, 30)) || ' minutes')::INTERVAL;
  
  v_delivery_leg_start := v_service_start;
  v_delivery_leg_end := p_event_start;
  
  v_pickup_leg_start := p_event_end;
  v_pickup_leg_end := v_service_end;
  
  IF p_delivery_crew_id IS NULL THEN
    SELECT find_available_ops_resource('delivery_crew', v_delivery_leg_start, v_delivery_leg_end, p_booking_id)
      INTO v_assigned_delivery_crew;
  ELSE
    v_assigned_delivery_crew := p_delivery_crew_id;
  END IF;
  
  IF p_pickup_crew_id IS NULL THEN
    SELECT find_available_ops_resource('delivery_crew', v_pickup_leg_start, v_pickup_leg_end, p_booking_id)
      INTO v_assigned_pickup_crew;
  ELSE
    v_assigned_pickup_crew := p_pickup_crew_id;
  END IF;
  
  IF v_assigned_delivery_crew IS NULL THEN
    RAISE EXCEPTION 'No delivery crew available for booking %', p_booking_id;
  END IF;
  
  IF v_assigned_pickup_crew IS NULL THEN
    RAISE EXCEPTION 'No pickup crew available for booking %', p_booking_id;
  END IF;
  
  DELETE FROM booking_blocks WHERE booking_id = p_booking_id;
  
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (p_booking_id, 'asset', p_unit_id, 'full_rental', v_service_start, v_service_end);
  
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (p_booking_id, 'ops', v_assigned_delivery_crew, 'delivery_leg', v_delivery_leg_start, v_delivery_leg_end);
  
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (p_booking_id, 'ops', v_assigned_pickup_crew, 'pickup_leg', v_pickup_leg_start, v_pickup_leg_end);
  
  RETURN true;
  
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Resource conflict - slot no longer available';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- =============================================================================
-- FUNCTION 7: Get blocked dates for product (calendar view)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_blocked_dates_for_product_v2(
  p_product_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS TABLE (blocked_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF v_product.scheduling_mode = 'slot_based' THEN
    RETURN QUERY
    SELECT d::DATE
    FROM generate_series(p_from_date, p_to_date, '1 day'::INTERVAL) d
    WHERE NOT EXISTS (
      SELECT 1 
      FROM get_available_slots_for_date(p_product_id, d::DATE, 18) slots
      WHERE slots.is_available = true
    );
  ELSE
    RETURN QUERY
    SELECT d::DATE
    FROM generate_series(p_from_date, p_to_date, '1 day'::INTERVAL) d
    WHERE NOT EXISTS (
      SELECT 1 
      FROM check_day_rental_availability(p_product_id, d::DATE, d::DATE, 18) avail
      WHERE avail.is_available = true
    );
  END IF;
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS ON FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION ops_resource_available(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_available_ops_resource(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_available_ops_resources(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_available_slots_for_date(UUID, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_day_rental_availability(UUID, DATE, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_booking_blocks(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_blocked_dates_for_product_v2(UUID, DATE, DATE) TO anon, authenticated, service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== FUNCTIONS CREATED SUCCESSFULLY ===';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  - ops_resource_available()';
  RAISE NOTICE '  - find_available_ops_resource()';
  RAISE NOTICE '  - count_available_ops_resources()';
  RAISE NOTICE '  - get_available_slots_for_date()';
  RAISE NOTICE '  - check_day_rental_availability()';
  RAISE NOTICE '  - create_booking_blocks()';
  RAISE NOTICE '  - get_blocked_dates_for_product_v2()';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration complete! Ready to test.';
END $$;
