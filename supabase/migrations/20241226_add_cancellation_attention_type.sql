-- =============================================================================
-- ADD cancellation_request TO attention_type ENUM
-- Migration: 20241226_add_cancellation_attention_type.sql
-- Purpose: Allow cancellation requests to appear in the notification bell
-- =============================================================================

-- Add the new enum value to attention_type
-- This allows cancellation requests to show in the notification bell dropdown
ALTER TYPE attention_type ADD VALUE IF NOT EXISTS 'cancellation_request';

-- Add comment for documentation
COMMENT ON TYPE attention_type IS 
'Types of attention items that can be created:
  - delivery_confirmation: Was this delivered?
  - pickup_confirmation: Was this picked up?
  - payment_collection: How was payment collected?
  - booking_closure: Ready to close booking?
  - issue_reported: Customer reported an issue
  - manual_review: Admin flagged for review
  - cancellation_request: Customer requested cancellation';

-- =============================================================================
-- VERIFICATION QUERY (run manually to verify)
-- =============================================================================
-- SELECT enumlabel FROM pg_enum 
-- WHERE enumtypid = 'attention_type'::regtype 
-- ORDER BY enumsortorder;
