-- =============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- Run this in Supabase SQL Editor to enable push notifications
-- =============================================================================

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_admin_id ON push_subscriptions(admin_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage their own subscriptions
CREATE POLICY "Admins can manage own subscriptions" ON push_subscriptions
  FOR ALL
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Also allow service role (for API routes)
CREATE POLICY "Service role has full access" ON push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Optional: Notification log table for tracking
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs
CREATE POLICY "Service role can manage logs" ON notification_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant access to authenticated users to read logs
CREATE POLICY "Admins can read logs" ON notification_log
  FOR SELECT
  USING (true);

COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscriptions for admin users';
COMMENT ON TABLE notification_log IS 'Logs all sent notifications for debugging';
