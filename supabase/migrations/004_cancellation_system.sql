-- =============================================================================
-- CANCELLATION & REFUND SYSTEM
-- supabase/migrations/004_cancellation_system.sql
-- Run this in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CANCELLATION POLICY TABLE (Configurable by admin)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Policy name for admin reference
  name text NOT NULL DEFAULT 'Standard Policy',
  
  -- Is this the active policy?
  is_active boolean NOT NULL DEFAULT false,
  
  -- Policy rules (days before event -> refund percentage)
  -- Stored as JSONB for flexibility
  -- Example: [{"min_days": 7, "max_days": null, "refund_percent": 100}, ...]
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Weather/emergency cancellation settings
  weather_full_refund boolean NOT NULL DEFAULT true,
  allow_reschedule boolean NOT NULL DEFAULT true,
  
  -- Processing fee (in dollars) - deducted from refunds
  processing_fee numeric(10,2) NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default cancellation policy
INSERT INTO cancellation_policies (name, is_active, rules, processing_fee) VALUES (
  'Standard Policy',
  true,
  '[
    {"min_days": 7, "max_days": null, "refund_percent": 100, "label": "7+ days before"},
    {"min_days": 3, "max_days": 6, "refund_percent": 50, "label": "3-6 days before"},
    {"min_days": 0, "max_days": 2, "refund_percent": 0, "label": "0-2 days before"}
  ]'::jsonb,
  0
);

-- -----------------------------------------------------------------------------
-- 2. CANCELLATION REQUESTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to booking
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Request details
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'denied', 'refunded')),
  
  -- Customer-provided reason
  reason text,
  
  -- Cancellation type
  cancellation_type text NOT NULL DEFAULT 'customer_request'
    CHECK (cancellation_type IN ('customer_request', 'weather', 'emergency', 'admin_initiated')),
  
  -- Calculated refund details (at time of request)
  days_before_event integer NOT NULL,
  policy_refund_percent integer NOT NULL,
  
  -- Amounts (in dollars)
  original_paid numeric(10,2) NOT NULL,        -- What customer paid
  suggested_refund numeric(10,2) NOT NULL,     -- Based on policy
  approved_refund numeric(10,2),               -- What admin approved (can differ)
  processing_fee numeric(10,2) NOT NULL DEFAULT 0,
  
  -- Admin response
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  -- Stripe refund tracking
  stripe_refund_id text,
  stripe_payment_intent_id text,
  refund_processed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one active request per booking
  UNIQUE(booking_id, status) WHERE status = 'pending'
);

-- Index for quick lookups
CREATE INDEX idx_cancellation_requests_booking ON cancellation_requests(booking_id);
CREATE INDEX idx_cancellation_requests_status ON cancellation_requests(status);
CREATE INDEX idx_cancellation_requests_created ON cancellation_requests(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. ADD STRIPE PAYMENT INTENT TO BOOKINGS (for refunds)
-- -----------------------------------------------------------------------------

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'stripe_charge_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_charge_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. FUNCTION: Calculate refund based on policy
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_refund(
  p_event_date date,
  p_amount_paid numeric
)
RETURNS TABLE (
  days_until_event integer,
  refund_percent integer,
  refund_amount numeric,
  processing_fee numeric,
  policy_label text
) AS $$
DECLARE
  v_policy cancellation_policies%ROWTYPE;
  v_days integer;
  v_rule jsonb;
  v_min_days integer;
  v_max_days integer;
BEGIN
  -- Get active policy
  SELECT * INTO v_policy 
  FROM cancellation_policies 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Calculate days until event
  v_days := p_event_date - CURRENT_DATE;
  
  -- Default values
  days_until_event := v_days;
  refund_percent := 0;
  refund_amount := 0;
  processing_fee := COALESCE(v_policy.processing_fee, 0);
  policy_label := 'No refund available';
  
  -- Find matching rule
  FOR v_rule IN SELECT * FROM jsonb_array_elements(v_policy.rules)
  LOOP
    v_min_days := (v_rule->>'min_days')::integer;
    v_max_days := (v_rule->>'max_days')::integer;
    
    IF v_days >= v_min_days AND (v_max_days IS NULL OR v_days <= v_max_days) THEN
      refund_percent := (v_rule->>'refund_percent')::integer;
      policy_label := v_rule->>'label';
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate refund amount
  refund_amount := ROUND((p_amount_paid * refund_percent / 100) - processing_fee, 2);
  IF refund_amount < 0 THEN
    refund_amount := 0;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. UPDATE TRIGGER FOR updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables
DROP TRIGGER IF EXISTS update_cancellation_policies_updated_at ON cancellation_policies;
CREATE TRIGGER update_cancellation_policies_updated_at
  BEFORE UPDATE ON cancellation_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cancellation_requests_updated_at ON cancellation_requests;
CREATE TRIGGER update_cancellation_requests_updated_at
  BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. RLS POLICIES (Row Level Security)
-- -----------------------------------------------------------------------------

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Policies can be read by anyone (for displaying policy info)
CREATE POLICY "Anyone can view active cancellation policy"
  ON cancellation_policies FOR SELECT
  USING (is_active = true);

-- Cancellation requests - more restrictive
-- For now, allow all operations (admin-only access will be via service role)
CREATE POLICY "Service role full access to cancellation_requests"
  ON cancellation_requests FOR ALL
  USING (true)
  WITH CHECK (true);
