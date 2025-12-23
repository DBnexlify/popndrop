/**
 * Image Compression Script for Pop and Drop Party Rentals
 * 
 * Compresses images in /public folder while maintaining visual quality.
 * Uses sharp (same library Next.js uses for image optimization).
 * 
 * Usage:
 *   npm install sharp --save-dev
 *   node scripts/compress-images.js
 * 
 * Options:
 *   --dry-run    Show what would be compressed without actually doing it
 *   --backup     Create backups before compressing (adds .backup extension)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('\n❌ Sharp is not installed. Run:\n');
  console.error('   npm install sharp --save-dev\n');
  process.exit(1);
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Directories to scan (relative to project root)
  directories: [
    'public/rentals',
    'public/brand',
  ],
  
  // Size thresholds
  minSizeToCompress: 500 * 1024, // Only compress files > 500KB
  
  // Quality settings (higher = better quality, larger file)
  quality: {
    jpeg: 82,      // 80-85 is visually lossless for most images
    webp: 82,      // WebP is more efficient, same quality at lower size
    png: 85,       // PNG compression level
  },
  
  // Maximum dimensions (images larger than this will be resized)
  maxDimensions: {
    width: 2400,   // Max width in pixels
    height: 2400,  // Max height in pixels
  },
  
  // File extensions to process
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

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

async function compressImage(filePath, dryRun = false, createBackup = false) {
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;
  const ext = path.extname(filePath).toLowerCase();
  
  // Skip small files
  if (originalSize < CONFIG.minSizeToCompress) {
    return { skipped: true, reason: 'below threshold', originalSize };
  }
  
  try {
    // Read the image
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Calculate new dimensions if needed
    let resizeOptions = null;
    if (metadata.width > CONFIG.maxDimensions.width || metadata.height > CONFIG.maxDimensions.height) {
      resizeOptions = {
        width: CONFIG.maxDimensions.width,
        height: CONFIG.maxDimensions.height,
        fit: 'inside',
        withoutEnlargement: true,
      };
    }
    
    // Build the pipeline
    let pipeline = sharp(filePath);
    
    if (resizeOptions) {
      pipeline = pipeline.resize(resizeOptions);
    }
    
    // Apply format-specific compression
    let outputBuffer;
    if (ext === '.png') {
      // For PNGs, convert to WebP if it's a photo (has many colors)
      // Keep as PNG if it's a logo/graphic (fewer colors)
      if (metadata.width * metadata.height > 500000) {
        // Large image, likely a photo - use lossy compression
        outputBuffer = await pipeline
          .jpeg({ quality: CONFIG.quality.jpeg, mozjpeg: true })
          .toBuffer();
      } else {
        outputBuffer = await pipeline
          .png({ quality: CONFIG.quality.png, compressionLevel: 9 })
          .toBuffer();
      }
    } else if (ext === '.jpg' || ext === '.jpeg') {
      outputBuffer = await pipeline
        .jpeg({ quality: CONFIG.quality.jpeg, mozjpeg: true })
        .toBuffer();
    } else if (ext === '.webp') {
      outputBuffer = await pipeline
        .webp({ quality: CONFIG.quality.webp })
        .toBuffer();
    }
    
    const newSize = outputBuffer.length;
    const savings = originalSize - newSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
    
    // Only save if we actually reduced the size
    if (savings > 0 && !dryRun) {
      // Create backup if requested
      if (createBackup) {
        fs.copyFileSync(filePath, filePath + '.backup');
      }
      
      // For PNGs that we converted to JPEG, update the extension
      let outputPath = filePath;
      if (ext === '.png' && metadata.width * metadata.height > 500000) {
        outputPath = filePath.replace('.png', '.jpg');
        // Delete the old PNG after saving new JPEG
        fs.writeFileSync(outputPath, outputBuffer);
        fs.unlinkSync(filePath);
      } else {
        fs.writeFileSync(filePath, outputBuffer);
      }
    }
    
    return {
      skipped: false,
      originalSize,
      newSize,
      savings,
      savingsPercent,
      resized: !!resizeOptions,
      converted: ext === '.png' && metadata.width * metadata.height > 500000,
    };
    
  } catch (error) {
    return { skipped: true, reason: error.message, originalSize };
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const createBackup = args.includes('--backup');
  
  console.log('\n🖼️  Pop and Drop Image Compression\n');
  console.log('━'.repeat(50));
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }
  
  // Find all images
  const projectRoot = path.resolve(__dirname, '..');
  let allFiles = [];
  
  for (const dir of CONFIG.directories) {
    const fullDir = path.join(projectRoot, dir);
    const files = getFilesRecursively(fullDir);
    allFiles = allFiles.concat(files);
  }
  
  if (allFiles.length === 0) {
    console.log('No images found to compress.');
    return;
  }
  
  console.log(`Found ${allFiles.length} images to analyze\n`);
  
  // Process each file
  let totalOriginal = 0;
  let totalNew = 0;
  let totalSavings = 0;
  let filesCompressed = 0;
  let filesSkipped = 0;
  let filesConverted = 0;
  
  const results = [];
  
  for (const filePath of allFiles) {
    const relativePath = path.relative(projectRoot, filePath);
    process.stdout.write(`Processing: ${relativePath}...`);
    
    const result = await compressImage(filePath, dryRun, createBackup);
    
    if (result.skipped) {
      console.log(` ⏭️  Skipped (${result.reason})`);
      filesSkipped++;
    } else {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      totalSavings += result.savings;
      filesCompressed++;
      
      if (result.converted) {
        filesConverted++;
        console.log(` ✅ ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (-${result.savingsPercent}%) [PNG→JPG]`);
      } else {
        console.log(` ✅ ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (-${result.savingsPercent}%)`);
      }
      
      results.push({
        path: relativePath,
        ...result,
      });
    }
  }
  
  // Summary
  console.log('\n' + '━'.repeat(50));
  console.log('📊 SUMMARY\n');
  console.log(`  Files analyzed:    ${allFiles.length}`);
  console.log(`  Files compressed:  ${filesCompressed}`);
  console.log(`  Files converted:   ${filesConverted} (PNG → JPG)`);
  console.log(`  Files skipped:     ${filesSkipped}`);
  console.log('');
  console.log(`  Original size:     ${formatBytes(totalOriginal)}`);
  console.log(`  New size:          ${formatBytes(totalNew)}`);
  console.log(`  Total savings:     ${formatBytes(totalSavings)} (${((totalSavings / totalOriginal) * 100).toFixed(1)}%)`);
  console.log('');
  
  if (dryRun) {
    console.log('💡 Run without --dry-run to apply these changes.\n');
  } else if (filesCompressed > 0) {
    console.log('✅ Compression complete!\n');
    
    if (filesConverted > 0) {
      console.log('⚠️  NOTE: Some PNG files were converted to JPG.');
      console.log('   Update any code references if needed.\n');
    }
  }
  
  // Show top savings
  if (results.length > 0) {
    console.log('📈 Top savings:\n');
    results
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10)
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.path}`);
        console.log(`     ${formatBytes(r.originalSize)} → ${formatBytes(r.newSize)} (-${r.savingsPercent}%)\n`);
      });
  }
}

main().catch(console.error);
