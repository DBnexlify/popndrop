-- =============================================================================
-- ADD FOLLOWUP EMAIL TRACKING TO BOOKINGS
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add column to track when follow-up email was sent
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_followup_pending 
ON bookings(event_date, status) 
WHERE followup_sent_at IS NULL;

COMMENT ON COLUMN bookings.followup_sent_at IS 'Timestamp when post-event follow-up email was sent';
