-- =============================================================================
-- 🧪 RESOURCE SCHEDULING TEST SUITE v1.0
-- =============================================================================
-- Run each section in Supabase SQL Editor to validate scheduling logic
-- 
-- WHAT WE'RE TESTING:
-- 1. Party House 120-min breakdown correctly calculated
-- 2. Crew conflicts detected across product types
-- 3. Soft holds prevent race conditions
-- 4. Availability function returns correct results
-- =============================================================================


-- =============================================================================
-- 📊 SECTION 1: VERIFY CONFIGURATION
-- =============================================================================

SELECT '========================================' as divider;
SELECT '📊 SECTION 1: PRODUCT CONFIGURATION' as section;
SELECT '========================================' as divider;

-- Show all products with their breakdown times
SELECT 
  name,
  slug,
  complexity_tier,
  breakdown_duration_minutes as "Breakdown (min)",
  travel_buffer_minutes as "Travel (min)",
  (COALESCE(breakdown_duration_minutes, 45) + COALESCE(travel_buffer_minutes, 30)) as "Total Pickup Window (min)"
FROM products
WHERE is_active = true
ORDER BY breakdown_duration_minutes DESC NULLS LAST;

-- ✅ EXPECTED OUTPUT:
-- | name                  | Breakdown | Travel | Total Pickup Window |
-- |-----------------------|-----------|--------|---------------------|
-- | Blackout Party House  | 120       | 30     | 150                 |
-- | Glitch Combo          | 60        | 30     | 90                  |


-- =============================================================================
-- 📊 SECTION 2: CHECK OPS RESOURCES (Crews)
-- =============================================================================

SELECT '========================================' as divider;
SELECT '📊 SECTION 2: DELIVERY CREWS' as section;
SELECT '========================================' as divider;

SELECT 
  id,
  name,
  resource_type,
  is_active
FROM ops_resources
WHERE resource_type = 'delivery_crew'
ORDER BY name;

-- ✅ EXPECTED: At least 1 active delivery_crew


-- =============================================================================
-- 🧪 SECTION 3: TEST AVAILABILITY FUNCTION
-- =============================================================================

SELECT '========================================' as divider;
SELECT '🧪 SECTION 3: AVAILABILITY CHECK TEST' as section;
SELECT '========================================' as divider;

-- Test Party House availability for a date 14 days from now
-- Should return is_available = true with all resources assigned

SELECT 
  'Party House - Future Date' as test_case,
  is_available,
  COALESCE(unavailable_reason, 'None') as reason,
  CASE WHEN unit_id IS NOT NULL THEN '✅ Assigned' ELSE '❌ Missing' END as unit_status,
  CASE WHEN delivery_crew_id IS NOT NULL THEN '✅ Assigned' ELSE '❌ Missing' END as delivery_crew_status,
  CASE WHEN pickup_crew_id IS NOT NULL THEN '✅ Assigned' ELSE '❌ Missing' END as pickup_crew_status,
  pickup_leg_start::TIME as pickup_starts,
  pickup_leg_end::TIME as pickup_ends,
  EXTRACT(EPOCH FROM (pickup_leg_end - pickup_leg_start))/60 as "pickup_duration_mins"
FROM check_availability_with_soft_holds(
  (SELECT id FROM products WHERE slug = 'blackout-party-house' LIMIT 1),
  (CURRENT_DATE + 14)::DATE,  -- delivery date
  (CURRENT_DATE + 14)::DATE,  -- pickup date
  'afternoon',                 -- delivery window
  'evening',                   -- pickup window
  18,                          -- lead time hours
  'TEST-CHECK-001'             -- session id
);

-- ✅ EXPECTED:
-- - is_available = true
-- - pickup_duration_mins ≈ 150 (120 breakdown + 30 travel)


-- =============================================================================
-- 🧪 SECTION 4: TEST SOFT HOLD CREATION
-- =============================================================================

SELECT '========================================' as divider;
SELECT '🧪 SECTION 4: SOFT HOLD CREATION TEST' as section;
SELECT '========================================' as divider;

-- First, get availability result
WITH avail AS (
  SELECT *
  FROM check_availability_with_soft_holds(
    (SELECT id FROM products WHERE slug = 'blackout-party-house' LIMIT 1),
    (CURRENT_DATE + 14)::DATE,
    (CURRENT_DATE + 14)::DATE,
    'afternoon',
    'evening',
    18,
    'TEST-HOLD-001'
  )
)
-- Create soft hold using result
SELECT create_soft_hold(
  'TEST-HOLD-001',
  avail.unit_id,
  avail.delivery_crew_id,
  avail.pickup_crew_id,
  avail.service_start,
  avail.service_end,
  avail.delivery_leg_start,
  avail.delivery_leg_end,
  avail.pickup_leg_start,
  avail.pickup_leg_end
) as soft_hold_id
FROM avail
WHERE avail.is_available = true;

-- Verify soft hold was created
SELECT 
  session_id,
  unit_id IS NOT NULL as has_unit,
  delivery_crew_id IS NOT NULL as has_delivery_crew,
  pickup_crew_id IS NOT NULL as has_pickup_crew,
  pickup_leg_start::TIME as pickup_start,
  pickup_leg_end::TIME as pickup_end,
  expires_at,
  (expires_at > NOW()) as is_active
FROM booking_soft_holds
WHERE session_id = 'TEST-HOLD-001';

-- ✅ EXPECTED: 1 row with is_active = true


-- =============================================================================
-- 🧪 SECTION 5: TEST SOFT HOLD BLOCKS CONCURRENT BOOKING
-- =============================================================================

SELECT '========================================' as divider;
SELECT '🧪 SECTION 5: SOFT HOLD BLOCKING TEST' as section;
SELECT '========================================' as divider;

-- Try to book the SAME slot from a different session
-- Should be blocked because TEST-HOLD-001 has a soft hold

SELECT 
  'Concurrent Booking Attempt' as test_case,
  is_available,
  unavailable_reason,
  CASE 
    WHEN is_available = false THEN '✅ BLOCKED (correct)'
    ELSE '❌ ALLOWED (should be blocked!)'
  END as result
FROM check_availability_with_soft_holds(
  (SELECT id FROM products WHERE slug = 'blackout-party-house' LIMIT 1),
  (CURRENT_DATE + 14)::DATE,
  (CURRENT_DATE + 14)::DATE,
  'afternoon',
  'evening',
  18,
  'TEST-CONCURRENT-002'  -- Different session ID
);

-- ✅ EXPECTED: is_available = false (blocked by TEST-HOLD-001's soft hold)


-- =============================================================================
-- 🧪 SECTION 6: TEST SAME SESSION CAN STILL ACCESS ITS HOLD
-- =============================================================================

SELECT '========================================' as divider;
SELECT '🧪 SECTION 6: SAME SESSION ACCESS TEST' as section;
SELECT '========================================' as divider;

-- Original session should still see availability (excludes own holds)
SELECT 
  'Original Session Re-check' as test_case,
  is_available,
  unavailable_reason,
  CASE 
    WHEN is_available = true THEN '✅ CAN ACCESS (correct)'
    ELSE '❌ BLOCKED (should be able to access own hold!)'
  END as result
FROM check_availability_with_soft_holds(
  (SELECT id FROM products WHERE slug = 'blackout-party-house' LIMIT 1),
  (CURRENT_DATE + 14)::DATE,
  (CURRENT_DATE + 14)::DATE,
  'afternoon',
  'evening',
  18,
  'TEST-HOLD-001'  -- Same session as the hold
);

-- ✅ EXPECTED: is_available = true (own session excluded)


-- =============================================================================
-- 🧪 SECTION 7: TEST PICKUP WINDOW CALCULATION
-- =============================================================================

SELECT '========================================' as divider;
SELECT '🧪 SECTION 7: PICKUP WINDOW CALCULATION TEST' as section;
SELECT '========================================' as divider;

-- Party House should have pickup window of 150 minutes (120 breakdown + 30 travel)
-- Starting at 6 PM = ending at 8:30 PM

SELECT
  p.name,
  p.breakdown_duration_minutes,
  p.travel_buffer_minutes,
  (p.breakdown_duration_minutes + COALESCE(p.travel_buffer_minutes, 30)) as expected_pickup_mins,
  avail.pickup_leg_start AT TIME ZONE 'America/New_York' as pickup_start_et,
  avail.pickup_leg_end AT TIME ZONE 'America/New_York' as pickup_end_et,
  EXTRACT(EPOCH FROM (avail.pickup_leg_end - avail.pickup_leg_start))/60 as actual_pickup_mins,
  CASE 
    WHEN EXTRACT(EPOCH FROM (avail.pickup_leg_end - avail.pickup_leg_start))/60 = 
         (p.breakdown_duration_minutes + COALESCE(p.travel_buffer_minutes, 30))
    THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as validation
FROM products p
CROSS JOIN LATERAL check_availability_with_soft_holds(
  p.id,
  (CURRENT_DATE + 15)::DATE,  -- Use different date to avoid soft hold
  (CURRENT_DATE + 15)::DATE,
  'afternoon',
  'evening',
  18,
  'TEST-WINDOW-' || p.slug
) avail
WHERE p.slug IN ('blackout-party-house', 'glitch-combo')
  AND avail.is_available = true;

-- ✅ EXPECTED:
-- | name                 | expected | actual | validation |
-- |----------------------|----------|--------|------------|
-- | Blackout Party House | 150      | 150    | ✅ CORRECT  |
-- | Glitch Combo         | 90       | 90     | ✅ CORRECT  |


-- =============================================================================
-- 🧹 CLEANUP: Remove Test Soft Holds
-- =============================================================================

SELECT '========================================' as divider;
SELECT '🧹 CLEANUP' as section;
SELECT '========================================' as divider;

DELETE FROM booking_soft_holds WHERE session_id LIKE 'TEST-%';

SELECT 'Deleted ' || COUNT(*) || ' test soft holds' as cleanup_result
FROM booking_soft_holds 
WHERE session_id LIKE 'TEST-%';

-- Final count
SELECT 
  'Remaining soft holds: ' || COUNT(*) as status
FROM booking_soft_holds;


-- =============================================================================
-- 📋 TEST SUMMARY
-- =============================================================================

SELECT '========================================' as divider;
SELECT '📋 TEST SUMMARY' as section;
SELECT '========================================' as divider;

SELECT 'All tests completed! Review output above for ✅ or ❌ indicators.' as summary;
