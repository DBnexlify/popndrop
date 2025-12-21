# Double Booking Prevention Setup
## Pop and Drop Rentals

> **Time Required:** ~5 minutes  
> **When to run:** After deploying the site, before going live

---

## What This Fixes

Without this protection, if two customers try to book the same date at the exact same millisecond, both could potentially succeed. This migration adds bulletproof database-level protection.

---

## How to Apply

### Step 1: Open Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Open your Pop and Drop project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Migration

Copy and paste this SQL:

```sql
-- Enable required extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add constraint to prevent overlapping bookings on same unit
ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  unit_id WITH =,
  daterange(delivery_date, pickup_date, '[]') WITH &&
)
WHERE (status NOT IN ('cancelled'));
```

Click **Run** (or Cmd+Enter / Ctrl+Enter).

### Step 3: Verify It Worked

Run this query to confirm:

```sql
SELECT conname FROM pg_constraint 
WHERE conrelid = 'bookings'::regclass 
AND conname = 'bookings_no_overlap';
```

You should see one row with `bookings_no_overlap`.

---

## What If It Fails?

If you get an error about "existing data violates constraint", you have overlapping bookings in the database. Run this to find them:

```sql
SELECT 
  b1.booking_number as booking_1,
  b2.booking_number as booking_2,
  b1.delivery_date, b1.pickup_date,
  b2.delivery_date, b2.pickup_date
FROM bookings b1
JOIN bookings b2 ON b1.unit_id = b2.unit_id
  AND b1.id < b2.id
  AND b1.status NOT IN ('cancelled')
  AND b2.status NOT IN ('cancelled')
  AND daterange(b1.delivery_date, b1.pickup_date, '[]') && 
      daterange(b2.delivery_date, b2.pickup_date, '[]');
```

Then either:
- Cancel one of the conflicting bookings in the admin dashboard
- Or manually update dates: `UPDATE bookings SET status = 'cancelled' WHERE booking_number = 'XXX';`

Then re-run the constraint migration.

---

## How It Works

```
Two customers book same date simultaneously
         ↓
Both pass the initial availability check
         ↓
Both try to insert booking
         ↓
Database constraint catches the conflict
         ↓
One succeeds, one gets: "Someone just booked this date!"
         ↓
Blocked customer can choose another date
```

The API code already handles this gracefully and shows a friendly error message.

---

## Optional: Update the Function Too

For extra protection (belt AND suspenders), also run this:

```sql
CREATE OR REPLACE FUNCTION find_available_unit(
  p_product_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  SELECT u.id INTO v_unit_id
  FROM units u
  WHERE u.product_id = p_product_id
    AND u.status = 'available'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.unit_id = u.id
        AND b.status NOT IN ('cancelled')
        AND daterange(b.delivery_date, b.pickup_date, '[]') && 
            daterange(p_start_date, p_end_date, '[]')
    )
    AND NOT EXISTS (
      SELECT 1 FROM blackout_dates bd
      WHERE bd.product_id = p_product_id
        AND daterange(bd.start_date, bd.end_date, '[]') &&
            daterange(p_start_date, p_end_date, '[]')
    )
  ORDER BY u.id
  LIMIT 1
  FOR UPDATE OF u SKIP LOCKED;
  
  RETURN v_unit_id;
END;
$$;
```

This adds row-level locking so concurrent requests won't even see the same unit as available.

---

## Done!

No code deployment needed — this is purely a database change. The API already knows how to handle the constraint.
