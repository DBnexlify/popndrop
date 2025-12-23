/**
 * Fix script for Pop and Drop image migration
 * 
 * Handles:
 * 1. Retry compressing the 3 failed JPG files
 * 2. Delete old PNG files that were converted to JPG
 * 3. Update database URLs from .png to .jpg
 * 
 * Usage:
 *   node scripts/fix-image-migration.js --dry-run
 *   node scripts/fix-image-migration.js
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Sharp not installed. Run: npm install sharp --save-dev');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// CONFIG
// =============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Files that need retry (the 3 that failed)
const RETRY_FILES = [
  'public/rentals/glitch/combo/photo-6.jpg',
  'public/rentals/glitch/combo/photo-7.jpg',
  'public/rentals/glitch/combo/photo-8.jpg',
];

// PNG files that were converted to JPG (need to delete originals)
const CONVERTED_PNGS = [
  'public/rentals/glitch/combo/hero.png',
  'public/rentals/glitch/combo/photo-1.png',
  'public/rentals/glitch/combo/photo-2.png',
  'public/rentals/glitch/combo/photo-3.png',
  'public/rentals/glitch/combo/photo-4.png',
  'public/rentals/glitch/combo/photo-5.png',
  'public/brand/contact-card.png',
];

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

async function compressJpg(filePath) {
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;
  
  try {
    const buffer = await sharp(filePath)
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    
    return { buffer, originalSize, newSize: buffer.length };
  } catch (error) {
    return { error: error.message, originalSize };
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
  
  console.log('\n🔧 Pop and Drop Image Migration Fix\n');
  console.log('━'.repeat(50));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // =========================================================================
  // STEP 1: Retry failed JPG compressions
  // =========================================================================
  console.log('\n📸 STEP 1: Retry compressing failed JPG files\n');
  
  for (const relPath of RETRY_FILES) {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⏭️  ${relPath} - File not found (already processed?)`);
      continue;
    }
    
    console.log(`  Processing: ${relPath}...`);
    
    const result = await compressJpg(fullPath);
    
    if (result.error) {
      console.log(`     ❌ Error: ${result.error}`);
      console.log(`     💡 Try closing VS Code or any program that might have the file open`);
      continue;
    }
    
    const savings = ((result.originalSize - result.newSize) / result.originalSize * 100).toFixed(1);
    console.log(`     ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (-${savings}%)`);
    
    if (!dryRun) {
      fs.writeFileSync(fullPath, result.buffer);
      console.log(`     ✅ Saved`);
    }
  }
  
  // =========================================================================
  // STEP 2: Delete old PNG files (they've been converted to JPG)
  // =========================================================================
  console.log('\n🗑️  STEP 2: Delete original PNG files (now converted to JPG)\n');
  
  for (const relPath of CONVERTED_PNGS) {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    const jpgPath = fullPath.replace('.png', '.jpg');
    
    // Verify the JPG exists before deleting PNG
    if (!fs.existsSync(jpgPath)) {
      console.log(`  ⚠️  ${relPath} - JPG not found, keeping PNG`);
      continue;
    }
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⏭️  ${relPath} - Already deleted`);
      continue;
    }
    
    const pngSize = fs.statSync(fullPath).size;
    console.log(`  🗑️  ${relPath} (${formatBytes(pngSize)})`);
    
    if (!dryRun) {
      fs.unlinkSync(fullPath);
      console.log(`     ✅ Deleted`);
    }
  }
  
  // =========================================================================
  // STEP 3: Update database URLs (.png → .jpg)
  // =========================================================================
  console.log('\n📝 STEP 3: Update database URLs (.png → .jpg)\n');
  
  const supabase = getSupabase();
  
  // Fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, image_url, gallery_urls');
  
  if (error) {
    console.error('  ❌ Failed to fetch products:', error.message);
    return;
  }
  
  for (const product of products) {
    let needsUpdate = false;
    const updates = {};
    
    // Check main image
    if (product.image_url && product.image_url.endsWith('.png')) {
      const newUrl = product.image_url.replace('.png', '.jpg');
      // Verify the file exists locally
      const localPath = path.join(PROJECT_ROOT, 'public', product.image_url.replace(/^\//, ''));
      const localJpgPath = localPath.replace('.png', '.jpg');
      
      if (fs.existsSync(localJpgPath)) {
        updates.image_url = newUrl;
        needsUpdate = true;
        console.log(`  ${product.slug}: image_url .png → .jpg`);
      }
    }
    
    // Check gallery URLs
    if (product.gallery_urls && product.gallery_urls.length > 0) {
      const newGallery = product.gallery_urls.map(url => {
        if (url.endsWith('.png')) {
          const localPath = path.join(PROJECT_ROOT, 'public', url.replace(/^\//, ''));
          const localJpgPath = localPath.replace('.png', '.jpg');
          
          if (fs.existsSync(localJpgPath)) {
            return url.replace('.png', '.jpg');
          }
        }
        return url;
      });
      
      if (JSON.stringify(newGallery) !== JSON.stringify(product.gallery_urls)) {
        updates.gallery_urls = newGallery;
        needsUpdate = true;
        const changed = product.gallery_urls.filter((url, i) => url !== newGallery[i]).length;
        console.log(`  ${product.slug}: gallery_urls ${changed} URLs updated`);
      }
    }
    
    // Apply updates
    if (needsUpdate && !dryRun) {
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
  
  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '━'.repeat(50));
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply these changes.\n');
  } else {
    console.log('\n✅ Migration fix complete!\n');
    console.log('Next steps:');
    console.log('  1. Run `npm run dev` and test the site');
    console.log('  2. Check that images load correctly on /rentals page');
    console.log('  3. Deploy to Vercel');
    console.log('');
  }
}

main().catch(console.error);
