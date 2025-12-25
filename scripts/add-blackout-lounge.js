/**
 * Add Blackout Lounge Product
 * Compresses images and prepares for Supabase upload
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUCKET_NAME = 'product-images';
const SOURCE_DIR = path.join(PROJECT_ROOT, 'public/temp-product-add');
const TARGET_FOLDER = 'party-houses/blackout-lounge';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function compressImage(buffer, ext) {
  let pipeline = sharp(buffer).resize({
    width: 2400,
    height: 2400,
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (ext === '.png') {
    return pipeline
      .png({
        quality: 80,
        compressionLevel: 9,
        palette: true,
      })
      .toBuffer();
  } else if (ext === '.jpg' || ext === '.jpeg') {
    return pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }
  return buffer;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n🎉 Adding Blackout Lounge to Supabase Storage\n');
  console.log('━'.repeat(55));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Get files from source directory
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
  });

  console.log(`📁 Source: ${SOURCE_DIR}`);
  console.log(`📁 Target: ${BUCKET_NAME}/${TARGET_FOLDER}`);
  console.log(`📷 Found ${files.length} images\n`);

  const uploadedUrls = [];
  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);
    const ext = path.extname(file).toLowerCase();
    const originalBuffer = fs.readFileSync(filePath);
    const originalSize = originalBuffer.length;
    totalOriginal += originalSize;

    console.log(`\n📷 Processing: ${file}`);
    console.log(`   Original size: ${formatBytes(originalSize)}`);

    // Compress
    const compressedBuffer = await compressImage(originalBuffer, ext);
    const compressedSize = compressedBuffer.length;
    totalCompressed += compressedSize;

    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    console.log(`   Compressed:    ${formatBytes(compressedSize)} (-${savings}%)`);

    // Upload path
    const storagePath = `${TARGET_FOLDER}/${file}`;
    console.log(`   Upload path:   ${storagePath}`);

    if (!dryRun) {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, compressedBuffer, {
          contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.log(`   ❌ Upload failed: ${error.message}`);
      } else {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
        uploadedUrls.push({ file, url: publicUrl });
        console.log(`   ✅ Uploaded!`);
      }
    } else {
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
      uploadedUrls.push({ file, url: publicUrl });
    }
  }

  // Summary
  console.log('\n' + '━'.repeat(55));
  console.log('📊 SUMMARY\n');
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Original total:  ${formatBytes(totalOriginal)}`);
  console.log(`   Compressed:      ${formatBytes(totalCompressed)}`);
  console.log(`   Savings:         ${formatBytes(totalOriginal - totalCompressed)} (${((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1)}%)`);

  // Output URLs for database
  console.log('\n📋 URLs for Database:\n');

  const heroUrl = uploadedUrls.find((u) => u.file.startsWith('hero'))?.url;
  const galleryUrls = uploadedUrls.map((u) => u.url);

  console.log('image_url:');
  console.log(`  ${heroUrl}\n`);

  console.log('gallery_urls:');
  console.log(`  ARRAY[${galleryUrls.map(u => `'${u}'`).join(',')}]\n`);

  // SQL Insert statement
  console.log('\n📝 SQL INSERT Statement:\n');
  console.log(`
INSERT INTO products (
  slug,
  name,
  series,
  subtitle,
  description,
  price_daily,
  price_weekend,
  price_sunday,
  dimensions,
  footprint,
  wet_or_dry,
  power_required,
  features,
  safety_notes,
  image_url,
  gallery_urls,
  is_active,
  is_featured,
  display_order
) VALUES (
  'blackout-lounge',
  'The Blackout Lounge',
  'Party Houses',
  'Premium inflatable party lounge with sound & lighting',
  'Transform any backyard into an exclusive VIP lounge! This premium inflatable party house comes fully equipped with a JBL party speaker, stunning LED lighting, and portable AC to keep the party cool. Perfect for teen parties, graduation celebrations, and adult gatherings.',
  400,
  500,
  450,
  '20'' L x 16.5'' W x 12'' H',
  '20ft x 16.5ft',
  'dry',
  '2 standard 110V outlets (15 amp)',
  ARRAY['JBL party speaker included', 'LED party lighting', 'Portable AC included', 'Sleek black design', 'Private party atmosphere', 'Fits 15-20 people comfortably'],
  ARRAY['Adult supervision required', 'Not a bounce house - no jumping', 'Keep all flames and sharp objects away', 'Do not exceed weight capacity'],
  '${heroUrl}',
  ARRAY[${galleryUrls.map(u => `'${u}'`).join(',')}],
  true,
  true,
  2
);
  `);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to upload images.\n');
  } else {
    console.log('\n✅ Images uploaded! Now run the SQL INSERT in Supabase.\n');
  }
}

main().catch(console.error);
