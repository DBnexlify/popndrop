-- =============================================================================
-- CUSTOMER LOYALTY REWARDS SYSTEM
-- supabase/migrations/20241223_loyalty_rewards.sql
-- Automated rewards when customers hit booking milestones
-- =============================================================================

-- =============================================================================
-- 1. LOYALTY TIER CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tier definition
  tier_name VARCHAR(50) NOT NULL,  -- 'bronze', 'silver', 'gold'
  tier_level INTEGER NOT NULL UNIQUE,  -- 1, 2, 3 (for ordering)
  bookings_required INTEGER NOT NULL,  -- Number of completed bookings
  
  -- Reward configuration
  discount_percent INTEGER NOT NULL,  -- 10, 20, etc.
  max_discount_cap NUMERIC(10, 2) NOT NULL DEFAULT 50.00,  -- Max discount in dollars
  minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 150.00,  -- Min order to use
  code_expiration_days INTEGER NOT NULL DEFAULT 60,  -- Days until code expires
  
  -- Code prefix for generated codes
  code_prefix VARCHAR(10) NOT NULL,  -- 'LYL10', 'LYL20'
  
  -- Display
  display_name VARCHAR(100) NOT NULL,  -- "Bronze Member - 10% Off"
  description TEXT,  -- Email/UI description
  badge_color VARCHAR(20) DEFAULT 'fuchsia',  -- For UI display
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO loyalty_tiers (tier_name, tier_level, bookings_required, discount_percent, code_prefix, display_name, description, badge_color)
VALUES 
  ('bronze', 1, 3, 10, 'LYL10', 'Loyal Customer', '10% off your next rental as a thank you for your loyalty!', 'amber'),
  ('silver', 2, 5, 20, 'LYL20', 'VIP Customer', '20% off your next rental - you''re one of our valued VIPs!', 'cyan')
ON CONFLICT DO NOTHING;

-- Index for tier lookups
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_bookings ON loyalty_tiers (bookings_required) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_level ON loyalty_tiers (tier_level);

-- =============================================================================
-- 2. CUSTOMER LOYALTY REWARDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE RESTRICT,
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  
  -- Award context
  bookings_at_award INTEGER NOT NULL,  -- How many bookings when awarded
  triggering_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Timestamps
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Usage tracking (denormalized from promo_code for quick access)
  code_used BOOLEAN NOT NULL DEFAULT false,
  code_used_at TIMESTAMPTZ,
  code_expired BOOLEAN NOT NULL DEFAULT false,
  
  -- Email tracking
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Ensure one reward per tier per customer
  UNIQUE (customer_id, tier_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_customer ON customer_loyalty_rewards (customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_unused ON customer_loyalty_rewards (customer_id) 
  WHERE code_used = false AND code_expired = false;
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_pending_email ON customer_loyalty_rewards (id) 
  WHERE email_sent = false;

-- =============================================================================
-- 3. LOYALTY AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS loyalty_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES customer_loyalty_rewards(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Action
  action_type VARCHAR(50) NOT NULL,  -- 'tier_achieved', 'code_generated', 'code_used', 'code_expired', 'manual_award'
  action_details JSONB DEFAULT '{}',
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_audit_customer ON loyalty_audit_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_audit_created ON loyalty_audit_log (created_at DESC);

-- =============================================================================
-- 4. HELPER FUNCTION: CHECK IF CUSTOMER QUALIFIES FOR NEW TIER
-- =============================================================================

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

-- =============================================================================
-- 5. FUNCTION: AWARD LOYALTY REWARD
-- =============================================================================

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
  
  -- Create the reward record
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
    v_customer.booking_count,
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
      'expires_at', v_expiration
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

-- =============================================================================
-- 6. FUNCTION: GET CUSTOMER LOYALTY STATUS
-- =============================================================================

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
  v_bookings INTEGER;
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- Get customer's completed booking count
  SELECT COALESCE(booking_count, 0) INTO v_bookings
  FROM customers WHERE id = p_customer_id;
  
  -- Get current tier (highest achieved)
  SELECT lt.* INTO v_current_tier
  FROM loyalty_tiers lt
  WHERE lt.is_active = true AND lt.bookings_required <= v_bookings
  ORDER BY lt.tier_level DESC
  LIMIT 1;
  
  -- Get next tier
  SELECT lt.* INTO v_next_tier
  FROM loyalty_tiers lt
  WHERE lt.is_active = true AND lt.bookings_required > v_bookings
  ORDER BY lt.tier_level ASC
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    v_bookings AS current_bookings,
    v_current_tier.tier_name AS current_tier_name,
    v_current_tier.tier_level AS current_tier_level,
    v_next_tier.tier_name AS next_tier_name,
    v_next_tier.tier_level AS next_tier_level,
    CASE WHEN v_next_tier.bookings_required IS NOT NULL 
         THEN v_next_tier.bookings_required - v_bookings 
         ELSE 0 
    END AS bookings_until_next,
    CASE WHEN v_next_tier.bookings_required IS NOT NULL AND v_current_tier.bookings_required IS NOT NULL
         THEN LEAST(100, ((v_bookings - COALESCE(v_current_tier.bookings_required, 0))::NUMERIC / 
               NULLIF(v_next_tier.bookings_required - COALESCE(v_current_tier.bookings_required, 0), 0) * 100)::INTEGER)
         WHEN v_current_tier.tier_level IS NOT NULL THEN 100
         ELSE LEAST(100, (v_bookings::NUMERIC / COALESCE(v_next_tier.bookings_required, 3) * 100)::INTEGER)
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

-- =============================================================================
-- 7. TRIGGER: AUTO-CHECK LOYALTY ON BOOKING COMPLETION
-- =============================================================================

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
    -- Get customer with updated booking count
    SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
    
    IF v_customer IS NOT NULL THEN
      -- Check if they qualify for a new tier
      SELECT * INTO v_eligibility 
      FROM check_loyalty_tier_eligibility(NEW.customer_id, v_customer.booking_count);
      
      -- If eligible and not already awarded
      IF v_eligibility.eligible = true AND v_eligibility.already_awarded = false THEN
        -- Award the reward
        SELECT * INTO v_award_result
        FROM award_loyalty_reward(NEW.customer_id, v_eligibility.tier_id, NEW.id);
        
        -- Log success or failure
        IF v_award_result.success THEN
          -- The award function already logs this
          NULL;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_check_loyalty_on_complete ON bookings;
CREATE TRIGGER trigger_check_loyalty_on_complete
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_loyalty_on_booking_complete();

-- =============================================================================
-- 8. TRIGGER: MARK LOYALTY CODE AS USED WHEN PROMO CODE USED
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_loyalty_code_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a promo code is used, check if it's a loyalty code
  IF NEW.usage_count > OLD.usage_count THEN
    UPDATE customer_loyalty_rewards
    SET code_used = true,
        code_used_at = NOW()
    WHERE promo_code_id = NEW.id
      AND code_used = false;
      
    -- Log it
    INSERT INTO loyalty_audit_log (
      customer_id, 
      reward_id, 
      action_type, 
      action_details
    )
    SELECT 
      clr.customer_id,
      clr.id,
      'code_used',
      jsonb_build_object('promo_code', NEW.code)
    FROM customer_loyalty_rewards clr
    WHERE clr.promo_code_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_loyalty_usage ON promo_codes;
CREATE TRIGGER trigger_sync_loyalty_usage
  AFTER UPDATE OF usage_count ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION sync_loyalty_code_usage();

-- =============================================================================
-- 9. VIEW: LOYALTY DASHBOARD STATS
-- =============================================================================

CREATE OR REPLACE VIEW loyalty_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM customer_loyalty_rewards) AS total_rewards_issued,
  (SELECT COUNT(*) FROM customer_loyalty_rewards WHERE code_used = true) AS rewards_redeemed,
  (SELECT COUNT(*) FROM customer_loyalty_rewards WHERE code_used = false AND code_expired = false) AS rewards_pending,
  (SELECT COUNT(*) FROM customer_loyalty_rewards WHERE code_expired = true) AS rewards_expired,
  CASE 
    WHEN (SELECT COUNT(*) FROM customer_loyalty_rewards) > 0 
    THEN ROUND((SELECT COUNT(*) FROM customer_loyalty_rewards WHERE code_used = true)::NUMERIC / 
         (SELECT COUNT(*) FROM customer_loyalty_rewards) * 100, 1)
    ELSE 0
  END AS redemption_rate_percent,
  (SELECT COALESCE(SUM(pcu.discount_applied), 0)
   FROM customer_loyalty_rewards clr
   JOIN promo_code_usage pcu ON pcu.promo_code_id = clr.promo_code_id
   WHERE clr.code_used = true) AS total_discount_given,
  (SELECT COUNT(DISTINCT customer_id) FROM customer_loyalty_rewards) AS customers_with_rewards;

-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_audit_log ENABLE ROW LEVEL SECURITY;

-- Public can read active tiers (for display)
CREATE POLICY "Public can view active tiers" ON loyalty_tiers
  FOR SELECT USING (is_active = true);

-- Admins can manage tiers
CREATE POLICY "Admins can manage tiers" ON loyalty_tiers
  FOR ALL USING (public.is_admin());

-- Service role can manage rewards
CREATE POLICY "Service role manages rewards" ON customer_loyalty_rewards
  FOR ALL USING (true);

-- Service role can view audit log  
CREATE POLICY "Service role views audit" ON loyalty_audit_log
  FOR ALL USING (true);

-- =============================================================================
-- 11. GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON loyalty_tiers TO anon, authenticated;
GRANT SELECT ON loyalty_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION check_loyalty_tier_eligibility TO service_role;
GRANT EXECUTE ON FUNCTION award_loyalty_reward TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_loyalty_status TO anon, authenticated, service_role;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON TABLE loyalty_tiers IS 'Configurable loyalty program tiers';
COMMENT ON TABLE customer_loyalty_rewards IS 'Tracks which rewards customers have earned';
COMMENT ON TABLE loyalty_audit_log IS 'Audit trail for all loyalty actions';
COMMENT ON FUNCTION award_loyalty_reward IS 'Awards a loyalty reward to a customer, generating a promo code';
COMMENT ON FUNCTION get_customer_loyalty_status IS 'Returns customer loyalty progress and available rewards';
