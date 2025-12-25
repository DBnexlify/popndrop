# Payment System Audit & ACH Support Implementation

## Summary

This comprehensive audit and implementation adds bulletproof payment handling including:
- **All 12 Stripe webhook events** properly handled
- **ACH/Bank transfer support** (async payments that take 3-5 days)
- **Complete idempotency protection** via stripe_events table
- **Financial dashboard accuracy** - pending ACH not counted as revenue
- **Customer-facing ACH status** on success page

---

## Files Created/Modified

### 1. Database Migration
**File:** `supabase/migrations/20241225_ach_payment_support.sql`

**Run this in Supabase SQL Editor before deploying!**

Adds:
- `bookings` table: ACH tracking columns (payment_method_type, is_async_payment, async_payment_status, etc.)
- `payments` table: ACH tracking columns (bank_name, bank_last_four, is_async, async_status, etc.)
- `stripe_events` table: Webhook idempotency tracking
- `pending_ach_payments` view: Dashboard view for pending ACH
- Helper functions: `is_stripe_event_processed()`, `record_stripe_event()`
- Indexes for efficient queries

---

### 2. Webhook Handler (Complete Rewrite)
**File:** `app/api/stripe/webhook/route.ts`

**Now handles ALL 12 Stripe events:**

| Event | Status | Purpose |
|-------|--------|---------|
| `checkout.session.completed` | ✅ Full | Card payments (immediate confirm) |
| `checkout.session.async_payment_succeeded` | ✅ NEW | ACH cleared (confirm booking) |
| `checkout.session.async_payment_failed` | ✅ NEW | ACH failed (notify customer) |
| `checkout.session.expired` | ✅ Full | Session timeout logging |
| `payment_intent.succeeded` | ✅ Full | Payment confirmation |
| `payment_intent.payment_failed` | ✅ Full | Payment failure tracking |
| `charge.refunded` | ✅ Full | Refund with fee loss tracking |
| `charge.updated` | ✅ Full | Status change logging |
| `charge.dispute.created` | ✅ Full | Chargeback alerts + expense |
| `refund.created` | ✅ NEW | Refund initiation |
| `refund.updated` | ✅ NEW | Refund status updates |

**Key features:**
- Idempotency via stripe_events table (no duplicate processing)
- ACH-aware: Doesn't confirm booking until payment clears
- Actual Stripe fee from balance_transaction (not estimated)
- Comprehensive email notifications for all scenarios
- Promo code usage tracking

---

### 3. Checkout Route Update
**File:** `app/api/stripe/create-checkout/route.ts`

**Changes:**
- Enables ACH/bank transfer (`us_bank_account`) payment method
- Configurable via `ENABLE_ACH_PAYMENTS` flag
- Uses instant verification when available
- Falls back to microdeposits if needed
- Passes all necessary metadata for webhook processing

---

### 4. Booking Status API Update
**File:** `app/api/bookings/status/route.ts`

**Changes:**
- Returns ACH-specific status fields
- Distinguishes between card (immediate) and ACH (pending) payments
- Provides estimated clearance messaging for ACH

---

### 5. Success Page Update
**File:** `app/(site)/bookings/success/page.tsx`
**File:** `app/(site)/bookings/success/success-content.tsx`

**Changes:**
- Shows "Payment Processing" banner for pending ACH
- Shows "Payment Failed" banner with retry button for failed ACH
- Different checkmark animations for success/pending/failed
- No confetti for pending ACH (wait until confirmed)
- Updated payment summary for ACH states
- Smart polling that stops for ACH pending (webhook will update)

---

### 6. Financial Queries Update
**File:** `lib/financial-queries.ts`

**New functions:**
- `getPendingACHPayments()` - List all pending ACH
- `getPendingACHPaymentCount()` - Count pending ACH
- `getPendingACHAmount()` - Total pending ACH amount

**Dashboard stats now include:**
- `pendingACHCount`
- `pendingACHAmount`

**CSV export:** Now includes payment method type

---

### 7. Database Types Update
**File:** `lib/database-types.ts`

**Booking interface additions:**
- `payment_method_type`
- `is_async_payment`
- `async_payment_status`
- `async_payment_initiated_at`
- `async_payment_completed_at`
- `async_payment_failed_at`
- `async_payment_failure_reason`
- `stripe_payment_intent_id`
- `needs_attention`
- `attention_reason`

**Payment interface additions:**
- `stripe_fee`
- `payment_method_type`
- `bank_name`
- `bank_last_four`
- `is_async`
- `async_status`
- `async_completed_at`
- `async_failed_at`
- `async_failure_reason`
- `is_manual_entry`
- `notes`

---

## Deployment Checklist

### Step 1: Run Database Migration
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/20241225_ach_payment_support.sql
```

### Step 2: Update Stripe Webhook Endpoint
In Stripe Dashboard → Developers → Webhooks:

Add these events to your webhook:
- `checkout.session.completed` ✓ (already have)
- `checkout.session.async_payment_succeeded` ← NEW
- `checkout.session.async_payment_failed` ← NEW
- `checkout.session.expired` ✓ (already have)
- `payment_intent.succeeded` ✓ (already have)
- `payment_intent.payment_failed` ✓ (already have)
- `charge.refunded` ✓ (already have)
- `charge.updated` ← NEW
- `charge.dispute.created` ✓ (already have)
- `refund.created` ← NEW
- `refund.updated` ← NEW

### Step 3: Deploy Code
```bash
git add .
git commit -m "feat: ACH payment support + complete webhook handling"
git push
```

### Step 4: Test ACH in Stripe Test Mode
Use Stripe test bank accounts:
- `000123456789` (routing: `110000000`) - Succeeds after 3 days
- `000111111116` (routing: `110000000`) - Fails immediately

---

## ACH Payment Flow

```
┌─────────────────┐
│ Customer selects│
│ "Pay with Bank" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe Checkout │
│ (Bank verified) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ checkout.session.completed          │
│ payment_status = 'unpaid'           │
│                                     │
│ → Create payment (status: pending)  │
│ → Booking stays 'pending'           │
│ → Send "Processing" email           │
│ → Show "Processing" on success page │
└────────┬────────────────────────────┘
         │
         │ 3-5 business days
         ▼
┌─────────────────────────────────────┐
│ checkout.session.async_payment_     │
│ succeeded                           │
│                                     │
│ → Update payment (status: succeeded)│
│ → Confirm booking                   │
│ → Send confirmation email           │
│ → Update customer stats             │
└─────────────────────────────────────┘

         OR

┌─────────────────────────────────────┐
│ checkout.session.async_payment_     │
│ failed                              │
│                                     │
│ → Update payment (status: failed)   │
│ → Mark booking needs attention      │
│ → Send failure email to customer    │
│ → Alert business owner              │
└─────────────────────────────────────┘
```

---

## Financial Dashboard Notes

**Revenue calculations only count `status = 'succeeded'` payments.**

Pending ACH payments are tracked separately:
- Shown in "Pending ACH" section
- Not included in gross revenue
- Included only after `async_payment_succeeded` webhook

---

## Testing Recommendations

1. **Card Payment Flow** - Should work exactly as before
2. **ACH Payment Flow** - Use Stripe test bank accounts
3. **Idempotency** - Send same webhook twice, verify only processed once
4. **Refund Flow** - Process a refund, verify fee loss tracked
5. **Dispute Flow** - Create test dispute, verify alert sent

---

## Questions?

This implementation follows Stripe's best practices for handling asynchronous payments. The key insight is that ACH payments go through `checkout.session.completed` with `payment_status = 'unpaid'`, then later fire `async_payment_succeeded` or `async_payment_failed`.

Let me know if you need any clarification or have questions about the implementation!
