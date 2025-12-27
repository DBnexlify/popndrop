-- =============================================================================
-- 🎯 CRITICAL SCENARIO TEST: Party House Blocks Overlapping Pickups
-- =============================================================================
-- 
-- THE BUG WE FIXED:
-- - Party House event 3-7 PM requires 120 min teardown
-- - Pickup leg should be 7:00 PM - 9:30 PM (120 + 30 travel)
-- - Bounce house pickup at 6-8 PM should be BLOCKED (crew conflict)
--
-- This test simulates that exact scenario.
-- =============================================================================


-- =============================================================================
-- STEP 1: Show current state
-- =============================================================================

SELECT '🔍 STEP 1: Current Configuration' as step;

SELECT 
  name,
  breakdown_duration_minutes as "Breakdown (min)",
  travel_buffer_minutes as "Travel (min)"
FROM products
WHERE slug IN ('blackout-party-house', 'glitch-combo');


-- =============================================================================
-- STEP 2: Create a Party House soft hold for afternoon slot
-- This simulates someone starting checkout for Party House 3-7 PM
-- =============================================================================

SELECT '📝 STEP 2: Create Party House Soft Hold (simulating checkout)' as step;

-- Clean up any previous test holds
DELETE FROM booking_soft_holds WHERE session_id LIKE 'CONFLICT-TEST-%';

-- Get availability for Party House (afternoon slot = 3-7 PM event)
WITH party_house_avail AS (
  SELECT *
  FROM check_availability_with_soft_holds(
    (SELECT id FROM products WHERE slug = 'blackout-party-house' LIMIT 1),
    (CURRENT_DATE + 21)::DATE,  -- Far enough in future
    (CURRENT_DATE + 21)::DATE,
    'afternoon',   -- 3-7 PM event
    'evening',     -- Pickup after event
    18,
    'CONFLICT-TEST-PARTYHOUSE'
  )
)
SELECT 
  'Party House (3-7 PM event)' as booking,
  is_available,
  pickup_leg_start AT TIME ZONE 'America/New_York' as "Pickup Starts (ET)",
  pickup_leg_end AT TIME ZONE 'America/New_York' as "Pickup Ends (ET)",
  ROUND(EXTRACT(EPOCH FROM (pickup_leg_end - pickup_leg_start))/60) as "Pickup Duration (min)"
FROM party_house_avail;

-- Create the soft hold
WITH party_house_avail AS (
  SELECT *
  FROM check_availability_with_soft_holds(
    (SELECT id FROM products WHERE slug = 'blackout-party-house' LIMIT 1),
    (CURRENT_DATE + 21)::DATE,
    (CURRENT_DATE + 21)::DATE,
    'afternoon',
    'evening',
    18,
    'CONFLICT-TEST-PARTYHOUSE'
  )
)
SELECT 
  'Created hold: ' || create_soft_hold(
    'CONFLICT-TEST-PARTYHOUSE',
    unit_id,
    delivery_crew_id,
    pickup_crew_id,
    service_start,
    service_end,
    delivery_leg_start,
    delivery_leg_end,
    pickup_leg_start,
    pickup_leg_end
  )::TEXT as result
FROM party_house_avail
WHERE is_available = true;


-- =============================================================================
-- STEP 3: Verify the soft hold
-- =============================================================================

SELECT '✅ STEP 3: Verify Soft Hold Created' as step;

SELECT 
  session_id,
  'Unit: ' || COALESCE(unit_id::TEXT, 'none') as unit,
  'Delivery Crew: ' || COALESCE(delivery_crew_id::TEXT, 'none') as delivery_crew,
  'Pickup Crew: ' || COALESCE(pickup_crew_id::TEXT, 'none') as pickup_crew,
  pickup_leg_start AT TIME ZONE 'America/New_York' as "Pickup Start (ET)",
  pickup_leg_end AT TIME ZONE 'America/New_York' as "Pickup End (ET)",
  ROUND(EXTRACT(EPOCH FROM (pickup_leg_end - pickup_leg_start))/60) as "Duration (min)"
FROM booking_soft_holds
WHERE session_id = 'CONFLICT-TEST-PARTYHOUSE';


-- =============================================================================
-- STEP 4: THE CRITICAL TEST - Try to book bounce house with overlapping pickup
-- =============================================================================

SELECT '🧪 STEP 4: CRITICAL TEST - Bounce House Overlapping Pickup' as step;

-- Try to book Glitch Combo with evening pickup (6-8 PM)
-- This SHOULD BE BLOCKED because Party House crew is busy 7-9:30 PM

SELECT 
  '⚠️ Attempting Glitch Combo with 6 PM pickup...' as action;

SELECT 
  'Glitch Combo (6 PM pickup)' as test_case,
  is_available,
  COALESCE(unavailable_reason, 'None') as reason,
  CASE 
    WHEN is_available = false AND unavailable_reason LIKE '%pickup crew%'
    THEN '✅ CORRECTLY BLOCKED - Crew conflict detected!'
    WHEN is_available = false AND unavailable_reason LIKE '%crew%'
    THEN '✅ CORRECTLY BLOCKED - Crew conflict detected!'
    WHEN is_available = false
    THEN '⚠️ BLOCKED but check reason: ' || COALESCE(unavailable_reason, 'unknown')
    ELSE '❌ ALLOWED - BUG! This should be blocked!'
  END as result
FROM check_availability_with_soft_holds(
  (SELECT id FROM products WHERE slug = 'glitch-combo' LIMIT 1),
  (CURRENT_DATE + 21)::DATE,
  (CURRENT_DATE + 21)::DATE,
  'morning',    -- Delivery in morning
  'evening',    -- Pickup in evening (6-8 PM) - CONFLICTS with Party House!
  18,
  'CONFLICT-TEST-BOUNCE'
);


-- =============================================================================
-- STEP 5: Test a NON-conflicting time
-- =============================================================================

SELECT '🧪 STEP 5: Test Non-Conflicting Time (should work)' as step;

-- Try next-morning pickup (8 AM next day) - should be available
SELECT 
  'Glitch Combo (next morning pickup)' as test_case,
  is_available,
  COALESCE(unavailable_reason, 'None') as reason,
  CASE 
    WHEN is_available = true
    THEN '✅ AVAILABLE - No conflict!'
    ELSE '⚠️ BLOCKED - May be other constraint: ' || COALESCE(unavailable_reason, 'unknown')
  END as result
FROM check_availability_with_soft_holds(
  (SELECT id FROM products WHERE slug = 'glitch-combo' LIMIT 1),
  (CURRENT_DATE + 21)::DATE,
  (CURRENT_DATE + 22)::DATE,  -- Pickup NEXT day
  'morning',
  'next-morning',  -- 8 AM next day - no conflict
  18,
  'CONFLICT-TEST-BOUNCE-OK'
);


-- =============================================================================
-- STEP 6: Test without any soft holds (baseline)
-- =============================================================================

SELECT '🧪 STEP 6: Baseline Test (no soft holds)' as step;

-- Clean up holds first
DELETE FROM booking_soft_holds WHERE session_id LIKE 'CONFLICT-TEST-%';

-- Now check if evening pickup works when no Party House is booked
SELECT 
  'Glitch Combo (evening, no conflicts)' as test_case,
  is_available,
  COALESCE(unavailable_reason, 'None') as reason,
  CASE 
    WHEN is_available = true
    THEN '✅ AVAILABLE - Correct (no Party House booked)'
    ELSE '❌ BLOCKED - Should be available when no conflicts!'
  END as result
FROM check_availability_with_soft_holds(
  (SELECT id FROM products WHERE slug = 'glitch-combo' LIMIT 1),
  (CURRENT_DATE + 21)::DATE,
  (CURRENT_DATE + 21)::DATE,
  'morning',
  'evening',
  18,
  'BASELINE-TEST'
);


-- =============================================================================
-- CLEANUP
-- =============================================================================

SELECT '🧹 CLEANUP' as step;

DELETE FROM booking_soft_holds WHERE session_id LIKE 'CONFLICT-TEST-%';
DELETE FROM booking_soft_holds WHERE session_id LIKE 'BASELINE-TEST%';

SELECT 'Test completed! Check results above for ✅ or ❌' as summary;


-- =============================================================================
-- VISUAL TIMELINE (for reference)
-- =============================================================================
/*
Party House Event Day Timeline:
================================

           12 PM    1 PM    2 PM    3 PM    4 PM    5 PM    6 PM    7 PM    8 PM    9 PM    10 PM
             |       |       |       |       |       |       |       |       |       |       |
             |       |       |-------|-------|-------|-------|       |       |       |       |
             |       |       |<-- Party House Event (3-7 PM) ->|       |       |       |       |
             |       |       |       |       |       |       |       |       |       |       |
             |       |       |       |       |       |       |-------|-------|-------|-------|
             |       |       |       |       |       |       |<-- Pickup Leg 7-9:30 PM ------>|
             |       |       |       |       |       |       |  (120 min teardown + 30 travel)|
             |       |       |       |       |       |       |       |       |       |       |
             |       |       |       |       |       |-------|-------|       |       |       |
             |       |       |       |       |       |<- Bounce 6-8 PM ->|   |       |       |
             |       |       |       |       |       |    CONFLICT!    |   |       |       |
             |       |       |       |       |       |  (overlaps 7-8)  |   |       |       |

The bounce house 6-8 PM pickup OVERLAPS with Party House 7-9:30 PM pickup.
Same crew can't be in two places at once!
*/
