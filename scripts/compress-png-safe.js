/**
 * PNG-Safe Image Compression
 * Compresses PNGs while KEEPING transparency (no JPG conversion)
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const PROJECT_ROOT = path.resolve(__dirname, '..');

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

async function compressImage(filePath) {
  const originalBuffer = fs.readFileSync(filePath);
  const originalSize = originalBuffer.length;
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    let pipeline = sharp(originalBuffer)
      .resize({ 
        width: 2400, 
        height: 2400, 
        fit: 'inside', 
        withoutEnlargement: true 
      });
    
    let outputBuffer;
    
    if (ext === '.png') {
      // Keep as PNG to preserve transparency!
      outputBuffer = await pipeline
        .png({ 
          quality: 80,
          compressionLevel: 9,  // Max compression
          palette: true,        // Use palette-based encoding when possible
        })
        .toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      outputBuffer = await pipeline
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } else if (ext === '.webp') {
      outputBuffer = await pipeline
        .webp({ quality: 82 })
        .toBuffer();
    }
    
    return { 
      buffer: outputBuffer, 
      originalSize, 
      newSize: outputBuffer.length,
      ext,
    };
  } catch (error) {
    return { error: error.message, originalSize, ext };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n🖼️  PNG-Safe Image Compression (Keeps Transparency!)\n');
  console.log('━'.repeat(55));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Find all images
  const dirs = ['public/rentals', 'public/brand'];
  let allFiles = [];
  
  for (const dir of dirs) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    allFiles = allFiles.concat(getFilesRecursively(fullDir));
  }
  
  // Filter out small files and the logo
  const filesToProcess = allFiles.filter(f => {
    const size = fs.statSync(f).size;
    const name = path.basename(f);
    // Skip files under 500KB and the logo
    return size > 500 * 1024 && name !== 'logo.png';
  });
  
  console.log(`Found ${filesToProcess.length} images to compress\n`);
  
  let totalOriginal = 0;
  let totalNew = 0;
  let successCount = 0;
  
  for (const filePath of filesToProcess) {
    const relPath = path.relative(PROJECT_ROOT, filePath);
    process.stdout.write(`Processing: ${relPath}...`);
    
    const result = await compressImage(filePath);
    
    if (result.error) {
      console.log(` ❌ ${result.error}`);
      continue;
    }
    
    totalOriginal += result.originalSize;
    totalNew += result.newSize;
    
    const savings = ((result.originalSize - result.newSize) / result.originalSize * 100).toFixed(1);
    console.log(` ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (-${savings}%)`);
    
    if (!dryRun) {
      const tempPath = filePath + '.tmp';
      fs.writeFileSync(tempPath, result.buffer);
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
      successCount++;
    }
  }
  
  // Summary
  console.log('\n' + '━'.repeat(55));
  console.log('📊 SUMMARY\n');
  console.log(`  Files compressed:  ${dryRun ? filesToProcess.length : successCount}`);
  console.log(`  Original size:     ${formatBytes(totalOriginal)}`);
  console.log(`  New size:          ${formatBytes(totalNew)}`);
  console.log(`  Total savings:     ${formatBytes(totalOriginal - totalNew)} (${((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1)}%)`);
  console.log('');
  
  if (dryRun) {
    console.log('💡 Run without --dry-run to apply changes.\n');
  } else {
    console.log('✅ Compression complete! Transparency preserved.\n');
  }
  
  // =========================================================================
  // Revert database URLs back to .png
  // =========================================================================
  if (!dryRun) {
    console.log('📝 Reverting database URLs back to .png...\n');
    
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
      
      // Revert main image to .png if it was changed
      if (product.image_url && product.image_url.endsWith('.jpg')) {
        const pngPath = product.image_url.replace('.jpg', '.png');
        const localPath = path.join(PROJECT_ROOT, 'public', pngPath.replace(/^\//, ''));
        
        if (fs.existsSync(localPath)) {
          updates.image_url = pngPath;
          needsUpdate = true;
        }
      }
      
      // Revert gallery URLs
      if (product.gallery_urls && product.gallery_urls.length > 0) {
        const newGallery = product.gallery_urls.map(url => {
          if (url.endsWith('.jpg')) {
            const pngUrl = url.replace('.jpg', '.png');
            const localPath = path.join(PROJECT_ROOT, 'public', pngUrl.replace(/^\//, ''));
            if (fs.existsSync(localPath)) {
              return pngUrl;
            }
          }
          return url;
        });
        
        if (JSON.stringify(newGallery) !== JSON.stringify(product.gallery_urls)) {
          updates.gallery_urls = newGallery;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id);
        
        if (updateError) {
          console.log(`  ❌ ${product.slug}: ${updateError.message}`);
        } else {
          console.log(`  ✅ ${product.slug}: URLs reverted to .png`);
        }
      }
    }
  }
  
  console.log('\n🎉 Done! Test with: npm run dev\n');
}

main().catch(console.error);
