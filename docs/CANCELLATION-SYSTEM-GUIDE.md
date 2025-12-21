# Cancellation & Refund System Setup Guide

## Overview

The cancellation system allows customers to request booking cancellations through their "My Bookings" page. Requests are reviewed by admin who can approve/deny and process refunds through Stripe automatically.

## Setup Time: ~10 minutes

---

## Step 1: Run Database Migration

Copy and paste this SQL into **Supabase SQL Editor** and run it:

📄 **File:** `supabase/migrations/004_cancellation_system.sql`

This creates:
- `cancellation_policies` table (configurable refund rules)
- `cancellation_requests` table (customer requests)
- `calculate_refund()` function
- Adds `stripe_payment_intent_id` column to bookings

---

## Step 2: Verify Stripe Webhook

Ensure your Stripe webhook is capturing payment intent IDs. The webhook handler (`/api/stripe/webhook/route.ts`) has been updated to save `stripe_payment_intent_id` to bookings.

**Note:** Only bookings made AFTER this update will have the payment intent stored. Older bookings won't be refundable through the system (you'd need to manually add the payment intent ID to the database or process refunds through Stripe dashboard).

---

## Step 3: Test the Flow

### Customer Side:
1. Go to `/my-bookings`
2. Enter an email with an existing booking
3. Click "Cancel Booking" on an upcoming booking
4. See the refund preview and policy
5. Submit cancellation request

### Admin Side:
1. Go to `/admin/cancellations`
2. See pending requests with customer info
3. Adjust refund amount if needed
4. Click "Approve & Refund" or "Deny"
5. Refund is processed through Stripe automatically

---

## Default Cancellation Policy

The system comes with this default policy (can be customized in database):

| Days Before Event | Refund |
|------------------|--------|
| 7+ days | 100% refund |
| 3-6 days | 50% refund |
| 0-2 days | No refund |

**Weather cancellations:** Full refund (customer selects "weather" as reason)
**Processing fee:** $0 (can be configured)

---

## Customizing the Policy

Edit the `cancellation_policies` table in Supabase:

```sql
UPDATE cancellation_policies 
SET rules = '[
  {"min_days": 14, "max_days": null, "refund_percent": 100, "label": "14+ days before"},
  {"min_days": 7, "max_days": 13, "refund_percent": 75, "label": "7-13 days before"},
  {"min_days": 3, "max_days": 6, "refund_percent": 50, "label": "3-6 days before"},
  {"min_days": 0, "max_days": 2, "refund_percent": 0, "label": "0-2 days before"}
]'::jsonb,
processing_fee = 5.00
WHERE is_active = true;
```

---

## API Endpoints

### Customer Endpoints

**GET `/api/cancellations/request?bookingId=xxx&email=xxx`**
- Get refund preview for a booking
- Returns policy details and estimated refund

**POST `/api/cancellations/request`**
- Submit cancellation request
- Body: `{ bookingId, email, reason?, cancellationType? }`

### Admin Endpoints

**GET `/api/cancellations/review?status=pending`**
- List all cancellation requests
- Filter by status: pending, approved, denied, refunded, all

**POST `/api/cancellations/review`**
- Process a request
- Body: `{ requestId, action, refundAmount?, adminNotes? }`
- Actions: `approve`, `deny`, `refund`

---

## Booking Status Flow

```
confirmed → pending_cancellation → cancelled
                    ↓
              (if denied)
                    ↓
              confirmed (restored)
```

---

## Files Created/Modified

### New Files:
- `/lib/cancellations.ts` - Refund calculation logic
- `/app/api/cancellations/request/route.ts` - Customer API
- `/app/api/cancellations/review/route.ts` - Admin API
- `/components/site/cancellation-modal.tsx` - Customer modal
- `/app/admin/(dashboard)/cancellations/page.tsx` - Admin page
- `/app/admin/(dashboard)/cancellations/cancellation-requests-list.tsx` - Admin list

### Modified Files:
- `/app/(site)/my-bookings/my-bookings-content.tsx` - Added cancel button
- `/app/api/stripe/webhook/route.ts` - Captures payment intent ID
- `/components/admin/admin-nav.tsx` - Added cancellations link
- `/components/admin/admin-mobile-nav.tsx` - Added cancellations link

---

## Troubleshooting

### "No payment found to refund"
- Booking was made before the payment intent tracking was added
- Manually add `stripe_payment_intent_id` to the booking in Supabase, or
- Process refund directly through Stripe dashboard

### Refund fails
- Check Stripe dashboard for the payment status
- Verify the payment intent ID is correct
- Ensure sufficient balance in Stripe account

### Customer can't find booking
- Verify email matches exactly (case-insensitive)
- Check booking exists and isn't already cancelled

---

## Future Enhancements (TODO)

- [ ] Email: Cancellation request confirmation
- [ ] Email: Cancellation approved/denied notification
- [ ] Admin: Sound notification for new requests
- [ ] Customer: Reschedule option instead of cancel
