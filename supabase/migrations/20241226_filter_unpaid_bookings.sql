-- =============================================================================
-- MIGRATION: Filter Unpaid Bookings from Admin Views
-- Date: December 26, 2024
-- Purpose: Only show PAID bookings (deposit_paid = true) in admin dashboard
-- =============================================================================

-- Business Logic:
-- UNPAID bookings (deposit_paid = false, status = 'pending') are "soft holds"
-- - They should NOT appear in admin dashboard
-- - They should NOT appear in delivery/pickup schedules
-- - They are just temporary date holds until payment is completed

-- =============================================================================
-- 1. UPDATE todays_deliveries VIEW
-- =============================================================================

DROP VIEW IF EXISTS todays_deliveries;

CREATE VIEW todays_deliveries AS
SELECT 
  b.booking_number,
  b.delivery_window,
  b.delivery_address,
  b.delivery_city,
  b.delivery_notes,
  CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
  c.phone AS customer_phone,
  (b.product_snapshot->>'name')::text AS product_name,
  u.unit_number,
  b.status
FROM bookings b
JOIN customers c ON c.id = b.customer_id
JOIN units u ON u.id = b.unit_id
WHERE b.delivery_date = CURRENT_DATE
  AND b.status = 'confirmed'
  AND b.deposit_paid = true  -- Only PAID bookings
ORDER BY 
  CASE b.delivery_window
    WHEN 'morning' THEN 1
    WHEN 'midday' THEN 2
    WHEN 'afternoon' THEN 3
    WHEN 'saturday-evening' THEN 4
    ELSE 5
  END;

COMMENT ON VIEW todays_deliveries IS 'Today''s confirmed deliveries - only shows paid bookings';

-- =============================================================================
-- 2. UPDATE todays_pickups VIEW
-- =============================================================================

DROP VIEW IF EXISTS todays_pickups;

CREATE VIEW todays_pickups AS
SELECT 
  b.booking_number,
  b.pickup_window,
  b.delivery_address,
  b.delivery_city,
  CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
  c.phone AS customer_phone,
  (b.product_snapshot->>'name')::text AS product_name,
  u.unit_number,
  b.balance_due,
  b.balance_paid,
  b.status
FROM bookings b
JOIN customers c ON c.id = b.customer_id
JOIN units u ON u.id = b.unit_id
WHERE b.pickup_date = CURRENT_DATE
  AND b.status = 'delivered'
  AND b.deposit_paid = true  -- Only PAID bookings
ORDER BY 
  CASE b.pickup_window
    WHEN 'morning' THEN 1
    WHEN 'next-morning' THEN 2
    WHEN 'monday-morning' THEN 3
    WHEN 'monday-afternoon' THEN 4
    WHEN 'evening' THEN 5
    ELSE 6
  END;

COMMENT ON VIEW todays_pickups IS 'Today''s pickups from delivered bookings - only shows paid bookings';

-- =============================================================================
-- 3. UPDATE upcoming_week_schedule VIEW
-- =============================================================================

DROP VIEW IF EXISTS upcoming_week_schedule;

CREATE VIEW upcoming_week_schedule AS
(
  -- Deliveries
  SELECT 
    'delivery'::text AS event_type,
    b.delivery_date AS event_date,
    b.delivery_window AS time_window,
    b.booking_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone AS customer_phone,
    CONCAT(b.delivery_address, ', ', b.delivery_city) AS address,
    (b.product_snapshot->>'name')::text AS product_name,
    b.status
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.delivery_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
    AND b.status IN ('confirmed', 'delivered', 'picked_up')
    AND b.deposit_paid = true  -- Only PAID bookings
)
UNION ALL
(
  -- Pickups
  SELECT 
    'pickup'::text AS event_type,
    b.pickup_date AS event_date,
    b.pickup_window AS time_window,
    b.booking_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone AS customer_phone,
    CONCAT(b.delivery_address, ', ', b.delivery_city) AS address,
    (b.product_snapshot->>'name')::text AS product_name,
    b.status
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.pickup_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
    AND b.status IN ('confirmed', 'delivered', 'picked_up')
    AND b.deposit_paid = true  -- Only PAID bookings
)
ORDER BY event_date, 
  CASE time_window
    WHEN 'morning' THEN 1
    WHEN 'midday' THEN 2
    WHEN 'afternoon' THEN 3
    WHEN 'saturday-evening' THEN 4
    WHEN 'evening' THEN 5
    WHEN 'next-morning' THEN 6
    WHEN 'monday-morning' THEN 7
    WHEN 'monday-afternoon' THEN 8
    ELSE 9
  END;

COMMENT ON VIEW upcoming_week_schedule IS 'Next 7 days of deliveries and pickups - only shows paid bookings';

-- =============================================================================
-- VERIFICATION QUERIES (Run these to confirm changes)
-- =============================================================================

-- Check that views now exclude unpaid bookings:
-- SELECT * FROM todays_deliveries;
-- SELECT * FROM todays_pickups;
-- SELECT * FROM upcoming_week_schedule LIMIT 20;

-- Count of pending unpaid bookings (these should NOT appear in views):
-- SELECT COUNT(*) FROM bookings WHERE status = 'pending' AND deposit_paid = false;
