-- =============================================================================
-- OPS RESOURCE SCHEDULING SYSTEM
-- Migration: 20241226_ops_resource_scheduling.sql
-- 
-- PURPOSE: Enable true resource-based scheduling that scales with business growth
-- 
-- PROBLEM SOLVED:
--   Currently the system only checks asset (bounce house) availability.
--   It doesn't track operational resources (crews/vehicles).
--   With 1 crew, overlapping delivery/pickup windows should block.
--   With 2+ crews, they should be allowed.
--
-- ARCHITECTURE:
--   1. ops_resources - Crews and vehicles that do deliveries/pickups
--   2. booking_blocks - Time blocks reserved for both assets AND ops resources
--   3. Separate delivery_leg and pickup_leg for ops (not full rental window)
--   4. Atomic booking creation with proper locking
--
-- =============================================================================

-- =============================================================================
-- 1. OPS RESOURCES TABLE
-- Tracks crews and vehicles that can perform deliveries/pickups
-- =============================================================================

CREATE TABLE IF NOT EXISTS ops_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('delivery_crew', 'vehicle')),
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#22d3ee', -- For calendar display
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup of active resources by type
CREATE INDEX IF NOT EXISTS idx_ops_resources_type_active 
  ON ops_resources(resource_type, is_active) 
  WHERE is_active = true;

COMMENT ON TABLE ops_resources IS 'Operational resources (crews, vehicles) that perform deliveries and pickups';
COMMENT ON COLUMN ops_resources.resource_type IS 'delivery_crew = people who do setup/teardown, vehicle = trucks/trailers';

-- =============================================================================
-- 2. OPS RESOURCE AVAILABILITY (Weekly Schedule)
-- Defines when each resource is available to work
-- =============================================================================

CREATE TABLE IF NOT EXISTS ops_resource_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES ops_resources(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '20:00:00',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- One schedule entry per resource per day
  UNIQUE(resource_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_ops_availability_resource 
  ON ops_resource_availability(resource_id, day_of_week);

COMMENT ON TABLE ops_resource_availability IS 'Weekly availability schedule for each ops resource';

-- =============================================================================
-- 3. BOOKING BLOCKS TABLE
-- The core scheduling table - tracks all resource reservations
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Resource identification
  resource_type TEXT NOT NULL CHECK (resource_type IN ('asset', 'ops')),
  resource_id UUID NOT NULL, -- Either unit_id (asset) or ops_resource_id (ops)
  
  -- Block type determines the time window
  block_type TEXT NOT NULL CHECK (block_type IN (
    'full_rental',    -- Asset blocked for entire service window
    'delivery_leg',   -- Ops blocked for delivery (travel + setup)
    'pickup_leg'      -- Ops blocked for pickup (teardown + travel)
  )),
  
  -- Time window this block reserves
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_ts > start_ts)
);

-- Critical indexes for overlap checking
CREATE INDEX IF NOT EXISTS idx_booking_blocks_resource 
  ON booking_blocks(resource_type, resource_id, start_ts, end_ts);

CREATE INDEX IF NOT EXISTS idx_booking_blocks_booking 
  ON booking_blocks(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_blocks_time_range 
  ON booking_blocks USING gist (tstzrange(start_ts, end_ts));

COMMENT ON TABLE booking_blocks IS 'Time blocks reserved by bookings - prevents double-booking of assets and ops resources';
COMMENT ON COLUMN booking_blocks.block_type IS 'full_rental=asset for entire period, delivery_leg/pickup_leg=ops for just that portion';

-- =============================================================================
-- 4. EXCLUSION CONSTRAINT FOR ASSET BLOCKS
-- Prevents double-booking the same physical unit
-- =============================================================================

-- For assets (bounce houses, party house), prevent overlapping bookings
ALTER TABLE booking_blocks DROP CONSTRAINT IF EXISTS booking_blocks_asset_no_overlap;
ALTER TABLE booking_blocks 
ADD CONSTRAINT booking_blocks_asset_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_ts, end_ts) WITH &&
) WHERE (resource_type = 'asset');

-- =============================================================================
-- 5. EXCLUSION CONSTRAINT FOR OPS BLOCKS  
-- Prevents double-booking the same crew/vehicle
-- =============================================================================

ALTER TABLE booking_blocks DROP CONSTRAINT IF EXISTS booking_blocks_ops_no_overlap;
ALTER TABLE booking_blocks 
ADD CONSTRAINT booking_blocks_ops_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_ts, end_ts) WITH &&
) WHERE (resource_type = 'ops');

-- =============================================================================
-- 6. PRODUCT SLOTS TABLE (For slot-based products like Party House)
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  start_time_local TIME NOT NULL,  -- e.g., '10:00:00'
  end_time_local TIME NOT NULL,    -- e.g., '14:00:00'
  label TEXT,                       -- e.g., 'Morning (10 AM - 2 PM)'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_slot_times CHECK (end_time_local > start_time_local)
);

CREATE INDEX IF NOT EXISTS idx_product_slots_product 
  ON product_slots(product_id, is_active, display_order);

COMMENT ON TABLE product_slots IS 'Time slots available for slot-based products (e.g., Party House)';

-- =============================================================================
-- 7. SEED INITIAL OPS RESOURCES
-- Current business has 1 crew (owner + spouse) and 1 vehicle
-- =============================================================================

-- Insert default crew (only if table is empty)
INSERT INTO ops_resources (name, resource_type, is_active, color, notes)
SELECT 'Team Alpha', 'delivery_crew', true, '#22d3ee', 'Primary delivery team (owner + spouse)'
WHERE NOT EXISTS (SELECT 1 FROM ops_resources WHERE resource_type = 'delivery_crew');

-- Insert default vehicle
INSERT INTO ops_resources (name, resource_type, is_active, color, notes)
SELECT 'Truck 1', 'vehicle', true, '#a855f7', 'Primary delivery vehicle'
WHERE NOT EXISTS (SELECT 1 FROM ops_resources WHERE resource_type = 'vehicle');

-- Set up default weekly availability (Mon-Sat 8 AM - 8 PM, no Sunday ops)
INSERT INTO ops_resource_availability (resource_id, day_of_week, start_time, end_time, is_available)
SELECT 
  r.id,
  d.day,
  '08:00:00'::TIME,
  '20:00:00'::TIME,
  d.day != 0  -- Not available on Sundays (day 0)
FROM ops_resources r
CROSS JOIN (
  SELECT generate_series(0, 6) AS day
) d
WHERE NOT EXISTS (
  SELECT 1 FROM ops_resource_availability 
  WHERE resource_id = r.id AND day_of_week = d.day
);

-- =============================================================================
-- 8. SEED PARTY HOUSE TIME SLOTS
-- =============================================================================

-- Get Party House product ID and create slots
DO $$
DECLARE
  v_party_house_id UUID;
BEGIN
  SELECT id INTO v_party_house_id 
  FROM products 
  WHERE slug = 'party-house' OR scheduling_mode = 'slot_based'
  LIMIT 1;
  
  IF v_party_house_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM product_slots WHERE product_id = v_party_house_id
  ) THEN
    INSERT INTO product_slots (product_id, start_time_local, end_time_local, label, display_order)
    VALUES
      (v_party_house_id, '10:00:00', '14:00:00', 'Morning (10 AM - 2 PM)', 1),
      (v_party_house_id, '15:00:00', '19:00:00', 'Afternoon (3 PM - 7 PM)', 2);
  END IF;
END $$;

-- =============================================================================
-- 9. HELPER FUNCTION: Check if ops resource is available for a time window
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
  -- Check for overlapping blocks
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
-- 10. FUNCTION: Find an available ops resource for a time window
-- Returns the first available resource of the given type, or NULL if none
-- =============================================================================

CREATE OR REPLACE FUNCTION find_available_ops_resource(
  p_resource_type TEXT,           -- 'delivery_crew' or 'vehicle'
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
  -- Extract day of week and times for schedule check
  v_day_of_week := EXTRACT(DOW FROM p_start_ts AT TIME ZONE 'America/New_York')::INTEGER;
  v_start_time := (p_start_ts AT TIME ZONE 'America/New_York')::TIME;
  v_end_time := (p_end_ts AT TIME ZONE 'America/New_York')::TIME;
  
  -- Find ANY active resource of this type that:
  -- 1. Is active
  -- 2. Is scheduled to work during this time window
  -- 3. Has no conflicting booking blocks
  SELECT r.id INTO v_resource_id
  FROM ops_resources r
  LEFT JOIN ops_resource_availability ra ON ra.resource_id = r.id AND ra.day_of_week = v_day_of_week
  WHERE r.resource_type = p_resource_type
    AND r.is_active = true
    -- Check schedule availability (if no schedule entry, assume available)
    AND (ra.id IS NULL OR (ra.is_available = true AND v_start_time >= ra.start_time AND v_end_time <= ra.end_time))
    -- Check no conflicting blocks
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
  ORDER BY r.name  -- Consistent ordering
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;  -- Lock to prevent race conditions
  
  RETURN v_resource_id;
END;
$$;

-- =============================================================================
-- 11. FUNCTION: Count available ops resources for a time window
-- Used for capacity display and validation
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
-- 12. FUNCTION: Get available slots for a slot-based product on a date
-- Returns slots with availability status based on BOTH asset AND ops capacity
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
  -- Get product configuration
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_setup_minutes := COALESCE(v_product.setup_minutes, 60);
  v_teardown_minutes := COALESCE(v_product.teardown_minutes, 30);
  v_travel_buffer := COALESCE(v_product.travel_buffer_minutes, 30);
  
  -- Calculate lead time cutoff
  v_lead_time_cutoff := v_now + (p_lead_time_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    ps.id AS slot_id,
    ps.start_time_local,
    ps.end_time_local,
    ps.label,
    -- Event times (customer's party time)
    (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' AS event_start,
    (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' AS event_end,
    -- Service times (including setup/teardown/travel)
    (p_date || ' ' || ps.start_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York' 
      - ((v_setup_minutes + v_travel_buffer) || ' minutes')::INTERVAL AS service_start,
    (p_date || ' ' || ps.end_time_local)::TIMESTAMP AT TIME ZONE 'America/New_York'
      + ((v_teardown_minutes + v_travel_buffer) || ' minutes')::INTERVAL AS service_end,
    -- Availability check
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
      -- Asset availability check (is the Party House unit free?)
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
      -- Ops capacity check (is ANY crew available for delivery AND pickup?)
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
    -- Reason for unavailability
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
-- 13. FUNCTION: Check day rental availability with ops capacity
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
  -- Get product config
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Product not found'::TEXT, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  v_same_day := (p_delivery_date = p_pickup_date);
  v_lead_time_cutoff := v_now + (p_lead_time_hours || ' hours')::INTERVAL;
  
  -- Calculate delivery window (morning: 8 AM - 11 AM)
  v_delivery_start := (p_delivery_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  v_delivery_end := (p_delivery_date || ' 11:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  
  -- Calculate pickup window
  IF v_same_day THEN
    -- Same day pickup: 6 PM - 8 PM
    v_pickup_start := (p_pickup_date || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
    v_pickup_end := (p_pickup_date || ' 20:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  ELSE
    -- Next day pickup: 8 AM - 10 AM
    v_pickup_start := (p_pickup_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
    v_pickup_end := (p_pickup_date || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  END IF;
  
  -- Service window spans delivery start to pickup end
  v_service_start := v_delivery_start - INTERVAL '30 minutes'; -- Travel buffer
  v_service_end := v_pickup_end + INTERVAL '30 minutes';
  
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
  
  -- Find available unit (asset)
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
  
  -- Find available delivery crew
  SELECT find_available_ops_resource('delivery_crew', v_delivery_start - INTERVAL '30 minutes', v_delivery_end)
    INTO v_delivery_crew_id;
  
  IF v_delivery_crew_id IS NULL THEN
    RETURN QUERY SELECT false, 'No delivery crew available'::TEXT, 
      NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  -- Find available pickup crew (could be same or different)
  SELECT find_available_ops_resource('delivery_crew', v_pickup_start, v_pickup_end + INTERVAL '30 minutes')
    INTO v_pickup_crew_id;
  
  IF v_pickup_crew_id IS NULL THEN
    -- Try next day pickup if same day was requested
    IF v_same_day THEN
      -- Recalculate for next day
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
      
      -- Same day pickup not possible, but next day is
      v_same_day := false;
    ELSE
      RETURN QUERY SELECT false, 'No pickup crew available'::TEXT, 
        NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, false, NULL::UUID, NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed!
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
-- 14. FUNCTION: Create booking blocks (atomic transaction)
-- Creates asset block (full rental) + ops blocks (delivery leg + pickup leg)
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
  -- Get product config
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
  
  -- Calculate service window (includes travel + setup/teardown)
  v_service_start := p_event_start - ((COALESCE(v_product.setup_minutes, 60) + COALESCE(v_product.travel_buffer_minutes, 30)) || ' minutes')::INTERVAL;
  v_service_end := p_event_end + ((COALESCE(v_product.teardown_minutes, 30) + COALESCE(v_product.travel_buffer_minutes, 30)) || ' minutes')::INTERVAL;
  
  -- Calculate ops leg windows
  v_delivery_leg_start := v_service_start;
  v_delivery_leg_end := p_event_start;  -- Delivery ends when event starts
  
  v_pickup_leg_start := p_event_end;    -- Pickup starts when event ends
  v_pickup_leg_end := v_service_end;
  
  -- If crews not specified, find available ones
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
  
  -- Validate we have resources
  IF v_assigned_delivery_crew IS NULL THEN
    RAISE EXCEPTION 'No delivery crew available for booking %', p_booking_id;
  END IF;
  
  IF v_assigned_pickup_crew IS NULL THEN
    RAISE EXCEPTION 'No pickup crew available for booking %', p_booking_id;
  END IF;
  
  -- Delete any existing blocks for this booking (in case of retry)
  DELETE FROM booking_blocks WHERE booking_id = p_booking_id;
  
  -- Create ASSET block (full service window)
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (p_booking_id, 'asset', p_unit_id, 'full_rental', v_service_start, v_service_end);
  
  -- Create OPS block for delivery leg
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (p_booking_id, 'ops', v_assigned_delivery_crew, 'delivery_leg', v_delivery_leg_start, v_delivery_leg_end);
  
  -- Create OPS block for pickup leg (might be same crew or different)
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (p_booking_id, 'ops', v_assigned_pickup_crew, 'pickup_leg', v_pickup_leg_start, v_pickup_leg_end);
  
  RETURN true;
  
EXCEPTION
  WHEN exclusion_violation THEN
    -- Race condition - another booking got this slot
    RAISE EXCEPTION 'Resource conflict - slot no longer available';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- =============================================================================
-- 15. FUNCTION: Get blocked dates for product (calendar view)
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
  
  -- For slot-based products, a date is blocked only if ALL slots are unavailable
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
    -- For day rentals, check if any unit is available
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
-- 16. GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ops_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops_resource_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_slots TO authenticated;

GRANT SELECT ON ops_resources TO anon;
GRANT SELECT ON ops_resource_availability TO anon;
GRANT SELECT ON booking_blocks TO anon;
GRANT SELECT ON product_slots TO anon;

GRANT EXECUTE ON FUNCTION ops_resource_available(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_available_ops_resource(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_available_ops_resources(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_available_slots_for_date(UUID, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_day_rental_availability(UUID, DATE, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_booking_blocks(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_blocked_dates_for_product_v2(UUID, DATE, DATE) TO anon, authenticated, service_role;

-- =============================================================================
-- 17. ADD COLUMNS TO BOOKINGS TABLE FOR CREW ASSIGNMENT
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_crew_id') THEN
    ALTER TABLE bookings ADD COLUMN delivery_crew_id UUID REFERENCES ops_resources(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_crew_id') THEN
    ALTER TABLE bookings ADD COLUMN pickup_crew_id UUID REFERENCES ops_resources(id);
  END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE!
-- 
-- WHAT THIS ENABLES:
-- 1. True resource-based scheduling - system knows crew/vehicle capacity
-- 2. Overlapping bookings when you have multiple crews
-- 3. Ops blocks only reserve delivery/pickup legs (not full rental)
-- 4. Atomic booking creation with exclusion constraints for race conditions
-- 5. Admin can add crews/vehicles and capacity automatically increases
--
-- SCALING EXAMPLE:
-- - 1 crew: Can do 1 delivery at a time
-- - 2 crews: Can do 2 deliveries at a time (e.g., bounce house + party house overlap)
-- - Add more in admin: INSERT INTO ops_resources (name, resource_type) VALUES ('Team Beta', 'delivery_crew')
-- =============================================================================
