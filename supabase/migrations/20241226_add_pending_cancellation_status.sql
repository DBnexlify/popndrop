-- =============================================================================
-- ADD pending_cancellation TO booking_status ENUM
-- Migration: 20241226_add_pending_cancellation_status.sql
-- Purpose: Allow bookings to have 'pending_cancellation' status when customer
--          requests cancellation but admin hasn't reviewed yet
-- =============================================================================

-- Add the new enum value
-- PostgreSQL allows adding values to existing enums
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_cancellation' AFTER 'pending';

-- Add comment for documentation
COMMENT ON TYPE booking_status IS 
'Booking lifecycle states:
  - pending: Awaiting payment
  - pending_cancellation: Customer requested cancellation, awaiting review
  - confirmed: Paid, scheduled
  - delivered: Equipment on-site
  - picked_up: Equipment retrieved
  - completed: Fully done
  - cancelled: Cancelled';

-- =============================================================================
-- VERIFICATION QUERY (run manually to verify)
-- =============================================================================
-- SELECT enumlabel FROM pg_enum 
-- WHERE enumtypid = 'booking_status'::regtype 
-- ORDER BY enumsortorder;
