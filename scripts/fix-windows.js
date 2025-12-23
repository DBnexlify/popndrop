/**
 * Windows-safe image compression with temp file workaround
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const FILES_TO_COMPRESS = [
  'public/rentals/glitch/combo/photo-6.jpg',
  'public/rentals/glitch/combo/photo-7.jpg',
  'public/rentals/glitch/combo/photo-8.jpg',
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n🔧 Windows-Safe Image Fix\n');
  console.log('━'.repeat(50));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE\n');
  }

  // =========================================================================
  // STEP 1: Compress JPGs using temp files
  // =========================================================================
  console.log('\n📸 STEP 1: Compress JPG files\n');
  
  for (const relPath of FILES_TO_COMPRESS) {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    const tempPath = fullPath + '.tmp';
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⏭️  ${relPath} - Not found`);
      continue;
    }
    
    const originalSize = fs.statSync(fullPath).size;
    
    // Skip if already small (under 1MB = already compressed)
    if (originalSize < 1024 * 1024) {
      console.log(`  ⏭️  ${relPath} - Already compressed (${formatBytes(originalSize)})`);
      continue;
    }
    
    console.log(`  Processing: ${relPath}...`);
    
    try {
      // Read into buffer first (doesn't hold file lock)
      const inputBuffer = fs.readFileSync(fullPath);
      
      // Compress
      const outputBuffer = await sharp(inputBuffer)
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      
      const savings = ((originalSize - outputBuffer.length) / originalSize * 100).toFixed(1);
      console.log(`     ${formatBytes(originalSize)} → ${formatBytes(outputBuffer.length)} (-${savings}%)`);
      
      if (!dryRun) {
        // Write to temp file
        fs.writeFileSync(tempPath, outputBuffer);
        
        // Delete original
        fs.unlinkSync(fullPath);
        
        // Rename temp to original
        fs.renameSync(tempPath, fullPath);
        
        console.log(`     ✅ Saved`);
      }
    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
      
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  // =========================================================================
  // STEP 2: Update database URLs
  // =========================================================================
  console.log('\n📝 STEP 2: Update database URLs (.png → .jpg)\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  
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
      updates.image_url = product.image_url.replace('.png', '.jpg');
      needsUpdate = true;
      console.log(`  ${product.slug}: image_url .png → .jpg`);
    }
    
    // Check gallery URLs
    if (product.gallery_urls && product.gallery_urls.length > 0) {
      const newGallery = product.gallery_urls.map(url => 
        url.endsWith('.png') ? url.replace('.png', '.jpg') : url
      );
      
      if (JSON.stringify(newGallery) !== JSON.stringify(product.gallery_urls)) {
        updates.gallery_urls = newGallery;
        needsUpdate = true;
        const changed = product.gallery_urls.filter(url => url.endsWith('.png')).length;
        console.log(`  ${product.slug}: gallery_urls ${changed} URLs updated`);
      }
    }
    
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
  
  console.log('\n' + '━'.repeat(50));
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes.\n');
  } else {
    console.log('\n✅ Done! Test with: npm run dev\n');
  }
}

main().catch(console.error);
