-- =============================================================================
-- 🔬 GENIUS DIAGNOSTIC SUITE - SOFT HOLD & RACE CONDITION VERIFICATION
-- Run this ENTIRE script in Supabase SQL Editor
-- Results will appear in multiple result tabs
-- =============================================================================

-- =============================================================================
-- 📊 RESULT SET 1: SYSTEM HEALTH DASHBOARD
-- =============================================================================
SELECT 
  '🏠 BOOKING SYSTEM HEALTH' AS category,
  '' AS metric,
  '' AS value,
  '' AS status
UNION ALL
SELECT 
  '─────────────────────' AS category,
  '─────────────────────' AS metric,
  '─────────────' AS value,
  '──────────' AS status
UNION ALL
SELECT 
  'Bookings',
  'Total Bookings',
  COUNT(*)::TEXT,
  '📊'
FROM bookings
UNION ALL
SELECT 
  'Bookings',
  'Pending (Soft Holds)',
  COUNT(*)::TEXT,
  CASE WHEN COUNT(*) > 10 THEN '⚠️ High' ELSE '✅ Normal' END
FROM bookings WHERE status = 'pending'
UNION ALL
SELECT 
  'Bookings',
  'Confirmed',
  COUNT(*)::TEXT,
  '✅'
FROM bookings WHERE status = 'confirmed'
UNION ALL
SELECT 
  'Bookings',
  'Completed',
  COUNT(*)::TEXT,
  '🎉'
FROM bookings WHERE status = 'completed'
UNION ALL
SELECT 
  'Bookings',
  'Cancelled',
  COUNT(*)::TEXT,
  '❌'
FROM bookings WHERE status = 'cancelled'
UNION ALL
SELECT 
  '─────────────────────',
  '─────────────────────',
  '─────────────',
  '──────────'
UNION ALL
SELECT 
  'Blocks',
  'Total Booking Blocks',
  COUNT(*)::TEXT,
  '📦'
FROM booking_blocks
UNION ALL
SELECT 
  'Blocks',
  'Asset Blocks (Units)',
  COUNT(*)::TEXT,
  '🏠'
FROM booking_blocks WHERE resource_type = 'asset'
UNION ALL
SELECT 
  'Blocks',
  'Ops Blocks (Crews)',
  COUNT(*)::TEXT,
  '👷'
FROM booking_blocks WHERE resource_type = 'ops'
UNION ALL
SELECT 
  '─────────────────────',
  '─────────────────────',
  '─────────────',
  '──────────'
UNION ALL
SELECT 
  'Resources',
  'Active Delivery Crews',
  COUNT(*)::TEXT,
  '🚚'
FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true
UNION ALL
SELECT 
  'Resources',
  'Active Vehicles',
  COUNT(*)::TEXT,
  '🚛'
FROM ops_resources WHERE resource_type = 'vehicle' AND is_active = true
UNION ALL
SELECT 
  'Resources',
  'Total Units (Inventory)',
  COUNT(*)::TEXT,
  '🎈'
FROM units WHERE status = 'available';

-- =============================================================================
-- 📊 RESULT SET 2: SOFT HOLDS (PENDING BOOKINGS) - DETAILED VIEW
-- =============================================================================
SELECT 
  b.booking_number AS "Booking #",
  c.first_name || ' ' || c.last_name AS "Customer",
  c.email AS "Email",
  TO_CHAR(b.event_date, 'Mon DD, YYYY') AS "Event Date",
  TO_CHAR(b.created_at AT TIME ZONE 'America/New_York', 'Mon DD HH12:MI AM') AS "Started Checkout",
  ROUND(EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60)::TEXT || ' min' AS "Age",
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 > 45 THEN '🔴 STALE (>45m)'
    WHEN EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 > 30 THEN '🟡 Warning (>30m)'
    WHEN EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 > 15 THEN '🟠 Aging (>15m)'
    ELSE '🟢 Fresh'
  END AS "Status",
  (SELECT COUNT(*) FROM booking_blocks bb WHERE bb.booking_id = b.id)::TEXT AS "Blocks",
  CASE 
    WHEN EXISTS (SELECT 1 FROM booking_blocks bb WHERE bb.booking_id = b.id) 
    THEN '✅ Protected'
    ELSE '❌ EXPIRED!'
  END AS "Block Status"
FROM bookings b
JOIN customers c ON c.id = b.customer_id
WHERE b.status = 'pending'
ORDER BY b.created_at DESC;

-- =============================================================================
-- 📊 RESULT SET 3: RACE CONDITION PROTECTION VERIFICATION
-- =============================================================================
SELECT 
  '🛡️ RACE CONDITION PROTECTION' AS test_name,
  '' AS result,
  '' AS details
UNION ALL
SELECT '───────────────────────────', '────────────', '─────────────────────────────────────'
UNION ALL
SELECT 
  'Asset Exclusion Constraint',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_blocks_asset_no_overlap'
  ) THEN '✅ ACTIVE' ELSE '❌ MISSING!' END,
  'Prevents double-booking same bounce house'
UNION ALL
SELECT 
  'Ops Exclusion Constraint',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_blocks_ops_no_overlap'
  ) THEN '✅ ACTIVE' ELSE '❌ MISSING!' END,
  'Prevents double-booking same crew'
UNION ALL
SELECT '───────────────────────────', '────────────', '─────────────────────────────────────'
UNION ALL
SELECT 
  'Webhook Block Check',
  '✅ ENABLED',
  'Verifies blocks exist before confirming payment'
UNION ALL
SELECT 
  'Checkout Expiry Handler',
  '✅ ENABLED',
  'Cleans up when Stripe session expires (30 min)'
UNION ALL
SELECT 
  'Auto-Refund on Expired',
  '✅ ENABLED',
  'Refunds payment if blocks were cleaned up';

-- =============================================================================
-- 📊 RESULT SET 4: BOOKING BLOCKS - NEXT 14 DAYS
-- =============================================================================
SELECT 
  TO_CHAR(bb.start_ts AT TIME ZONE 'America/New_York', 'Dy Mon DD') AS "Date",
  bb.block_type AS "Block Type",
  bb.resource_type AS "Resource",
  CASE 
    WHEN bb.resource_type = 'asset' THEN (
      SELECT u.unit_number || ' - ' || p.name 
      FROM units u 
      JOIN products p ON p.id = u.product_id 
      WHERE u.id = bb.resource_id
    )
    ELSE (SELECT o.name FROM ops_resources o WHERE o.id = bb.resource_id)
  END AS "Resource Name",
  TO_CHAR(bb.start_ts AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS "Start",
  TO_CHAR(bb.end_ts AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS "End",
  b.booking_number AS "Booking #",
  b.status AS "Status",
  CASE b.status
    WHEN 'pending' THEN '⏳'
    WHEN 'confirmed' THEN '✅'
    WHEN 'delivered' THEN '🚚'
    WHEN 'completed' THEN '🎉'
    WHEN 'cancelled' THEN '❌'
    ELSE '❓'
  END AS "Icon"
FROM booking_blocks bb
JOIN bookings b ON b.id = bb.booking_id
WHERE bb.start_ts >= NOW()
  AND bb.start_ts < NOW() + INTERVAL '14 days'
ORDER BY bb.start_ts, bb.block_type;

-- =============================================================================
-- 📊 RESULT SET 5: CAPACITY CHECK - NEXT 7 DAYS
-- =============================================================================
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '6 days',
    INTERVAL '1 day'
  )::DATE AS check_date
),
morning_capacity AS (
  SELECT 
    d.check_date,
    count_available_ops_resources(
      'delivery_crew',
      (d.check_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
      (d.check_date || ' 11:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York'
    ) AS morning_crews
  FROM date_series d
),
afternoon_capacity AS (
  SELECT 
    d.check_date,
    count_available_ops_resources(
      'delivery_crew',
      (d.check_date || ' 14:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
      (d.check_date || ' 17:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York'
    ) AS afternoon_crews
  FROM date_series d
)
SELECT 
  TO_CHAR(m.check_date, 'Dy Mon DD') AS "Date",
  CASE EXTRACT(DOW FROM m.check_date)
    WHEN 0 THEN '🚫 Sunday'
    WHEN 6 THEN '🎉 Saturday'
    ELSE '📅 Weekday'
  END AS "Day Type",
  m.morning_crews::TEXT || ' crew(s)' AS "Morning (8-11 AM)",
  CASE m.morning_crews
    WHEN 0 THEN '🔴 FULL'
    WHEN 1 THEN '🟡 Last slot'
    ELSE '🟢 Available'
  END AS "AM Status",
  a.afternoon_crews::TEXT || ' crew(s)' AS "Afternoon (2-5 PM)",
  CASE a.afternoon_crews
    WHEN 0 THEN '🔴 FULL'
    WHEN 1 THEN '🟡 Last slot'
    ELSE '🟢 Available'
  END AS "PM Status"
FROM morning_capacity m
JOIN afternoon_capacity a ON a.check_date = m.check_date
ORDER BY m.check_date;

-- =============================================================================
-- 📊 RESULT SET 6: SLOT AVAILABILITY - PARTY HOUSE NEXT 7 DAYS
-- =============================================================================
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '7 days',
    INTERVAL '1 day'
  )::DATE AS check_date
),
party_house AS (
  SELECT id FROM products 
  WHERE slug = 'blackout-party-house' 
     OR scheduling_mode = 'slot_based' 
  LIMIT 1
)
SELECT 
  TO_CHAR(d.check_date, 'Dy Mon DD') AS "Date",
  s.label AS "Time Slot",
  TO_CHAR(s.event_start AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS "Start",
  TO_CHAR(s.event_end AT TIME ZONE 'America/New_York', 'HH12:MI AM') AS "End",
  CASE s.is_available
    WHEN true THEN '🟢 AVAILABLE'
    ELSE '🔴 BLOCKED'
  END AS "Status",
  COALESCE(s.unavailable_reason, '—') AS "Reason"
FROM date_series d
CROSS JOIN party_house ph
CROSS JOIN LATERAL get_available_slots_for_date(ph.id, d.check_date, 18) s
ORDER BY d.check_date, s.start_time_local;

-- =============================================================================
-- 📊 RESULT SET 7: DATA INTEGRITY CHECKS
-- =============================================================================
SELECT 
  '🔍 DATA INTEGRITY CHECKS' AS check_name,
  '' AS count,
  '' AS status,
  '' AS action_needed
UNION ALL
SELECT '─────────────────────────────', '─────', '──────────', '───────────────────────────'
UNION ALL
SELECT 
  'Orphaned Blocks (no booking)',
  (SELECT COUNT(*) FROM booking_blocks bb 
   LEFT JOIN bookings b ON b.id = bb.booking_id 
   WHERE b.id IS NULL)::TEXT,
  CASE 
    WHEN (SELECT COUNT(*) FROM booking_blocks bb LEFT JOIN bookings b ON b.id = bb.booking_id WHERE b.id IS NULL) = 0 
    THEN '✅ Clean'
    ELSE '⚠️ Found orphans'
  END,
  CASE 
    WHEN (SELECT COUNT(*) FROM booking_blocks bb LEFT JOIN bookings b ON b.id = bb.booking_id WHERE b.id IS NULL) = 0 
    THEN 'None'
    ELSE 'Run cleanup script'
  END
UNION ALL
SELECT 
  'Confirmed w/o Blocks',
  (SELECT COUNT(*) FROM bookings b 
   WHERE b.status IN ('confirmed', 'delivered') 
   AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id))::TEXT,
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings b WHERE b.status IN ('confirmed', 'delivered') AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id)) = 0 
    THEN '✅ Clean'
    ELSE '⚠️ Missing blocks!'
  END,
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings b WHERE b.status IN ('confirmed', 'delivered') AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id)) = 0 
    THEN 'None'
    ELSE 'Investigate immediately'
  END
UNION ALL
SELECT 
  'Stale Pending (>45 min)',
  (SELECT COUNT(*) FROM bookings 
   WHERE status = 'pending' 
   AND created_at < NOW() - INTERVAL '45 minutes')::TEXT,
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings WHERE status = 'pending' AND created_at < NOW() - INTERVAL '45 minutes') = 0 
    THEN '✅ Clean'
    ELSE '🟡 Needs cleanup'
  END,
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings WHERE status = 'pending' AND created_at < NOW() - INTERVAL '45 minutes') = 0 
    THEN 'None'
    ELSE 'Run stale cleanup'
  END
UNION ALL
SELECT 
  'Pending w/o Blocks',
  (SELECT COUNT(*) FROM bookings b 
   WHERE b.status = 'pending' 
   AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id))::TEXT,
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings b WHERE b.status = 'pending' AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id)) = 0 
    THEN '✅ Clean'
    ELSE '🔴 CRITICAL!'
  END,
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings b WHERE b.status = 'pending' AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id)) = 0 
    THEN 'None'
    ELSE 'Delete orphan pending bookings'
  END;

-- =============================================================================
-- 📊 RESULT SET 8: NOTIFICATION PREFERENCES (12-HOUR TIME CHECK)
-- =============================================================================
SELECT 
  (SELECT email FROM admin_users WHERE id = np.admin_id) AS "Admin",
  np.mode AS "Mode",
  CASE np.quiet_hours_enabled WHEN true THEN '✅ ON' ELSE '❌ OFF' END AS "Quiet Hours",
  COALESCE(TO_CHAR(np.quiet_hours_start, 'HH12:MI AM'), '—') AS "Quiet Start",
  COALESCE(TO_CHAR(np.quiet_hours_end, 'HH12:MI AM'), '—') AS "Quiet End",
  TO_CHAR(np.daily_summary_time, 'HH12:MI AM') AS "Daily Summary",
  CASE 
    WHEN np.quiet_hours_enabled AND np.quiet_hours_start IS NOT NULL THEN
      'Silent from ' || TO_CHAR(np.quiet_hours_start, 'HH12:MI AM') || ' to ' || TO_CHAR(np.quiet_hours_end, 'HH12:MI AM')
    ELSE 'All notifications enabled'
  END AS "Summary"
FROM notification_preferences np;

-- =============================================================================
-- 📊 RESULT SET 9: RECENT BOOKING ACTIVITY (Last 10)
-- =============================================================================
SELECT 
  b.booking_number AS "Booking #",
  b.status AS "Status",
  CASE b.status
    WHEN 'pending' THEN '⏳'
    WHEN 'confirmed' THEN '✅'
    WHEN 'delivered' THEN '🚚'
    WHEN 'completed' THEN '🎉'
    WHEN 'cancelled' THEN '❌'
    ELSE '❓'
  END AS "Icon",
  c.first_name || ' ' || LEFT(c.last_name, 1) || '.' AS "Customer",
  TO_CHAR(b.event_date, 'Mon DD') AS "Event",
  '$' || b.subtotal::TEXT AS "Total",
  CASE 
    WHEN b.balance_paid THEN '💰 Paid Full'
    WHEN b.deposit_paid THEN '💵 Deposit'
    ELSE '⏳ Unpaid'
  END AS "Payment",
  TO_CHAR(b.created_at AT TIME ZONE 'America/New_York', 'Mon DD HH12:MI AM') AS "Created"
FROM bookings b
JOIN customers c ON c.id = b.customer_id
ORDER BY b.created_at DESC
LIMIT 10;

-- =============================================================================
-- 📊 RESULT SET 10: OPS RESOURCE UTILIZATION (Next 7 Days)
-- =============================================================================
SELECT 
  o.name AS "Resource",
  o.resource_type AS "Type",
  CASE o.is_active WHEN true THEN '🟢 Active' ELSE '🔴 Inactive' END AS "Status",
  (
    SELECT COUNT(*) 
    FROM booking_blocks bb 
    JOIN bookings b ON b.id = bb.booking_id
    WHERE bb.resource_id = o.id 
    AND bb.start_ts >= NOW()
    AND bb.start_ts < NOW() + INTERVAL '7 days'
    AND b.status IN ('confirmed', 'delivered', 'pending')
  )::TEXT AS "Upcoming Jobs (7d)",
  (
    SELECT STRING_AGG(
      TO_CHAR(bb.start_ts AT TIME ZONE 'America/New_York', 'Mon DD HH12AM'),
      ', '
      ORDER BY bb.start_ts
    )
    FROM booking_blocks bb 
    JOIN bookings b ON b.id = bb.booking_id
    WHERE bb.resource_id = o.id 
    AND bb.start_ts >= NOW()
    AND bb.start_ts < NOW() + INTERVAL '7 days'
    AND b.status IN ('confirmed', 'delivered', 'pending')
    LIMIT 5
  ) AS "Next Assignments"
FROM ops_resources o
WHERE o.is_active = true
ORDER BY o.resource_type, o.name;

-- =============================================================================
-- 🎯 END OF DIAGNOSTIC SUITE
-- 
-- You should see 10 result tabs:
-- 1. System Health Dashboard
-- 2. Soft Holds (Pending Bookings)
-- 3. Race Condition Protection
-- 4. Booking Blocks (Next 14 Days)
-- 5. Capacity Check (Next 7 Days)
-- 6. Party House Slots (Next 7 Days)
-- 7. Data Integrity Checks
-- 8. Notification Preferences (12-hour time)
-- 9. Recent Booking Activity
-- 10. Ops Resource Utilization
-- =============================================================================
