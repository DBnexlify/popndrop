# Stripe Payment Implementation Guide
## Pop and Drop Rentals

> **Time Required:** ~15 minutes  
> **Prerequisites:** Access to client's email for Stripe account

---

## Overview

The code is already complete. You just need to:
1. Create/access Stripe account
2. Get API keys
3. Create webhook
4. Add keys to Vercel
5. Test

---

## Step 1: Stripe Account Setup

### If they don't have a Stripe account:
1. Go to [stripe.com](https://stripe.com)
2. Click **Start now**
3. Enter their business email
4. Complete the signup (can skip business verification for now—it's required before going live)

### If they have an existing account:
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign in

---

## Step 2: Get API Keys

1. In Stripe Dashboard, click **Developers** (top right)
2. Click **API keys**
3. You'll see two keys:

| Key Type | Starts With | What It's For |
|----------|-------------|---------------|
| Publishable key | `pk_live_` | Frontend (not needed yet) |
| Secret key | `sk_live_` | Backend API calls |

4. Click **Reveal live key** on the Secret key
5. Copy both keys somewhere safe (notepad)

> ⚠️ **Test Mode:** Toggle "Test mode" in top-right if you want to test first. Keys will start with `pk_test_` and `sk_test_` instead.

---

## Step 3: Create Webhook

Webhooks tell your site when a payment succeeds.

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Fill in:
   - **Endpoint URL:** `https://popndroprentals.com/api/stripe/webhook`
   - **Description:** "Pop and Drop booking confirmations"
4. Click **Select events**
5. Search for and check: `checkout.session.completed`
6. Click **Add events**
7. Click **Add endpoint**
8. On the next page, find **Signing secret**
9. Click **Reveal** and copy it (starts with `whsec_`)

---

## Step 4: Add Keys to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Select the **popndrop** project
3. Go to **Settings** → **Environment Variables**
4. Add these 3 variables:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_xxxxx...` (from Step 2) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx...` (from Step 3) |
| `NEXT_PUBLIC_BASE_URL` | `https://popndroprentals.com` |

5. For each one:
   - Enter the name
   - Paste the value
   - Keep all environments checked (Production, Preview, Development)
   - Click **Save**

---

## Step 5: Redeploy

For the new environment variables to take effect:

1. In Vercel, go to **Deployments** tab
2. Find the most recent deployment
3. Click the **⋮** menu → **Redeploy**
4. Wait for deployment to complete (~1-2 min)

---

## Step 6: Test the Integration

### Quick Test:
1. Go to the live site booking form
2. Fill out all fields
3. Select a rental, date, times
4. Choose **Pay deposit** or **Pay in full**
5. Accept terms
6. Click **Complete Booking**
7. Should redirect to Stripe checkout page

### Test Payment (Use Test Mode):
If in test mode, use this card:
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Verify Success:
After payment:
- ✅ Redirects to success page
- ✅ Customer receives confirmation email
- ✅ Business receives notification email
- ✅ Booking shows "confirmed" in admin dashboard
- ✅ Payment appears in Stripe Dashboard → Payments

---

## How It Works (For Reference)

```
Customer fills form → Booking created as "pending"
         ↓
Redirect to Stripe Checkout
         ↓
Customer pays $50 (deposit) or full amount
         ↓
Stripe sends webhook to /api/stripe/webhook
         ↓
Webhook updates booking to "confirmed"
         ↓
Confirmation emails sent to customer & business
         ↓
Customer sees success page
```

---

## Pricing Summary

| Payment Option | Amount Charged | Balance Due on Delivery |
|----------------|----------------|-------------------------|
| Pay deposit | $50 | Rental price - $50 |
| Pay in full | Full rental price | $0 |

---

## Troubleshooting

### "Payment failed" or checkout doesn't load
- Check that `STRIPE_SECRET_KEY` is correct in Vercel
- Make sure you redeployed after adding env vars

### Payment succeeds but booking stays "pending"
- Webhook isn't working
- Check webhook URL is exactly: `https://popndroprentals.com/api/stripe/webhook`
- Check `STRIPE_WEBHOOK_SECRET` matches the one shown in Stripe dashboard

### No confirmation emails
- Check Resend is still configured
- Emails are sent by the webhook, so webhook must be working first

### Test mode vs Live mode
- Make sure API keys match the mode you're testing in
- Test keys start with `sk_test_` / `pk_test_`
- Live keys start with `sk_live_` / `pk_live_`

---

## Going Live Checklist

Before accepting real payments:

- [ ] Complete Stripe business verification (Stripe will prompt for this)
- [ ] Switch from test keys to live keys
- [ ] Update webhook to use live endpoint (or create new one)
- [ ] Test with a real $1 payment and refund it
- [ ] Verify emails are being received

---

## Quick Reference

| Item | Location |
|------|----------|
| Stripe Dashboard | dashboard.stripe.com |
| API Keys | Developers → API keys |
| Webhooks | Developers → Webhooks |
| Payments | Payments (left sidebar) |
| Vercel Env Vars | Project → Settings → Environment Variables |
