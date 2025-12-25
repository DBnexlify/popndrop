-- =============================================================================
-- ACH/ASYNC PAYMENT SUPPORT MIGRATION
-- Run this in Supabase SQL Editor
-- 
-- This migration adds support for ACH bank transfer payments which are
-- asynchronous (take 3-5 business days to clear).
-- =============================================================================

-- =============================================================================
-- 1. ADD PAYMENT METHOD TYPE TO BOOKINGS
-- Tracks whether payment was made via card or bank transfer
-- =============================================================================

-- Add payment_method_type to bookings (for display and filtering)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT 'card';

-- Add is_async_payment flag to track ACH payments awaiting clearance
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_async_payment BOOLEAN DEFAULT FALSE;

-- Add async payment status for tracking ACH payment state
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS async_payment_status TEXT DEFAULT NULL;

-- Add async payment timestamps
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS async_payment_initiated_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS async_payment_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add async payment failure tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS async_payment_failed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS async_payment_failure_reason TEXT DEFAULT NULL;

-- Comment on columns
COMMENT ON COLUMN bookings.payment_method_type IS 'Payment method: card, us_bank_account (ACH), etc.';
COMMENT ON COLUMN bookings.is_async_payment IS 'True if payment is asynchronous (ACH) and may still be processing';
COMMENT ON COLUMN bookings.async_payment_status IS 'Status of async payment: pending, processing, succeeded, failed';
COMMENT ON COLUMN bookings.async_payment_initiated_at IS 'When async payment was initiated (checkout completed)';
COMMENT ON COLUMN bookings.async_payment_completed_at IS 'When async payment succeeded (funds received)';
COMMENT ON COLUMN bookings.async_payment_failed_at IS 'When async payment failed';
COMMENT ON COLUMN bookings.async_payment_failure_reason IS 'Reason for async payment failure';

-- =============================================================================
-- 2. ADD PAYMENT METHOD DETAILS TO PAYMENTS TABLE
-- Enhanced tracking for different payment methods
-- =============================================================================

-- Add payment method type to payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT 'card';

-- Add bank account details for ACH payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT NULL;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS bank_last_four TEXT DEFAULT NULL;

-- Add async payment tracking
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS is_async BOOLEAN DEFAULT FALSE;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS async_status TEXT DEFAULT NULL;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS async_completed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS async_failed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS async_failure_reason TEXT DEFAULT NULL;

-- Comment on columns
COMMENT ON COLUMN payments.payment_method_type IS 'Payment method: card, us_bank_account, etc.';
COMMENT ON COLUMN payments.bank_name IS 'Bank name for ACH payments';
COMMENT ON COLUMN payments.bank_last_four IS 'Last 4 digits of bank account for ACH';
COMMENT ON COLUMN payments.is_async IS 'True if this is an async payment (ACH)';
COMMENT ON COLUMN payments.async_status IS 'Async payment status: pending, processing, succeeded, failed';
COMMENT ON COLUMN payments.async_completed_at IS 'When async payment cleared';
COMMENT ON COLUMN payments.async_failed_at IS 'When async payment failed';
COMMENT ON COLUMN payments.async_failure_reason IS 'Reason for async payment failure';

-- =============================================================================
-- 3. CREATE INDEX FOR ASYNC PAYMENT QUERIES
-- =============================================================================

-- Index for finding pending async payments
CREATE INDEX IF NOT EXISTS idx_bookings_async_payment 
ON bookings (is_async_payment, async_payment_status)
WHERE is_async_payment = TRUE;

-- Index for finding pending async payments in payments table
CREATE INDEX IF NOT EXISTS idx_payments_async 
ON payments (is_async, async_status)
WHERE is_async = TRUE;

-- =============================================================================
-- 4. CREATE VIEW FOR PENDING ACH PAYMENTS
-- Useful for admin dashboard and financial tracking
-- =============================================================================

CREATE OR REPLACE VIEW pending_ach_payments AS
SELECT 
  b.id AS booking_id,
  b.booking_number,
  b.customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  b.product_snapshot->>'name' AS product_name,
  b.event_date,
  b.delivery_date,
  b.subtotal,
  b.deposit_amount,
  b.async_payment_status,
  b.async_payment_initiated_at,
  p.amount AS payment_amount,
  p.bank_name,
  p.bank_last_four,
  p.created_at AS payment_created_at,
  -- Calculate days since initiation
  EXTRACT(DAY FROM NOW() - b.async_payment_initiated_at) AS days_pending
FROM bookings b
JOIN customers c ON c.id = b.customer_id
LEFT JOIN payments p ON p.booking_id = b.id AND p.is_async = TRUE
WHERE b.is_async_payment = TRUE 
  AND b.async_payment_status IN ('pending', 'processing')
  AND b.status != 'cancelled'
ORDER BY b.async_payment_initiated_at ASC;

COMMENT ON VIEW pending_ach_payments IS 'View of all ACH payments currently pending clearance';

-- =============================================================================
-- 5. UPDATE GET_FINANCIAL_METRICS TO HANDLE ASYNC PAYMENTS
-- Only count completed payments in revenue
-- =============================================================================

-- Note: The existing get_financial_metrics function should already filter by
-- payment status = 'succeeded', but we need to ensure async payments aren't
-- counted until they actually succeed. The payments table's status field
-- will be 'pending' for async payments until they clear.

-- =============================================================================
-- 6. ADD STRIPE ASYNC PAYMENT EVENT TRACKING
-- For webhook idempotency and audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  payment_id UUID REFERENCES payments(id),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_booking_id ON stripe_events(booking_id);

COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events for idempotency';

-- =============================================================================
-- 7. HELPER FUNCTION TO CHECK IF STRIPE EVENT ALREADY PROCESSED
-- =============================================================================

CREATE OR REPLACE FUNCTION is_stripe_event_processed(p_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stripe_events WHERE event_id = p_event_id
  );
END;
$$;

COMMENT ON FUNCTION is_stripe_event_processed IS 'Returns true if webhook event was already processed';

-- =============================================================================
-- 8. FUNCTION TO RECORD STRIPE EVENT
-- =============================================================================

CREATE OR REPLACE FUNCTION record_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_booking_id UUID DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if already processed
  IF is_stripe_event_processed(p_event_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Record the event
  INSERT INTO stripe_events (event_id, event_type, booking_id, payment_id, payload)
  VALUES (p_event_id, p_event_type, p_booking_id, p_payment_id, p_payload);
  
  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition - another process recorded it first
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION record_stripe_event IS 'Records a Stripe webhook event, returns false if already processed';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Verify the changes
SELECT 
  'bookings' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND column_name LIKE '%async%'
UNION ALL
SELECT 
  'payments' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name IN ('payment_method_type', 'bank_name', 'bank_last_four', 'is_async', 'async_status');
