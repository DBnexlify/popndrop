/**
 * Upload compressed images to Supabase Storage
 * Images are already optimized - just upload and update DB
 * 
 * Usage:
 *   node scripts/upload-to-supabase.js --dry-run
 *   node scripts/upload-to-supabase.js
 *   node scripts/upload-to-supabase.js --cleanup   # Also delete local files
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUCKET_NAME = 'product-images';

// =============================================================================
// HELPERS
// =============================================================================

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFilesRecursively(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getFilesRecursively(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function getContentType(ext) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const cleanup = args.includes('--cleanup');
  
  console.log('\n☁️  Upload Images to Supabase Storage\n');
  console.log('━'.repeat(55));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  const supabase = getSupabase();
  
  // =========================================================================
  // STEP 1: Ensure bucket exists
  // =========================================================================
  console.log('\n📦 STEP 1: Check/create storage bucket\n');
  
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (bucketExists) {
    console.log(`  ✅ Bucket "${BUCKET_NAME}" exists`);
  } else if (!dryRun) {
    console.log(`  Creating bucket "${BUCKET_NAME}"...`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
    
    if (error) {
      console.error(`  ❌ Failed to create bucket: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✅ Bucket created`);
  } else {
    console.log(`  Would create bucket "${BUCKET_NAME}"`);
  }
  
  // =========================================================================
  // STEP 2: Upload images
  // =========================================================================
  console.log('\n📤 STEP 2: Upload images\n');
  
  const rentalsDir = path.join(PROJECT_ROOT, 'public/rentals');
  const files = getFilesRecursively(rentalsDir);
  
  if (files.length === 0) {
    console.log('  No images found in public/rentals/');
    return;
  }
  
  console.log(`  Found ${files.length} images to upload\n`);
  
  const urlMappings = new Map(); // oldUrl -> newUrl
  let totalSize = 0;
  let uploadCount = 0;
  
  for (const filePath of files) {
    const relPath = path.relative(path.join(PROJECT_ROOT, 'public/rentals'), filePath);
    const storagePath = relPath.replace(/\\/g, '/'); // Windows fix
    const ext = path.extname(filePath).toLowerCase();
    const size = fs.statSync(filePath).size;
    totalSize += size;
    
    console.log(`  Uploading: ${storagePath} (${formatBytes(size)})`);
    
    if (!dryRun) {
      const buffer = fs.readFileSync(filePath);
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: getContentType(ext),
          upsert: true,
        });
      
      if (error) {
        console.log(`     ❌ Upload failed: ${error.message}`);
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);
      
      const oldUrl = `/rentals/${storagePath}`;
      urlMappings.set(oldUrl, urlData.publicUrl);
      
      console.log(`     ✅ Uploaded`);
      uploadCount++;
    } else {
      // Simulate URL for dry run
      const oldUrl = `/rentals/${storagePath}`;
      const newUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
      urlMappings.set(oldUrl, newUrl);
      uploadCount++;
    }
  }
  
  console.log(`\n  Total: ${formatBytes(totalSize)} in ${uploadCount} files`);
  
  // =========================================================================
  // STEP 3: Update database URLs
  // =========================================================================
  console.log('\n📝 STEP 3: Update database URLs\n');
  
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, slug, image_url, gallery_urls');
  
  if (fetchError) {
    console.error(`  ❌ Failed to fetch products: ${fetchError.message}`);
    return;
  }
  
  for (const product of products) {
    let needsUpdate = false;
    const updates = {};
    
    // Update main image URL
    if (product.image_url && urlMappings.has(product.image_url)) {
      updates.image_url = urlMappings.get(product.image_url);
      needsUpdate = true;
    }
    
    // Update gallery URLs
    if (product.gallery_urls && product.gallery_urls.length > 0) {
      const newGallery = product.gallery_urls.map(url => 
        urlMappings.has(url) ? urlMappings.get(url) : url
      );
      
      if (JSON.stringify(newGallery) !== JSON.stringify(product.gallery_urls)) {
        updates.gallery_urls = newGallery;
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log(`  ${product.slug}:`);
      if (updates.image_url) console.log(`     image_url → Supabase`);
      if (updates.gallery_urls) console.log(`     gallery_urls (${updates.gallery_urls.length}) → Supabase`);
      
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id);
        
        if (updateError) {
          console.log(`     ❌ Update failed: ${updateError.message}`);
        } else {
          console.log(`     ✅ Database updated`);
        }
      }
    }
  }
  
  // =========================================================================
  // STEP 4: Cleanup local files (optional)
  // =========================================================================
  if (cleanup && !dryRun) {
    console.log('\n🗑️  STEP 4: Delete local files\n');
    
    for (const filePath of files) {
      const relPath = path.relative(PROJECT_ROOT, filePath);
      try {
        fs.unlinkSync(filePath);
        console.log(`  Deleted: ${relPath}`);
      } catch (e) {
        console.log(`  ❌ Failed to delete: ${relPath}`);
      }
    }
    
    // Remove empty directories
    removeEmptyDirs(rentalsDir);
    
    console.log('\n  ✅ Local files cleaned up');
    console.log('  💡 Commit this change to reduce repo size');
  }
  
  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '━'.repeat(55));
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to perform the upload.');
    console.log('   Add --cleanup to also delete local files.\n');
  } else {
    console.log('\n✅ Upload complete!\n');
    console.log('Next steps:');
    console.log('  1. Test: npm run dev');
    console.log('  2. Check images load on /rentals page');
    if (!cleanup) {
      console.log('  3. Run with --cleanup to delete local files');
    }
    console.log('  4. Deploy to Vercel');
    console.log('');
  }
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name));
    }
  }
  
  // Check if empty now
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    console.log(`  Removed empty dir: ${path.relative(PROJECT_ROOT, dir)}`);
  }
}

main().catch(console.error);
