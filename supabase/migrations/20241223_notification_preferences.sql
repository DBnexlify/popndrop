-- =============================================================================
-- NOTIFICATION PREFERENCES MIGRATION
-- 20241223_notification_preferences.sql
-- Stores admin notification preferences for controlling what alerts they receive
-- =============================================================================

-- =============================================================================
-- PART 1: NOTIFICATION MODE ENUM
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE notification_mode AS ENUM ('realtime', 'digest', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- PART 2: NOTIFICATION PREFERENCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE UNIQUE,
  
  -- Notification Mode
  mode notification_mode NOT NULL DEFAULT 'realtime',
  
  -- =========================================================================
  -- BOOKING EVENTS
  -- =========================================================================
  new_booking BOOLEAN NOT NULL DEFAULT true,
  booking_cancelled BOOLEAN NOT NULL DEFAULT true,
  booking_modified BOOLEAN NOT NULL DEFAULT true,
  
  -- =========================================================================
  -- PAYMENT EVENTS
  -- =========================================================================
  payment_deposit BOOLEAN NOT NULL DEFAULT true,
  payment_full BOOLEAN NOT NULL DEFAULT true,
  payment_failed BOOLEAN NOT NULL DEFAULT true,
  refund_requested BOOLEAN NOT NULL DEFAULT true,
  refund_completed BOOLEAN NOT NULL DEFAULT false,
  
  -- =========================================================================
  -- OPERATIONAL PROMPTS
  -- =========================================================================
  delivery_prompt BOOLEAN NOT NULL DEFAULT true,
  pickup_prompt BOOLEAN NOT NULL DEFAULT true,
  balance_reminder BOOLEAN NOT NULL DEFAULT true,
  auto_complete_notice BOOLEAN NOT NULL DEFAULT false,
  
  -- =========================================================================
  -- DAILY SUMMARY
  -- =========================================================================
  daily_summary BOOLEAN NOT NULL DEFAULT true,
  daily_summary_time TIME NOT NULL DEFAULT '07:00:00',
  
  -- =========================================================================
  -- QUIET HOURS (optional feature)
  -- =========================================================================
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  
  -- =========================================================================
  -- TIMESTAMPS
  -- =========================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by admin
CREATE INDEX IF NOT EXISTS idx_notification_preferences_admin 
  ON notification_preferences(admin_id);

-- =============================================================================
-- PART 3: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own preferences
CREATE POLICY "Admins manage own preferences" ON notification_preferences
  FOR ALL TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access to preferences" ON notification_preferences
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- PART 4: UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =============================================================================
-- PART 5: HELPER FUNCTION - GET PREFERENCES WITH DEFAULTS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_notification_preferences(p_admin_id UUID)
RETURNS notification_preferences AS $$
DECLARE
  prefs notification_preferences;
BEGIN
  SELECT * INTO prefs
  FROM notification_preferences
  WHERE admin_id = p_admin_id;
  
  -- If no preferences exist, return defaults (will be null, handle in app)
  RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 6: HELPER FUNCTION - SHOULD SEND NOTIFICATION
-- Checks if a specific notification type should be sent to an admin
-- =============================================================================

CREATE OR REPLACE FUNCTION should_send_notification(
  p_admin_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs notification_preferences;
  should_send BOOLEAN;
  current_time_et TIME;
BEGIN
  -- Get preferences (will be null if none exist)
  SELECT * INTO prefs
  FROM notification_preferences
  WHERE admin_id = p_admin_id;
  
  -- Default to true if no preferences set
  IF prefs IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check quiet hours first
  IF prefs.quiet_hours_enabled THEN
    current_time_et := (NOW() AT TIME ZONE 'America/New_York')::TIME;
    
    -- Handle overnight quiet hours (e.g., 22:00 to 07:00)
    IF prefs.quiet_hours_start > prefs.quiet_hours_end THEN
      IF current_time_et >= prefs.quiet_hours_start OR current_time_et < prefs.quiet_hours_end THEN
        -- Only allow urgent notifications during quiet hours
        IF p_notification_type NOT IN ('payment_failed', 'booking_cancelled') THEN
          RETURN false;
        END IF;
      END IF;
    ELSE
      -- Normal quiet hours (e.g., 14:00 to 15:00)
      IF current_time_et >= prefs.quiet_hours_start AND current_time_et < prefs.quiet_hours_end THEN
        IF p_notification_type NOT IN ('payment_failed', 'booking_cancelled') THEN
          RETURN false;
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Check mode
  IF prefs.mode = 'digest' THEN
    -- In digest mode, only send urgent notifications in real-time
    RETURN p_notification_type IN ('payment_failed', 'booking_cancelled');
  END IF;
  
  -- For realtime and custom modes, check the specific toggle
  should_send := CASE p_notification_type
    WHEN 'new_booking' THEN prefs.new_booking
    WHEN 'booking_cancelled' THEN prefs.booking_cancelled
    WHEN 'booking_modified' THEN prefs.booking_modified
    WHEN 'payment_deposit' THEN prefs.payment_deposit
    WHEN 'payment_full' THEN prefs.payment_full
    WHEN 'payment_failed' THEN prefs.payment_failed
    WHEN 'refund_requested' THEN prefs.refund_requested
    WHEN 'refund_completed' THEN prefs.refund_completed
    WHEN 'delivery_prompt' THEN prefs.delivery_prompt
    WHEN 'pickup_prompt' THEN prefs.pickup_prompt
    WHEN 'balance_reminder' THEN prefs.balance_reminder
    WHEN 'auto_complete_notice' THEN prefs.auto_complete_notice
    WHEN 'daily_summary' THEN prefs.daily_summary
    ELSE true -- Default to true for unknown types
  END;
  
  RETURN should_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 7: GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON TABLE notification_preferences IS 'Stores admin notification preferences for controlling push notification delivery';
COMMENT ON COLUMN notification_preferences.mode IS 'realtime=all enabled, digest=daily summary only, custom=pick individual toggles';
COMMENT ON FUNCTION should_send_notification IS 'Checks preferences, quiet hours, and mode to determine if a notification should be sent';
