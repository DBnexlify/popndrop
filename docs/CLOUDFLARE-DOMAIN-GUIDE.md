# Cloudflare Domain Setup Guide
## Connecting popndroprentals.com to Vercel

> **Time Required:** ~10 minutes  
> **Prerequisites:** Access to client's Cloudflare account

---

## Overview

You need to:
1. Add domain to Vercel
2. Get DNS records from Vercel
3. Add those records in Cloudflare
4. Configure SSL settings
5. Verify connection

---

## Step 1: Add Domain to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Select the **popndrop** project
3. Go to **Settings** → **Domains**
4. Enter: `popndroprentals.com`
5. Click **Add**
6. Vercel will show you DNS records to add

You'll see something like:

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

**Keep this page open** — you'll need these values.

---

## Step 2: Log Into Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign in with the client's account
3. Click on **popndroprentals.com** (or the domain name)

---

## Step 3: Add DNS Records

1. Click **DNS** in the left sidebar
2. Click **DNS Records**

### Add the A Record (root domain):

1. Click **Add record**
2. Fill in:
   - **Type:** `A`
   - **Name:** `@`
   - **IPv4 address:** `76.76.21.21`
   - **Proxy status:** Click the orange cloud to turn it **gray** (DNS only)
   - **TTL:** Auto
3. Click **Save**

### Add the CNAME Record (www):

1. Click **Add record**
2. Fill in:
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Target:** `cname.vercel-dns.com`
   - **Proxy status:** Click the orange cloud to turn it **gray** (DNS only)
   - **TTL:** Auto
3. Click **Save**

> ⚠️ **Important:** The proxy status MUST be gray (DNS only), not orange. Vercel handles SSL and won't work properly with Cloudflare's proxy enabled.

---

## Step 4: Configure SSL Settings

While still in Cloudflare:

1. Click **SSL/TLS** in the left sidebar
2. Click **Overview**
3. Set SSL mode to **Full** (not Full Strict)

This prevents redirect loops between Cloudflare and Vercel.

---

## Step 5: Disable Cloudflare Features That Conflict

### Turn off "Always Use HTTPS" (Vercel handles this):
1. **SSL/TLS** → **Edge Certificates**
2. Find **Always Use HTTPS**
3. Toggle it **OFF**

### Check Auto Minify is off:
1. **Speed** → **Optimization**
2. Find **Auto Minify**
3. Make sure JavaScript, CSS, HTML are all **unchecked**

---

## Step 6: Verify in Vercel

1. Go back to Vercel → **Settings** → **Domains**
2. Wait 1-5 minutes for DNS to propagate
3. You should see green checkmarks next to both domains:
   - ✅ `popndroprentals.com`
   - ✅ `www.popndroprentals.com`

If you see "Invalid Configuration":
- Double-check DNS records are correct
- Make sure Cloudflare proxy is OFF (gray cloud)
- Wait a few more minutes

---

## Step 7: Test the Site

1. Open a new incognito/private browser window
2. Go to `https://popndroprentals.com`
3. Verify:
   - ✅ Site loads correctly
   - ✅ Shows HTTPS padlock
   - ✅ `www.popndroprentals.com` redirects to `popndroprentals.com` (or vice versa)

---

## DNS Records Summary

Your final Cloudflare DNS should look like:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | @ | 76.76.21.21 | DNS only (gray) |
| CNAME | www | cname.vercel-dns.com | DNS only (gray) |

Delete any old/conflicting A, AAAA, or CNAME records for @ or www.

---

## Troubleshooting

### "Invalid Configuration" in Vercel
- Cloudflare proxy is probably ON (orange cloud) — turn it OFF (gray)
- Wait 5 minutes and check again

### Site shows "Too many redirects"
- Cloudflare SSL mode is wrong
- Set it to **Full** (not Strict, not Flexible)
- Turn off "Always Use HTTPS" in Cloudflare

### Site shows old content or different site
- Old DNS records are still there
- Delete any other A or CNAME records for @ or www
- Clear browser cache or use incognito

### SSL certificate error
- Vercel is still issuing the certificate
- Wait 10-15 minutes
- Vercel auto-provisions SSL once DNS is correct

### www doesn't work but root domain does (or vice versa)
- Missing one of the DNS records
- Make sure both A record (for @) AND CNAME (for www) are added

---

## Cloudflare Settings Checklist

| Setting | Location | Should Be |
|---------|----------|-----------|
| A record | DNS → Records | `@ → 76.76.21.21` (gray cloud) |
| CNAME record | DNS → Records | `www → cname.vercel-dns.com` (gray cloud) |
| SSL Mode | SSL/TLS → Overview | **Full** |
| Always Use HTTPS | SSL/TLS → Edge Certificates | **OFF** |
| Auto Minify | Speed → Optimization | **All OFF** |

---

## Quick Reference

| Item | URL |
|------|-----|
| Cloudflare Dashboard | dash.cloudflare.com |
| Vercel Dashboard | vercel.com |
| Vercel Domain Settings | Project → Settings → Domains |
| Cloudflare DNS | Domain → DNS → Records |
| Cloudflare SSL | Domain → SSL/TLS → Overview |

---

## After Domain is Working

Once the domain is connected:

1. ✅ Update `NEXT_PUBLIC_BASE_URL` in Vercel to `https://popndroprentals.com`
2. ✅ Update Stripe webhook URL to use the real domain
3. ✅ Test the full booking flow on the live domain
