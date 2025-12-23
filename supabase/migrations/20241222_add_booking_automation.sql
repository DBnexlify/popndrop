-- =============================================================================
-- BOOKING AUTOMATION SCHEMA MIGRATION
-- 20241222_add_booking_automation.sql
-- Adds fields and tables for smart status automation
-- =============================================================================

-- =============================================================================
-- PART 1: NEW ENUM TYPES
-- =============================================================================

-- Attention item types
CREATE TYPE attention_type AS ENUM (
  'delivery_confirmation',    -- Was this delivered?
  'pickup_confirmation',      -- Was this picked up?
  'payment_collection',       -- How was payment collected?
  'booking_closure',          -- Ready to close booking?
  'issue_reported',           -- Customer reported an issue
  'manual_review'             -- Admin flagged for review
);

-- Attention item priority
CREATE TYPE attention_priority AS ENUM (
  'low',      -- Can wait
  'medium',   -- Should address today
  'high',     -- Address ASAP
  'urgent'    -- Requires immediate attention
);

-- Attention item status
CREATE TYPE attention_status AS ENUM (
  'pending',      -- Awaiting action
  'in_progress',  -- Admin is working on it
  'resolved',     -- Completed
  'dismissed'     -- Ignored/not applicable
);

-- =============================================================================
-- PART 2: NEW COLUMNS ON BOOKINGS TABLE
-- =============================================================================

-- Window end timestamps (computed from date + window text)
-- These are calculated on insert/update via trigger
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_window_end timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_window_end timestamptz;

-- Auto-completion tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_completed boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_completed_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_completed_reason text;

-- Attention flag (quick filter for dashboard)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS needs_attention boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attention_reason text;

-- Last automation check timestamp
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_automation_check timestamptz;

-- =============================================================================
-- PART 3: ATTENTION ITEMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS attention_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What booking does this relate to?
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- What type of attention is needed?
  attention_type attention_type NOT NULL,
  priority attention_priority NOT NULL DEFAULT 'medium',
  status attention_status NOT NULL DEFAULT 'pending',
  
  -- Context and actions
  title text NOT NULL,                    -- Short title for display
  description text,                       -- Longer explanation
  suggested_actions jsonb DEFAULT '[]',   -- Array of {label, action, data}
  
  -- Resolution tracking
  resolved_by uuid REFERENCES admin_users(id),
  resolved_at timestamptz,
  resolution_notes text,
  resolution_action text,                 -- What action was taken
  
  -- Auto-generated or manual?
  is_automated boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate attention items for same booking/type
  CONSTRAINT unique_pending_attention UNIQUE (booking_id, attention_type, status)
);

-- Indexes for attention_items
CREATE INDEX idx_attention_items_status ON attention_items (status) WHERE status = 'pending';
CREATE INDEX idx_attention_items_priority ON attention_items (priority, created_at);
CREATE INDEX idx_attention_items_booking ON attention_items (booking_id);
CREATE INDEX idx_attention_items_created ON attention_items (created_at DESC);

-- =============================================================================
-- PART 4: AUTOMATION LOG TABLE
-- =============================================================================

-- Track all automation actions for audit trail
CREATE TABLE IF NOT EXISTS automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What booking was affected?
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  booking_number text,  -- Denormalized for history when booking deleted
  
  -- What action was taken?
  action_type text NOT NULL,              -- 'auto_complete', 'create_attention', 'status_check'
  action_details jsonb DEFAULT '{}',      -- Detailed context
  
  -- Outcome
  success boolean DEFAULT true,
  error_message text,
  
  -- Timing
  created_at timestamptz DEFAULT now()
);

-- Index for querying automation history
CREATE INDEX idx_automation_log_booking ON automation_log (booking_id);
CREATE INDEX idx_automation_log_action ON automation_log (action_type, created_at DESC);
CREATE INDEX idx_automation_log_created ON automation_log (created_at DESC);

-- =============================================================================
-- PART 5: FUNCTION TO CALCULATE WINDOW END TIMES
-- =============================================================================

-- Delivery window end times (Eastern timezone)
CREATE OR REPLACE FUNCTION get_delivery_window_end(
  delivery_date date,
  delivery_window text
) RETURNS timestamptz AS $$
DECLARE
  end_hour integer;
  result timestamptz;
BEGIN
  -- Map window text to end hour (Eastern time)
  end_hour := CASE delivery_window
    WHEN 'morning' THEN 11          -- 8-11 AM -> ends at 11 AM
    WHEN 'midday' THEN 14           -- 11 AM-2 PM -> ends at 2 PM
    WHEN 'afternoon' THEN 17        -- 2-5 PM -> ends at 5 PM
    WHEN 'saturday-evening' THEN 19 -- 5-7 PM -> ends at 7 PM
    ELSE 17                         -- Default to 5 PM
  END;
  
  -- Create timestamp in Eastern timezone, then convert to UTC for storage
  result := (delivery_date::text || ' ' || end_hour::text || ':00:00')::timestamp 
            AT TIME ZONE 'America/New_York';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Pickup window end times (Eastern timezone)
CREATE OR REPLACE FUNCTION get_pickup_window_end(
  pickup_date date,
  pickup_window text
) RETURNS timestamptz AS $$
DECLARE
  end_hour integer;
  result timestamptz;
BEGIN
  -- Map window text to end hour (Eastern time)
  end_hour := CASE pickup_window
    WHEN 'evening' THEN 20            -- 6-8 PM -> ends at 8 PM
    WHEN 'next-morning' THEN 10       -- by 10 AM next day -> ends at 10 AM
    WHEN 'monday-morning' THEN 10     -- by 10 AM Monday -> ends at 10 AM
    WHEN 'monday-afternoon' THEN 17   -- 2-5 PM Monday -> ends at 5 PM
    ELSE 20                           -- Default to 8 PM
  END;
  
  -- Create timestamp in Eastern timezone, then convert to UTC for storage
  result := (pickup_date::text || ' ' || end_hour::text || ':00:00')::timestamp 
            AT TIME ZONE 'America/New_York';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- PART 6: TRIGGER TO AUTO-CALCULATE WINDOW END TIMES
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_window_end_times()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate delivery window end
  IF NEW.delivery_date IS NOT NULL AND NEW.delivery_window IS NOT NULL THEN
    NEW.delivery_window_end := get_delivery_window_end(NEW.delivery_date, NEW.delivery_window);
  END IF;
  
  -- Calculate pickup window end
  IF NEW.pickup_date IS NOT NULL AND NEW.pickup_window IS NOT NULL THEN
    NEW.pickup_window_end := get_pickup_window_end(NEW.pickup_date, NEW.pickup_window);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new bookings and updates
DROP TRIGGER IF EXISTS calculate_booking_windows ON bookings;
CREATE TRIGGER calculate_booking_windows
  BEFORE INSERT OR UPDATE OF delivery_date, delivery_window, pickup_date, pickup_window
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_window_end_times();

-- =============================================================================
-- PART 7: BACKFILL EXISTING BOOKINGS
-- =============================================================================

-- Update all existing bookings with calculated window end times
UPDATE bookings
SET 
  delivery_window_end = get_delivery_window_end(delivery_date, delivery_window),
  pickup_window_end = get_pickup_window_end(pickup_date, pickup_window)
WHERE delivery_window_end IS NULL OR pickup_window_end IS NULL;

-- =============================================================================
-- PART 8: FUNCTION TO CHECK IF BOOKING NEEDS ATTENTION
-- =============================================================================

CREATE OR REPLACE FUNCTION check_booking_automation_status(booking_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  booking_rec RECORD;
  result jsonb;
  needs_action boolean := false;
  action_type text;
  action_reason text;
  can_auto_complete boolean := false;
BEGIN
  -- Get booking with all relevant fields
  SELECT 
    b.*,
    COALESCE(b.deposit_paid, false) AS deposit_is_paid,
    COALESCE(b.balance_paid, false) AS balance_is_paid,
    (COALESCE(b.deposit_paid, false) AND COALESCE(b.balance_paid, false)) AS fully_paid,
    (COALESCE(b.deposit_paid, false) AND b.balance_due = 0) AS paid_in_full_at_checkout
  INTO booking_rec
  FROM bookings b
  WHERE b.id = booking_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Booking not found');
  END IF;
  
  -- Skip cancelled or completed bookings
  IF booking_rec.status IN ('cancelled', 'completed') THEN
    RETURN jsonb_build_object(
      'status', booking_rec.status,
      'needs_action', false,
      'can_auto_complete', false
    );
  END IF;
  
  -- Check if delivery window has passed for CONFIRMED bookings
  IF booking_rec.status = 'confirmed' 
     AND booking_rec.delivery_window_end IS NOT NULL
     AND booking_rec.delivery_window_end < now() THEN
    
    needs_action := true;
    action_type := 'delivery_confirmation';
    
    -- If fully paid via Stripe, can potentially auto-advance
    IF booking_rec.paid_in_full_at_checkout OR booking_rec.fully_paid THEN
      action_reason := 'Delivery window passed. Paid in full - confirm delivery?';
      can_auto_complete := true;
    ELSE
      action_reason := 'Delivery window passed. Payment needed - was this delivered?';
    END IF;
  END IF;
  
  -- Check if pickup window has passed for DELIVERED bookings
  IF booking_rec.status = 'delivered'
     AND booking_rec.pickup_window_end IS NOT NULL  
     AND booking_rec.pickup_window_end < now() THEN
    
    needs_action := true;
    action_type := 'pickup_confirmation';
    
    IF booking_rec.fully_paid OR booking_rec.paid_in_full_at_checkout THEN
      action_reason := 'Pickup window passed. Paid in full - confirm pickup?';
      can_auto_complete := true;
    ELSE
      action_reason := 'Pickup window passed. Balance due - was this picked up?';
    END IF;
  END IF;
  
  -- Check if PICKED_UP booking can be auto-completed
  IF booking_rec.status = 'picked_up' THEN
    IF booking_rec.fully_paid OR booking_rec.paid_in_full_at_checkout THEN
      needs_action := true;
      action_type := 'booking_closure';
      action_reason := 'Ready to complete - paid in full, pickup confirmed';
      can_auto_complete := true;
    ELSE
      needs_action := true;
      action_type := 'payment_collection';
      action_reason := 'Payment needed before completion';
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'booking_id', booking_uuid,
    'booking_number', booking_rec.booking_number,
    'status', booking_rec.status,
    'needs_action', needs_action,
    'action_type', action_type,
    'action_reason', action_reason,
    'can_auto_complete', can_auto_complete,
    'delivery_window_end', booking_rec.delivery_window_end,
    'pickup_window_end', booking_rec.pickup_window_end,
    'deposit_paid', booking_rec.deposit_is_paid,
    'balance_paid', booking_rec.balance_is_paid,
    'balance_due', booking_rec.balance_due,
    'checked_at', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 9: FUNCTION TO GET ALL BOOKINGS NEEDING ATTENTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_bookings_needing_attention()
RETURNS TABLE (
  booking_id uuid,
  booking_number text,
  status booking_status,
  action_type text,
  action_reason text,
  can_auto_complete boolean,
  delivery_window_end timestamptz,
  pickup_window_end timestamptz,
  deposit_paid boolean,
  balance_paid boolean,
  balance_due numeric,
  customer_name text,
  product_name text,
  event_date date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS booking_id,
    b.booking_number,
    b.status,
    CASE
      WHEN b.status = 'confirmed' AND b.delivery_window_end < now() THEN 'delivery_confirmation'
      WHEN b.status = 'delivered' AND b.pickup_window_end < now() THEN 'pickup_confirmation'
      WHEN b.status = 'picked_up' THEN 'booking_closure'
      ELSE 'manual_review'
    END AS action_type,
    CASE
      WHEN b.status = 'confirmed' AND b.delivery_window_end < now() THEN 'Delivery window passed'
      WHEN b.status = 'delivered' AND b.pickup_window_end < now() THEN 'Pickup window passed'
      WHEN b.status = 'picked_up' THEN 'Ready for completion'
      ELSE 'Needs review'
    END AS action_reason,
    CASE
      WHEN (COALESCE(b.deposit_paid, false) AND COALESCE(b.balance_paid, false)) 
           OR (COALESCE(b.deposit_paid, false) AND b.balance_due = 0) THEN true
      ELSE false
    END AS can_auto_complete,
    b.delivery_window_end,
    b.pickup_window_end,
    COALESCE(b.deposit_paid, false) AS deposit_paid,
    COALESCE(b.balance_paid, false) AS balance_paid,
    b.balance_due,
    c.first_name || ' ' || c.last_name AS customer_name,
    (b.product_snapshot->>'name')::text AS product_name,
    b.event_date
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.status NOT IN ('cancelled', 'completed', 'pending')
    AND (
      -- Confirmed bookings past delivery window
      (b.status = 'confirmed' AND b.delivery_window_end < now())
      OR
      -- Delivered bookings past pickup window
      (b.status = 'delivered' AND b.pickup_window_end < now())
      OR
      -- Picked up bookings waiting for closure
      (b.status = 'picked_up')
    )
  ORDER BY 
    CASE b.status
      WHEN 'picked_up' THEN 1
      WHEN 'delivered' THEN 2
      WHEN 'confirmed' THEN 3
      ELSE 4
    END,
    COALESCE(b.delivery_window_end, b.pickup_window_end) ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 10: VIEW FOR DASHBOARD ATTENTION ITEMS
-- =============================================================================

CREATE OR REPLACE VIEW bookings_needing_attention AS
SELECT * FROM get_bookings_needing_attention();

-- =============================================================================
-- PART 11: ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE attention_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;

-- Attention items - admin only
CREATE POLICY "Admin can view attention items" ON attention_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin can manage attention items" ON attention_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Automation log - admin read only
CREATE POLICY "Admin can view automation log" ON automation_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Service role can insert automation logs
CREATE POLICY "Service can insert automation log" ON automation_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- =============================================================================
-- PART 12: UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER attention_items_updated_at
  BEFORE UPDATE ON attention_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PART 13: INDEXES FOR BOOKING AUTOMATION QUERIES
-- =============================================================================

-- Index for finding confirmed bookings past delivery window
CREATE INDEX idx_bookings_automation_delivery 
  ON bookings (delivery_window_end, status) 
  WHERE status = 'confirmed';

-- Index for finding delivered bookings past pickup window
CREATE INDEX idx_bookings_automation_pickup 
  ON bookings (pickup_window_end, status) 
  WHERE status = 'delivered';

-- Index for bookings needing attention flag
CREATE INDEX idx_bookings_needs_attention 
  ON bookings (needs_attention, status) 
  WHERE needs_attention = true;

-- Composite index for automation checks
CREATE INDEX idx_bookings_automation_check
  ON bookings (status, delivery_window_end, pickup_window_end)
  WHERE status NOT IN ('cancelled', 'completed', 'pending');

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON TABLE attention_items IS 'Queue of bookings needing admin attention - auto-generated by automation system';
COMMENT ON TABLE automation_log IS 'Audit trail of all automation actions';
COMMENT ON FUNCTION get_bookings_needing_attention IS 'Returns all bookings that need admin action based on time windows and payment status';
COMMENT ON FUNCTION check_booking_automation_status IS 'Checks a single booking and returns what automation action if any is needed';
