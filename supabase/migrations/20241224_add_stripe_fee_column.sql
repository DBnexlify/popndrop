-- =============================================================================
-- ADD STRIPE FEE COLUMN TO PAYMENTS TABLE
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add stripe_fee column if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10,2) DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN payments.stripe_fee IS 
  'Actual Stripe processing fee captured from balance_transaction (in dollars)';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'stripe_fee';

SELECT '✅ stripe_fee column added to payments table!' AS status;
