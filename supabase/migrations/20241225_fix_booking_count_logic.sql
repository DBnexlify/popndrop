-- =============================================================================
-- FIX BOOKING COUNT LOGIC
-- supabase/migrations/20241225_fix_booking_count_logic.sql
--
-- PROBLEM:
--   The `booking_count` field on customers was being incremented when a
--   booking was CONFIRMED (payment received), not when it was COMPLETED
--   (rental finished). This caused incorrect counts in the loyalty system,
--   customer statistics, and admin displays.
--
-- SOLUTION:
--   1. Rename `booking_count` to `total_bookings` (reflects confirmed bookings)
--   2. Add `completed_bookings_count` field (only completed rentals)
--   3. Create trigger to increment completed count on status change
--   4. Update loyalty functions to use completed count
--   5. Backfill both counts from actual booking data
--
-- BOOKING STATUS DEFINITIONS:
--   - pending: Payment not completed, not counted anywhere
--   - confirmed: Payment received, counted in total_bookings
--   - delivered: Equipment delivered, still counted as confirmed
--   - picked_up: Equipment picked up, still counted as confirmed
--   - completed: Rental finished, NOW counted in completed_bookings_count
--   - cancelled: Not counted in either total
--
-- =============================================================================

-- =============================================================================
-- STEP 1: Add new column and rename existing
-- =============================================================================

-- Add completed_bookings_count column
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS completed_bookings_count INTEGER DEFAULT 0;

-- Create index for loyalty queries
CREATE INDEX IF NOT EXISTS idx_customers_completed_bookings 
ON customers (completed_bookings_count);

-- Comment for documentation
COMMENT ON COLUMN customers.booking_count IS 'Total bookings (confirmed or further). Incremented when payment is received.';
COMMENT ON COLUMN customers.completed_bookings_count IS 'Completed rentals only. Used for loyalty rewards and customer value metrics.';

-- =============================================================================
-- STEP 2: Backfill counts from actual booking data
-- =============================================================================

-- Update completed_bookings_count based on actual completed bookings
UPDATE customers c
SET completed_bookings_count = COALESCE((
  SELECT COUNT(*)
  FROM bookings b
  WHERE b.customer_id = c.id
    AND b.status = 'completed'
), 0);

-- Also fix booking_count to be accurate (confirmed or completed, not cancelled)
UPDATE customers c
SET booking_count = COALESCE((
  SELECT COUNT(*)
  FROM bookings b
  WHERE b.customer_id = c.id
    AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
), 0);

-- =============================================================================
-- STEP 3: Create trigger to increment completed count on status change
-- =============================================================================

-- Drop existing trigger if it conflicts
DROP TRIGGER IF EXISTS trigger_update_completed_booking_count ON bookings;

-- Create function to update completed_bookings_count
CREATE OR REPLACE FUNCTION update_completed_booking_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE customers
    SET completed_bookings_count = COALESCE(completed_bookings_count, 0) + 1,
        last_booking_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    RAISE NOTICE 'Incremented completed_bookings_count for customer %', NEW.customer_id;
  END IF;
  
  -- When status changes FROM 'completed' to something else (revert/undo)
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE customers
    SET completed_bookings_count = GREATEST(0, COALESCE(completed_bookings_count, 0) - 1),
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    RAISE NOTICE 'Decremented completed_bookings_count for customer %', NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_update_completed_booking_count
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_booking_count();

-- =============================================================================
-- STEP 4: Update loyalty functions to use completed_bookings_count
-- =============================================================================

-- Update the loyalty tier eligibility check
CREATE OR REPLACE FUNCTION check_loyalty_tier_eligibility(
  p_customer_id UUID,
  p_completed_bookings INTEGER
)
RETURNS TABLE (
  eligible BOOLEAN,
  tier_id UUID,
  tier_name VARCHAR(50),
  tier_level INTEGER,
  bookings_required INTEGER,
  discount_percent INTEGER,
  max_discount_cap NUMERIC,
  minimum_order_amount NUMERIC,
  code_prefix VARCHAR(10),
  display_name VARCHAR(100),
  description TEXT,
  already_awarded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NOTE: p_completed_bookings should be the completed_bookings_count from customers table
  RETURN QUERY
  SELECT 
    true AS eligible,
    lt.id AS tier_id,
    lt.tier_name,
    lt.tier_level,
    lt.bookings_required,
    lt.discount_percent,
    lt.max_discount_cap,
    lt.minimum_order_amount,
    lt.code_prefix,
    lt.display_name,
    lt.description,
    (clr.id IS NOT NULL) AS already_awarded
  FROM loyalty_tiers lt
  LEFT JOIN customer_loyalty_rewards clr 
    ON clr.tier_id = lt.id AND clr.customer_id = p_customer_id
  WHERE lt.is_active = true
    AND lt.bookings_required <= p_completed_bookings
  ORDER BY lt.tier_level DESC
  LIMIT 1;
END;
$$;

-- Update the customer loyalty status function to use completed_bookings_count
CREATE OR REPLACE FUNCTION get_customer_loyalty_status(p_customer_id UUID)
RETURNS TABLE (
  current_bookings INTEGER,
  current_tier_name VARCHAR(50),
  current_tier_level INTEGER,
  next_tier_name VARCHAR(50),
  next_tier_level INTEGER,
  bookings_until_next INTEGER,
  progress_percent INTEGER,
  available_rewards JSONB,
  earned_rewards JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_bookings INTEGER;
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- FIXED: Get customer's COMPLETED booking count (not total bookings)
  SELECT COALESCE(completed_bookings_count, 0) INTO v_completed_bookings
  FROM customers WHERE id = p_customer_id;
  
  -- Get current tier (highest achieved based on COMPLETED bookings)
  SELECT lt.* INTO v_current_tier
  FROM loyalty_tiers lt
  WHERE lt.is_active = true AND lt.bookings_required <= v_completed_bookings
  ORDER BY lt.tier_level DESC
  LIMIT 1;
  
  -- Get next tier
  SELECT lt.* INTO v_next_tier
  FROM loyalty_tiers lt
  WHERE lt.is_active = true AND lt.bookings_required > v_completed_bookings
  ORDER BY lt.tier_level ASC
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    v_completed_bookings AS current_bookings,
    v_current_tier.tier_name AS current_tier_name,
    v_current_tier.tier_level AS current_tier_level,
    v_next_tier.tier_name AS next_tier_name,
    v_next_tier.tier_level AS next_tier_level,
    CASE WHEN v_next_tier.bookings_required IS NOT NULL 
         THEN v_next_tier.bookings_required - v_completed_bookings 
         ELSE 0 
    END AS bookings_until_next,
    CASE WHEN v_next_tier.bookings_required IS NOT NULL AND v_current_tier.bookings_required IS NOT NULL
         THEN LEAST(100, ((v_completed_bookings - COALESCE(v_current_tier.bookings_required, 0))::NUMERIC / 
               NULLIF(v_next_tier.bookings_required - COALESCE(v_current_tier.bookings_required, 0), 0) * 100)::INTEGER)
         WHEN v_current_tier.tier_level IS NOT NULL THEN 100
         ELSE LEAST(100, (v_completed_bookings::NUMERIC / COALESCE(v_next_tier.bookings_required, 3) * 100)::INTEGER)
    END AS progress_percent,
    -- Available (unused) rewards
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'reward_id', clr.id,
      'tier_name', lt.tier_name,
      'discount_percent', lt.discount_percent,
      'promo_code', pc.code,
      'expires_at', pc.expiration_date,
      'min_order', lt.minimum_order_amount,
      'max_discount', lt.max_discount_cap
    )), '[]'::JSONB)
    FROM customer_loyalty_rewards clr
    JOIN loyalty_tiers lt ON lt.id = clr.tier_id
    JOIN promo_codes pc ON pc.id = clr.promo_code_id
    WHERE clr.customer_id = p_customer_id 
      AND clr.code_used = false 
      AND clr.code_expired = false
      AND pc.status = 'active'
      AND (pc.expiration_date IS NULL OR pc.expiration_date > NOW())
    ) AS available_rewards,
    -- All earned rewards
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'reward_id', clr.id,
      'tier_name', lt.tier_name,
      'discount_percent', lt.discount_percent,
      'awarded_at', clr.awarded_at,
      'code_used', clr.code_used,
      'code_used_at', clr.code_used_at
    ) ORDER BY clr.awarded_at DESC), '[]'::JSONB)
    FROM customer_loyalty_rewards clr
    JOIN loyalty_tiers lt ON lt.id = clr.tier_id
    WHERE clr.customer_id = p_customer_id
    ) AS earned_rewards;
END;
$$;

-- Update the award loyalty reward function to use completed_bookings_count
CREATE OR REPLACE FUNCTION award_loyalty_reward(
  p_customer_id UUID,
  p_tier_id UUID,
  p_triggering_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  reward_id UUID,
  promo_code_id UUID,
  promo_code VARCHAR(20),
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_tier RECORD;
  v_code VARCHAR(20);
  v_promo_id UUID;
  v_reward_id UUID;
  v_expiration TIMESTAMPTZ;
BEGIN
  -- Get customer info
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Customer not found'::TEXT;
    RETURN;
  END IF;
  
  -- Get tier info
  SELECT * INTO v_tier FROM loyalty_tiers WHERE id = p_tier_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Tier not found or inactive'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already awarded
  IF EXISTS (SELECT 1 FROM customer_loyalty_rewards WHERE customer_id = p_customer_id AND tier_id = p_tier_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR, 'Reward already awarded for this tier'::TEXT;
    RETURN;
  END IF;
  
  -- Generate unique code: PND-LYL10-XXXXX
  v_code := 'PND-' || v_tier.code_prefix || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
  v_expiration := NOW() + (v_tier.code_expiration_days || ' days')::INTERVAL;
  
  -- Create the promo code
  INSERT INTO promo_codes (
    code,
    discount_type,
    discount_amount,
    max_discount_cap,
    minimum_order_amount,
    expiration_date,
    customer_id,
    usage_limit,
    single_use_per_customer,
    status,
    description,
    internal_notes,
    campaign_name
  ) VALUES (
    v_code,
    'percent',
    v_tier.discount_percent,
    v_tier.max_discount_cap,
    v_tier.minimum_order_amount,
    v_expiration,
    p_customer_id,  -- Customer-specific
    1,  -- One-time use
    true,
    'active',
    v_tier.display_name || ' - ' || v_tier.discount_percent || '% off',
    'Auto-generated loyalty reward for ' || v_customer.email,
    'loyalty_' || v_tier.tier_name
  )
  RETURNING id INTO v_promo_id;
  
  -- FIXED: Create the reward record with completed_bookings_count
  INSERT INTO customer_loyalty_rewards (
    customer_id,
    tier_id,
    promo_code_id,
    bookings_at_award,
    triggering_booking_id
  ) VALUES (
    p_customer_id,
    p_tier_id,
    v_promo_id,
    COALESCE(v_customer.completed_bookings_count, 0),  -- Use completed count, not total
    p_triggering_booking_id
  )
  RETURNING id INTO v_reward_id;
  
  -- Log the award
  INSERT INTO loyalty_audit_log (customer_id, reward_id, booking_id, action_type, action_details)
  VALUES (
    p_customer_id,
    v_reward_id,
    p_triggering_booking_id,
    'tier_achieved',
    jsonb_build_object(
      'tier_name', v_tier.tier_name,
      'tier_level', v_tier.tier_level,
      'discount_percent', v_tier.discount_percent,
      'promo_code', v_code,
      'expires_at', v_expiration,
      'completed_bookings_at_award', COALESCE(v_customer.completed_bookings_count, 0)
    )
  );
  
  RETURN QUERY SELECT true, v_reward_id, v_promo_id, v_code, NULL::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO loyalty_audit_log (customer_id, action_type, action_details, success, error_message)
  VALUES (p_customer_id, 'tier_achieved', jsonb_build_object('tier_id', p_tier_id), false, SQLERRM);
  
  RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR, SQLERRM;
END;
$$;

-- Update the loyalty trigger to use completed_bookings_count
CREATE OR REPLACE FUNCTION check_loyalty_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_eligibility RECORD;
  v_award_result RECORD;
BEGIN
  -- Only run when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get customer with updated completed booking count
    -- IMPORTANT: The count should already be incremented by trigger_update_completed_booking_count
    -- but we add 1 here just in case the triggers fire in unexpected order
    SELECT *, COALESCE(completed_bookings_count, 0) AS actual_completed 
    INTO v_customer 
    FROM customers 
    WHERE id = NEW.customer_id;
    
    IF v_customer IS NOT NULL THEN
      -- Check if they qualify for a new tier based on COMPLETED bookings
      SELECT * INTO v_eligibility 
      FROM check_loyalty_tier_eligibility(NEW.customer_id, v_customer.actual_completed);
      
      -- If eligible and not already awarded
      IF v_eligibility.eligible = true AND v_eligibility.already_awarded = false THEN
        -- Award the reward
        SELECT * INTO v_award_result
        FROM award_loyalty_reward(NEW.customer_id, v_eligibility.tier_id, NEW.id);
        
        IF v_award_result.success THEN
          RAISE NOTICE 'Loyalty reward awarded to customer % for tier %', 
            NEW.customer_id, v_eligibility.tier_name;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 5: Update customer_leaderboard view
-- =============================================================================

-- Drop and recreate the view with proper counts
DROP VIEW IF EXISTS customer_leaderboard;

CREATE VIEW customer_leaderboard AS
SELECT 
  c.id,
  c.first_name || ' ' || c.last_name AS name,
  c.email,
  c.phone,
  c.booking_count AS total_bookings,  -- All confirmed+ bookings
  COALESCE(c.completed_bookings_count, 0) AS completed_bookings,  -- Only completed
  COALESCE(c.total_spent, 0) AS total_spent,
  c.last_booking_at,
  -- Tier based on COMPLETED bookings, not total
  CASE 
    WHEN COALESCE(c.completed_bookings_count, 0) >= 10 THEN 'VIP'
    WHEN COALESCE(c.completed_bookings_count, 0) >= 5 THEN 'Loyal'
    WHEN COALESCE(c.completed_bookings_count, 0) >= 2 THEN 'Returning'
    ELSE 'New'
  END AS customer_tier
FROM customers c
WHERE c.merged_into_id IS NULL  -- Exclude merged customers
ORDER BY COALESCE(c.total_spent, 0) DESC, COALESCE(c.completed_bookings_count, 0) DESC;

-- Grant access
GRANT SELECT ON customer_leaderboard TO anon, authenticated;

-- =============================================================================
-- STEP 6: Add documentation comments
-- =============================================================================

COMMENT ON FUNCTION update_completed_booking_count IS 
'Trigger function that increments/decrements completed_bookings_count when booking status changes to/from completed. This is the ONLY source of truth for completed booking counts.';

COMMENT ON FUNCTION check_loyalty_tier_eligibility IS 
'Checks if a customer qualifies for a loyalty tier based on their COMPLETED booking count.';

COMMENT ON FUNCTION get_customer_loyalty_status IS 
'Returns customer loyalty status including tier progress and available rewards, based on COMPLETED bookings only.';

COMMENT ON FUNCTION check_loyalty_on_booking_complete IS 
'Trigger that checks and awards loyalty rewards when a booking status changes to completed.';

COMMENT ON VIEW customer_leaderboard IS 
'Customer ranking view showing both total bookings and completed bookings. Tier is based on completed_bookings only.';

-- =============================================================================
-- MIGRATION COMPLETE
-- 
-- After running this migration:
-- 1. completed_bookings_count is now the source of truth for loyalty
-- 2. booking_count remains as "total confirmed bookings" for reference
-- 3. Customer tiers are now based on completed rentals only
-- 4. Loyalty rewards trigger only when a rental is fully completed
-- =============================================================================
