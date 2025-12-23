/**
 * Image Migration Script for Pop and Drop Party Rentals
 * 
 * This script:
 * 1. Compresses images locally using sharp
 * 2. Uploads compressed images to Supabase Storage
 * 3. Updates database records with new URLs
 * 4. Optionally deletes local files after migration
 * 
 * Prerequisites:
 *   npm install sharp @supabase/supabase-js dotenv --save-dev
 * 
 * Usage:
 *   node scripts/migrate-images-to-supabase.js --dry-run     # Preview only
 *   node scripts/migrate-images-to-supabase.js               # Run migration
 *   node scripts/migrate-images-to-supabase.js --cleanup     # Delete local files after
 * 
 * Environment variables needed (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (NOT the anon key - needs admin access)
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check dependencies
let sharp, createClient;
try {
  sharp = require('sharp');
  const supabase = require('@supabase/supabase-js');
  createClient = supabase.createClient;
} catch (e) {
  console.error('\n❌ Missing dependencies. Run:\n');
  console.error('   npm install sharp @supabase/supabase-js dotenv --save-dev\n');
  process.exit(1);
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Supabase Storage bucket name
  bucketName: 'product-images',
  
  // Local directory to scan
  localDir: 'public/rentals',
  
  // Compression settings
  compression: {
    quality: 82,           // 80-85 is visually lossless
    maxWidth: 2400,        // Max dimension
    maxHeight: 2400,
  },
  
  // File size threshold (only compress files larger than this)
  minSizeToCompress: 100 * 1024, // 100KB
  
  // Extensions to process
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.error('\n❌ Missing environment variables:');
    if (!url) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nMake sure these are set in .env.local\n');
    process.exit(1);
  }
  
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}

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
      if (CONFIG.extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

// =============================================================================
// COMPRESSION
// =============================================================================

async function compressImage(filePath) {
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Resize if needed
    let pipeline = sharp(filePath);
    
    if (metadata.width > CONFIG.compression.maxWidth || 
        metadata.height > CONFIG.compression.maxHeight) {
      pipeline = pipeline.resize({
        width: CONFIG.compression.maxWidth,
        height: CONFIG.compression.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Compress based on format - always output as JPEG for photos
    let outputBuffer;
    let outputExt = ext;
    
    // Convert PNGs to JPEG if they're large photos (not logos/graphics)
    if (ext === '.png' && originalSize > 500 * 1024) {
      outputBuffer = await pipeline
        .jpeg({ quality: CONFIG.compression.quality, mozjpeg: true })
        .toBuffer();
      outputExt = '.jpg';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      outputBuffer = await pipeline
        .jpeg({ quality: CONFIG.compression.quality, mozjpeg: true })
        .toBuffer();
    } else if (ext === '.webp') {
      outputBuffer = await pipeline
        .webp({ quality: CONFIG.compression.quality })
        .toBuffer();
    } else if (ext === '.png') {
      outputBuffer = await pipeline
        .png({ quality: CONFIG.compression.quality, compressionLevel: 9 })
        .toBuffer();
    }
    
    return {
      buffer: outputBuffer,
      originalSize,
      compressedSize: outputBuffer.length,
      originalExt: ext,
      outputExt,
      width: metadata.width,
      height: metadata.height,
    };
    
  } catch (error) {
    console.error(`  ❌ Error compressing ${filePath}:`, error.message);
    return null;
  }
}

// =============================================================================
// SUPABASE STORAGE
// =============================================================================

async function ensureBucketExists(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === CONFIG.bucketName);
  
  if (!exists) {
    console.log(`\n📦 Creating bucket: ${CONFIG.bucketName}`);
    const { error } = await supabase.storage.createBucket(CONFIG.bucketName, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB max
    });
    
    if (error) {
      console.error('❌ Failed to create bucket:', error.message);
      process.exit(1);
    }
    console.log('✅ Bucket created successfully');
  } else {
    console.log(`\n📦 Bucket "${CONFIG.bucketName}" exists`);
  }
}

async function uploadToSupabase(supabase, buffer, storagePath, contentType) {
  const { data, error } = await supabase.storage
    .from(CONFIG.bucketName)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true, // Overwrite if exists
    });
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(CONFIG.bucketName)
    .getPublicUrl(storagePath);
  
  return urlData.publicUrl;
}

// =============================================================================
// DATABASE UPDATE
// =============================================================================

async function updateProductImages(supabase, urlMappings) {
  console.log('\n📝 Updating database records...\n');
  
  // Fetch all products
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, slug, image_url, gallery_urls');
  
  if (fetchError) {
    console.error('❌ Failed to fetch products:', fetchError.message);
    return;
  }
  
  for (const product of products) {
    let updated = false;
    const updates = {};
    
    // Check main image
    if (product.image_url) {
      const newUrl = findNewUrl(product.image_url, urlMappings);
      if (newUrl && newUrl !== product.image_url) {
        updates.image_url = newUrl;
        updated = true;
      }
    }
    
    // Check gallery images
    if (product.gallery_urls && product.gallery_urls.length > 0) {
      const newGallery = product.gallery_urls.map(url => {
        const newUrl = findNewUrl(url, urlMappings);
        return newUrl || url;
      });
      
      if (JSON.stringify(newGallery) !== JSON.stringify(product.gallery_urls)) {
        updates.gallery_urls = newGallery;
        updated = true;
      }
    }
    
    if (updated) {
      const { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', product.id);
      
      if (updateError) {
        console.error(`  ❌ Failed to update ${product.slug}:`, updateError.message);
      } else {
        console.log(`  ✅ Updated ${product.slug}`);
        if (updates.image_url) console.log(`     Main image → Supabase`);
        if (updates.gallery_urls) console.log(`     Gallery (${updates.gallery_urls.length} images) → Supabase`);
      }
    }
  }
}

function findNewUrl(oldUrl, urlMappings) {
  // Extract the relative path from the old URL
  // Could be "/rentals/glitch/combo/hero.png" or just "hero.png"
  for (const [localPath, supabaseUrl] of urlMappings) {
    // Match if the old URL ends with the filename or contains the relative path
    const filename = path.basename(localPath);
    const relativePath = localPath.replace(/^public\//, '/');
    
    if (oldUrl === relativePath || 
        oldUrl.endsWith(filename) || 
        oldUrl.includes(relativePath.replace(/^\//, ''))) {
      return supabaseUrl;
    }
  }
  return null;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const cleanup = args.includes('--cleanup');
  
  console.log('\n🚀 Pop and Drop Image Migration\n');
  console.log('━'.repeat(60));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Initialize Supabase
  const supabase = getSupabaseAdmin();
  
  // Ensure bucket exists
  if (!dryRun) {
    await ensureBucketExists(supabase);
  }
  
  // Find all images
  const projectRoot = path.resolve(__dirname, '..');
  const localDir = path.join(projectRoot, CONFIG.localDir);
  const files = getFilesRecursively(localDir);
  
  if (files.length === 0) {
    console.log('No images found to migrate.');
    return;
  }
  
  console.log(`\nFound ${files.length} images to process\n`);
  
  // Process each file
  const urlMappings = new Map(); // localPath -> supabaseUrl
  let totalOriginal = 0;
  let totalCompressed = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath);
    const stats = fs.statSync(filePath);
    
    process.stdout.write(`Processing: ${relativePath}...`);
    
    // Compress
    const result = await compressImage(filePath);
    if (!result) {
      console.log(' ❌ Compression failed');
      failCount++;
      continue;
    }
    
    totalOriginal += result.originalSize;
    totalCompressed += result.compressedSize;
    
    // Generate storage path (e.g., "glitch/combo/hero.jpg")
    const relativeToRentals = path.relative(localDir, filePath);
    let storagePath = relativeToRentals
      .replace(/\\/g, '/') // Windows paths
      .replace(result.originalExt, result.outputExt); // Update extension if converted
    
    const savings = ((result.originalSize - result.compressedSize) / result.originalSize * 100).toFixed(1);
    console.log(` ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (-${savings}%)`);
    
    if (!dryRun) {
      try {
        // Determine content type
        const contentType = result.outputExt === '.jpg' || result.outputExt === '.jpeg' 
          ? 'image/jpeg' 
          : result.outputExt === '.png' 
          ? 'image/png' 
          : 'image/webp';
        
        // Upload to Supabase
        const publicUrl = await uploadToSupabase(supabase, result.buffer, storagePath, contentType);
        urlMappings.set(filePath, publicUrl);
        console.log(`     → ${publicUrl.substring(0, 60)}...`);
        successCount++;
        
      } catch (error) {
        console.log(`     ❌ Upload failed: ${error.message}`);
        failCount++;
      }
    } else {
      // In dry run, simulate the URL
      urlMappings.set(filePath, `https://[supabase-url]/storage/v1/object/public/${CONFIG.bucketName}/${storagePath}`);
      successCount++;
    }
  }
  
  // Update database
  if (!dryRun && urlMappings.size > 0) {
    await updateProductImages(supabase, urlMappings);
  }
  
  // Cleanup local files
  if (cleanup && !dryRun && successCount > 0) {
    console.log('\n🧹 Cleaning up local files...\n');
    for (const [filePath] of urlMappings) {
      try {
        fs.unlinkSync(filePath);
        console.log(`  Deleted: ${path.relative(projectRoot, filePath)}`);
      } catch (e) {
        console.log(`  ❌ Failed to delete: ${path.relative(projectRoot, filePath)}`);
      }
    }
    
    // Remove empty directories
    removeEmptyDirs(localDir);
  }
  
  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('📊 SUMMARY\n');
  console.log(`  Files processed:   ${files.length}`);
  console.log(`  Successful:        ${successCount}`);
  console.log(`  Failed:            ${failCount}`);
  console.log('');
  console.log(`  Original size:     ${formatBytes(totalOriginal)}`);
  console.log(`  Compressed size:   ${formatBytes(totalCompressed)}`);
  console.log(`  Total savings:     ${formatBytes(totalOriginal - totalCompressed)} (${((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1)}%)`);
  console.log('');
  
  if (dryRun) {
    console.log('💡 Run without --dry-run to perform the migration.\n');
  } else if (successCount > 0) {
    console.log('✅ Migration complete!\n');
    
    if (!cleanup) {
      console.log('💡 Run with --cleanup to delete local files and reduce repo size.\n');
    }
    
    console.log('📝 Next steps:');
    console.log('   1. Test the site to verify images load correctly');
    console.log('   2. Deploy to Vercel');
    console.log('   3. Commit the database changes (already saved)');
    if (!cleanup) {
      console.log('   4. Delete local images from /public/rentals/ and commit');
    }
    console.log('');
  }
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      removeEmptyDirs(fullPath);
    }
  }
  
  // Check if dir is now empty
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0) {
    fs.rmdirSync(dir);
    console.log(`  Removed empty dir: ${dir}`);
  }
}

main().catch(console.error);
