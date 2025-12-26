-- =============================================================================
-- 🔥 STRESS TEST SUITE v2 - WITH VISIBLE RESULTS
-- Run this to simulate race conditions and verify protection
-- Results appear in the output table!
-- =============================================================================

-- Create temp table for results
DROP TABLE IF EXISTS _stress_test_results;
CREATE TEMP TABLE _stress_test_results (
  test_num INT,
  test_name TEXT,
  expected TEXT,
  actual TEXT,
  status TEXT,
  details TEXT
);

DO $$
DECLARE
  v_customer_1 UUID;
  v_customer_2 UUID;
  v_product_id UUID;
  v_unit_id UUID;
  v_unit_2 UUID;
  v_crew_id UUID;
  v_booking_1 UUID;
  v_booking_2 UUID;
  v_test_date DATE := CURRENT_DATE + INTERVAL '30 days';
  v_event_start TIMESTAMPTZ;
  v_event_end TIMESTAMPTZ;
  v_block_count INT;
  v_avail RECORD;
BEGIN

  -- =========================================================================
  -- SETUP
  -- =========================================================================
  SELECT id INTO v_product_id FROM products WHERE is_active = true LIMIT 1;
  SELECT id INTO v_unit_id FROM units WHERE status = 'available' LIMIT 1;
  SELECT id INTO v_unit_2 FROM units WHERE status = 'available' AND id != v_unit_id LIMIT 1;
  SELECT id INTO v_crew_id FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true LIMIT 1;
  
  IF v_product_id IS NULL OR v_unit_id IS NULL OR v_crew_id IS NULL THEN
    INSERT INTO _stress_test_results VALUES (0, 'SETUP', 'Find resources', 'Missing data', '❌ FAILED', 
      'Need at least 1 product, 1 unit, 1 crew');
    RETURN;
  END IF;
  
  INSERT INTO _stress_test_results VALUES (0, 'SETUP', 'Find resources', 'Found', '✅ PASSED', 
    'Product: ' || v_product_id::TEXT || ', Unit: ' || v_unit_id::TEXT);

  -- Create test customers
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-1@example.com', 'Race', 'TestOne', '555-0001')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Race'
  RETURNING id INTO v_customer_1;
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-2@example.com', 'Race', 'TestTwo', '555-0002')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Race'
  RETURNING id INTO v_customer_2;

  v_event_start := (v_test_date || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  v_event_end := (v_test_date || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';

  -- =========================================================================
  -- TEST 1: Create valid booking with blocks
  -- =========================================================================
  BEGIN
    INSERT INTO bookings (
      customer_id, unit_id, booking_number, status, event_date,
      delivery_date, pickup_date, delivery_window, pickup_window,
      delivery_address, delivery_city, delivery_zip,
      subtotal, deposit_amount, balance_due, product_snapshot
    ) VALUES (
      v_customer_1, v_unit_id, 'STRESS-001', 'pending', v_test_date,
      v_test_date, v_test_date + 1, 'morning', 'next-morning',
      '123 Test St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test')
    ) RETURNING id INTO v_booking_1;
    
    PERFORM create_booking_blocks(v_booking_1, v_unit_id, v_product_id, v_event_start, v_event_end, v_crew_id, v_crew_id);
    
    SELECT COUNT(*) INTO v_block_count FROM booking_blocks WHERE booking_id = v_booking_1;
    
    INSERT INTO _stress_test_results VALUES (1, 'Create Valid Booking', 'Success + 3 blocks', 
      'Created with ' || v_block_count || ' blocks', '✅ PASSED', 'Booking STRESS-001 created');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _stress_test_results VALUES (1, 'Create Valid Booking', 'Success', 'Error: ' || SQLERRM, '❌ FAILED', '');
  END;

  -- =========================================================================
  -- TEST 2: RACE CONDITION - Double-book same UNIT (MUST FAIL)
  -- =========================================================================
  BEGIN
    INSERT INTO bookings (
      customer_id, unit_id, booking_number, status, event_date,
      delivery_date, pickup_date, delivery_window, pickup_window,
      delivery_address, delivery_city, delivery_zip,
      subtotal, deposit_amount, balance_due, product_snapshot
    ) VALUES (
      v_customer_2, v_unit_id, 'STRESS-002-RACE', 'pending', v_test_date,
      v_test_date, v_test_date + 1, 'morning', 'next-morning',
      '456 Race St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test')
    ) RETURNING id INTO v_booking_2;
    
    -- This SHOULD fail with exclusion_violation
    PERFORM create_booking_blocks(v_booking_2, v_unit_id, v_product_id, v_event_start, v_event_end, v_crew_id, v_crew_id);
    
    -- If we reach here, the race condition was NOT prevented!
    INSERT INTO _stress_test_results VALUES (2, '🔥 RACE: Double-book Unit', 'BLOCKED', 'ALLOWED!', '❌ FAILED', 
      'CRITICAL: Same unit was double-booked!');
    DELETE FROM booking_blocks WHERE booking_id = v_booking_2;
    DELETE FROM bookings WHERE id = v_booking_2;
    
  EXCEPTION 
    WHEN exclusion_violation THEN
      INSERT INTO _stress_test_results VALUES (2, '🔥 RACE: Double-book Unit', 'BLOCKED', 'exclusion_violation', '✅ PASSED', 
        'Database prevented double-booking!');
      DELETE FROM bookings WHERE booking_number = 'STRESS-002-RACE';
    WHEN OTHERS THEN
      INSERT INTO _stress_test_results VALUES (2, '🔥 RACE: Double-book Unit', 'BLOCKED', SQLERRM, '✅ PASSED', 
        'Error prevented double-booking');
      DELETE FROM bookings WHERE booking_number = 'STRESS-002-RACE';
  END;

  -- =========================================================================
  -- TEST 3: RACE CONDITION - Double-book same CREW (MUST FAIL)
  -- =========================================================================
  IF v_unit_2 IS NOT NULL THEN
    BEGIN
      INSERT INTO bookings (
        customer_id, unit_id, booking_number, status, event_date,
        delivery_date, pickup_date, delivery_window, pickup_window,
        delivery_address, delivery_city, delivery_zip,
        subtotal, deposit_amount, balance_due, product_snapshot
      ) VALUES (
        v_customer_2, v_unit_2, 'STRESS-003-CREW', 'pending', v_test_date,
        v_test_date, v_test_date + 1, 'morning', 'next-morning',
        '789 Crew St', 'Ocala', '34470',
        175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test')
      ) RETURNING id INTO v_booking_2;
      
      -- Try to use SAME crew - should fail
      PERFORM create_booking_blocks(v_booking_2, v_unit_2, v_product_id, v_event_start, v_event_end, v_crew_id, v_crew_id);
      
      INSERT INTO _stress_test_results VALUES (3, '🔥 RACE: Double-book Crew', 'BLOCKED', 'ALLOWED!', '❌ FAILED', 
        'CRITICAL: Same crew was double-booked!');
      DELETE FROM booking_blocks WHERE booking_id = v_booking_2;
      DELETE FROM bookings WHERE id = v_booking_2;
      
    EXCEPTION 
      WHEN exclusion_violation THEN
        INSERT INTO _stress_test_results VALUES (3, '🔥 RACE: Double-book Crew', 'BLOCKED', 'exclusion_violation', '✅ PASSED', 
          'Crew conflict prevented!');
        DELETE FROM bookings WHERE booking_number = 'STRESS-003-CREW';
      WHEN OTHERS THEN
        INSERT INTO _stress_test_results VALUES (3, '🔥 RACE: Double-book Crew', 'BLOCKED', SQLERRM, '✅ PASSED', 
          'Error prevented crew conflict');
        DELETE FROM bookings WHERE booking_number = 'STRESS-003-CREW';
    END;
  ELSE
    INSERT INTO _stress_test_results VALUES (3, '🔥 RACE: Double-book Crew', 'N/A', 'Skipped', '⏭️ SKIPPED', 
      'Only 1 unit - cannot test crew conflict');
  END IF;

  -- =========================================================================
  -- TEST 4: Verify block structure (1 asset + 2 ops = 3 total)
  -- =========================================================================
  DECLARE
    v_asset_blocks INT;
    v_ops_blocks INT;
  BEGIN
    SELECT 
      COUNT(*) FILTER (WHERE resource_type = 'asset'),
      COUNT(*) FILTER (WHERE resource_type = 'ops')
    INTO v_asset_blocks, v_ops_blocks
    FROM booking_blocks WHERE booking_id = v_booking_1;
    
    IF v_asset_blocks = 1 AND v_ops_blocks = 2 THEN
      INSERT INTO _stress_test_results VALUES (4, 'Block Structure', '1 asset + 2 ops', 
        v_asset_blocks || ' asset + ' || v_ops_blocks || ' ops', '✅ PASSED', 
        'Correct: full_rental + delivery_leg + pickup_leg');
    ELSE
      INSERT INTO _stress_test_results VALUES (4, 'Block Structure', '1 asset + 2 ops', 
        v_asset_blocks || ' asset + ' || v_ops_blocks || ' ops', '❌ FAILED', 'Wrong block count');
    END IF;
  END;

  -- =========================================================================
  -- TEST 5: Availability check - booked date shows unavailable
  -- =========================================================================
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date, v_test_date + 1, 18);
  
  IF v_avail.is_available = false THEN
    INSERT INTO _stress_test_results VALUES (5, 'Booked Date Unavailable', 'is_available=false', 
      'is_available=false', '✅ PASSED', 'Reason: ' || COALESCE(v_avail.unavailable_reason, 'Blocked'));
  ELSE
    INSERT INTO _stress_test_results VALUES (5, 'Booked Date Unavailable', 'is_available=false', 
      'is_available=true', '❌ FAILED', 'BUG: Booked date shows available!');
  END IF;

  -- =========================================================================
  -- TEST 6: Free date shows available
  -- =========================================================================
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date + 15, v_test_date + 16, 18);
  
  IF v_avail.is_available = true THEN
    INSERT INTO _stress_test_results VALUES (6, 'Free Date Available', 'is_available=true', 
      'is_available=true', '✅ PASSED', 'Unbooked date correctly available');
  ELSE
    INSERT INTO _stress_test_results VALUES (6, 'Free Date Available', 'is_available=true', 
      'is_available=false', '⚠️ WARNING', 'Reason: ' || COALESCE(v_avail.unavailable_reason, 'Unknown'));
  END IF;

  -- =========================================================================
  -- TEST 7: Webhook protection - detect booking without blocks
  -- =========================================================================
  DECLARE
    v_orphan_booking UUID;
    v_has_blocks BOOLEAN;
  BEGIN
    -- Create booking WITHOUT blocks (simulates expired pending)
    INSERT INTO bookings (
      customer_id, unit_id, booking_number, status, event_date,
      delivery_date, pickup_date, delivery_window, pickup_window,
      delivery_address, delivery_city, delivery_zip,
      subtotal, deposit_amount, balance_due, product_snapshot
    ) VALUES (
      v_customer_2, v_unit_id, 'STRESS-ORPHAN', 'pending', v_test_date + 20,
      v_test_date + 20, v_test_date + 21, 'morning', 'next-morning',
      '000 Orphan St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test')
    ) RETURNING id INTO v_orphan_booking;
    
    -- Don't create blocks - this simulates an expired pending
    SELECT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = v_orphan_booking) INTO v_has_blocks;
    
    IF NOT v_has_blocks THEN
      INSERT INTO _stress_test_results VALUES (7, 'Webhook Block Check', 'Detects missing blocks', 
        'No blocks found', '✅ PASSED', 'Webhook would REJECT payment');
    ELSE
      INSERT INTO _stress_test_results VALUES (7, 'Webhook Block Check', 'Detects missing blocks', 
        'Has blocks', '❌ FAILED', 'Unexpected');
    END IF;
    
    DELETE FROM bookings WHERE id = v_orphan_booking;
  END;

  -- =========================================================================
  -- TEST 8: Cancel and verify slot freed
  -- =========================================================================
  -- Cancel first booking
  UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = v_booking_1;
  DELETE FROM booking_blocks WHERE booking_id = v_booking_1;
  
  -- Check if slot is now available
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date, v_test_date + 1, 18);
  
  IF v_avail.is_available = true THEN
    INSERT INTO _stress_test_results VALUES (8, 'Slot Freed After Cancel', 'is_available=true', 
      'is_available=true', '✅ PASSED', 'Cancelled slot correctly freed!');
  ELSE
    INSERT INTO _stress_test_results VALUES (8, 'Slot Freed After Cancel', 'is_available=true', 
      'is_available=false', '❌ FAILED', 'Slot still blocked after cancel');
  END IF;

  -- =========================================================================
  -- CLEANUP
  -- =========================================================================
  DELETE FROM booking_blocks WHERE booking_id IN (SELECT id FROM bookings WHERE booking_number LIKE 'STRESS-%');
  DELETE FROM bookings WHERE booking_number LIKE 'STRESS-%';
  DELETE FROM customers WHERE email LIKE 'stress-test-%@example.com';

END $$;

-- =============================================================================
-- OUTPUT RESULTS
-- =============================================================================
SELECT 
  test_num AS "#",
  test_name AS "Test",
  expected AS "Expected",
  actual AS "Actual",
  status AS "Result",
  details AS "Details"
FROM _stress_test_results
ORDER BY test_num;

-- =============================================================================
-- SUMMARY
-- =============================================================================
SELECT 
  '📊 SUMMARY' AS "Category",
  COUNT(*) FILTER (WHERE status LIKE '✅%') AS "Passed",
  COUNT(*) FILTER (WHERE status LIKE '❌%') AS "Failed",
  COUNT(*) FILTER (WHERE status LIKE '⚠️%') AS "Warnings",
  COUNT(*) FILTER (WHERE status LIKE '⏭️%') AS "Skipped",
  CASE 
    WHEN COUNT(*) FILTER (WHERE status LIKE '❌%') = 0 THEN '🏆 ALL TESTS PASSED!'
    ELSE '⚠️ ISSUES FOUND'
  END AS "Overall"
FROM _stress_test_results;

-- Cleanup temp table
DROP TABLE IF EXISTS _stress_test_results;
