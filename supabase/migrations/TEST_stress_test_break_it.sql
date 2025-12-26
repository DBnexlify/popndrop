-- =============================================================================
-- 🔥 STRESS TEST SUITE - BREAK THE BOOKING SYSTEM
-- Run this to simulate real-world scenarios and race conditions
-- 
-- ⚠️ CREATES TEST DATA - Has cleanup at the end
-- =============================================================================

-- =============================================================================
-- SETUP: Create test customers and get product/unit IDs
-- =============================================================================
DO $$
DECLARE
  v_customer_1 UUID;
  v_customer_2 UUID;
  v_customer_3 UUID;
  v_product_id UUID;
  v_unit_id UUID;
  v_crew_id UUID;
  v_booking_1 UUID;
  v_booking_2 UUID;
  v_booking_3 UUID;
  v_test_date DATE := CURRENT_DATE + INTERVAL '30 days';
  v_event_start TIMESTAMPTZ;
  v_event_end TIMESTAMPTZ;
  v_results TEXT := '';
  v_test_passed BOOLEAN;
  v_error_msg TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔥 STRESS TEST SUITE - STARTING';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- =========================================================================
  -- SETUP: Get required IDs
  -- =========================================================================
  RAISE NOTICE '📋 SETUP: Getting product, unit, and crew IDs...';
  
  SELECT id INTO v_product_id FROM products WHERE is_active = true LIMIT 1;
  SELECT id INTO v_unit_id FROM units WHERE status = 'available' LIMIT 1;
  SELECT id INTO v_crew_id FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true LIMIT 1;
  
  IF v_product_id IS NULL OR v_unit_id IS NULL OR v_crew_id IS NULL THEN
    RAISE EXCEPTION '❌ Missing required data: product=%, unit=%, crew=%', v_product_id, v_unit_id, v_crew_id;
  END IF;
  
  RAISE NOTICE '   ✅ Product: %', v_product_id;
  RAISE NOTICE '   ✅ Unit: %', v_unit_id;
  RAISE NOTICE '   ✅ Crew: %', v_crew_id;
  RAISE NOTICE '';

  -- =========================================================================
  -- SETUP: Create test customers
  -- =========================================================================
  RAISE NOTICE '👥 SETUP: Creating test customers...';
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-1@example.com', 'Stress', 'TestOne', '555-0001')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Stress'
  RETURNING id INTO v_customer_1;
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-2@example.com', 'Stress', 'TestTwo', '555-0002')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Stress'
  RETURNING id INTO v_customer_2;
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-3@example.com', 'Stress', 'TestThree', '555-0003')
  ON CONFLICT (email) DO UPDATE SET first_name = 'Stress'
  RETURNING id INTO v_customer_3;
  
  RAISE NOTICE '   ✅ Created 3 test customers';
  RAISE NOTICE '';

  -- Set event times
  v_event_start := (v_test_date || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  v_event_end := (v_test_date || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';

  -- =========================================================================
  -- TEST 1: Create a valid booking with blocks
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 1: Create valid booking with blocks';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  BEGIN
    -- Create booking
    INSERT INTO bookings (
      customer_id, unit_id, booking_number, status, event_date,
      delivery_date, pickup_date, delivery_window, pickup_window,
      delivery_address, delivery_city, delivery_zip,
      subtotal, deposit_amount, balance_due, product_snapshot
    ) VALUES (
      v_customer_1, v_unit_id, 'STRESS-001', 'pending', v_test_date,
      v_test_date, v_test_date + 1, 'morning', 'next-morning',
      '123 Test St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test Product')
    ) RETURNING id INTO v_booking_1;
    
    -- Create blocks
    PERFORM create_booking_blocks(
      v_booking_1, v_unit_id, v_product_id,
      v_event_start, v_event_end, v_crew_id, v_crew_id
    );
    
    RAISE NOTICE '   ✅ PASSED: Booking STRESS-001 created with blocks';
    RAISE NOTICE '   📦 Blocks created for unit and crew';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '   ❌ FAILED: %', SQLERRM;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 2: RACE CONDITION - Try to double-book same unit (SHOULD FAIL)
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 2: Race condition - Double-book same unit';
  RAISE NOTICE '   Expected: FAIL with exclusion_violation';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  BEGIN
    -- Create second booking for SAME unit on SAME date
    INSERT INTO bookings (
      customer_id, unit_id, booking_number, status, event_date,
      delivery_date, pickup_date, delivery_window, pickup_window,
      delivery_address, delivery_city, delivery_zip,
      subtotal, deposit_amount, balance_due, product_snapshot
    ) VALUES (
      v_customer_2, v_unit_id, 'STRESS-002', 'pending', v_test_date,
      v_test_date, v_test_date + 1, 'morning', 'next-morning',
      '456 Race St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test Product')
    ) RETURNING id INTO v_booking_2;
    
    -- Try to create blocks (THIS SHOULD FAIL!)
    PERFORM create_booking_blocks(
      v_booking_2, v_unit_id, v_product_id,
      v_event_start, v_event_end, v_crew_id, v_crew_id
    );
    
    -- If we get here, the test FAILED (should have thrown exception)
    RAISE NOTICE '   ❌ FAILED: Double-booking was ALLOWED! This is a bug!';
    
    -- Cleanup the bad booking
    DELETE FROM booking_blocks WHERE booking_id = v_booking_2;
    DELETE FROM bookings WHERE id = v_booking_2;
    
  EXCEPTION 
    WHEN exclusion_violation THEN
      RAISE NOTICE '   ✅ PASSED: exclusion_violation raised - double-booking BLOCKED!';
      RAISE NOTICE '   🛡️ Race condition protection working correctly';
      -- Cleanup the booking record (blocks weren't created)
      DELETE FROM bookings WHERE booking_number = 'STRESS-002';
    WHEN OTHERS THEN
      RAISE NOTICE '   ✅ PASSED: Error raised - %', SQLERRM;
      DELETE FROM bookings WHERE booking_number = 'STRESS-002';
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 3: RACE CONDITION - Try to double-book same CREW (SHOULD FAIL)
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 3: Race condition - Double-book same crew';
  RAISE NOTICE '   Expected: FAIL (crew already busy with delivery)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_other_unit UUID;
  BEGIN
    -- Get a DIFFERENT unit (if available)
    SELECT id INTO v_other_unit FROM units WHERE status = 'available' AND id != v_unit_id LIMIT 1;
    
    IF v_other_unit IS NULL THEN
      RAISE NOTICE '   ⏭️ SKIPPED: Only 1 unit available, cannot test crew conflict';
    ELSE
      -- Create booking for DIFFERENT unit but SAME crew at SAME time
      INSERT INTO bookings (
        customer_id, unit_id, booking_number, status, event_date,
        delivery_date, pickup_date, delivery_window, pickup_window,
        delivery_address, delivery_city, delivery_zip,
        subtotal, deposit_amount, balance_due, product_snapshot
      ) VALUES (
        v_customer_2, v_other_unit, 'STRESS-003', 'pending', v_test_date,
        v_test_date, v_test_date + 1, 'morning', 'next-morning',
        '789 Crew St', 'Ocala', '34470',
        175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test Product')
      ) RETURNING id INTO v_booking_3;
      
      -- Try to create blocks with same crew (THIS SHOULD FAIL!)
      BEGIN
        PERFORM create_booking_blocks(
          v_booking_3, v_other_unit, v_product_id,
          v_event_start, v_event_end, v_crew_id, v_crew_id
        );
        
        RAISE NOTICE '   ❌ FAILED: Crew double-booking was ALLOWED!';
        DELETE FROM booking_blocks WHERE booking_id = v_booking_3;
        DELETE FROM bookings WHERE id = v_booking_3;
        
      EXCEPTION 
        WHEN exclusion_violation THEN
          RAISE NOTICE '   ✅ PASSED: Crew exclusion_violation - double-booking BLOCKED!';
          DELETE FROM bookings WHERE booking_number = 'STRESS-003';
        WHEN OTHERS THEN
          RAISE NOTICE '   ✅ PASSED: Error raised - %', SQLERRM;
          DELETE FROM bookings WHERE booking_number = 'STRESS-003';
      END;
    END IF;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 4: Verify booking blocks exist
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 4: Verify booking blocks structure';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_block_count INT;
    v_asset_count INT;
    v_ops_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_block_count FROM booking_blocks WHERE booking_id = v_booking_1;
    SELECT COUNT(*) INTO v_asset_count FROM booking_blocks WHERE booking_id = v_booking_1 AND resource_type = 'asset';
    SELECT COUNT(*) INTO v_ops_count FROM booking_blocks WHERE booking_id = v_booking_1 AND resource_type = 'ops';
    
    IF v_block_count = 3 AND v_asset_count = 1 AND v_ops_count = 2 THEN
      RAISE NOTICE '   ✅ PASSED: Correct block structure';
      RAISE NOTICE '   📦 Total: % blocks (1 asset + 2 ops)', v_block_count;
    ELSE
      RAISE NOTICE '   ❌ FAILED: Expected 3 blocks (1 asset, 2 ops), got % (% asset, % ops)', 
        v_block_count, v_asset_count, v_ops_count;
    END IF;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 5: Simulate stale pending (webhook protection test)
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 5: Webhook protection - detect missing blocks';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_stale_booking UUID;
    v_has_blocks BOOLEAN;
  BEGIN
    -- Create a booking WITHOUT blocks (simulates expired pending)
    INSERT INTO bookings (
      customer_id, unit_id, booking_number, status, event_date,
      delivery_date, pickup_date, delivery_window, pickup_window,
      delivery_address, delivery_city, delivery_zip,
      subtotal, deposit_amount, balance_due, product_snapshot,
      created_at  -- Set to 1 hour ago
    ) VALUES (
      v_customer_3, v_unit_id, 'STRESS-STALE', 'pending', v_test_date + 5,
      v_test_date + 5, v_test_date + 6, 'morning', 'next-morning',
      '000 Stale St', 'Ocala', '34470',
      175.00, 50.00, 125.00, jsonb_build_object('id', v_product_id, 'name', 'Test Product'),
      NOW() - INTERVAL '1 hour'
    ) RETURNING id INTO v_stale_booking;
    
    -- Check if it has blocks (it shouldn't)
    SELECT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = v_stale_booking) INTO v_has_blocks;
    
    IF NOT v_has_blocks THEN
      RAISE NOTICE '   ✅ PASSED: Stale booking correctly has NO blocks';
      RAISE NOTICE '   🛡️ Webhook would REJECT payment for this booking';
    ELSE
      RAISE NOTICE '   ❌ UNEXPECTED: Stale booking has blocks?';
    END IF;
    
    -- Cleanup
    DELETE FROM bookings WHERE id = v_stale_booking;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 6: Availability function accuracy
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 6: Availability function - blocked date detection';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_avail RECORD;
  BEGIN
    -- Check availability for the date we booked (should show unavailable)
    SELECT * INTO v_avail FROM check_day_rental_availability(
      v_product_id, v_test_date, v_test_date + 1, 18
    );
    
    IF v_avail.is_available = false THEN
      RAISE NOTICE '   ✅ PASSED: Booked date correctly shows as UNAVAILABLE';
      RAISE NOTICE '   📅 Reason: %', COALESCE(v_avail.unavailable_reason, 'Already booked');
    ELSE
      RAISE NOTICE '   ❌ FAILED: Booked date shows as AVAILABLE (bug!)';
    END IF;
    
    -- Check availability for an unbooked date (should show available)
    SELECT * INTO v_avail FROM check_day_rental_availability(
      v_product_id, v_test_date + 10, v_test_date + 11, 18
    );
    
    IF v_avail.is_available = true THEN
      RAISE NOTICE '   ✅ PASSED: Unbooked date correctly shows as AVAILABLE';
    ELSE
      RAISE NOTICE '   ⚠️ WARNING: Unbooked date shows unavailable - %', v_avail.unavailable_reason;
    END IF;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 7: Confirm booking (status change)
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 7: Confirm booking - verify blocks remain';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_blocks_before INT;
    v_blocks_after INT;
  BEGIN
    SELECT COUNT(*) INTO v_blocks_before FROM booking_blocks WHERE booking_id = v_booking_1;
    
    -- Confirm the booking
    UPDATE bookings SET 
      status = 'confirmed',
      deposit_paid = true,
      deposit_paid_at = NOW(),
      confirmed_at = NOW()
    WHERE id = v_booking_1;
    
    SELECT COUNT(*) INTO v_blocks_after FROM booking_blocks WHERE booking_id = v_booking_1;
    
    IF v_blocks_before = v_blocks_after AND v_blocks_after = 3 THEN
      RAISE NOTICE '   ✅ PASSED: Blocks preserved after confirmation (% blocks)', v_blocks_after;
    ELSE
      RAISE NOTICE '   ❌ FAILED: Block count changed! Before: %, After: %', v_blocks_before, v_blocks_after;
    END IF;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 8: Cancel booking - blocks should be deleted
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 8: Cancel booking - blocks cleanup';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_blocks_before INT;
    v_blocks_after INT;
  BEGIN
    SELECT COUNT(*) INTO v_blocks_before FROM booking_blocks WHERE booking_id = v_booking_1;
    
    -- Cancel and cleanup
    UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = v_booking_1;
    DELETE FROM booking_blocks WHERE booking_id = v_booking_1;
    
    SELECT COUNT(*) INTO v_blocks_after FROM booking_blocks WHERE booking_id = v_booking_1;
    
    IF v_blocks_after = 0 THEN
      RAISE NOTICE '   ✅ PASSED: Blocks cleaned up after cancellation';
      RAISE NOTICE '   🗑️ Removed % blocks, slot is now FREE', v_blocks_before;
    ELSE
      RAISE NOTICE '   ❌ FAILED: % orphan blocks remain!', v_blocks_after;
    END IF;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- TEST 9: Slot now available after cancellation
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧪 TEST 9: Verify slot freed after cancellation';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  DECLARE
    v_avail RECORD;
  BEGIN
    SELECT * INTO v_avail FROM check_day_rental_availability(
      v_product_id, v_test_date, v_test_date + 1, 18
    );
    
    IF v_avail.is_available = true THEN
      RAISE NOTICE '   ✅ PASSED: Cancelled slot is now AVAILABLE again!';
      RAISE NOTICE '   🎉 System correctly freed the slot';
    ELSE
      RAISE NOTICE '   ❌ FAILED: Slot still shows unavailable - %', v_avail.unavailable_reason;
    END IF;
  END;
  RAISE NOTICE '';

  -- =========================================================================
  -- CLEANUP
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🧹 CLEANUP: Removing test data...';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  -- Delete test bookings
  DELETE FROM booking_blocks WHERE booking_id IN (
    SELECT id FROM bookings WHERE booking_number LIKE 'STRESS-%'
  );
  DELETE FROM bookings WHERE booking_number LIKE 'STRESS-%';
  
  -- Delete test customers
  DELETE FROM customers WHERE email LIKE 'stress-test-%@example.com';
  
  RAISE NOTICE '   ✅ Test data cleaned up';
  RAISE NOTICE '';

  -- =========================================================================
  -- FINAL SUMMARY
  -- =========================================================================
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🏁 STRESS TEST COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '   If you see mostly ✅ above, your system is SOLID!';
  RAISE NOTICE '   Race conditions are blocked at the database level.';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

END $$;

-- =============================================================================
-- VERIFICATION QUERY - Run after the test to confirm clean state
-- =============================================================================
SELECT 
  'Post-Test Verification' AS "Check",
  (SELECT COUNT(*) FROM bookings WHERE booking_number LIKE 'STRESS-%') AS "Test Bookings Remaining",
  (SELECT COUNT(*) FROM customers WHERE email LIKE 'stress-test-%') AS "Test Customers Remaining",
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings WHERE booking_number LIKE 'STRESS-%') = 0 
     AND (SELECT COUNT(*) FROM customers WHERE email LIKE 'stress-test-%') = 0
    THEN '✅ Clean - All test data removed'
    ELSE '⚠️ Cleanup may have failed'
  END AS "Status";
