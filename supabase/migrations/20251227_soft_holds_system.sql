-- =============================================================================
-- MIGRATION: Soft Holds System for Race Condition Prevention
-- Run this in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SOFT HOLDS TABLE
-- Temporary reservations during checkout (15 min expiry)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS soft_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  delivery_crew_id UUID REFERENCES crew_members(id) ON DELETE SET NULL,
  pickup_crew_id UUID REFERENCES crew_members(id) ON DELETE SET NULL,
  service_start TIMESTAMPTZ NOT NULL,
  service_end TIMESTAMPTZ NOT NULL,
  delivery_leg_start TIMESTAMPTZ,
  delivery_leg_end TIMESTAMPTZ,
  pickup_leg_start TIMESTAMPTZ,
  pickup_leg_end TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT soft_holds_session_unique UNIQUE (session_id)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_soft_holds_expires_at ON soft_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_soft_holds_unit_id ON soft_holds(unit_id);

COMMENT ON TABLE soft_holds IS 'Temporary resource reservations during checkout to prevent race conditions';

-- -----------------------------------------------------------------------------
-- 2. CHECK AVAILABILITY WITH SOFT HOLDS
-- Enhanced availability check that considers both committed bookings AND soft holds
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_availability_with_soft_holds(
  p_product_id UUID,
  p_delivery_date DATE,
  p_pickup_date DATE,
  p_delivery_window TEXT,
  p_pickup_window TEXT,
  p_lead_time_hours INTEGER DEFAULT 18,
  p_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_available BOOLEAN,
  unavailable_reason TEXT,
  unit_id UUID,
  delivery_crew_id UUID,
  pickup_crew_id UUID,
  service_start TIMESTAMPTZ,
  service_end TIMESTAMPTZ,
  delivery_leg_start TIMESTAMPTZ,
  delivery_leg_end TIMESTAMPTZ,
  pickup_leg_start TIMESTAMPTZ,
  pickup_leg_end TIMESTAMPTZ
) AS $$
DECLARE
  v_unit_id UUID;
  v_service_start TIMESTAMPTZ;
  v_service_end TIMESTAMPTZ;
  v_delivery_start TIMESTAMPTZ;
  v_delivery_end TIMESTAMPTZ;
  v_pickup_start TIMESTAMPTZ;
  v_pickup_end TIMESTAMPTZ;
  v_delivery_crew_id UUID;
  v_pickup_crew_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_lead_time_cutoff TIMESTAMPTZ;
BEGIN
  -- Calculate lead time cutoff
  v_lead_time_cutoff := v_now + (p_lead_time_hours || ' hours')::INTERVAL;
  
  -- Calculate service window times based on delivery/pickup windows
  -- Morning: 8 AM - 11 AM, Afternoon: 12 PM - 3 PM, Evening: 5 PM - 8 PM
  v_service_start := (p_delivery_date || ' ' || 
    CASE p_delivery_window
      WHEN 'morning' THEN '08:00:00'
      WHEN 'afternoon' THEN '12:00:00'
      WHEN 'evening' THEN '17:00:00'
      ELSE '09:00:00'
    END)::TIMESTAMPTZ;
    
  v_service_end := (p_pickup_date || ' ' || 
    CASE p_pickup_window
      WHEN 'morning' THEN '11:00:00'
      WHEN 'afternoon' THEN '15:00:00'
      WHEN 'evening' THEN '20:00:00'
      ELSE '18:00:00'
    END)::TIMESTAMPTZ;

  -- Check lead time
  IF v_service_start < v_lead_time_cutoff THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Requires ' || p_lead_time_hours || ' hours advance booking',
      NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Find an available unit
  -- Check against: confirmed bookings AND active soft holds (excluding our own session)
  SELECT u.id INTO v_unit_id
  FROM units u
  WHERE u.product_id = p_product_id
    AND u.status = 'available'
    -- No overlapping confirmed bookings
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.unit_id = u.id
        AND b.status IN ('confirmed', 'pending', 'delivered')
        AND (
          (b.service_start_time, b.service_end_time) OVERLAPS (v_service_start, v_service_end)
          OR (b.delivery_date <= p_pickup_date AND b.pickup_date >= p_delivery_date)
        )
    )
    -- No overlapping active soft holds (except our own session)
    AND NOT EXISTS (
      SELECT 1 FROM soft_holds sh
      WHERE sh.unit_id = u.id
        AND sh.expires_at > v_now
        AND (p_session_id IS NULL OR sh.session_id != p_session_id)
        AND (sh.service_start, sh.service_end) OVERLAPS (v_service_start, v_service_end)
    )
  ORDER BY u.unit_number
  LIMIT 1;

  IF v_unit_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'No units available for these dates',
      NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Calculate delivery leg times (1 hour before service start)
  v_delivery_start := v_service_start - INTERVAL '1 hour';
  v_delivery_end := v_service_start;
  
  -- Calculate pickup leg times (starts at service end, duration based on product)
  v_pickup_start := v_service_end;
  v_pickup_end := v_service_end + INTERVAL '1 hour';

  -- Find available delivery crew (simplified - just get first available)
  SELECT cm.id INTO v_delivery_crew_id
  FROM crew_members cm
  WHERE cm.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM booking_blocks bb
      WHERE bb.crew_id = cm.id
        AND bb.block_type = 'ops'
        AND (bb.start_time, bb.end_time) OVERLAPS (v_delivery_start, v_delivery_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM soft_holds sh
      WHERE sh.delivery_crew_id = cm.id
        AND sh.expires_at > v_now
        AND (p_session_id IS NULL OR sh.session_id != p_session_id)
        AND (sh.delivery_leg_start, sh.delivery_leg_end) OVERLAPS (v_delivery_start, v_delivery_end)
    )
  LIMIT 1;

  -- Find available pickup crew
  SELECT cm.id INTO v_pickup_crew_id
  FROM crew_members cm
  WHERE cm.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM booking_blocks bb
      WHERE bb.crew_id = cm.id
        AND bb.block_type = 'ops'
        AND (bb.start_time, bb.end_time) OVERLAPS (v_pickup_start, v_pickup_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM soft_holds sh
      WHERE sh.pickup_crew_id = cm.id
        AND sh.expires_at > v_now
        AND (p_session_id IS NULL OR sh.session_id != p_session_id)
        AND (sh.pickup_leg_start, sh.pickup_leg_end) OVERLAPS (v_pickup_start, v_pickup_end)
    )
  LIMIT 1;

  -- Return availability (crew is optional - booking can proceed without assigned crew)
  RETURN QUERY SELECT 
    TRUE,
    NULL::TEXT,
    v_unit_id,
    v_delivery_crew_id,
    v_pickup_crew_id,
    v_service_start,
    v_service_end,
    v_delivery_start,
    v_delivery_end,
    v_pickup_start,
    v_pickup_end;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. CREATE SOFT HOLD
-- Reserve resources during checkout
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_soft_hold(
  p_session_id TEXT,
  p_unit_id UUID,
  p_delivery_crew_id UUID,
  p_pickup_crew_id UUID,
  p_service_start TIMESTAMPTZ,
  p_service_end TIMESTAMPTZ,
  p_delivery_leg_start TIMESTAMPTZ DEFAULT NULL,
  p_delivery_leg_end TIMESTAMPTZ DEFAULT NULL,
  p_pickup_leg_start TIMESTAMPTZ DEFAULT NULL,
  p_pickup_leg_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_hold_id UUID;
BEGIN
  -- Delete any existing hold for this session first
  DELETE FROM soft_holds WHERE session_id = p_session_id;
  
  -- Insert new hold
  INSERT INTO soft_holds (
    session_id,
    unit_id,
    delivery_crew_id,
    pickup_crew_id,
    service_start,
    service_end,
    delivery_leg_start,
    delivery_leg_end,
    pickup_leg_start,
    pickup_leg_end,
    expires_at
  ) VALUES (
    p_session_id,
    p_unit_id,
    p_delivery_crew_id,
    p_pickup_crew_id,
    p_service_start,
    p_service_end,
    p_delivery_leg_start,
    p_delivery_leg_end,
    p_pickup_leg_start,
    p_pickup_leg_end,
    NOW() + INTERVAL '15 minutes'
  )
  RETURNING id INTO v_hold_id;
  
  RETURN v_hold_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 4. RELEASE SOFT HOLD
-- Called when booking is completed or abandoned
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION release_soft_hold(p_session_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM soft_holds WHERE session_id = p_session_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. CLEANUP EXPIRED HOLDS
-- Called by cron job every 5 minutes
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_expired_soft_holds()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM soft_holds 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 6. GRANT PERMISSIONS
-- -----------------------------------------------------------------------------

-- Grant permissions for the service role
GRANT ALL ON soft_holds TO service_role;
GRANT EXECUTE ON FUNCTION check_availability_with_soft_holds TO service_role;
GRANT EXECUTE ON FUNCTION create_soft_hold TO service_role;
GRANT EXECUTE ON FUNCTION release_soft_hold TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_soft_holds TO service_role;

-- Grant for anon (API calls)
GRANT SELECT, INSERT, DELETE ON soft_holds TO anon;
GRANT EXECUTE ON FUNCTION check_availability_with_soft_holds TO anon;
GRANT EXECUTE ON FUNCTION create_soft_hold TO anon;
GRANT EXECUTE ON FUNCTION release_soft_hold TO anon;

-- -----------------------------------------------------------------------------
-- DONE! 
-- After running this, deploy the code changes to production
-- -----------------------------------------------------------------------------
