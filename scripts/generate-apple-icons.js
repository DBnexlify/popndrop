#!/usr/bin/env node
/**
 * =============================================================================
 * GENERATE APPLE TOUCH ICONS
 * scripts/generate-apple-icons.js
 * =============================================================================
 * 
 * This script generates the required Apple touch icons for PWA home screen.
 * 
 * Apple requires specific icon sizes that are DIFFERENT from Android:
 * - Android uses: manifest.json icons (192x192, 512x512)
 * - Apple uses: <link rel="apple-touch-icon"> in HTML (180x180, 152x152, 120x120)
 * 
 * Usage:
 *   npm install sharp --save-dev (one-time)
 *   node scripts/generate-apple-icons.js
 * 
 * Or with npx (no install needed):
 *   npx --yes sharp-cli resize 180 180 --input public/admin/icon-512.png --output public/admin/apple-touch-icon.png
 *   npx --yes sharp-cli resize 152 152 --input public/admin/icon-512.png --output public/admin/apple-touch-icon-152.png
 *   npx --yes sharp-cli resize 120 120 --input public/admin/icon-512.png --output public/admin/apple-touch-icon-120.png
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('\x1b[33m%s\x1b[0m', '⚠️  Sharp not installed. Running install...');
  console.log('\nTo generate Apple touch icons, you have two options:\n');
  
  console.log('\x1b[36m%s\x1b[0m', 'OPTION 1: Quick one-liner commands (recommended):');
  console.log('  Copy and run these commands in your terminal:\n');
  console.log('  npx --yes sharp-cli resize 180 180 --input public/admin/icon-512.png --output public/admin/apple-touch-icon.png');
  console.log('  npx --yes sharp-cli resize 152 152 --input public/admin/icon-512.png --output public/admin/apple-touch-icon-152.png');
  console.log('  npx --yes sharp-cli resize 120 120 --input public/admin/icon-512.png --output public/admin/apple-touch-icon-120.png\n');
  
  console.log('\x1b[36m%s\x1b[0m', 'OPTION 2: Install sharp and run this script:');
  console.log('  npm install sharp --save-dev');
  console.log('  node scripts/generate-apple-icons.js\n');
  
  console.log('\x1b[36m%s\x1b[0m', 'OPTION 3: Use an online tool:');
  console.log('  1. Go to https://realfavicongenerator.net/');
  console.log('  2. Upload your logo (public/brand/logo.png or public/admin/icon-512.png)');
  console.log('  3. Download and extract to public/admin/');
  console.log('  4. Rename the 180x180 icon to "apple-touch-icon.png"\n');
  
  process.exit(0);
}

// Icon sizes needed for Apple
const APPLE_ICON_SIZES = [
  { size: 180, name: 'apple-touch-icon.png' },     // iPhone retina
  { size: 152, name: 'apple-touch-icon-152.png' }, // iPad retina
  { size: 120, name: 'apple-touch-icon-120.png' }, // iPhone
];

// Source icon - use the highest resolution available
const SOURCE_ICON = path.join(__dirname, '../public/admin/icon-512.png');
const OUTPUT_DIR = path.join(__dirname, '../public/admin');

async function generateIcons() {
  console.log('\x1b[36m%s\x1b[0m', '🍎 Generating Apple Touch Icons...\n');
  
  // Check source exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Source icon not found: ${SOURCE_ICON}`);
    console.log('   Please ensure icon-512.png exists in public/admin/');
    process.exit(1);
  }
  
  console.log(`   Source: ${SOURCE_ICON}`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);
  
  for (const icon of APPLE_ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    
    try {
      await sharp(SOURCE_ICON)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 } // Match PWA background color
        })
        .png()
        .toFile(outputPath);
      
      console.log(`   ✅ Created ${icon.name} (${icon.size}x${icon.size})`);
    } catch (err) {
      console.error(`   ❌ Failed to create ${icon.name}: ${err.message}`);
    }
  }
  
  console.log('\n\x1b[32m%s\x1b[0m', '✨ Apple Touch Icons generated successfully!');
  console.log('\n   Next steps:');
  console.log('   1. Deploy to Vercel');
  console.log('   2. On your iPhone, go to the admin page');
  console.log('   3. Tap Share → Add to Home Screen');
  console.log('   4. The Pop & Drop logo should now appear!\n');
  console.log('\x1b[33m%s\x1b[0m', '   ⚠️  Note: You may need to clear Safari cache if old icon persists.');
  console.log('      Settings → Safari → Clear History and Website Data\n');
}

generateIcons().catch(console.error);
