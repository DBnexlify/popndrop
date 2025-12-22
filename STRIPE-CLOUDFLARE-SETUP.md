# Stripe & Cloudflare Setup Guide

## Overview
This guide walks through connecting:
1. **Cloudflare** - Domain DNS → Vercel
2. **Stripe** - Payment processing

---

## Part 1: Cloudflare → Vercel Domain Setup

### Step 1: Add Domain in Vercel
1. Go to [Vercel Dashboard](https://vercel.com) → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `popanddroprentals.com`)
4. Vercel will show you the required DNS records

### Step 2: Configure Cloudflare DNS
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Go to **DNS** → **Records**
4. **Delete** any existing A or CNAME records for `@` (root) and `www`
5. Add these records:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| CNAME | `@` | `cname.vercel-dns.com` | **DNS Only** (gray cloud) |
| CNAME | `www` | `cname.vercel-dns.com` | **DNS Only** (gray cloud) |

> ⚠️ **Important**: Set proxy status to **DNS Only** (gray cloud icon), NOT "Proxied" (orange cloud). Vercel handles SSL.

### Step 3: Cloudflare SSL Settings
1. In Cloudflare, go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Go to **Edge Certificates** → Turn OFF **Always Use HTTPS** (Vercel handles this)

### Step 4: Verify in Vercel
1. Back in Vercel **Domains** section
2. Wait 1-5 minutes for DNS propagation
3. Both domains should show green checkmarks
4. Vercel auto-provisions SSL certificates

### Troubleshooting DNS
- If stuck on "Invalid Configuration", ensure Cloudflare proxy is OFF (gray cloud)
- Clear browser cache and try `https://yourdomain.com` in incognito
- DNS can take up to 48 hours (usually 5-15 minutes)

---

## Part 2: Stripe Integration

### Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification (required for live payments)
3. You'll start in **Test Mode** (toggle in top-right)

### Step 2: Get API Keys
1. In Stripe Dashboard → **Developers** → **API Keys**
2. Copy these values:

**Test Mode (for development):**
- `Publishable key`: `pk_test_...`
- `Secret key`: `sk_test_...`

**Live Mode (for production):**
- `Publishable key`: `pk_live_...`
- `Secret key`: `sk_live_...`

### Step 3: Add Environment Variables in Vercel
1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Preview, Development |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | All (set after Step 4) |

### Step 4: Create Webhook Endpoint
1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click **Add endpoint**
6. Click **Reveal** under Signing secret
7. Copy the `whsec_...` value
8. Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

### Step 5: Redeploy
After adding all environment variables:
1. Go to Vercel → **Deployments**
2. Click the three dots on latest deployment → **Redeploy**
3. Check "Use existing build cache" and click **Redeploy**

---

## Part 3: Testing Stripe

### Test Card Numbers
Use these in **Test Mode**:

| Scenario | Card Number | Exp | CVC |
|----------|-------------|-----|-----|
| Success | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Declined | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| Requires Auth | `4000 0025 0000 3155` | Any future date | Any 3 digits |

### Test Webhook Locally (Optional)
```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret it outputs
```

---

## Part 4: Go Live Checklist

### Before Launch
- [ ] Cloudflare DNS pointing to Vercel (gray cloud)
- [ ] SSL working on custom domain
- [ ] Stripe account verified for live payments
- [ ] Live API keys in Vercel Production environment
- [ ] Webhook endpoint created with live URL
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel
- [ ] Test a real $1 payment and refund it

### Environment Variables Summary
```
# Required for Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Already configured
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
RESEND_API_KEY=re_...
FROM_EMAIL=bookings@yourdomain.com
NOTIFY_EMAIL=owner@email.com
CRON_SECRET=random-string-here
```

---

## Quick Reference

### Vercel Dashboard
- Project Settings: `vercel.com/[team]/[project]/settings`
- Environment Variables: `vercel.com/[team]/[project]/settings/environment-variables`
- Domains: `vercel.com/[team]/[project]/settings/domains`

### Stripe Dashboard
- API Keys: `dashboard.stripe.com/apikeys`
- Webhooks: `dashboard.stripe.com/webhooks`
- Test Mode Toggle: Top-right corner

### Cloudflare Dashboard
- DNS Records: `dash.cloudflare.com/[account]/[domain]/dns`
- SSL Settings: `dash.cloudflare.com/[account]/[domain]/ssl-tls`

---

## Support Contacts
- **Vercel**: [vercel.com/help](https://vercel.com/help)
- **Stripe**: [support.stripe.com](https://support.stripe.com)
- **Cloudflare**: [support.cloudflare.com](https://support.cloudflare.com)
