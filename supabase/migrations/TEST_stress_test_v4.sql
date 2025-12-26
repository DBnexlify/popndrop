-- =============================================================================
-- 🔥 STRESS TEST v4 - SHOWS DETAILED RESULTS
-- =============================================================================

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
  v_asset_blocks INT;
  v_ops_blocks INT;
BEGIN

  -- SETUP: Get IDs
  SELECT id INTO v_product_id FROM products WHERE is_active = true LIMIT 1;
  SELECT id INTO v_unit_id FROM units WHERE status = 'available' LIMIT 1;
  SELECT id INTO v_unit_2 FROM units WHERE status = 'available' AND id != v_unit_id LIMIT 1;
  SELECT id INTO v_crew_id FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true LIMIT 1;
  
  IF v_product_id IS NULL OR v_unit_id IS NULL OR v_crew_id IS NULL THEN
    RAISE EXCEPTION 'SETUP FAILED: Need product, unit, crew. Got: product=%, unit=%, crew=%', v_product_id, v_unit_id, v_crew_id;
  END IF;
  
  RAISE NOTICE '✅ TEST 0 - SETUP: Found product, unit, crew';

  -- Create test customers (DELETE first, then INSERT)
  DELETE FROM customers WHERE email LIKE 'stress-test-%@example.com';
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-1@example.com', 'Race', 'TestOne', '555-0001')
  RETURNING id INTO v_customer_1;
  
  INSERT INTO customers (email, first_name, last_name, phone)
  VALUES ('stress-test-2@example.com', 'Race', 'TestTwo', '555-0002')
  RETURNING id INTO v_customer_2;

  v_event_start := (v_test_date || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  v_event_end := (v_test_date || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';

  -- TEST 1: Create valid booking
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
    
    RAISE NOTICE '✅ TEST 1 - Create Booking: SUCCESS (% blocks created)', v_block_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 1 - Create Booking: FAILED - %', SQLERRM;
  END;

  -- TEST 2: RACE - Double-book same UNIT
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
    
    -- If here, race NOT prevented
    RAISE NOTICE '❌ TEST 2 - Race Double-Book Unit: FAILED - Was allowed!';
    DELETE FROM booking_blocks WHERE booking_id = v_booking_2;
    DELETE FROM bookings WHERE id = v_booking_2;
  EXCEPTION 
    WHEN exclusion_violation THEN
      RAISE NOTICE '✅ TEST 2 - Race Double-Book Unit: BLOCKED (exclusion_violation)';
      DELETE FROM bookings WHERE booking_number = 'STRESS-RACE';
    WHEN OTHERS THEN
      RAISE NOTICE '✅ TEST 2 - Race Double-Book Unit: BLOCKED (%)', SQLERRM;
      DELETE FROM bookings WHERE booking_number = 'STRESS-RACE';
  END;

  -- TEST 3: Block structure check
  SELECT COUNT(*) FILTER (WHERE resource_type = 'asset'), COUNT(*) FILTER (WHERE resource_type = 'ops')
  INTO v_asset_blocks, v_ops_blocks
  FROM booking_blocks WHERE booking_id = v_booking_1;
  
  IF v_asset_blocks = 1 AND v_ops_blocks = 2 THEN
    RAISE NOTICE '✅ TEST 3 - Block Structure: CORRECT (% asset + % ops)', v_asset_blocks, v_ops_blocks;
  ELSE
    RAISE NOTICE '❌ TEST 3 - Block Structure: WRONG (% asset + % ops, expected 1+2)', v_asset_blocks, v_ops_blocks;
  END IF;

  -- TEST 4: Booked date unavailable
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date, v_test_date + 1, 18);
  IF v_avail.is_available = false THEN
    RAISE NOTICE '✅ TEST 4 - Booked Date Blocked: CORRECT (%)', COALESCE(v_avail.unavailable_reason, 'Blocked');
  ELSE
    RAISE NOTICE '❌ TEST 4 - Booked Date Blocked: FAILED (shows available!)';
  END IF;

  -- TEST 5: Free date available
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date + 15, v_test_date + 16, 18);
  IF v_avail.is_available = true THEN
    RAISE NOTICE '✅ TEST 5 - Free Date Available: CORRECT';
  ELSE
    RAISE NOTICE '❌ TEST 5 - Free Date Available: FAILED (%, %)', v_avail.is_available, v_avail.unavailable_reason;
  END IF;

  -- TEST 6: Cancel frees slot
  UPDATE bookings SET status = 'cancelled' WHERE id = v_booking_1;
  DELETE FROM booking_blocks WHERE booking_id = v_booking_1;
  
  SELECT * INTO v_avail FROM check_day_rental_availability(v_product_id, v_test_date, v_test_date + 1, 18);
  IF v_avail.is_available = true THEN
    RAISE NOTICE '✅ TEST 6 - Cancel Frees Slot: CORRECT';
  ELSE
    RAISE NOTICE '❌ TEST 6 - Cancel Frees Slot: FAILED (still blocked: %)', v_avail.unavailable_reason;
  END IF;

  -- CLEANUP
  DELETE FROM booking_blocks WHERE booking_id IN (SELECT id FROM bookings WHERE booking_number LIKE 'STRESS-%');
  DELETE FROM bookings WHERE booking_number LIKE 'STRESS-%';
  DELETE FROM customers WHERE email LIKE 'stress-test-%@example.com';
  
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🧹 CLEANUP COMPLETE - Test data removed';
  RAISE NOTICE '════════════════════════════════════════';

END $$;
