-- =============================================================================
-- 📊 SCHEDULING SYSTEM DIAGNOSTIC REPORT
-- =============================================================================
-- Run this to get a full picture of the current scheduling state
-- Useful for debugging booking conflicts and understanding system behavior
-- =============================================================================


-- =============================================================================
-- 1. PRODUCT CONFIGURATION
-- =============================================================================

SELECT '================================' as section;
SELECT '📦 PRODUCT CONFIGURATION' as title;
SELECT '================================' as section;

SELECT 
  p.name,
  p.slug,
  p.scheduling_mode,
  p.complexity_tier,
  p.breakdown_duration_minutes as "Breakdown (min)",
  p.teardown_minutes as "Teardown (min)",
  p.setup_minutes as "Setup (min)",
  p.travel_buffer_minutes as "Travel (min)",
  (COALESCE(p.breakdown_duration_minutes, p.teardown_minutes, 45) + COALESCE(p.travel_buffer_minutes, 30)) as "Total Pickup Window (min)",
  COUNT(u.id) as "Unit Count"
FROM products p
LEFT JOIN units u ON u.product_id = p.id AND u.status = 'available'
WHERE p.is_active = true
GROUP BY p.id
ORDER BY p.complexity_tier DESC NULLS LAST, p.name;


-- =============================================================================
-- 2. OPS RESOURCES (Delivery Crews)
-- =============================================================================

SELECT '================================' as section;
SELECT '👥 DELIVERY CREWS' as title;
SELECT '================================' as section;

SELECT 
  name,
  resource_type,
  is_active,
  created_at::DATE as "Added"
FROM ops_resources
WHERE resource_type = 'delivery_crew'
ORDER BY name;


-- =============================================================================
-- 3. ACTIVE SOFT HOLDS (Checkout in Progress)
-- =============================================================================

SELECT '================================' as section;
SELECT '🔒 ACTIVE SOFT HOLDS' as title;
SELECT '================================' as section;

SELECT 
  sh.session_id,
  p.name as product_name,
  sh.service_start AT TIME ZONE 'America/New_York' as "Service Start (ET)",
  sh.service_end AT TIME ZONE 'America/New_York' as "Service End (ET)",
  sh.pickup_leg_start AT TIME ZONE 'America/New_York' as "Pickup Start (ET)",
  sh.pickup_leg_end AT TIME ZONE 'America/New_York' as "Pickup End (ET)",
  sh.expires_at AT TIME ZONE 'America/New_York' as "Expires (ET)",
  CASE 
    WHEN sh.expires_at > NOW() THEN '🟢 Active'
    ELSE '🔴 Expired'
  END as status,
  ROUND(EXTRACT(EPOCH FROM (sh.expires_at - NOW()))/60) as "Mins Until Expiry"
FROM booking_soft_holds sh
JOIN units u ON u.id = sh.unit_id
JOIN products p ON p.id = u.product_id
ORDER BY sh.expires_at DESC;

-- Count summary
SELECT 
  COUNT(*) FILTER (WHERE expires_at > NOW()) as "Active Holds",
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as "Expired (pending cleanup)"
FROM booking_soft_holds;


-- =============================================================================
-- 4. UPCOMING BOOKINGS (Next 14 Days)
-- =============================================================================

SELECT '================================' as section;
SELECT '📅 UPCOMING BOOKINGS (14 days)' as title;
SELECT '================================' as section;

SELECT 
  b.booking_number,
  b.status,
  (b.product_snapshot->>'name')::TEXT as product,
  b.event_date,
  b.delivery_date,
  b.pickup_date,
  b.delivery_window,
  b.pickup_window,
  c.first_name || ' ' || COALESCE(c.last_name, '') as customer
FROM bookings b
JOIN customers c ON c.id = b.customer_id
WHERE b.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
  AND b.status NOT IN ('cancelled')
ORDER BY b.event_date, b.delivery_window;


-- =============================================================================
-- 5. BOOKING BLOCKS (Resource Reservations)
-- =============================================================================

SELECT '================================' as section;
SELECT '🧱 BOOKING BLOCKS (Next 14 Days)' as title;
SELECT '================================' as section;

SELECT 
  bb.block_type,
  bb.resource_type,
  b.booking_number,
  (b.product_snapshot->>'name')::TEXT as product,
  bb.start_ts AT TIME ZONE 'America/New_York' as "Start (ET)",
  bb.end_ts AT TIME ZONE 'America/New_York' as "End (ET)",
  ROUND(EXTRACT(EPOCH FROM (bb.end_ts - bb.start_ts))/60) as "Duration (min)"
FROM booking_blocks bb
JOIN bookings b ON b.id = bb.booking_id
WHERE bb.start_ts::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
  AND b.status NOT IN ('cancelled', 'pending')
ORDER BY bb.start_ts, bb.block_type;


-- =============================================================================
-- 6. POTENTIAL CONFLICTS DETECTION
-- =============================================================================

SELECT '================================' as section;
SELECT '⚠️ POTENTIAL CONFLICTS (Same Day)' as title;
SELECT '================================' as section;

-- Find bookings on same day that might have crew conflicts
WITH daily_bookings AS (
  SELECT 
    b.id,
    b.booking_number,
    b.event_date,
    (b.product_snapshot->>'name')::TEXT as product,
    p.breakdown_duration_minutes,
    b.pickup_window,
    b.status
  FROM bookings b
  JOIN units u ON u.id = b.unit_id
  JOIN products p ON p.id = u.product_id
  WHERE b.event_date >= CURRENT_DATE
    AND b.status NOT IN ('cancelled')
)
SELECT 
  d1.event_date,
  d1.booking_number as "Booking 1",
  d1.product as "Product 1",
  d1.pickup_window as "Pickup 1",
  d1.breakdown_duration_minutes as "Breakdown 1 (min)",
  d2.booking_number as "Booking 2",
  d2.product as "Product 2",
  d2.pickup_window as "Pickup 2",
  d2.breakdown_duration_minutes as "Breakdown 2 (min)",
  '⚠️ Review' as action
FROM daily_bookings d1
JOIN daily_bookings d2 ON d1.event_date = d2.event_date AND d1.id < d2.id
WHERE (d1.pickup_window = 'evening' OR d2.pickup_window = 'evening')
  AND (d1.breakdown_duration_minutes >= 90 OR d2.breakdown_duration_minutes >= 90)
ORDER BY d1.event_date;


-- =============================================================================
-- 7. SYSTEM HEALTH CHECK
-- =============================================================================

SELECT '================================' as section;
SELECT '💚 SYSTEM HEALTH CHECK' as title;
SELECT '================================' as section;

SELECT 
  'Products with breakdown times' as check_item,
  COUNT(*) FILTER (WHERE breakdown_duration_minutes IS NOT NULL) as configured,
  COUNT(*) FILTER (WHERE breakdown_duration_minutes IS NULL) as unconfigured,
  CASE 
    WHEN COUNT(*) FILTER (WHERE breakdown_duration_minutes IS NULL) = 0 
    THEN '✅ All configured'
    ELSE '⚠️ ' || COUNT(*) FILTER (WHERE breakdown_duration_minutes IS NULL) || ' products missing breakdown times'
  END as status
FROM products
WHERE is_active = true;

SELECT 
  'Active delivery crews' as check_item,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ At least 1 crew'
    ELSE '❌ No active crews!'
  END as status
FROM ops_resources
WHERE resource_type = 'delivery_crew' AND is_active = true;

SELECT 
  'Party House breakdown time' as check_item,
  breakdown_duration_minutes as value,
  CASE 
    WHEN breakdown_duration_minutes = 120 THEN '✅ Correct (120 min)'
    WHEN breakdown_duration_minutes IS NULL THEN '❌ NOT SET!'
    ELSE '⚠️ Unexpected: ' || breakdown_duration_minutes || ' min'
  END as status
FROM products
WHERE slug = 'blackout-party-house' OR name ILIKE '%party house%'
LIMIT 1;


SELECT '================================' as section;
SELECT '✅ DIAGNOSTIC COMPLETE' as title;
SELECT '================================' as section;
