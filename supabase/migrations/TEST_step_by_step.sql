-- =============================================================================
-- STEP-BY-STEP TEST SCRIPT
-- Run each section one at a time in Supabase SQL Editor
-- =============================================================================

-- ============================================================================
-- STEP 1: Verify the migration ran (check for new column)
-- ============================================================================

-- Should return a row with cleaning_minutes column
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'cleaning_minutes';

-- ============================================================================
-- STEP 2: Verify cleanup function exists
-- ============================================================================

-- Should return the function definition
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'cleanup_expired_pending_bookings';

-- ============================================================================
-- STEP 3: Test the cleanup function (dry run - no real data affected)
-- ============================================================================

-- This will show what WOULD be cleaned up (pending bookings > 45 mins old)
-- If you have no old pending bookings, it returns 0
SELECT * FROM cleanup_expired_pending_bookings(45);

-- ============================================================================
-- STEP 4: Check current pending bookings
-- ============================================================================

-- See all pending bookings and their age
SELECT 
  id,
  booking_number,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS minutes_old
FROM bookings 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 5: Verify availability functions check pending status
-- ============================================================================

-- Check the function source to confirm it includes 'pending'
-- Look for: b.status IN ('pending', 'confirmed', ...
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'check_day_rental_availability'
LIMIT 1;

-- ============================================================================
-- STEP 6: Test availability with a real product
-- ============================================================================

-- Replace with your actual product ID
-- Get a product ID first:
SELECT id, name, slug, scheduling_mode FROM products WHERE is_active = true LIMIT 5;

-- Then test availability for a date 7 days from now:
-- Replace 'YOUR-PRODUCT-ID-HERE' with an actual UUID
/*
SELECT * FROM check_day_rental_availability(
  'YOUR-PRODUCT-ID-HERE'::UUID,
  CURRENT_DATE + 7,
  CURRENT_DATE + 7,
  18
);
*/

-- ============================================================================
-- STEP 7: Verify credit system tables exist (if you ran that migration)
-- ============================================================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('credits', 'credit_redemptions');

-- ============================================================================
-- STEP 8: Test credit functions (if tables exist)
-- ============================================================================

-- Get a customer ID first:
SELECT id, email, first_name FROM customers LIMIT 5;

-- Then test getting their credit balance:
-- Replace 'CUSTOMER-ID-HERE' with an actual UUID
/*
SELECT get_customer_credit_balance('CUSTOMER-ID-HERE'::UUID);
*/

-- ============================================================================
-- STEP 9: Check booking blocks table
-- ============================================================================

-- See recent booking blocks
SELECT 
  bb.id,
  bb.booking_id,
  bb.resource_type,
  bb.block_type,
  bb.start_ts,
  bb.end_ts,
  b.booking_number,
  b.status
FROM booking_blocks bb
JOIN bookings b ON b.id = bb.booking_id
ORDER BY bb.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 10: Simulate the "ghost block" scenario
-- ============================================================================

-- This creates a test scenario to verify the fix works
-- WARNING: This creates real test data - clean it up after!

/*
-- Create a test pending booking that's "old" (would be cleaned up)
DO $$
DECLARE
  v_customer_id UUID;
  v_unit_id UUID;
  v_booking_id UUID;
BEGIN
  -- Get a customer
  SELECT id INTO v_customer_id FROM customers LIMIT 1;
  
  -- Get a unit
  SELECT id INTO v_unit_id FROM units WHERE status = 'available' LIMIT 1;
  
  -- Create old pending booking
  INSERT INTO bookings (
    booking_number, customer_id, unit_id,
    event_date, delivery_date, pickup_date,
    status, subtotal, deposit_amount, balance_due,
    delivery_address, delivery_city, delivery_zip,
    product_snapshot,
    created_at  -- Set to 60 minutes ago
  ) VALUES (
    'TEST-GHOST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    v_customer_id, v_unit_id,
    CURRENT_DATE + 14, CURRENT_DATE + 14, CURRENT_DATE + 14,
    'pending', 200, 50, 150,
    '123 Test St', 'Ocala', '34470',
    '{"name": "Ghost Test"}'::jsonb,
    NOW() - INTERVAL '60 minutes'
  )
  RETURNING id INTO v_booking_id;
  
  -- Create a block for it
  INSERT INTO booking_blocks (booking_id, resource_type, resource_id, block_type, start_ts, end_ts)
  SELECT 
    v_booking_id, 
    'asset', 
    v_unit_id, 
    'full_rental',
    (CURRENT_DATE + 14 || ' 08:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York',
    (CURRENT_DATE + 14 || ' 20:00:00')::TIMESTAMP AT TIME ZONE 'America/New_York';
  
  RAISE NOTICE 'Created test booking: %', v_booking_id;
  RAISE NOTICE 'Now run cleanup_expired_pending_bookings(45) to see it get cleaned up';
END $$;

-- Check it was created
SELECT * FROM bookings WHERE booking_number LIKE 'TEST-GHOST-%';

-- Run cleanup
SELECT * FROM cleanup_expired_pending_bookings(45);

-- Verify it was cleaned up
SELECT * FROM bookings WHERE booking_number LIKE 'TEST-GHOST-%';
-- Should return 0 rows!
*/
