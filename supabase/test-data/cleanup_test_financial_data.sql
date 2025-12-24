-- =============================================================================
-- CLEANUP TEST FINANCIAL DATA
-- Run this in Supabase SQL Editor to DELETE all test data
-- Only removes records marked with 'TEST_DATA'
-- =============================================================================

-- Show what will be deleted BEFORE deleting
SELECT '⚠️ RECORDS TO BE DELETED:' as warning;

SELECT 'Payments to delete:' as type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
FROM payments WHERE notes = 'TEST_DATA';

SELECT 'Expenses to delete:' as type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
FROM expenses WHERE notes = 'TEST_DATA';

SELECT 'Bookings to delete:' as type, COUNT(*) as count
FROM bookings WHERE customer_notes LIKE '%TEST_DATA%' OR booking_number LIKE 'TEST-%';

SELECT 'Customers to delete:' as type, COUNT(*) as count
FROM customers WHERE email = 'testdata@fake-test-example.com';

-- =============================================================================
-- DELETE TEST DATA (in correct order due to foreign keys)
-- =============================================================================

-- 1. Delete test payments first (references bookings)
DELETE FROM payments WHERE notes = 'TEST_DATA';

-- 2. Delete test expenses
DELETE FROM expenses WHERE notes = 'TEST_DATA';

-- 3. Delete test bookings (references customers)
DELETE FROM bookings WHERE customer_notes LIKE '%TEST_DATA%' OR booking_number LIKE 'TEST-%';

-- 4. Delete test customers last (identified by special email)
DELETE FROM customers WHERE email = 'testdata@fake-test-example.com';

-- =============================================================================
-- VERIFY DELETION
-- =============================================================================
SELECT '✅ DELETION COMPLETE - VERIFICATION:' as status;

SELECT 'Remaining test payments:' as check_type, COUNT(*) as count
FROM payments WHERE notes = 'TEST_DATA';

SELECT 'Remaining test expenses:' as check_type, COUNT(*) as count
FROM expenses WHERE notes = 'TEST_DATA';

SELECT 'Remaining test bookings:' as check_type, COUNT(*) as count
FROM bookings WHERE customer_notes LIKE '%TEST_DATA%' OR booking_number LIKE 'TEST-%';

SELECT 'Remaining test customers:' as check_type, COUNT(*) as count
FROM customers WHERE email = 'testdata@fake-test-example.com';

SELECT '🧹 All TEST_DATA records have been removed!' as result;
