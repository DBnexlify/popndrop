-- =============================================================================
-- PROMO CODES SCHEMA
-- supabase/migrations/20241223_promo_codes.sql
-- Discount code system for checkout
-- =============================================================================

-- =============================================================================
-- 1. PROMO CODE STATUS TYPE
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE promo_code_status AS ENUM ('active', 'used', 'expired', 'disabled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE promo_discount_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. PROMO CODES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code itself (e.g., "PND-7F39K2")
  code VARCHAR(20) UNIQUE NOT NULL,
  
  -- Discount configuration
  discount_type promo_discount_type NOT NULL DEFAULT 'percent',
  discount_amount NUMERIC(10, 2) NOT NULL,
  max_discount_cap NUMERIC(10, 2) DEFAULT NULL,  -- For percent discounts
  minimum_order_amount NUMERIC(10, 2) DEFAULT NULL,
  
  -- Validity
  expiration_date TIMESTAMPTZ DEFAULT NULL,
  
  -- Customer targeting (optional - NULL means any customer)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL DEFAULT NULL,
  
  -- Usage limits
  usage_limit INTEGER DEFAULT NULL,  -- NULL = unlimited
  usage_count INTEGER NOT NULL DEFAULT 0,
  single_use_per_customer BOOLEAN NOT NULL DEFAULT false,
  
  -- Product restrictions (optional - NULL means all products)
  applicable_products UUID[] DEFAULT NULL,
  excluded_products UUID[] DEFAULT NULL,
  
  -- Status
  status promo_code_status NOT NULL DEFAULT 'active',
  
  -- Metadata
  description TEXT DEFAULT NULL,  -- Public description shown to customer
  internal_notes TEXT DEFAULT NULL,  -- Admin-only notes
  campaign_name VARCHAR(100) DEFAULT NULL,  -- For grouping/reporting
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_discount CHECK (discount_amount > 0),
  CONSTRAINT valid_percent_discount CHECK (
    discount_type != 'percent' OR (discount_amount <= 100)
  ),
  CONSTRAINT valid_cap CHECK (
    max_discount_cap IS NULL OR max_discount_cap > 0
  ),
  CONSTRAINT valid_minimum CHECK (
    minimum_order_amount IS NULL OR minimum_order_amount > 0
  )
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes (status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_customer ON promo_codes (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_codes_campaign ON promo_codes (campaign_name) WHERE campaign_name IS NOT NULL;

-- =============================================================================
-- 3. PROMO CODE USAGE TABLE (Audit Trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Discount applied
  original_amount NUMERIC(10, 2) NOT NULL,
  discount_applied NUMERIC(10, 2) NOT NULL,
  final_amount NUMERIC(10, 2) NOT NULL,
  
  -- Timestamp
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate usage on same booking
  UNIQUE (promo_code_id, booking_id)
);

-- Index for checking customer usage
CREATE INDEX IF NOT EXISTS idx_promo_usage_customer ON promo_code_usage (promo_code_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_booking ON promo_code_usage (booking_id);

-- =============================================================================
-- 4. ADD PROMO CODE FIELD TO BOOKINGS TABLE
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN discount_code VARCHAR(20) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- =============================================================================
-- 5. VALIDATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR,
  p_customer_id UUID,
  p_product_id UUID,
  p_order_amount NUMERIC
)
RETURNS TABLE (
  valid BOOLEAN,
  error_message TEXT,
  promo_code_id UUID,
  discount_type promo_discount_type,
  discount_amount NUMERIC,
  max_discount_cap NUMERIC,
  calculated_discount NUMERIC,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_customer_usage_count INTEGER;
  v_calculated_discount NUMERIC;
BEGIN
  -- Normalize code to uppercase
  p_code := UPPER(TRIM(p_code));
  
  -- Find the promo code
  SELECT * INTO v_promo 
  FROM promo_codes 
  WHERE UPPER(code) = p_code;
  
  -- Code doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'Code not found'::TEXT, 
      NULL::UUID,
      NULL::promo_discount_type,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check status
  IF v_promo.status != 'active' THEN
    RETURN QUERY SELECT 
      false, 
      CASE v_promo.status
        WHEN 'used' THEN 'This code has already been fully used'
        WHEN 'expired' THEN 'This code has expired'
        WHEN 'disabled' THEN 'This code is no longer valid'
      END::TEXT,
      NULL::UUID,
      NULL::promo_discount_type,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_promo.expiration_date IS NOT NULL AND v_promo.expiration_date < NOW() THEN
    -- Auto-update status to expired
    UPDATE promo_codes SET status = 'expired', updated_at = NOW() WHERE id = v_promo.id;
    
    RETURN QUERY SELECT 
      false, 
      'This code has expired'::TEXT,
      NULL::UUID,
      NULL::promo_discount_type,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check usage limit
  IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit THEN
    -- Auto-update status to used
    UPDATE promo_codes SET status = 'used', updated_at = NOW() WHERE id = v_promo.id;
    
    RETURN QUERY SELECT 
      false, 
      'This code has reached its usage limit'::TEXT,
      NULL::UUID,
      NULL::promo_discount_type,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check customer-specific code
  IF v_promo.customer_id IS NOT NULL AND v_promo.customer_id != p_customer_id THEN
    RETURN QUERY SELECT 
      false, 
      'This code is not valid for your account'::TEXT,
      NULL::UUID,
      NULL::promo_discount_type,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check single-use-per-customer
  IF v_promo.single_use_per_customer AND p_customer_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_customer_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo.id AND customer_id = p_customer_id;
    
    IF v_customer_usage_count > 0 THEN
      RETURN QUERY SELECT 
        false, 
        'You have already used this code'::TEXT,
        NULL::UUID,
        NULL::promo_discount_type,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check minimum order amount
  IF v_promo.minimum_order_amount IS NOT NULL AND p_order_amount < v_promo.minimum_order_amount THEN
    RETURN QUERY SELECT 
      false, 
      ('Minimum order of $' || v_promo.minimum_order_amount || ' required')::TEXT,
      NULL::UUID,
      NULL::promo_discount_type,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check product restrictions
  IF v_promo.applicable_products IS NOT NULL AND p_product_id IS NOT NULL THEN
    IF NOT (p_product_id = ANY(v_promo.applicable_products)) THEN
      RETURN QUERY SELECT 
        false, 
        'This code is not valid for the selected rental'::TEXT,
        NULL::UUID,
        NULL::promo_discount_type,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check excluded products
  IF v_promo.excluded_products IS NOT NULL AND p_product_id IS NOT NULL THEN
    IF p_product_id = ANY(v_promo.excluded_products) THEN
      RETURN QUERY SELECT 
        false, 
        'This code cannot be used with the selected rental'::TEXT,
        NULL::UUID,
        NULL::promo_discount_type,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::NUMERIC,
        NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'percent' THEN
    v_calculated_discount := p_order_amount * (v_promo.discount_amount / 100);
    
    -- Apply cap if set
    IF v_promo.max_discount_cap IS NOT NULL AND v_calculated_discount > v_promo.max_discount_cap THEN
      v_calculated_discount := v_promo.max_discount_cap;
    END IF;
  ELSE
    -- Fixed discount
    v_calculated_discount := LEAST(v_promo.discount_amount, p_order_amount);
  END IF;
  
  -- Round to 2 decimal places
  v_calculated_discount := ROUND(v_calculated_discount, 2);
  
  -- Success!
  RETURN QUERY SELECT 
    true,
    NULL::TEXT,
    v_promo.id,
    v_promo.discount_type,
    v_promo.discount_amount,
    v_promo.max_discount_cap,
    v_calculated_discount,
    v_promo.description;
END;
$$;

-- =============================================================================
-- 6. APPLY PROMO CODE FUNCTION (called when booking is created)
-- =============================================================================

CREATE OR REPLACE FUNCTION apply_promo_code(
  p_promo_code_id UUID,
  p_booking_id UUID,
  p_customer_id UUID,
  p_original_amount NUMERIC,
  p_discount_applied NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Record usage
  INSERT INTO promo_code_usage (
    promo_code_id,
    booking_id,
    customer_id,
    original_amount,
    discount_applied,
    final_amount
  ) VALUES (
    p_promo_code_id,
    p_booking_id,
    p_customer_id,
    p_original_amount,
    p_discount_applied,
    p_original_amount - p_discount_applied
  );
  
  -- Increment usage count
  UPDATE promo_codes 
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = p_promo_code_id;
  
  -- Check if usage limit reached and auto-disable
  UPDATE promo_codes 
  SET 
    status = 'used',
    updated_at = NOW()
  WHERE id = p_promo_code_id 
    AND usage_limit IS NOT NULL 
    AND usage_count >= usage_limit;
  
  RETURN true;
END;
$$;

-- =============================================================================
-- 7. GENERATE UNIQUE CODE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_promo_code()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_code VARCHAR;
  v_exists BOOLEAN;
  v_chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Exclude confusing chars (0/O, 1/I/L)
  v_i INTEGER;
BEGIN
  LOOP
    v_code := 'PND-';
    
    -- Generate 6 random characters
    FOR v_i IN 1..6 LOOP
      v_code := v_code || SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1);
    END LOOP;
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM promo_codes WHERE code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- 8. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Admin full access to promo codes
CREATE POLICY "Admin full access to promo_codes" ON promo_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Service role full access
CREATE POLICY "Service role access to promo_codes" ON promo_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin full access to usage
CREATE POLICY "Admin full access to promo_code_usage" ON promo_code_usage
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Service role full access to usage
CREATE POLICY "Service role access to promo_code_usage" ON promo_code_usage
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_promo_code_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_promo_codes_updated ON promo_codes;
CREATE TRIGGER trigger_promo_codes_updated
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_code_timestamp();
