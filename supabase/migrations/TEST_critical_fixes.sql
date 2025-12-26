-- =============================================================================
-- TEST SCRIPT: Verify Critical Fixes
-- Run this in Supabase SQL Editor AFTER running the migrations
-- 
-- This script:
-- 1. Creates test data
-- 2. Runs the functions
-- 3. Verifies expected behavior
-- 4. Cleans up test data
-- =============================================================================

-- Enable notices for test output
SET client_min_messages TO NOTICE;

DO $$
DECLARE
  -- Test data IDs
  v_test_customer_id UUID;
  v_test_product_id UUID;
  v_test_unit_id UUID;
  v_test_booking_id UUID;
  v_test_crew_id UUID;
  
  -- Test results
  v_result RECORD;
  v_count INTEGER;
  v_balance DECIMAL(10,2);
  v_credit_id UUID;
  v_slots_before INTEGER;
  v_slots_after INTEGER;
  
  -- Test dates
  v_test_date DATE := CURRENT_DATE + 7; -- One week from now
  
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STARTING CRITICAL FIXES TEST SUITE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ==========================================================================
  -- SETUP: Get existing test data or create minimal test records
  -- ==========================================================================
  
  RAISE NOTICE '📦 SETUP: Finding or creating test data...';
  
  -- Get an existing product
  SELECT id INTO v_test_product_id 
  FROM products 
  WHERE is_active = true 
  LIMIT 1;
  
  IF v_test_product_id IS NULL THEN
    RAISE NOTICE '❌ No products found. Please ensure products exist.';
    RETURN;
  END IF;
  RAISE NOTICE '  ✓ Found product: %', v_test_product_id;
  
  -- Get a unit for this product
  SELECT id INTO v_test_unit_id
  FROM units
  WHERE product_id = v_test_product_id
    AND status = 'available'
  LIMIT 1;
  
  IF v_test_unit_id IS NULL THEN
    RAISE NOTICE '❌ No units found for product. Please ensure units exist.';
    RETURN;
  END IF;
  RAISE NOTICE '  ✓ Found unit: %', v_test_unit_id;
  
  -- Get a crew
  SELECT id INTO v_test_crew_id
  FROM ops_resources
  WHERE resource_type = 'delivery_crew'
    AND is_active = true
  LIMIT 1;
  
  IF v_test_crew_id IS NULL THEN
    RAISE NOTICE '❌ No delivery crew found. Please ensure ops_resources exist.';
    RETURN;
  END IF;
  RAISE NOTICE '  ✓ Found crew: %', v_test_crew_id;
  
  -- Create test customer
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('Test', 'Customer', 'test-critical-fixes@example.com', '555-0000')
  RETURNING id INTO v_test_customer_id;
  RAISE NOTICE '  ✓ Created test customer: %', v_test_customer_id;
  
  RAISE NOTICE '';

  -- ==========================================================================
  -- TEST 1: Verify cleaning_minutes column exists
  -- ==========================================================================
  
  RAISE NOTICE '🧪 TEST 1: Verify cleaning_minutes column exists on products';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cleaning_minutes'
  ) THEN
    RAISE NOTICE '  ✅ PASS: cleaning_minutes column exists';
  ELSE
    RAISE NOTICE '  ❌ FAIL: cleaning_minutes column NOT found';
  END IF;
  
  RAISE NOTICE '';

  -- ==========================================================================
  -- TEST 2: Verify availability functions include pending status
  -- ==========================================================================
  
  RAISE NOTICE '🧪 TEST 2: Verify pending bookings block availability';
  
  -- Create a PENDING booking with blocks
  INSERT INTO bookings (
    booking_number, customer_id, unit_id, 
    event_date, delivery_date, pickup_date,
    status, subtotal, deposit_amount, balance_due,
    delivery_address, delivery_city, delivery_zip,
    product_snapshot, created_at
  ) VALUES (
    'TEST-PENDING-001', v_test_customer_id, v_test_unit_id,
    v_test_date, v_test_date, v_test_date,
    'pending', 200, 50, 150,
    '123 Test St', 'Ocala', '34470',
    '{"name": "Test Product"}'::jsonb,
    NOW() - INTERVAL '10 minutes'  -- Created 10 minutes ago (not expired)
  )
  RETURNING id INTO v_test_booking_id;
  RAISE NOTICE '  Created pending booking: %', v_test_booking_id;
  
  -- Create booking blocks for the pending booking
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES 
    (v_test_booking_id, 'asset', v_test_unit_id, 'full_rental', 
     (v_test_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
     (v_test_date || ' 20:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York'),
    (v_test_booking_id, 'ops', v_test_crew_id, 'delivery_leg',
     (v_test_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
     (v_test_date || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York'),
    (v_test_booking_id, 'ops', v_test_crew_id, 'pickup_leg',
     (v_test_date || ' 18:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
     (v_test_date || ' 20:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York');
  RAISE NOTICE '  Created booking blocks for pending booking';
  
  -- Check if day rental availability sees the pending booking as blocking
  SELECT * INTO v_result
  FROM check_day_rental_availability(v_test_product_id, v_test_date, v_test_date, 18);
  
  IF v_result.is_available = false THEN
    RAISE NOTICE '  ✅ PASS: Pending booking correctly blocks availability';
    RAISE NOTICE '    Reason: %', v_result.unavailable_reason;
  ELSE
    RAISE NOTICE '  ❌ FAIL: Pending booking did NOT block availability (this is the bug we fixed!)';
  END IF;
  
  RAISE NOTICE '';

  -- ==========================================================================
  -- TEST 3: Verify cleanup function works
  -- ==========================================================================
  
  RAISE NOTICE '🧪 TEST 3: Verify cleanup_expired_pending_bookings function';
  
  -- Update the test booking to be "expired" (created 60 minutes ago)
  UPDATE bookings 
  SET created_at = NOW() - INTERVAL '60 minutes'
  WHERE id = v_test_booking_id;
  RAISE NOTICE '  Updated booking to be 60 minutes old (should be cleaned up)';
  
  -- Count blocks before cleanup
  SELECT COUNT(*) INTO v_count FROM booking_blocks WHERE booking_id = v_test_booking_id;
  RAISE NOTICE '  Blocks before cleanup: %', v_count;
  
  -- Run cleanup with 45 minute expiry
  SELECT * INTO v_result FROM cleanup_expired_pending_bookings(45);
  RAISE NOTICE '  Cleanup result: % bookings deleted, % blocks deleted', 
    v_result.deleted_bookings, v_result.deleted_blocks;
  
  -- Verify booking was deleted
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = v_test_booking_id) THEN
    RAISE NOTICE '  ✅ PASS: Expired pending booking was cleaned up';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Expired pending booking was NOT cleaned up';
  END IF;
  
  -- Verify blocks were deleted
  SELECT COUNT(*) INTO v_count FROM booking_blocks WHERE booking_id = v_test_booking_id;
  IF v_count = 0 THEN
    RAISE NOTICE '  ✅ PASS: Booking blocks were cleaned up';
  ELSE
    RAISE NOTICE '  ❌ FAIL: % booking blocks remain', v_count;
  END IF;
  
  RAISE NOTICE '';

  -- ==========================================================================
  -- TEST 4: Verify credit system (if tables exist)
  -- ==========================================================================
  
  RAISE NOTICE '🧪 TEST 4: Verify credit system';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credits') THEN
    -- Issue a credit
    SELECT issue_credit(
      v_test_customer_id,
      75.00,
      'weather_cancellation',
      NULL,
      'Test credit for verification'
    ) INTO v_credit_id;
    RAISE NOTICE '  Created credit: %', v_credit_id;
    
    -- Check balance
    SELECT get_customer_credit_balance(v_test_customer_id) INTO v_balance;
    IF v_balance = 75.00 THEN
      RAISE NOTICE '  ✅ PASS: Credit balance is correct ($%)', v_balance;
    ELSE
      RAISE NOTICE '  ❌ FAIL: Credit balance is $% (expected $75.00)', v_balance;
    END IF;
    
    -- Clean up credit
    DELETE FROM credits WHERE id = v_credit_id;
    RAISE NOTICE '  Cleaned up test credit';
  ELSE
    RAISE NOTICE '  ⚠️ SKIPPED: Credits table does not exist (run credit_system migration first)';
  END IF;
  
  RAISE NOTICE '';

  -- ==========================================================================
  -- TEST 5: Verify ops resource availability with pending blocks
  -- ==========================================================================
  
  RAISE NOTICE '🧪 TEST 5: Verify ops resource availability respects pending blocks';
  
  -- Create another pending booking for tomorrow
  v_test_date := CURRENT_DATE + 3;
  
  INSERT INTO bookings (
    booking_number, customer_id, unit_id, 
    event_date, delivery_date, pickup_date,
    status, subtotal, deposit_amount, balance_due,
    delivery_address, delivery_city, delivery_zip,
    product_snapshot, created_at
  ) VALUES (
    'TEST-PENDING-002', v_test_customer_id, v_test_unit_id,
    v_test_date, v_test_date, v_test_date,
    'pending', 200, 50, 150,
    '123 Test St', 'Ocala', '34470',
    '{"name": "Test Product"}'::jsonb,
    NOW()  -- Just created (not expired)
  )
  RETURNING id INTO v_test_booking_id;
  
  -- Create ops block
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  VALUES (v_test_booking_id, 'ops', v_test_crew_id, 'delivery_leg',
     (v_test_date || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
     (v_test_date || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York');
  
  -- Check if ops_resource_available sees the pending block
  SELECT ops_resource_available(
    v_test_crew_id,
    (v_test_date || ' 08:30:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
    (v_test_date || ' 09:30:00')::TIMESTAMP AT TIME ZONE 'America/New_York'
  ) INTO v_result;
  
  IF v_result.ops_resource_available = false THEN
    RAISE NOTICE '  ✅ PASS: Pending ops block correctly shows resource as unavailable';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Pending ops block did NOT block resource';
  END IF;
  
  -- Check count_available_ops_resources
  SELECT count_available_ops_resources(
    'delivery_crew',
    (v_test_date || ' 08:30:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
    (v_test_date || ' 09:30:00')::TIMESTAMP AT TIME ZONE 'America/New_York'
  ) INTO v_count;
  
  -- Get total active crews to compare
  DECLARE
    v_total_crews INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_total_crews FROM ops_resources WHERE resource_type = 'delivery_crew' AND is_active = true;
    
    IF v_count < v_total_crews THEN
      RAISE NOTICE '  ✅ PASS: count_available_ops_resources shows reduced availability (% of % available)', v_count, v_total_crews;
    ELSE
      RAISE NOTICE '  ⚠️ INFO: count_available_ops_resources shows % of % available', v_count, v_total_crews;
    END IF;
  END;
  
  RAISE NOTICE '';

  -- ==========================================================================
  -- CLEANUP: Remove all test data
  -- ==========================================================================
  
  RAISE NOTICE '🧹 CLEANUP: Removing test data...';
  
  -- Delete test bookings (cascade will delete blocks)
  DELETE FROM bookings WHERE customer_id = v_test_customer_id;
  RAISE NOTICE '  Deleted test bookings';
  
  -- Delete test customer
  DELETE FROM customers WHERE id = v_test_customer_id;
  RAISE NOTICE '  Deleted test customer';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST SUITE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If all tests show ✅ PASS, the migrations are working correctly.';
  RAISE NOTICE 'If any tests show ❌ FAIL, review the migration and re-run.';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on error
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'Cleaning up test data...';
    
    IF v_test_customer_id IS NOT NULL THEN
      DELETE FROM bookings WHERE customer_id = v_test_customer_id;
      DELETE FROM customers WHERE id = v_test_customer_id;
    END IF;
    
    RAISE;
END $$;
