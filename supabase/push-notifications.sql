-- =============================================================================
-- PUSH NOTIFICATIONS SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- Stores web push notification subscriptions for admin users
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  
  -- Push subscription data
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,        -- Public key for encryption
  auth TEXT NOT NULL,          -- Auth secret for encryption
  
  -- Metadata
  user_agent TEXT,             -- Device info for debugging
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by admin
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_admin_id 
  ON push_subscriptions(admin_id);

-- Index for endpoint lookups (for unsubscribe)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
  ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can only manage their own subscriptions
CREATE POLICY "Admins can manage own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- Policy: Service role can manage all subscriptions (for server-side operations)
CREATE POLICY "Service role full access"
  ON push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- NOTIFICATION LOG TABLE (Optional - for tracking sent notifications)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT,                   -- 'new_booking', 'payment', 'reminder', 'alert'
  
  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Delivery status
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent notifications
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at 
  ON notification_log(created_at DESC);

-- Index for booking-related notifications
CREATE INDEX IF NOT EXISTS idx_notification_log_booking_id 
  ON notification_log(booking_id);

-- =============================================================================
-- FUNCTION: Send new booking notification
-- Called by trigger when a new booking is created
-- =============================================================================

-- Note: This function calls an Edge Function to send the actual notification
-- You'll need to set up the Edge Function separately

CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
  event_date_formatted TEXT;
BEGIN
  -- Get customer name
  SELECT c.first_name || ' ' || c.last_name INTO customer_name
  FROM customers c
  WHERE c.id = NEW.customer_id;
  
  -- Format event date
  event_date_formatted := TO_CHAR(NEW.event_date, 'Mon DD, YYYY');
  
  -- Log the notification
  INSERT INTO notification_log (title, body, type, booking_id)
  VALUES (
    '🎉 New Booking!',
    customer_name || ' booked for ' || event_date_formatted,
    'new_booking',
    NEW.id
  );
  
  -- Call edge function to send push notification
  -- This uses pg_net extension if available
  -- PERFORM net.http_post(
  --   url := current_setting('app.push_notification_url'),
  --   headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.push_webhook_secret')),
  --   body := jsonb_build_object(
  --     'notification', jsonb_build_object(
  --       'title', '🎉 New Booking!',
  --       'body', customer_name || ' booked for ' || event_date_formatted,
  --       'tag', 'booking-' || NEW.booking_number,
  --       'url', '/admin/bookings?search=' || NEW.booking_number,
  --       'type', 'new_booking',
  --       'requireInteraction', true
  --     )
  --   )
  -- );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new bookings
DROP TRIGGER IF EXISTS on_new_booking_notify ON bookings;
CREATE TRIGGER on_new_booking_notify
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT ON notification_log TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions for admin users';
COMMENT ON TABLE notification_log IS 'Log of sent notifications for debugging and analytics';
COMMENT ON FUNCTION notify_new_booking() IS 'Trigger function to send push notification on new booking';
