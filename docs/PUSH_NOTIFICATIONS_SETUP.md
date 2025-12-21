# Push Notification Setup Guide

## 1. Generate VAPID Keys

Run this in your terminal (requires Node.js):

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
Public Key: BEl62iUYgUivxIkv69...
Private Key: UUxI4O8r3nN1Zg2x...
```

## 2. Add Environment Variables to Vercel

Go to your Vercel project → Settings → Environment Variables

Add these TWO variables:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Your public key from step 1 | Production, Preview, Development |
| `VAPID_PRIVATE_KEY` | Your private key from step 1 | Production, Preview, Development |

⚠️ **Important**: `NEXT_PUBLIC_` prefix is required for the public key!

## 3. Run Database Migration

Go to Supabase → SQL Editor → New Query

Copy and paste the contents of:
`supabase/migrations/20241221_push_subscriptions.sql`

Click "Run"

## 4. Redeploy

After adding environment variables, redeploy your site:
- Push a commit, OR
- Go to Vercel → Deployments → Redeploy

## 5. Test

1. Go to `/admin/settings`
2. Enable notifications (toggle ON)
3. Click "Send Test Notification"
4. You should receive a push notification!

## Troubleshooting

Visit `/api/push/debug` to see diagnostic info:

```
https://your-site.vercel.app/api/push/debug
```

This will show you:
- ✅ Which environment variables are set
- ✅ If the database table exists
- ✅ How many devices are subscribed
- ❌ What's missing/broken

## Common Issues

### "VAPID not configured"
→ Environment variables not set in Vercel

### "No subscriptions found"
→ Go to Admin Settings and enable notifications

### "Table does not exist"
→ Run the SQL migration in Supabase

### Notifications not appearing on mobile
→ Make sure the PWA is installed (Add to Home Screen)
→ Check that notifications are allowed in device settings
