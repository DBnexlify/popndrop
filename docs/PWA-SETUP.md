# PWA & Push Notifications Setup Guide

## Overview
This document explains how to set up the Progressive Web App (PWA) and push notifications for the Pop & Drop Admin dashboard.

---

## Step 1: Install Dependencies

```bash
npm install web-push
npm install --save-dev @types/web-push
```

---

## Step 2: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

```bash
node scripts/generate-vapid-keys.js
```

This will output something like:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgU...
VAPID_PRIVATE_KEY=UUxI4O8-FbR...
PUSH_WEBHOOK_SECRET=abc123...
```

Add these to your `.env.local` file.

---

## Step 3: Create App Icons

You need to create icons for the PWA. Place them in `/public/admin/`:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192x192 | App icon (maskable) |
| `icon-512.png` | 512x512 | App icon (high-res) |
| `badge-72.png` | 72x72 | Notification badge |

### Creating Icons
1. Use your logo as the base
2. Ensure icons have padding for maskable format (safe zone is center 80%)
3. Use tools like [Maskable.app](https://maskable.app/) to test maskable icons

---

## Step 4: Run Database Migration

Run the SQL in Supabase SQL Editor:

```bash
# File: supabase/push-notifications.sql
```

This creates:
- `push_subscriptions` - Stores device push subscriptions
- `notification_log` - Logs all sent notifications
- `notify_new_booking()` - Trigger function (optional)

---

## Step 5: Environment Variables

Add to `.env.local`:

```env
# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
PUSH_WEBHOOK_SECRET=your_secret_here
```

---

## Step 6: Test the PWA

### On Desktop (Chrome)
1. Go to `/admin` in Chrome
2. Look for the install icon in the address bar (or three-dot menu)
3. Click "Install"

### On Mobile (iOS Safari)
1. Go to `/admin` in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Name it "P&D Admin"

### On Mobile (Android Chrome)
1. Go to `/admin` in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home Screen" or "Install app"

---

## Step 7: Enable Notifications

1. Open the admin dashboard
2. In the sidebar, click "Enable Notifications"
3. Accept the browser permission prompt
4. You should see "Notifications On" ✓

---

## How It Works

### PWA Installation Flow
```
User visits /admin
    ↓
Service worker registers (/admin/sw.js)
    ↓
Browser detects manifest.json
    ↓
"Install" prompt appears
    ↓
User installs → App icon on home screen
```

### Push Notification Flow
```
User enables notifications
    ↓
Browser creates push subscription
    ↓
Subscription saved to push_subscriptions table
    ↓
New booking created
    ↓
Server calls notifyNewBooking()
    ↓
web-push sends to all subscriptions
    ↓
Service worker receives push event
    ↓
Notification displayed to user
```

---

## Notification Types

| Type | Trigger | Title | Action |
|------|---------|-------|--------|
| New Booking | Booking created | "🎉 New Booking!" | Opens booking |
| Deposit Paid | Payment recorded | "💰 Deposit Received" | Opens booking |
| Balance Paid | Payment recorded | "✅ Balance Paid" | Opens booking |
| Cancellation | Booking cancelled | "❌ Booking Cancelled" | Opens booking |
| Daily Reminder | Scheduled (future) | "🚚 Deliveries Today" | Opens dashboard |

---

## Troubleshooting

### "Notifications blocked in browser settings"
1. Click the lock icon in the address bar
2. Find "Notifications"
3. Change from "Block" to "Allow"
4. Refresh the page

### Notifications not appearing
1. Check browser supports notifications: `'Notification' in window`
2. Check permission: `Notification.permission`
3. Check subscription exists in database
4. Check VAPID keys are set correctly

### PWA not installing
1. Must be served over HTTPS (or localhost)
2. Must have valid manifest.json
3. Must have service worker registered
4. Must meet Chrome's engagement criteria

### Service worker not updating
1. Open DevTools → Application → Service Workers
2. Click "Update" or "Unregister"
3. Hard refresh (Ctrl+Shift+R)

---

## Files Reference

```
public/admin/
├── manifest.json      # PWA manifest
├── sw.js              # Service worker
├── icon-192.png       # App icon (create this)
├── icon-512.png       # App icon (high-res, create this)
└── badge-72.png       # Notification badge (create this)

app/admin/(dashboard)/
├── layout.tsx         # PWA meta tags
└── offline/
    └── page.tsx       # Offline fallback page

components/admin/
├── pwa-provider.tsx   # PWA context & components
└── admin-nav.tsx      # Includes NotificationToggle

lib/
└── push-notifications.ts  # Server-side push utilities

app/api/push/
├── subscribe/route.ts    # Save subscription
├── unsubscribe/route.ts  # Remove subscription
└── send/route.ts         # Send notification

supabase/
└── push-notifications.sql  # Database schema
```

---

## Security Notes

1. VAPID private key must never be exposed client-side
2. Push webhook secret should be used for server-to-server calls
3. RLS policies ensure admins can only manage their own subscriptions
4. Service role access needed for sending to all admins
