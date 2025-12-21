-- =============================================================================
-- COUNTDOWN EMAIL TRACKING
-- supabase/migrations/20241222_countdown_email_tracking.sql
-- Adds countdown_sent_at field to track "party tomorrow" emails
-- =============================================================================

-- Add countdown_sent_at column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS countdown_sent_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN bookings.countdown_sent_at IS 'Timestamp when the "your party is tomorrow" email was sent';

-- Create index for efficient querying by cron job
CREATE INDEX IF NOT EXISTS idx_bookings_countdown_pending 
ON bookings (event_date) 
WHERE countdown_sent_at IS NULL AND status IN ('confirmed', 'paid');
