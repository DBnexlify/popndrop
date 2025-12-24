-- =============================================================================
-- GENERATE TEST FINANCIAL DATA
-- Run this in Supabase SQL Editor to create fake data for testing
-- All test data will have 'TEST_DATA' marker for easy cleanup
-- =============================================================================

DO $$
DECLARE
  v_booking_id UUID;
  v_customer_id UUID;
  v_unit_id UUID;
  v_category_fuel UUID;
  v_category_cleaning UUID;
  v_category_repairs UUID;
  v_category_marketing UUID;
  v_category_insurance UUID;
  v_category_software UUID;
  v_category_meals UUID;
  v_category_supplies UUID;
  v_category_fees UUID;
  v_category_other UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO v_category_fuel FROM expense_categories WHERE name = 'Fuel/Gas' LIMIT 1;
  SELECT id INTO v_category_cleaning FROM expense_categories WHERE name = 'Cleaning Supplies' LIMIT 1;
  SELECT id INTO v_category_repairs FROM expense_categories WHERE name = 'Equipment Repairs' LIMIT 1;
  SELECT id INTO v_category_marketing FROM expense_categories WHERE name = 'Marketing' LIMIT 1;
  SELECT id INTO v_category_insurance FROM expense_categories WHERE name = 'Insurance' LIMIT 1;
  SELECT id INTO v_category_software FROM expense_categories WHERE name = 'Website/Software' LIMIT 1;
  SELECT id INTO v_category_meals FROM expense_categories WHERE name = 'Meals' LIMIT 1;
  SELECT id INTO v_category_supplies FROM expense_categories WHERE name = 'Office Supplies' LIMIT 1;
  SELECT id INTO v_category_fees FROM expense_categories WHERE name = 'Bank/Processing Fees' LIMIT 1;
  SELECT id INTO v_category_other FROM expense_categories WHERE name = 'Other' LIMIT 1;

  -- ==========================================================================
  -- CREATE TEST CUSTOMER (use special email to identify)
  -- ==========================================================================
  INSERT INTO customers (first_name, last_name, email, phone)
  VALUES ('Test', 'DataCustomer', 'testdata@fake-test-example.com', '555-000-0000')
  RETURNING id INTO v_customer_id;

  -- Get a unit to use
  SELECT id INTO v_unit_id FROM units WHERE is_active = true LIMIT 1;

  -- ==========================================================================
  -- CREATE TEST BOOKING (needed for payments)
  -- ==========================================================================
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
    booking_type,
    customer_notes
  ) VALUES (
    v_customer_id,
    v_unit_id,
    'TEST-2024-001',
    'completed',
    '2024-06-15',
    '2024-06-15',
    '2024-06-15',
    'morning',
    'morning',
    '123 Test Street',
    'Ocala',
    '34471',
    200.00,
    50.00,
    150.00,
    'daily',
    'TEST_DATA - This booking is for financial testing'
  )
  RETURNING id INTO v_booking_id;

  RAISE NOTICE 'Created test booking: %', v_booking_id;

  -- ==========================================================================
  -- TEST PAYMENTS - Full year of realistic revenue
  -- ==========================================================================
  
  -- January-March (slower season)
  INSERT INTO payments (booking_id, payment_type, amount, stripe_fee, status, payment_method, created_at, notes) VALUES 
    (v_booking_id, 'full', 175.00, 5.38, 'succeeded', 'card', '2024-01-05 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-01-12 14:30:00', 'TEST_DATA'),
    (v_booking_id, 'full', 200.00, 6.10, 'succeeded', 'card', '2024-01-20 09:15:00', 'TEST_DATA'),
    (v_booking_id, 'full', 175.00, 5.38, 'succeeded', 'card', '2024-02-03 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 250.00, 7.55, 'succeeded', 'card', '2024-02-17 10:30:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-03-02 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-03-16 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 175.00, 5.38, 'succeeded', 'card', '2024-03-30 12:00:00', 'TEST_DATA');

  -- April-June (picking up)
  INSERT INTO payments (booking_id, payment_type, amount, stripe_fee, status, payment_method, created_at, notes) VALUES 
    (v_booking_id, 'full', 250.00, 7.55, 'succeeded', 'card', '2024-04-06 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-04-13 14:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 275.00, 8.28, 'succeeded', 'card', '2024-04-20 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-05-04 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-05-11 15:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 350.00, 10.45, 'succeeded', 'card', '2024-05-18 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 250.00, 7.55, 'succeeded', 'card', '2024-05-25 13:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 325.00, 9.73, 'succeeded', 'card', '2024-06-01 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 275.00, 8.28, 'succeeded', 'card', '2024-06-08 14:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 350.00, 10.45, 'succeeded', 'card', '2024-06-15 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 400.00, 11.90, 'succeeded', 'card', '2024-06-22 16:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-06-29 10:00:00', 'TEST_DATA');

  -- July-September (peak summer!)
  INSERT INTO payments (booking_id, payment_type, amount, stripe_fee, status, payment_method, created_at, notes) VALUES 
    (v_booking_id, 'full', 350.00, 10.45, 'succeeded', 'card', '2024-07-04 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 275.00, 8.28, 'succeeded', 'card', '2024-07-06 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-07-13 14:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 325.00, 9.73, 'succeeded', 'card', '2024-07-20 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 250.00, 7.55, 'succeeded', 'card', '2024-07-27 15:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 275.00, 8.28, 'succeeded', 'card', '2024-08-03 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 350.00, 10.45, 'succeeded', 'card', '2024-08-10 13:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-08-17 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-08-24 14:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 275.00, 8.28, 'succeeded', 'card', '2024-08-31 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 250.00, 7.55, 'succeeded', 'card', '2024-09-07 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 200.00, 6.10, 'succeeded', 'card', '2024-09-14 15:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-09-21 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 175.00, 5.38, 'succeeded', 'card', '2024-09-28 13:00:00', 'TEST_DATA');

  -- October-December (fall/holidays)
  INSERT INTO payments (booking_id, payment_type, amount, stripe_fee, status, payment_method, created_at, notes) VALUES 
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-10-05 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 350.00, 10.45, 'succeeded', 'card', '2024-10-12 14:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 275.00, 8.28, 'succeeded', 'card', '2024-10-19 09:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 400.00, 11.90, 'succeeded', 'card', '2024-10-31 10:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-11-02 15:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 200.00, 6.10, 'succeeded', 'card', '2024-11-16 13:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 250.00, 7.55, 'succeeded', 'card', '2024-11-23 11:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 300.00, 9.00, 'succeeded', 'card', '2024-12-07 14:00:00', 'TEST_DATA'),
    (v_booking_id, 'full', 225.00, 6.83, 'succeeded', 'card', '2024-12-14 09:00:00', 'TEST_DATA');

  -- ==========================================================================
  -- TEST EXPENSES - Realistic business expenses
  -- ==========================================================================

  -- FUEL (Line 9) - Monthly delivery fuel
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_fuel, 45.50, 'Shell', 'Delivery fuel January', '2024-01-15', 'TEST_DATA'),
    (v_category_fuel, 52.30, 'Wawa', 'Delivery fuel February', '2024-02-12', 'TEST_DATA'),
    (v_category_fuel, 67.80, 'Shell', 'Delivery fuel March', '2024-03-18', 'TEST_DATA'),
    (v_category_fuel, 58.90, 'BP', 'Delivery fuel April', '2024-04-10', 'TEST_DATA'),
    (v_category_fuel, 72.40, 'Shell', 'Delivery fuel May', '2024-05-22', 'TEST_DATA'),
    (v_category_fuel, 85.20, 'Wawa', 'Delivery fuel June', '2024-06-15', 'TEST_DATA'),
    (v_category_fuel, 91.50, 'Shell', 'Delivery fuel July', '2024-07-20', 'TEST_DATA'),
    (v_category_fuel, 88.30, 'BP', 'Delivery fuel August', '2024-08-14', 'TEST_DATA'),
    (v_category_fuel, 65.70, 'Shell', 'Delivery fuel September', '2024-09-10', 'TEST_DATA'),
    (v_category_fuel, 55.40, 'Wawa', 'Delivery fuel October', '2024-10-18', 'TEST_DATA'),
    (v_category_fuel, 48.90, 'Shell', 'Delivery fuel November', '2024-11-12', 'TEST_DATA'),
    (v_category_fuel, 52.10, 'BP', 'Delivery fuel December', '2024-12-08', 'TEST_DATA');

  -- CLEANING SUPPLIES (Line 22) - Quarterly
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_cleaning, 34.99, 'Home Depot', 'Cleaning supplies Q1', '2024-01-20', 'TEST_DATA'),
    (v_category_cleaning, 42.50, 'Walmart', 'Sanitizer and cleaners', '2024-04-05', 'TEST_DATA'),
    (v_category_cleaning, 56.75, 'Amazon', 'Bulk cleaning supplies', '2024-07-10', 'TEST_DATA'),
    (v_category_cleaning, 38.99, 'Home Depot', 'Cleaning supplies Q4', '2024-10-15', 'TEST_DATA');

  -- EQUIPMENT REPAIRS (Line 21)
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_repairs, 125.00, 'Bounce Pro Repairs', 'Patch repair on Castle unit', '2024-03-25', 'TEST_DATA'),
    (v_category_repairs, 85.50, 'Inflatable Fix', 'Blower motor repair', '2024-06-20', 'TEST_DATA'),
    (v_category_repairs, 210.00, 'Bounce Pro Repairs', 'Seam repair and inspection', '2024-09-15', 'TEST_DATA');

  -- MARKETING (Line 8)
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_marketing, 150.00, 'Facebook Ads', 'January ad campaign', '2024-01-05', 'TEST_DATA'),
    (v_category_marketing, 75.00, 'Vistaprint', 'Business cards and flyers', '2024-02-15', 'TEST_DATA'),
    (v_category_marketing, 200.00, 'Facebook Ads', 'Spring promotion', '2024-04-01', 'TEST_DATA'),
    (v_category_marketing, 300.00, 'Facebook Ads', 'Summer campaign', '2024-06-01', 'TEST_DATA'),
    (v_category_marketing, 125.00, 'Google Ads', 'Local search ads', '2024-08-15', 'TEST_DATA'),
    (v_category_marketing, 250.00, 'Facebook Ads', 'Fall/Halloween promo', '2024-10-01', 'TEST_DATA');

  -- INSURANCE (Line 15) - Quarterly payments
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_insurance, 425.00, 'State Farm', 'Q1 liability insurance', '2024-01-01', 'TEST_DATA'),
    (v_category_insurance, 425.00, 'State Farm', 'Q2 liability insurance', '2024-04-01', 'TEST_DATA'),
    (v_category_insurance, 425.00, 'State Farm', 'Q3 liability insurance', '2024-07-01', 'TEST_DATA'),
    (v_category_insurance, 425.00, 'State Farm', 'Q4 liability insurance', '2024-10-01', 'TEST_DATA');

  -- WEBSITE/SOFTWARE (Line 18) - Monthly hosting
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_software, 29.00, 'Vercel', 'Hosting January', '2024-01-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting February', '2024-02-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting March', '2024-03-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting April', '2024-04-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting May', '2024-05-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting June', '2024-06-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting July', '2024-07-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting August', '2024-08-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting September', '2024-09-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting October', '2024-10-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting November', '2024-11-15', 'TEST_DATA'),
    (v_category_software, 29.00, 'Vercel', 'Hosting December', '2024-12-15', 'TEST_DATA');

  -- MEALS (Line 24b - 50% deductible)
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_meals, 12.50, 'Chick-fil-A', 'Lunch during delivery day', '2024-03-16', 'TEST_DATA'),
    (v_category_meals, 15.75, 'Subway', 'Lunch during delivery day', '2024-05-18', 'TEST_DATA'),
    (v_category_meals, 18.90, 'Panera', 'Lunch during busy Saturday', '2024-07-04', 'TEST_DATA'),
    (v_category_meals, 14.25, 'Chipotle', 'Lunch during delivery day', '2024-08-10', 'TEST_DATA'),
    (v_category_meals, 22.50, 'Olive Garden', 'Client meeting lunch', '2024-09-22', 'TEST_DATA'),
    (v_category_meals, 16.50, 'Chick-fil-A', 'Lunch during Halloween rush', '2024-10-31', 'TEST_DATA');

  -- OFFICE SUPPLIES (Line 18)
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_supplies, 45.99, 'Staples', 'Printer ink and paper', '2024-02-20', 'TEST_DATA'),
    (v_category_supplies, 28.50, 'Amazon', 'Waiver clipboard and pens', '2024-05-10', 'TEST_DATA'),
    (v_category_supplies, 35.00, 'Staples', 'Receipt book and folders', '2024-09-05', 'TEST_DATA');

  -- BANK/PROCESSING FEES (Line 27a)
  INSERT INTO expenses (category_id, amount, vendor_name, description, expense_date, notes) VALUES 
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Jan', '2024-01-31', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Feb', '2024-02-29', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Mar', '2024-03-31', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Apr', '2024-04-30', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee May', '2024-05-31', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Jun', '2024-06-30', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Jul', '2024-07-31', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Aug', '2024-08-31', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Sep', '2024-09-30', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Oct', '2024-10-31', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Nov', '2024-11-30', 'TEST_DATA'),
    (v_category_fees, 25.00, 'Chase Bank', 'Monthly business account fee Dec', '2024-12-31', 'TEST_DATA');

  RAISE NOTICE '✅ Test financial data created successfully!';
END $$;

-- =============================================================================
-- SUMMARY OF TEST DATA
-- =============================================================================

SELECT '💰 REVENUE SUMMARY' as report;
SELECT 
  COUNT(*) as total_payments,
  SUM(amount) as gross_revenue,
  SUM(stripe_fee) as total_stripe_fees,
  SUM(amount) - SUM(stripe_fee) as net_revenue
FROM payments 
WHERE notes = 'TEST_DATA';

SELECT '📊 EXPENSE SUMMARY' as report;
SELECT 
  COUNT(*) as total_expenses,
  SUM(amount) as total_expenses_amount
FROM expenses 
WHERE notes = 'TEST_DATA';

SELECT '📋 EXPENSES BY SCHEDULE C LINE' as report;
SELECT 
  ec.schedule_c_line as "Sch C Line",
  ec.name as "Category",
  COUNT(*) as "Count",
  SUM(e.amount) as "Total",
  SUM(e.amount * ec.deduction_percent / 100) as "Deductible"
FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
WHERE e.notes = 'TEST_DATA'
GROUP BY ec.schedule_c_line, ec.name, ec.display_order
ORDER BY ec.display_order;

SELECT '💵 PROFIT/LOSS ESTIMATE' as report;
SELECT 
  (SELECT SUM(amount) FROM payments WHERE notes = 'TEST_DATA') as gross_revenue,
  (SELECT SUM(stripe_fee) FROM payments WHERE notes = 'TEST_DATA') as stripe_fees,
  (SELECT SUM(amount) FROM expenses WHERE notes = 'TEST_DATA') as total_expenses,
  (SELECT SUM(amount) FROM payments WHERE notes = 'TEST_DATA') 
    - (SELECT SUM(stripe_fee) FROM payments WHERE notes = 'TEST_DATA')
    - (SELECT SUM(amount) FROM expenses WHERE notes = 'TEST_DATA') as net_profit;
