-- =============================================================================
-- ADD CANCELLATION_REQUEST TO ATTENTION_TYPE ENUM
-- 20241223_add_cancellation_attention_type.sql
-- Adds cancellation_request to the attention_type enum for notification system
-- =============================================================================

-- Add new value to the attention_type enum
-- Note: PostgreSQL requires ALTER TYPE ... ADD VALUE syntax
ALTER TYPE attention_type ADD VALUE IF NOT EXISTS 'cancellation_request';

-- Update the unique constraint to allow multiple cancellation requests
-- (since they're resolved when processed)
-- The existing constraint prevents duplicate pending items, which is correct

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON TYPE attention_type IS 'Types of attention items: delivery_confirmation, pickup_confirmation, payment_collection, booking_closure, issue_reported, manual_review, cancellation_request';
