-- =============================================================================
-- NOTIFICATION ENHANCEMENT MIGRATION
-- 20241223_add_notification_fields.sql
-- Adds viewed_at and snoozed_until for nudge notification UX
-- =============================================================================

-- Add viewed tracking
ALTER TABLE attention_items ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- Add snooze functionality  
ALTER TABLE attention_items ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

-- Index for finding unviewed items quickly
CREATE INDEX IF NOT EXISTS idx_attention_items_unviewed 
  ON attention_items (viewed_at) 
  WHERE status = 'pending' AND viewed_at IS NULL;

-- Index for finding snoozed items ready to show again
CREATE INDEX IF NOT EXISTS idx_attention_items_snoozed
  ON attention_items (snoozed_until)
  WHERE status = 'pending' AND snoozed_until IS NOT NULL;

-- =============================================================================
-- FUNCTION: Get pending notifications for admin
-- Returns items that are pending, not snoozed (or snooze expired)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_pending_notifications(
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  attention_type attention_type,
  priority attention_priority,
  status attention_status,
  title text,
  description text,
  suggested_actions jsonb,
  created_at timestamptz,
  viewed_at timestamptz,
  snoozed_until timestamptz,
  booking_number text,
  customer_name text,
  customer_phone text,
  product_name text,
  event_date date,
  balance_due numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.booking_id,
    ai.attention_type,
    ai.priority,
    ai.status,
    ai.title,
    ai.description,
    ai.suggested_actions,
    ai.created_at,
    ai.viewed_at,
    ai.snoozed_until,
    b.booking_number,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.phone AS customer_phone,
    (b.product_snapshot->>'name')::text AS product_name,
    b.event_date,
    b.balance_due
  FROM attention_items ai
  JOIN bookings b ON b.id = ai.booking_id
  JOIN customers c ON c.id = b.customer_id
  WHERE ai.status = 'pending'
    AND (ai.snoozed_until IS NULL OR ai.snoozed_until <= now())
  ORDER BY 
    ai.priority DESC,
    ai.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Get notification counts by priority
-- =============================================================================

CREATE OR REPLACE FUNCTION get_notification_counts()
RETURNS TABLE (
  total bigint,
  unviewed bigint,
  urgent bigint,
  high bigint,
  medium bigint,
  low bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE viewed_at IS NULL)::bigint AS unviewed,
    COUNT(*) FILTER (WHERE priority = 'urgent')::bigint AS urgent,
    COUNT(*) FILTER (WHERE priority = 'high')::bigint AS high,
    COUNT(*) FILTER (WHERE priority = 'medium')::bigint AS medium,
    COUNT(*) FILTER (WHERE priority = 'low')::bigint AS low
  FROM attention_items
  WHERE status = 'pending'
    AND (snoozed_until IS NULL OR snoozed_until <= now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Mark notification as viewed
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_notification_viewed(p_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE attention_items
  SET viewed_at = now()
  WHERE id = p_id AND viewed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Snooze a notification
-- =============================================================================

CREATE OR REPLACE FUNCTION snooze_notification(
  p_id uuid,
  p_duration interval DEFAULT '1 hour'
)
RETURNS timestamptz AS $$
DECLARE
  snooze_time timestamptz;
BEGIN
  snooze_time := now() + p_duration;
  
  UPDATE attention_items
  SET snoozed_until = snooze_time
  WHERE id = p_id;
  
  RETURN snooze_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_pending_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_counts TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_viewed TO authenticated;
GRANT EXECUTE ON FUNCTION snooze_notification TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON COLUMN attention_items.viewed_at IS 'When admin first viewed this notification';
COMMENT ON COLUMN attention_items.snoozed_until IS 'Hide notification until this time';
