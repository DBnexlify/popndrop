#!/usr/bin/env node

/**
 * Database Backup Script for Pop and Drop Party Rentals
 * 
 * Run: node scripts/backup-database.js
 * 
 * Creates a JSON backup of all critical tables.
 * Store these backups in Google Drive, Dropbox, or similar.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      // Rejoin in case value contains '=' signs
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return env;
}

const env = loadEnv();

// Validate required env vars
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const TABLES_TO_BACKUP = [
  'products',
  'units',
  'customers',
  'bookings',
  'payments',
  'blackout_dates',
  'admin_users',
  'cancellation_policies',
  'cancellation_requests',
  'notification_log',
  'push_subscriptions',
  // audit_log can be large, uncomment if needed
  // 'audit_log',
];

async function backup() {
  console.log('🔄 Starting database backup...\n');

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const backupData = {
    created_at: new Date().toISOString(),
    project: 'Pop and Drop Party Rentals',
    tables: {},
  };

  let totalRows = 0;

  for (const table of TABLES_TO_BACKUP) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`❌ Error backing up ${table}:`, error.message);
        backupData.tables[table] = { error: error.message };
      } else {
        backupData.tables[table] = data;
        totalRows += data.length;
        console.log(`✅ ${table}: ${data.length} rows`);
      }
    } catch (err) {
      console.error(`❌ Failed to backup ${table}:`, err.message);
      backupData.tables[table] = { error: err.message };
    }
  }

  // Write backup file
  const filename = `popndrop-backup-${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Backup complete!`);
  console.log(`📁 File: ${filepath}`);
  console.log(`📊 Total rows: ${totalRows}`);
  console.log(`📅 Date: ${timestamp}`);
  console.log('='.repeat(50));
  console.log('\n⚠️  Remember to copy this file to Google Drive or Dropbox!');
}

backup().catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
