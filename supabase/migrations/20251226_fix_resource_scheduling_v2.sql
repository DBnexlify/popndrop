-- =============================================================================
-- MIGRATION: 20241226_fix_resource_scheduling_v2.sql
-- Fixes the crew scheduling gap and adds multi-item booking support
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD COMPLEXITY TIER TO PRODUCTS
-- Premium items (Party House) need longer breakdown times
-- -----------------------------------------------------------------------------

-- Add complexity tier column
ALTER TABLE products ADD COLUMN IF NOT EXISTS complexity_tier TEXT 
  DEFAULT 'standard' 
  CHECK (complexity_tier IN ('standard', 'combo', 'premium'));

-- Add explicit breakdown duration (separate from teardown_minutes for clarity)
ALTER TABLE products ADD COLUMN IF NOT EXISTS breakdown_duration_minutes INTEGER DEFAULT 45;

COMMENT ON COLUMN products.complexity_tier IS 'standard=30-45min, combo=45-60min, premium=90-120min (lights/speakers/full setup)';
COMMENT ON COLUMN products.breakdown_duration_minutes IS 'Total time for crew to tear down this specific item, including all equipment';

-- Update existing products with proper breakdown durations
UPDATE products SET 
  complexity_tier = 'premium',
  breakdown_duration_minutes = 120,
  teardown_minutes = 120
WHERE slug = 'party-house' OR scheduling_mode = 'slot_based';

UPDATE products SET 
  complexity_tier = 'combo',
  breakdown_duration_minutes = 60,
  teardown_minutes = 60
WHERE name ILIKE '%combo%' AND complexity_tier = 'standard';

-- Standard bounce houses stay at 45 minutes
UPDATE products SET 
  breakdown_duration_minutes = 45,
  teardown_minutes = 45
WHERE complexity_tier = 'standard';