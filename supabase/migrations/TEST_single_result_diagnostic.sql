-- =============================================================================
-- 🔬 SINGLE-RESULT DIAGNOSTIC SUITE
-- Run this in Supabase SQL Editor - outputs ONE combined result
-- =============================================================================

WITH 
-- Counts
booking_counts AS (
  SELECT 
    COUNT(*) FILTER (WHERE true) AS total,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
  FROM bookings
),
block_counts AS (
  SELECT 
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE resource_type = 'asset') AS asset_blocks,
    COUNT(*) FILTER (WHERE resource_type = 'ops') AS ops_blocks
  FROM booking_blocks
),
resource_counts AS (
  SELECT 
    COUNT(*) FILTER (WHERE resource_type = 'delivery_crew' AND is_active) AS crews,
    COUNT(*) FILTER (WHERE resource_type = 'vehicle' AND is_active) AS vehicles
  FROM ops_resources
),
unit_counts AS (
  SELECT COUNT(*) AS available_units FROM units WHERE status = 'available'
),
-- Integrity checks
orphaned_blocks AS (
  SELECT COUNT(*) AS cnt FROM booking_blocks bb 
  LEFT JOIN bookings b ON b.id = bb.booking_id 
  WHERE b.id IS NULL
),
confirmed_no_blocks AS (
  SELECT COUNT(*) AS cnt FROM bookings b 
  WHERE b.status IN ('confirmed', 'delivered') 
  AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id)
),
stale_pending AS (
  SELECT COUNT(*) AS cnt FROM bookings 
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '45 minutes'
),
pending_no_blocks AS (
  SELECT COUNT(*) AS cnt FROM bookings b 
  WHERE b.status = 'pending' 
  AND NOT EXISTS (SELECT 1 FROM booking_blocks WHERE booking_id = b.id)
),
-- Constraints check
constraints_check AS (
  SELECT 
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_blocks_asset_no_overlap') AS asset_constraint,
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_blocks_ops_no_overlap') AS ops_constraint
)

SELECT * FROM (
  -- HEADER
  SELECT 1 AS sort, '═══════════════════════════════════════════════════════════════' AS "Category", '' AS "Metric", '' AS "Value", '' AS "Status"
  UNION ALL SELECT 2, '🏠 SYSTEM HEALTH DASHBOARD', '', '', ''
  UNION ALL SELECT 3, '═══════════════════════════════════════════════════════════════', '', '', ''
  
  -- Booking counts
  UNION ALL SELECT 10, 'Bookings', 'Total', (SELECT total::TEXT FROM booking_counts), '📊'
  UNION ALL SELECT 11, 'Bookings', 'Pending (Soft Holds)', (SELECT pending::TEXT FROM booking_counts), 
    CASE WHEN (SELECT pending FROM booking_counts) > 10 THEN '⚠️ High' ELSE '✅' END
  UNION ALL SELECT 12, 'Bookings', 'Confirmed', (SELECT confirmed::TEXT FROM booking_counts), '✅'
  UNION ALL SELECT 13, 'Bookings', 'Completed', (SELECT completed::TEXT FROM booking_counts), '🎉'
  UNION ALL SELECT 14, 'Bookings', 'Cancelled', (SELECT cancelled::TEXT FROM booking_counts), '❌'
  
  -- Block counts
  UNION ALL SELECT 20, '───────────────────────', '───────────────────', '──────────', '──────'
  UNION ALL SELECT 21, 'Booking Blocks', 'Total Blocks', (SELECT total::TEXT FROM block_counts), '📦'
  UNION ALL SELECT 22, 'Booking Blocks', 'Asset Blocks (Units)', (SELECT asset_blocks::TEXT FROM block_counts), '🏠'
  UNION ALL SELECT 23, 'Booking Blocks', 'Ops Blocks (Crews)', (SELECT ops_blocks::TEXT FROM block_counts), '👷'
  
  -- Resources
  UNION ALL SELECT 30, '───────────────────────', '───────────────────', '──────────', '──────'
  UNION ALL SELECT 31, 'Resources', 'Active Delivery Crews', (SELECT crews::TEXT FROM resource_counts), '🚚'
  UNION ALL SELECT 32, 'Resources', 'Active Vehicles', (SELECT vehicles::TEXT FROM resource_counts), '🚛'
  UNION ALL SELECT 33, 'Resources', 'Available Units', (SELECT available_units::TEXT FROM unit_counts), '🎈'
  
  -- Race condition protection
  UNION ALL SELECT 40, '═══════════════════════════════════════════════════════════════', '', '', ''
  UNION ALL SELECT 41, '🛡️ RACE CONDITION PROTECTION', '', '', ''
  UNION ALL SELECT 42, '═══════════════════════════════════════════════════════════════', '', '', ''
  UNION ALL SELECT 43, 'Constraint', 'Asset No-Overlap', 
    CASE WHEN (SELECT asset_constraint FROM constraints_check) THEN 'EXISTS' ELSE 'MISSING!' END,
    CASE WHEN (SELECT asset_constraint FROM constraints_check) THEN '✅ PROTECTED' ELSE '❌ VULNERABLE!' END
  UNION ALL SELECT 44, 'Constraint', 'Ops No-Overlap',
    CASE WHEN (SELECT ops_constraint FROM constraints_check) THEN 'EXISTS' ELSE 'MISSING!' END,
    CASE WHEN (SELECT ops_constraint FROM constraints_check) THEN '✅ PROTECTED' ELSE '❌ VULNERABLE!' END
  
  -- Data integrity
  UNION ALL SELECT 50, '═══════════════════════════════════════════════════════════════', '', '', ''
  UNION ALL SELECT 51, '🔍 DATA INTEGRITY CHECKS', '', '', ''
  UNION ALL SELECT 52, '═══════════════════════════════════════════════════════════════', '', '', ''
  UNION ALL SELECT 53, 'Integrity', 'Orphaned Blocks', (SELECT cnt::TEXT FROM orphaned_blocks),
    CASE WHEN (SELECT cnt FROM orphaned_blocks) = 0 THEN '✅ Clean' ELSE '⚠️ ISSUE' END
  UNION ALL SELECT 54, 'Integrity', 'Confirmed w/o Blocks', (SELECT cnt::TEXT FROM confirmed_no_blocks),
    CASE WHEN (SELECT cnt FROM confirmed_no_blocks) = 0 THEN '✅ Clean' ELSE '🔴 CRITICAL' END
  UNION ALL SELECT 55, 'Integrity', 'Stale Pending (>45m)', (SELECT cnt::TEXT FROM stale_pending),
    CASE WHEN (SELECT cnt FROM stale_pending) = 0 THEN '✅ Clean' ELSE '🟡 Cleanup needed' END
  UNION ALL SELECT 56, 'Integrity', 'Pending w/o Blocks', (SELECT cnt::TEXT FROM pending_no_blocks),
    CASE WHEN (SELECT cnt FROM pending_no_blocks) = 0 THEN '✅ Clean' ELSE '🔴 CRITICAL' END
  
  -- Summary
  UNION ALL SELECT 60, '═══════════════════════════════════════════════════════════════', '', '', ''
  UNION ALL SELECT 61, '🎯 OVERALL STATUS', '', 
    CASE 
      WHEN (SELECT asset_constraint AND ops_constraint FROM constraints_check)
           AND (SELECT cnt FROM orphaned_blocks) = 0
           AND (SELECT cnt FROM confirmed_no_blocks) = 0
           AND (SELECT cnt FROM pending_no_blocks) = 0
      THEN 'ALL SYSTEMS GO ✅'
      ELSE 'ISSUES DETECTED ⚠️'
    END, '🚀'
  UNION ALL SELECT 62, '═══════════════════════════════════════════════════════════════', '', '', ''
) AS results
ORDER BY sort;
