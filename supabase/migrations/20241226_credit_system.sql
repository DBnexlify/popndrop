-- =============================================================================
-- CREDIT SYSTEM MIGRATION
-- 20241226_credit_system.sql
-- 
-- Implements weather cancellation credits with 12-month expiration
-- Credits are issued instead of refunds for weather-related cancellations
-- =============================================================================

-- =============================================================================
-- CREDITS TABLE
-- Stores credit balances for customers
-- =============================================================================

CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who owns this credit
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Credit details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  remaining_amount DECIMAL(10,2) NOT NULL CHECK (remaining_amount >= 0),
  
  -- Origin tracking
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('weather_cancellation', 'customer_service', 'price_adjustment', 'promotional', 'other')),
  notes TEXT,
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  is_expired BOOLEAN DEFAULT false,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'system',
  
  -- Ensure remaining never exceeds original
  CONSTRAINT remaining_not_exceeds_original CHECK (remaining_amount <= amount)
);

-- Index for finding active credits
CREATE INDEX idx_credits_customer_active 
  ON credits(customer_id, is_expired, expires_at) 
  WHERE is_expired = false AND remaining_amount > 0;

-- Index for expiration cleanup
CREATE INDEX idx_credits_expiration 
  ON credits(expires_at) 
  WHERE is_expired = false;

COMMENT ON TABLE credits IS 'Customer credit balances for weather cancellations and other adjustments';

-- =============================================================================
-- CREDIT REDEMPTIONS TABLE
-- Tracks when/how credits are used
-- =============================================================================

CREATE TABLE IF NOT EXISTS credit_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which credit was used
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  
  -- What booking used it
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Amount details
  amount_redeemed DECIMAL(10,2) NOT NULL CHECK (amount_redeemed > 0),
  
  -- Tracking
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding redemptions by booking
CREATE INDEX idx_credit_redemptions_booking 
  ON credit_redemptions(booking_id);

-- Index for finding redemptions by credit
CREATE INDEX idx_credit_redemptions_credit 
  ON credit_redemptions(credit_id);

COMMENT ON TABLE credit_redemptions IS 'History of credit usage against bookings';

-- =============================================================================
-- FUNCTION: Issue Credit
-- Creates a new credit for a customer
-- =============================================================================

CREATE OR REPLACE FUNCTION issue_credit(
  p_customer_id UUID,
  p_amount DECIMAL(10,2),
  p_reason TEXT,
  p_booking_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_expiry_months INTEGER DEFAULT 12
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Calculate expiration (default 12 months)
  v_expires_at := NOW() + (p_expiry_months || ' months')::INTERVAL;
  
  -- Create the credit
  INSERT INTO credits (
    customer_id,
    amount,
    remaining_amount,
    booking_id,
    reason,
    notes,
    expires_at
  ) VALUES (
    p_customer_id,
    p_amount,
    p_amount,  -- Full amount available initially
    p_booking_id,
    p_reason,
    p_notes,
    v_expires_at
  )
  RETURNING id INTO v_credit_id;
  
  RETURN v_credit_id;
END;
$$;

COMMENT ON FUNCTION issue_credit IS 'Creates a new credit for a customer with configurable expiration';

-- =============================================================================
-- FUNCTION: Get Available Credit Balance
-- Returns total usable credit for a customer
-- =============================================================================

CREATE OR REPLACE FUNCTION get_customer_credit_balance(
  p_customer_id UUID
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_balance
  FROM credits
  WHERE customer_id = p_customer_id
    AND is_expired = false
    AND remaining_amount > 0
    AND expires_at > NOW();
  
  RETURN v_balance;
END;
$$;

COMMENT ON FUNCTION get_customer_credit_balance IS 'Returns total available credit balance for a customer';

-- =============================================================================
-- FUNCTION: Get Credit Details
-- Returns all active credits for a customer with expiration info
-- =============================================================================

CREATE OR REPLACE FUNCTION get_customer_credits(
  p_customer_id UUID
)
RETURNS TABLE (
  credit_id UUID,
  original_amount DECIMAL(10,2),
  remaining_amount DECIMAL(10,2),
  reason TEXT,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER,
  created_at TIMESTAMPTZ,
  booking_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS credit_id,
    c.amount AS original_amount,
    c.remaining_amount,
    c.reason,
    c.notes,
    c.expires_at,
    EXTRACT(DAY FROM c.expires_at - NOW())::INTEGER AS days_until_expiry,
    c.created_at,
    b.booking_number
  FROM credits c
  LEFT JOIN bookings b ON b.id = c.booking_id
  WHERE c.customer_id = p_customer_id
    AND c.is_expired = false
    AND c.remaining_amount > 0
    AND c.expires_at > NOW()
  ORDER BY c.expires_at ASC;  -- Oldest expiring first
END;
$$;

COMMENT ON FUNCTION get_customer_credits IS 'Returns all active credits for a customer with details';

-- =============================================================================
-- FUNCTION: Redeem Credit
-- Applies credit to a booking
-- =============================================================================

CREATE OR REPLACE FUNCTION redeem_credit(
  p_customer_id UUID,
  p_booking_id UUID,
  p_amount_to_redeem DECIMAL(10,2)
)
RETURNS TABLE (
  success BOOLEAN,
  amount_redeemed DECIMAL(10,2),
  remaining_balance DECIMAL(10,2),
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit RECORD;
  v_total_redeemed DECIMAL(10,2) := 0;
  v_remaining_to_redeem DECIMAL(10,2);
  v_redeem_from_this DECIMAL(10,2);
BEGIN
  v_remaining_to_redeem := p_amount_to_redeem;
  
  -- Process credits oldest-first (FIFO)
  FOR v_credit IN
    SELECT id, remaining_amount
    FROM credits
    WHERE customer_id = p_customer_id
      AND is_expired = false
      AND remaining_amount > 0
      AND expires_at > NOW()
    ORDER BY expires_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_redeem <= 0;
    
    -- Calculate how much to take from this credit
    v_redeem_from_this := LEAST(v_credit.remaining_amount, v_remaining_to_redeem);
    
    -- Update the credit
    UPDATE credits 
    SET remaining_amount = remaining_amount - v_redeem_from_this
    WHERE id = v_credit.id;
    
    -- Record the redemption
    INSERT INTO credit_redemptions (credit_id, booking_id, amount_redeemed)
    VALUES (v_credit.id, p_booking_id, v_redeem_from_this);
    
    v_total_redeemed := v_total_redeemed + v_redeem_from_this;
    v_remaining_to_redeem := v_remaining_to_redeem - v_redeem_from_this;
  END LOOP;
  
  IF v_total_redeemed = 0 THEN
    RETURN QUERY SELECT 
      false,
      0::DECIMAL(10,2),
      get_customer_credit_balance(p_customer_id),
      'No available credit balance'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    v_total_redeemed,
    get_customer_credit_balance(p_customer_id),
    NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION redeem_credit IS 'Applies available credit to a booking using FIFO method';

-- =============================================================================
-- FUNCTION: Expire Credits (Called by Cron)
-- Marks expired credits
-- =============================================================================

CREATE OR REPLACE FUNCTION expire_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE credits
    SET is_expired = true
    WHERE is_expired = false
      AND expires_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION expire_credits IS 'Marks credits as expired. Should be run daily by cron.';

-- =============================================================================
-- ADD CREDIT-RELATED COLUMNS TO BOOKINGS
-- =============================================================================

DO $$
BEGIN
  -- Track credit applied to booking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'credit_applied'
  ) THEN
    ALTER TABLE bookings ADD COLUMN credit_applied DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN bookings.credit_applied IS 'Amount of credit applied to this booking';
  END IF;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON credits TO authenticated;
GRANT SELECT, INSERT ON credit_redemptions TO authenticated;
GRANT SELECT ON credits TO anon;
GRANT SELECT ON credit_redemptions TO anon;

GRANT EXECUTE ON FUNCTION issue_credit(UUID, DECIMAL, TEXT, UUID, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_customer_credit_balance(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_customer_credits(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION redeem_credit(UUID, UUID, DECIMAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION expire_credits() TO service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== CREDIT SYSTEM CREATED ===';
  RAISE NOTICE 'Tables: credits, credit_redemptions';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - issue_credit(customer_id, amount, reason, booking_id, notes, expiry_months)';
  RAISE NOTICE '  - get_customer_credit_balance(customer_id)';
  RAISE NOTICE '  - get_customer_credits(customer_id)';
  RAISE NOTICE '  - redeem_credit(customer_id, booking_id, amount)';
  RAISE NOTICE '  - expire_credits()';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Update cancellation flow to issue credits instead of refunds for weather';
  RAISE NOTICE '2. Add credit balance display in customer dashboard';
  RAISE NOTICE '3. Integrate credit redemption into booking checkout';
  RAISE NOTICE '4. Add daily cron to call expire_credits()';
END $$;
