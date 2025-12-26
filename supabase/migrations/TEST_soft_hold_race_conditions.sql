-- =============================================================================
-- SOFT HOLD & RACE CONDITION TEST SCRIPT
-- Run in Supabase SQL Editor to test booking block logic
-- 
-- This script tests:
-- 1. Current state inspection
-- 2. Soft hold (pending booking) creation
-- 3. Race condition prevention (exclusion constraints)
-- 4. Pending booking cleanup
-- 5. Edge cases
-- =============================================================================

-- =============================================================================
-- SECTION 1: INSPECT CURRENT STATE
-- =============================================================================

-- 1.1 View all active booking blocks
SELECT 
  bb.id AS block_id,
  b.booking_number,
  b.status AS booking_status,
  bb.resource_type,
  bb.block_type,
  bb.start_ts AT TIME ZONE 'America/New_York' AS start_eastern,
  bb.end_ts AT TIME ZONE 'America/New_York' AS end_eastern,
  CASE 
    WHEN bb.resource_type = 'asset' THEN (SELECT u.unit_number || ' (' || p.name || ')' FROM units u JOIN products p ON p.id = u.product_id WHERE u.id = bb.resource_id)
    WHEN bb.resource_type = 'ops' THEN (SELECT o.name FROM ops_resources o WHERE o.id = bb.resource_id)
  END AS resource_name,
  bb.created_at
FROM booking_blocks bb
JOIN bookings b ON b.id = bb.booking_id
ORDER BY bb.start_ts DESC
LIMIT 20;

-- 1.2 View pending bookings (soft holds)
SELECT 
  b.id,
  b.booking_number,
  b.status,
  b.event_date,
  b.created_at,
  NOW() - b.created_at AS age,
  EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 AS minutes_old,
  c.email AS customer_email,
  p.name AS product_name
FROM bookings b
JOIN customers c ON c.id = b.customer_id
LEFT JOIN units u ON u.id = b.unit_id
LEFT JOIN products p ON p.id = u.product_id OR p.id = (b.product_snapshot->>'id')::UUID
WHERE b.status = 'pending'
ORDER BY b.created_at DESC;

-- 1.3 View ops resources and their current capacity
SELECT 
  o.id,
  o.name,
  o.resource_type,
  o.is_active,
  o.color,
  (SELECT COUNT(*) FROM booking_blocks bb 
   JOIN bookings b ON b.id = bb.booking_id
   WHERE bb.resource_id = o.id 
   AND b.status IN ('confirmed', 'delivered', 'picked_up', 'completed')
   AND bb.end_ts > NOW()
  ) AS active_blocks
FROM ops_resources o
ORDER BY o.resource_type, o.name;

-- =============================================================================
-- SECTION 2: TEST SLOT AVAILABILITY (Party House)
-- =============================================================================

-- 2.1 Check available slots for a specific date (Party House)
-- Change the date to test different scenarios
SELECT * FROM get_available_slots_for_date(
  (SELECT id FROM products WHERE slug = 'blackout-party-house' OR scheduling_mode = 'slot_based' LIMIT 1),
  CURRENT_DATE + INTERVAL '7 days',  -- Test 7 days from now
  18  -- Lead time hours
);

-- 2.2 Check day rental availability (Bounce House)
-- Change the date to test different scenarios
SELECT * FROM check_day_rental_availability(
  (SELECT id FROM products WHERE slug = 'rainbow-bounce-house' OR scheduling_mode = 'day_rental' LIMIT 1),
  CURRENT_DATE + INTERVAL '7 days',  -- Delivery date
  CURRENT_DATE + INTERVAL '8 days',  -- Pickup date (next day)
  18  -- Lead time hours
);

-- =============================================================================
-- SECTION 3: SIMULATE SOFT HOLD CREATION
-- Run this to see what happens when a customer starts checkout
-- =============================================================================

-- 3.1 Create a test pending booking (DO NOT RUN IN PRODUCTION WITHOUT CLEANUP)
/*
DO $$
DECLARE
  v_customer_id UUID;
  v_booking_id UUID;
  v_unit_id UUID;
  v_product_id UUID;
  v_booking_number TEXT;
BEGIN
  -- Get first bounce house product and unit
  SELECT p.id, u.id INTO v_product_id, v_unit_id
  FROM products p
  JOIN units u ON u.product_id = p.id
  WHERE p.scheduling_mode = 'day_rental' OR p.slug LIKE '%bounce%'
  LIMIT 1;
  
  -- Get or create a test customer
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('test-soft-hold@example.com', 'Test', 'SoftHold', '555-0000')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Test'
  RETURNING id INTO v_customer_id;
  
  -- Generate booking number
  v_booking_number := 'TEST-' || LPAD((RANDOM() * 99999)::INT::TEXT, 5, '0');
  
  -- Create pending booking
  INSERT INTO bookings (
    customer_id, 
    unit_id, 
    booking_number, 
    status,
    event_date,
    delivery_date,
    pickup_date,
    delivery_window,
    pickup_window,
    delivery_address,
    delivery_city,
    delivery_zip,
    subtotal,
    deposit_amount,
    balance_due,
    product_snapshot
  )
  VALUES (
    v_customer_id,
    v_unit_id,
    v_booking_number,
    'pending',  -- SOFT HOLD
    CURRENT_DATE + INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '11 days',
    'morning',
    'next-morning',
    '123 Test St',
    'Ocala',
    '34470',
    175.00,
    50.00,
    125.00,
    jsonb_build_object('id', v_product_id, 'name', 'Test Bounce House')
  )
  RETURNING id INTO v_booking_id;
  
  -- Create booking blocks (this is the SOFT HOLD)
  PERFORM create_booking_blocks(
    v_booking_id,
    v_unit_id,
    v_product_id,
    (CURRENT_DATE + INTERVAL '10 days' || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
    (CURRENT_DATE + INTERVAL '11 days' || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York'
  );
  
  RAISE NOTICE 'Created soft hold: % (booking_id: %)', v_booking_number, v_booking_id;
END $$;
*/

-- =============================================================================
-- SECTION 4: TEST RACE CONDITION (Exclusion Constraint)
-- This demonstrates how the system prevents double-booking
-- =============================================================================

-- 4.1 View the exclusion constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname LIKE '%booking_blocks%overlap%';

-- 4.2 Simulate race condition - Try to double-book same asset
-- This SHOULD FAIL with exclusion_violation if blocks overlap
/*
DO $$
DECLARE
  v_unit_id UUID;
  v_booking_id1 UUID;
  v_booking_id2 UUID;
  v_start_ts TIMESTAMPTZ;
  v_end_ts TIMESTAMPTZ;
BEGIN
  -- Get a unit
  SELECT id INTO v_unit_id FROM units LIMIT 1;
  
  -- Set overlapping time window
  v_start_ts := (CURRENT_DATE + INTERVAL '20 days' || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  v_end_ts := (CURRENT_DATE + INTERVAL '20 days' || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  
  -- Create two fake booking IDs
  v_booking_id1 := gen_random_uuid();
  v_booking_id2 := gen_random_uuid();
  
  -- First block should succeed
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (v_booking_id1, 'asset', v_unit_id, 'full_rental', v_start_ts, v_end_ts);
  
  RAISE NOTICE 'First block created successfully';
  
  -- Second block SHOULD FAIL due to exclusion constraint
  BEGIN
    INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
    VALUES (v_booking_id2, 'asset', v_unit_id, 'full_rental', v_start_ts, v_end_ts);
    
    RAISE NOTICE 'ERROR: Second block should have failed!';
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE NOTICE 'SUCCESS: Race condition prevented - exclusion_violation raised';
  END;
  
  -- Cleanup
  DELETE FROM booking_blocks WHERE booking_id IN (v_booking_id1, v_booking_id2);
  RAISE NOTICE 'Test cleanup complete';
END $$;
*/

-- =============================================================================
-- SECTION 5: TEST PENDING BOOKING CLEANUP
-- Shows what the cleanup cron should process
-- =============================================================================

-- 5.1 Find stale pending bookings (older than 45 minutes)
SELECT 
  b.id,
  b.booking_number,
  b.status,
  b.created_at,
  EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 AS minutes_old,
  (SELECT COUNT(*) FROM booking_blocks bb WHERE bb.booking_id = b.id) AS block_count,
  c.email
FROM bookings b
JOIN customers c ON c.id = b.customer_id
WHERE b.status = 'pending'
  AND b.created_at < NOW() - INTERVAL '45 minutes'
ORDER BY b.created_at;

-- 5.2 Preview what cleanup would delete (DON'T ACTUALLY DELETE)
SELECT 
  'Would delete blocks for: ' || b.booking_number AS action,
  bb.id AS block_id,
  bb.block_type,
  bb.resource_type
FROM bookings b
JOIN booking_blocks bb ON bb.booking_id = b.id
WHERE b.status = 'pending'
  AND b.created_at < NOW() - INTERVAL '45 minutes';

-- 5.3 ACTUALLY CLEANUP STALE PENDING BOOKINGS (UNCOMMENT TO RUN)
/*
DO $$
DECLARE
  v_deleted_bookings INT;
  v_deleted_blocks INT;
BEGIN
  -- First delete blocks (foreign key constraint)
  WITH stale_bookings AS (
    SELECT id FROM bookings 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '45 minutes'
  )
  DELETE FROM booking_blocks 
  WHERE booking_id IN (SELECT id FROM stale_bookings);
  
  GET DIAGNOSTICS v_deleted_blocks = ROW_COUNT;
  
  -- Then delete the bookings
  DELETE FROM bookings 
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '45 minutes';
  
  GET DIAGNOSTICS v_deleted_bookings = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup complete: % bookings, % blocks deleted', v_deleted_bookings, v_deleted_blocks;
END $$;
*/

-- =============================================================================
-- SECTION 6: VERIFY WEBHOOK RACE PROTECTION
-- Check if a booking has blocks before confirming (webhook logic)
-- =============================================================================

-- 6.1 Check if a specific booking has valid blocks
-- Replace 'BOOKING_ID_HERE' with actual UUID
/*
SELECT 
  b.booking_number,
  b.status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id) 
    THEN 'HAS BLOCKS - Safe to confirm'
    ELSE 'NO BLOCKS - Expired pending, should reject payment'
  END AS block_status,
  (SELECT COUNT(*) FROM booking_blocks WHERE booking_id = b.id) AS block_count
FROM bookings b
WHERE b.id = 'BOOKING_ID_HERE';
*/

-- 6.2 Check all pending bookings and their block status
SELECT 
  b.booking_number,
  b.status,
  b.created_at,
  EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 AS minutes_pending,
  CASE 
    WHEN EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id) 
    THEN '✅ Has blocks'
    ELSE '❌ NO BLOCKS (expired)'
  END AS block_status,
  (SELECT COUNT(*) FROM booking_blocks WHERE booking_id = b.id) AS block_count
FROM bookings b
WHERE b.status = 'pending'
ORDER BY b.created_at;

-- =============================================================================
-- SECTION 7: STRESS TEST - CAPACITY CHECK
-- =============================================================================

-- 7.1 Check capacity for a specific time window
SELECT 
  count_available_ops_resources(
    'delivery_crew',
    (CURRENT_DATE + INTERVAL '7 days' || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
    (CURRENT_DATE + INTERVAL '7 days' || ' 11:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York'
  ) AS available_delivery_crews,
  (SELECT COUNT(*) FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true) AS total_crews;

-- 7.2 View all blocks for a specific date
SELECT 
  bb.block_type,
  bb.resource_type,
  bb.start_ts AT TIME ZONE 'America/New_York' AS start_et,
  bb.end_ts AT TIME ZONE 'America/New_York' AS end_et,
  b.booking_number,
  b.status
FROM booking_blocks bb
JOIN bookings b ON b.id = bb.booking_id
WHERE DATE(bb.start_ts AT TIME ZONE 'America/New_York') = CURRENT_DATE + INTERVAL '7 days'
ORDER BY bb.start_ts;

-- =============================================================================
-- SECTION 8: DIAGNOSTIC QUERIES
-- =============================================================================

-- 8.1 Check for orphaned blocks (blocks without valid bookings)
SELECT 
  bb.id AS orphan_block_id,
  bb.booking_id,
  bb.block_type,
  bb.resource_type
FROM booking_blocks bb
LEFT JOIN bookings b ON b.id = bb.booking_id
WHERE b.id IS NULL;

-- 8.2 Check for bookings with missing blocks (confirmed but no blocks)
SELECT 
  b.booking_number,
  b.status,
  b.event_date,
  'Missing blocks!' AS issue
FROM bookings b
WHERE b.status IN ('confirmed', 'delivered')
  AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id);

-- 8.3 Summary statistics
SELECT 
  'Total Bookings' AS metric,
  COUNT(*)::TEXT AS value
FROM bookings
UNION ALL
SELECT 'Pending (Soft Holds)', COUNT(*)::TEXT FROM bookings WHERE status = 'pending'
UNION ALL
SELECT 'Confirmed', COUNT(*)::TEXT FROM bookings WHERE status = 'confirmed'
UNION ALL
SELECT 'Total Blocks', COUNT(*)::TEXT FROM booking_blocks
UNION ALL
SELECT 'Asset Blocks', COUNT(*)::TEXT FROM booking_blocks WHERE resource_type = 'asset'
UNION ALL
SELECT 'Ops Blocks', COUNT(*)::TEXT FROM booking_blocks WHERE resource_type = 'ops';

-- =============================================================================
-- SECTION 9: TIME DISPLAY CHECK (12-hour format verification)
-- =============================================================================

-- 9.1 Verify notification preferences time format
SELECT 
  admin_id,
  mode,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end,
  TO_CHAR(quiet_hours_start, 'HH12:MI AM') AS quiet_start_12hr,
  TO_CHAR(quiet_hours_end, 'HH12:MI AM') AS quiet_end_12hr,
  daily_summary_time,
  TO_CHAR(daily_summary_time, 'HH12:MI AM') AS summary_time_12hr
FROM notification_preferences;

-- =============================================================================
-- END OF TEST SCRIPT
-- 
-- SUMMARY OF RACE CONDITION PROTECTION:
-- 1. SOFT HOLD: Booking created with status='pending', blocks created immediately
-- 2. EXCLUSION CONSTRAINT: Prevents two blocks on same resource overlapping
-- 3. WEBHOOK CHECK: Before confirming, verifies:
--    - Booking not cancelled
--    - Booking blocks still exist (not cleaned up)
-- 4. CLEANUP: Stale pending bookings (>45 min) have blocks deleted
-- 5. AUTO-REFUND: If payment completes for expired booking, auto-refund issued
-- =============================================================================
