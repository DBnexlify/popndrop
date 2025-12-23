# Pop and Drop Scripts

Utility scripts for managing the Pop and Drop Party Rentals website.

## Prerequisites

```bash
npm install sharp @supabase/supabase-js dotenv --save-dev
```

## Available Scripts

### 1. Compress Images Locally

Compress images in `/public/rentals` and `/public/brand` folders without uploading anywhere.

```bash
# Preview what would be compressed (no changes)
node scripts/compress-images.js --dry-run

# Actually compress images
node scripts/compress-images.js

# Compress and create backups
node scripts/compress-images.js --backup
```

**What it does:**
- Compresses JPEG/PNG/WebP images to ~82% quality (visually lossless)
- Resizes images larger than 2400px
- Converts large PNGs to JPEG (better for photos)
- Skips files under 500KB
- Shows before/after sizes

### 2. Migrate Images to Supabase Storage

Move product images to Supabase Storage and update database URLs.

**Required Environment Variables** (in `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ You need the **Service Role Key** (not the anon key) for bucket creation.

```bash
# Preview what would happen (no changes)
node scripts/migrate-images-to-supabase.js --dry-run

# Run the full migration
node scripts/migrate-images-to-supabase.js

# Migrate AND delete local files after
node scripts/migrate-images-to-supabase.js --cleanup
```

**What it does:**
1. Creates `product-images` bucket in Supabase Storage (if needed)
2. Compresses each image
3. Uploads to Supabase Storage
4. Updates `image_url` and `gallery_urls` in the products table
5. Optionally deletes local files

## After Migration

1. Test the site locally to verify images load
2. Deploy to Vercel
3. If using `--cleanup`, commit the removal of `/public/rentals/`
4. The logo (`/public/brand/logo.png`) stays local (used in emails)

## Expected Results

Current state: ~112 MB in `/public/rentals/`

After compression:
- Individual images: 200-400 KB (from 5-20 MB)
- Total size: ~3-5 MB

Savings: **97%+**
