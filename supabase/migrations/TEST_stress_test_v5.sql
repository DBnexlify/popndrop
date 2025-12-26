-- =============================================================================
-- 🔥 STRESS TEST v5 - OUTPUTS TO REAL TABLE
-- Run this, then run the SELECT at the bottom
-- =============================================================================

-- Create permanent results table
DROP TABLE IF EXISTS stress_test_results;
CREATE TABLE stress_test_results (
  id SERIAL PRIMARY KEY,
  test_num INT,
  test_name TEXT,
  expected TEXT,
  actual TEXT,
  status TEXT,
  details TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

-- Run the tests
DO $$
DECLARE
  v_customer_1 UUID;
  v_customer_2 UUID;
  v_product_id UUID;
  v_unit_id UUID;
  v_crew_id UUID;
  v_booking_1 UUID;
  v_booking_2 UUID;
  v_test_date DATE := CURRENT_DATE + INTERVAL '30 days';
  v_event_start TIMESTAMPTZ;
  v_event_end TIMESTAMPTZ;
  v_block_count INT;
  v_avail RECORD;
  v_asset_blocks INT;
  v_ops_blocks INT;
BEGIN

  -- Clear old results
  DELETE FROM stress_test_results;

  -- SETUP: Get IDs
  SELECT id INTO v_product_id FROM products WHERE is_active = true LIMIT 1;
  SELECT id INTO v_unit_id FROM units WHERE status = 'available' LIMIT 1;
  SELECT id INTO v_crew_id FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true LIMIT 1;
  
  IF v_product_id IS NULL THEN
    INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
    VALUES (0, 'SETUP', 'Find product', 'NULL', '❌ FAILED', 'No active product found');
    RETURN;
  END IF;
  
  IF v_unit_id IS NULL THEN
    INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
    VALUES (0, 'SETUP', 'Find unit', 'NULL', '❌ FAILED', 'No available unit found');
    RETURN;
  END IF;
  
  IF v_crew_id IS NULL THEN
    INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
    VALUES (0, 'SETUP', 'Find crew', 'NULL', '❌ FAILED', 'No active crew found');
    RETURN;
  END IF;
  
  INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
  VALUES (0, 'SETUP', 'Find resources', 'Found all', '✅ PASSED', 'Product, unit, and crew found');

  -- Create test customers
  DELETE FROM customers WHERE email LIKE 'stress-test-%@example.com';
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-1@example.com', 'Race', 'TestOne', '555-0001')
  RETURNING id INTO v_customer_1;
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-2@example.com', 'Race', 'TestTwo', '555-0002')
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
    
    INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
    VALUES (1, 'Create Valid Booking', '3 blocks', v_block_count || ' blocks', 
      CASE WHEN v_block_count = 3 THEN '✅ PASSED' ELSE '❌ FAILED' END, 
      'Booking STRESS-001 with blocks');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
    VALUES (1, 'Create Valid Booking', 'Success', SQLERRM, '❌ FAILED', 'Exception thrown');
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
      v_customer_2, v_unit_id, 'STRESS-RACE', 'pending', v_test_date,
      v_test_date, v_test_date + 1, 'morning', 'next-morning',
      '456 Race St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test')
    ) RETURNING id INTO v_booking_2;
    
    PERFORM create_booking_blocks(v_booking_2, v_unit_id, v_product_id, v_event_start, v_event_end, v_crew_id, v_crew_id);
    
    -- If we get here, double-booking was ALLOWED (BAD!)
    INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
    VALUES (2, '🔥 RACE: Double-book Unit', 'BLOCKED', 'ALLOWED', '❌ CRITICAL', 'Double-booking was permitted!');
    
    DELETE FROM booking_blocks WHERE booking_id = v_booking_2;
    DELETE FROM bookings WHERE id = v_booking_2;
  EXCEPTION 
    WHEN exclusion_violation THEN
      INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
      VALUES (2, '🔥 RACE: Double-book Unit', 'BLOCKED', 'exclusion_violation', '✅ PASSED', 'Database blocked it!');
      DELETE FROM bookings WHERE booking_number = 'STRESS-RACE';
    WHEN OTHERS THEN
      INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
      VALUES (2, '🔥 RACE: Double-book Unit', 'BLOCKED', SQLERRM, '✅ PASSED', 'Error prevented it');
      DELETE FROM bookings WHERE booking_number = 'STRESS-RACE';
  END;

  -- =========================================================================
  -- TEST 3: Block structure (1 asset + 2 ops)
  -- =========================================================================
  SELECT COUNT(*) FILTER (WHERE resource_type = 'asset'), 
         COUNT(*) FILTER (WHERE resource_type = 'ops')
  INTO v_asset_blocks, v_ops_blocks
  FROM booking_blocks WHERE booking_id = v_booking_1;
  
  INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
  VALUES (3, 'Block Structure', '1 asset + 2 ops', 
    v_asset_blocks || ' asset + ' || v_ops_blocks || ' ops',
    CASE WHEN v_asset_blocks = 1 AND v_ops_blocks = 2 THEN '✅ PASSED' ELSE '❌ FAILED' END,
    'full_rental + delivery_leg + pickup_leg');

  -- =========================================================================
  -- TEST 4: Booked date shows unavailable
  -- =========================================================================
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date, v_test_date + 1, 18);
  
  INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
  VALUES (4, 'Booked Date Unavailable', 'is_available=false', 
    'is_available=' || v_avail.is_available,
    CASE WHEN v_avail.is_available = false THEN '✅ PASSED' ELSE '❌ FAILED' END,
    COALESCE(v_avail.unavailable_reason, 'N/A'));

  -- =========================================================================
  -- TEST 5: Free date shows available
  -- =========================================================================
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date + 15, v_test_date + 16, 18);
  
  INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
  VALUES (5, 'Free Date Available', 'is_available=true', 
    'is_available=' || v_avail.is_available,
    CASE WHEN v_avail.is_available = true THEN '✅ PASSED' ELSE '⚠️ WARNING' END,
    COALESCE(v_avail.unavailable_reason, 'Available'));

  -- =========================================================================
  -- TEST 6: Cancel booking and verify slot freed
  -- =========================================================================
  UPDATE bookings SET status = 'cancelled' WHERE id = v_booking_1;
  DELETE FROM booking_blocks WHERE booking_id = v_booking_1;
  
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date, v_test_date + 1, 18);
  
  INSERT INTO stress_test_results (test_num, test_name, expected, actual, status, details)
  VALUES (6, 'Cancel Frees Slot', 'is_available=true', 
    'is_available=' || v_avail.is_available,
    CASE WHEN v_avail.is_available = true THEN '✅ PASSED' ELSE '❌ FAILED' END,
    COALESCE(v_avail.unavailable_reason, 'Slot freed'));

  -- =========================================================================
  -- CLEANUP
  -- =========================================================================
  DELETE FROM booking_blocks WHERE booking_id IN (SELECT id FROM bookings WHERE booking_number LIKE 'STRESS-%');
  DELETE FROM bookings WHERE booking_number LIKE 'STRESS-%';
  DELETE FROM customers WHERE email LIKE 'stress-test-%@example.com';

END $$;

-- =============================================================================
-- VIEW RESULTS (Run this part to see output)
-- =============================================================================
SELECT 
  test_num AS "#",
  test_name AS "Test",
  expected AS "Expected",
  actual AS "Actual", 
  status AS "Status",
  details AS "Details"
FROM stress_test_results 
ORDER BY test_num;
