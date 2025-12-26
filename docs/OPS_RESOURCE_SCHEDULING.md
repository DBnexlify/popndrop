# OPS RESOURCE SCHEDULING SYSTEM - Implementation Summary

## 📋 Overview

This implementation adds true resource-based scheduling that enables the business to scale. Previously, the system only checked if a bounce house was available. Now it tracks **operational resources** (crews/vehicles) separately from **assets** (equipment).

---

## 🗂️ Files Created/Modified

### New Migration (Run in Supabase SQL Editor)
```
supabase/migrations/20241226_ops_resource_scheduling.sql
```

### Modified Files
```
lib/booking-blocks.ts        - Updated TypeScript utilities
lib/database-types.ts        - Type definitions (already updated)
app/api/bookings/route.ts    - Booking API with crew assignment
```

---

## 🏗️ Architecture

### New Tables

| Table | Purpose |
|-------|---------|
| `ops_resources` | Crews and vehicles (name, type, is_active) |
| `ops_resource_availability` | Weekly schedule per resource |
| `booking_blocks` | Time blocks for assets AND ops |
| `product_slots` | Time slots for Party House |

### Block Types

| Block Type | What It Reserves | Duration |
|------------|------------------|----------|
| `full_rental` | Asset (bounce house/party house) | Service start → Service end |
| `delivery_leg` | Ops crew | Service start → Event start |
| `pickup_leg` | Ops crew | Event end → Service end |

**Key Insight:** Ops blocks only reserve the delivery and pickup LEGS, not the full rental period. This is what enables overlapping bookings when you have multiple crews!

---

## 📊 Scaling Validation Scenarios

### Scenario 1: Single Crew (Current State)

**Setup:**
- 1 crew (Team Alpha)
- 1 vehicle (Truck 1)

**Test Case A: Same-time deliveries**
- Booking 1: Bounce house delivery 8-11 AM
- Booking 2: Party house delivery 9 AM (service starts 8 AM)
- **Expected Result:** ❌ BLOCKED (ops conflict)
- **Why:** Same crew can't be in two places at once

**Test Case B: Non-overlapping times**
- Booking 1: Bounce house delivery 8-11 AM
- Booking 2: Party house (3-7 PM slot, service 2-8 PM)
- **Expected Result:** ✅ ALLOWED
- **Why:** Delivery times don't overlap, pickup times might use different crew

### Scenario 2: Two Crews (Scaled State)

**Setup:**
```sql
INSERT INTO ops_resources (name, resource_type, is_active)
VALUES ('Team Beta', 'delivery_crew', true);
```

**Test Case A: Same-time deliveries**
- Booking 1: Bounce house delivery 8-11 AM → Team Alpha assigned
- Booking 2: Party house delivery 9 AM → Team Beta assigned
- **Expected Result:** ✅ ALLOWED
- **Why:** Two crews available, one for each delivery

**Test Case B: Three bookings, two crews**
- Booking 1: Bounce house A delivery 8-11 AM → Team Alpha
- Booking 2: Party house delivery 9 AM → Team Beta
- Booking 3: Bounce house B delivery 9 AM → ???
- **Expected Result:** ❌ BLOCKED
- **Why:** Both crews already busy during 9-11 AM window

---

## 🔒 Race Condition Protection

### Exclusion Constraints
```sql
-- Assets: No double-booking same unit
EXCLUDE USING gist (resource_id WITH =, tstzrange(start_ts, end_ts) WITH &&)
WHERE (resource_type = 'asset');

-- Ops: No double-booking same crew
EXCLUDE USING gist (resource_id WITH =, tstzrange(start_ts, end_ts) WITH &&)
WHERE (resource_type = 'ops');
```

### Transaction Flow
1. Check availability → Returns assigned crew IDs
2. Create booking (pending)
3. Create booking blocks (with crew assignment)
4. If exclusion violation → Catch error, return "slot taken"
5. Create Stripe session
6. Payment confirms booking

### FOR UPDATE SKIP LOCKED
```sql
-- Prevents two simultaneous queries from picking same resource
SELECT r.id INTO v_resource_id
FROM ops_resources r
WHERE ...
FOR UPDATE OF r SKIP LOCKED;
```

---

## 🛠️ Admin Scaling

### Adding a New Crew
```sql
INSERT INTO ops_resources (name, resource_type, is_active, color)
VALUES ('Team Beta', 'delivery_crew', true, '#f97316');
```

### Setting Crew Schedule
```sql
-- Team Beta only works Fri-Sat
UPDATE ops_resource_availability
SET is_available = false
WHERE resource_id = (SELECT id FROM ops_resources WHERE name = 'Team Beta')
  AND day_of_week NOT IN (5, 6); -- 5=Friday, 6=Saturday
```

### Temporarily Disabling a Crew
```sql
UPDATE ops_resources
SET is_available = false
WHERE name = 'Team Alpha';
-- All future availability checks will only find other crews
```

---

## 📅 How Blocks Are Created

### For Party House (Slot-Based)
```
Event: 10 AM - 2 PM
Setup: 60 min, Teardown: 30 min, Travel: 30 min

Service Window: 8:30 AM - 3:00 PM
├─ ASSET block: 8:30 AM - 3:00 PM (full window)
├─ OPS delivery_leg: 8:30 AM - 10:00 AM (travel+setup)
└─ OPS pickup_leg: 2:00 PM - 3:00 PM (teardown+travel)
```

### For Bounce House (Day Rental)
```
Event: Saturday 9 AM - 6 PM (same-day pickup)

Service Window: 7:30 AM - 8:30 PM
├─ ASSET block: 7:30 AM - 8:30 PM (full window)
├─ OPS delivery_leg: 7:30 AM - 9:00 AM
└─ OPS pickup_leg: 6:00 PM - 8:30 PM
```

---

## 🧪 Testing Checklist

### Pre-Migration
- [ ] Backup current database
- [ ] Note current booking count

### Post-Migration
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify tables created: `SELECT * FROM ops_resources;`
- [ ] Verify slots created: `SELECT * FROM product_slots;`
- [ ] Test booking flow end-to-end

### Scaling Test
- [ ] Add second crew
- [ ] Book two overlapping times
- [ ] Verify both succeed
- [ ] Remove second crew
- [ ] Try third overlapping booking
- [ ] Verify it fails

---

## 📝 Notes for Future Development

1. **Vehicle Tracking**: The `vehicle` resource type exists but isn't actively checked. Could be used if crew and vehicle need to be paired.

2. **Cleaning Buffer**: The schema supports `cleaning_minutes` but it's currently folded into teardown. Could be separated for back-to-back slot optimization.

3. **Calendar View**: Booking blocks can be used to build a visual ops calendar showing crew assignments.

4. **Reports**: Track crew utilization by querying booking_blocks grouped by resource_id.

---

## ⚡ Quick Reference

### Check Ops Capacity
```typescript
const count = await countAvailableOpsResources(
  'delivery_crew',
  startTimestamp,
  endTimestamp
);
// Returns number of available crews
```

### Get Slot Availability
```typescript
const { slots } = await getAvailableSlotsForDate(
  productId,
  '2025-01-15',
  18 // lead time hours
);
// Each slot has is_available and unavailable_reason
```

### Check Day Rental
```typescript
const availability = await checkDayRentalAvailability(
  productId,
  '2025-01-15', // delivery
  '2025-01-15', // pickup (or next day)
  18
);
// Returns unitId, crewIds, and sameDayPickupPossible
```

---

*Last Updated: December 26, 2024*
