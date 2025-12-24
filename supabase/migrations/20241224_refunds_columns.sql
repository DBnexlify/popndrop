-- =============================================================================
-- ENSURE REFUNDS TABLE HAS ALL REQUIRED COLUMNS
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add is_full_refund column if it doesn't exist
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS is_full_refund BOOLEAN DEFAULT FALSE;

-- Add original_stripe_fee_lost if it doesn't exist
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS original_stripe_fee_lost DECIMAL(10,2) DEFAULT 0;

-- Add stripe_refund_id if it doesn't exist
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255);

-- Add processed_at if it doesn't exist
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add payment_id if it doesn't exist (links to original payment)
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'refunds'
ORDER BY ordinal_position;

SELECT '✅ Refunds table columns verified!' AS status;
