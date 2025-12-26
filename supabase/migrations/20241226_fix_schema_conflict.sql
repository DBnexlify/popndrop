-- =============================================================================
-- FIX SCRIPT: Resolve ops_resources schema conflict
-- Run this FIRST, then run the main migration
-- =============================================================================

-- Step 1: Drop the old enum-based ops_resources table and related objects
DROP TABLE IF EXISTS ops_resource_availability CASCADE;
DROP TABLE IF EXISTS booking_blocks CASCADE;
DROP TABLE IF EXISTS credit_redemptions CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS product_slots CASCADE;
DROP TABLE IF EXISTS ops_resources CASCADE;

-- Step 2: Drop old enum types that conflict
DROP TYPE IF EXISTS ops_resource_type CASCADE;
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS block_type CASCADE;
DROP TYPE IF EXISTS scheduling_mode CASCADE;
DROP TYPE IF EXISTS credit_reason CASCADE;

-- Step 3: Remove columns from bookings that reference dropped tables
ALTER TABLE bookings DROP COLUMN IF EXISTS slot_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS delivery_crew_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS pickup_crew_id;

-- Step 4: Ensure btree_gist extension exists
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- NOW CREATE FRESH TABLES WITH CORRECT SCHEMA
-- =============================================================================

-- OPS RESOURCES TABLE (using TEXT, not ENUM)
CREATE TABLE ops_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('delivery_crew', 'vehicle')),
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#22d3ee',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ops_resources_type_active 
  ON ops_resources(resource_type, is_active) 
  WHERE is_active = true;

-- OPS RESOURCE AVAILABILITY
CREATE TABLE ops_resource_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES ops_resources(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '20:00:00',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, day_of_week)
);

CREATE INDEX idx_ops_availability_resource 
  ON ops_resource_availability(resource_id, day_of_week);

-- BOOKING BLOCKS TABLE
CREATE TABLE booking_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('asset', 'ops')),
  resource_id UUID NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('full_rental', 'delivery_leg', 'pickup_leg')),
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_ts > start_ts)
);

CREATE INDEX idx_booking_blocks_resource 
  ON booking_blocks(resource_type, resource_id, start_ts, end_ts);
CREATE INDEX idx_booking_blocks_booking 
  ON booking_blocks(booking_id);
CREATE INDEX idx_booking_blocks_time_range 
  ON booking_blocks USING gist (tstzrange(start_ts, end_ts));

-- Exclusion constraints
ALTER TABLE booking_blocks 
ADD CONSTRAINT booking_blocks_asset_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_ts, end_ts) WITH &&
) WHERE (resource_type = 'asset');

ALTER TABLE booking_blocks 
ADD CONSTRAINT booking_blocks_ops_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_ts, end_ts) WITH &&
) WHERE (resource_type = 'ops');

-- PRODUCT SLOTS TABLE
CREATE TABLE product_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  start_time_local TIME NOT NULL,
  end_time_local TIME NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_slot_times CHECK (end_time_local > start_time_local)
);

CREATE INDEX idx_product_slots_product 
  ON product_slots(product_id, is_active, display_order);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default crew and vehicle
INSERT INTO ops_resources (name, resource_type, is_active, color, notes)
VALUES 
  ('Team Alpha', 'delivery_crew', true, '#22d3ee', 'Primary delivery team (owner + spouse)'),
  ('Truck 1', 'vehicle', true, '#a855f7', 'Primary delivery vehicle');

-- Set up weekly availability (Mon-Sat 8 AM - 8 PM, no Sunday ops)
INSERT INTO ops_resource_availability (resource_id, day_of_week, start_time, end_time, is_available)
SELECT 
  r.id,
  d.day,
  '08:00:00'::TIME,
  '20:00:00'::TIME,
  d.day != 0  -- Not available on Sundays
FROM ops_resources r
CROSS JOIN (SELECT generate_series(0, 6) AS day) d;

-- Insert Party House time slots
DO $party_house$
DECLARE
  v_party_house_id UUID;
BEGIN
  SELECT id INTO v_party_house_id 
  FROM products 
  WHERE slug = 'blackout-party-house' 
     OR slug = 'party-house'
     OR name ILIKE '%party house%'
     OR name ILIKE '%blackout%'
  LIMIT 1;
  
  IF v_party_house_id IS NOT NULL THEN
    INSERT INTO product_slots (product_id, start_time_local, end_time_local, label, display_order)
    VALUES
      (v_party_house_id, '10:00:00', '14:00:00', 'Morning (10 AM - 2 PM)', 1),
      (v_party_house_id, '15:00:00', '19:00:00', 'Afternoon (3 PM - 7 PM)', 2);
    RAISE NOTICE 'Created Party House slots for product %', v_party_house_id;
  ELSE
    RAISE NOTICE 'No Party House product found - skipping slot creation';
  END IF;
END $party_house$;

-- Add crew columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES product_slots(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_crew_id UUID REFERENCES ops_resources(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_crew_id UUID REFERENCES ops_resources(id);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ops_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops_resource_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON booking_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_slots TO authenticated;

GRANT SELECT ON ops_resources TO anon;
GRANT SELECT ON ops_resource_availability TO anon;
GRANT SELECT ON booking_blocks TO anon;
GRANT SELECT ON product_slots TO anon;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== FIX SCRIPT COMPLETE ===';
  RAISE NOTICE 'Tables created: ops_resources, ops_resource_availability, booking_blocks, product_slots';
  RAISE NOTICE 'Seed data inserted: Team Alpha + Truck 1 with weekly schedules';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run the FUNCTIONS portion of 20241226_ops_resource_scheduling.sql';
  RAISE NOTICE '      (Starting from section 9: "HELPER FUNCTION: Check if ops resource is available")';
END $$;

-- Show what was created
SELECT 'ops_resources' as table_name, count(*) as rows FROM ops_resources
UNION ALL
SELECT 'ops_resource_availability', count(*) FROM ops_resource_availability
UNION ALL
SELECT 'product_slots', count(*) FROM product_slots;
