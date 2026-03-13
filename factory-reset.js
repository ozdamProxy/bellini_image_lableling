#!/usr/bin/env node
/**
 * FACTORY RESET SCRIPT
 *
 * This script will:
 * 1. Delete ALL images from S3
 * 2. Delete ALL records from the database
 *
 * RUN WITH: node factory-reset.js [--force]
 *
 * WARNING: This action CANNOT be undone!
 */

// Load environment variables from .env.local
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env.local file not found!');
  console.error('   Please make sure you have configured your environment variables.');
  process.exit(1);
}

console.log('📝 Loading environment variables from .env.local...');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim();
    if (value && !value.startsWith('#')) {
      process.env[key] = value;
    }
  }
});

const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

// Check for --force flag
const forceMode = process.argv.includes('--force');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function factoryReset() {
  console.log('\n' + '='.repeat(60));
  log('☢️  FACTORY RESET / NUCLEAR OPTION  ☢️', 'red');
  log('This will DELETE EVERYTHING!', 'red');
  console.log('='.repeat(60) + '\n');

  // Get configuration
  const bucket = process.env.AWS_S3_BUCKET;
  const prefix = process.env.AWS_S3_PREFIX || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Validate configuration
  log('Configuration Check:', 'cyan');
  console.log(`  AWS Region: ${region || '❌ MISSING'}`);
  console.log(`  S3 Bucket: ${bucket || '❌ MISSING'}`);
  console.log(`  S3 Prefix: ${prefix || '(none)'}`);
  console.log(`  Supabase URL: ${supabaseUrl ? '✓ Configured' : '❌ MISSING'}`);
  console.log(`  Supabase Key: ${supabaseKey ? '✓ Configured' : '❌ MISSING'}`);

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    log('\n❌ ERROR: Missing AWS credentials!', 'red');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseKey) {
    log('\n❌ ERROR: Missing Supabase credentials!', 'red');
    process.exit(1);
  }

  // Initialize clients
  log('\n⚙️  Initializing clients...', 'cyan');
  const s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  const supabase = createClient(supabaseUrl, supabaseKey);
  log('✓ Clients initialized', 'green');

  // Step 1: List all S3 images
  log('\n📋 Step 1: Counting images in S3...', 'cyan');
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  let allS3Keys = [];
  let continuationToken = undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        const keys = response.Contents
          .filter(item => {
            const key = item.Key || '';
            return imageExtensions.some(ext => key.toLowerCase().endsWith(ext));
          })
          .map(item => item.Key || '')
          .filter(key => key !== '');

        allS3Keys = allS3Keys.concat(keys);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    log(`✓ Found ${allS3Keys.length} images in S3`, allS3Keys.length > 0 ? 'yellow' : 'green');
  } catch (error) {
    log(`✗ Error listing S3 objects: ${error.message}`, 'red');
    process.exit(1);
  }

  // Step 2: Count database records
  log('\n📊 Step 2: Counting database records...', 'cyan');
  let dbCount = 0;
  try {
    const { count, error } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true });

    if (error) {
      log(`✗ Error counting database records: ${error.message}`, 'red');
      process.exit(1);
    }

    dbCount = count || 0;
    log(`✓ Found ${dbCount} records in database`, dbCount > 0 ? 'yellow' : 'green');
  } catch (error) {
    log(`✗ Error accessing database: ${error.message}`, 'red');
    process.exit(1);
  }

  // Show summary
  console.log('\n' + '='.repeat(60));
  log('📊 SUMMARY', 'cyan');
  console.log('='.repeat(60));
  log(`  S3 Images to delete:    ${allS3Keys.length}`, 'yellow');
  log(`  Database records to delete: ${dbCount}`, 'yellow');
  console.log('='.repeat(60));

  if (allS3Keys.length === 0 && dbCount === 0) {
    log('\n✅ Nothing to delete! System is already clean.', 'green');
    process.exit(0);
  }

  // Check for force mode
  if (!forceMode) {
    log('\n⚠️  AUTO-CONFIRMATION NOT ENABLED', 'yellow');
    log('   To run this script in automated mode, use:', 'cyan');
    log('   node factory-reset.js --force', 'cyan');
    log('\n   Or run it manually for interactive prompts', 'yellow');
    process.exit(1);
  }

  log('\n⚠️  WARNING: --force flag detected. Starting deletion...', 'yellow');
  const startTime = Date.now();

  // Step 3: Delete from S3
  let s3DeletedCount = 0;
  let s3FailedCount = 0;
  const errors = [];

  if (allS3Keys.length > 0) {
    log(`\n🗑️  Step 3: Deleting ${allS3Keys.length} images from S3...`, 'cyan');

    const batchSize = 1000;
    const totalBatches = Math.ceil(allS3Keys.length / batchSize);

    for (let i = 0; i < allS3Keys.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const batch = allS3Keys.slice(i, i + batchSize);

      process.stdout.write(`\r  Batch ${batchNum}/${totalBatches} (${batch.length} keys)... `);

      try {
        const command = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: false,
          },
        });

        const response = await s3Client.send(command);

        if (response.Deleted) {
          s3DeletedCount += response.Deleted.length;
        }

        if (response.Errors) {
          s3FailedCount += response.Errors.length;
          response.Errors.forEach(err => {
            errors.push(`${err.Key}: ${err.Message}`);
          });
        }
      } catch (error) {
        log(`\n✗ Error deleting batch ${batchNum}: ${error.message}`, 'red');
        errors.push(`Batch ${batchNum}: ${error.message}`);
      }
    }

    process.stdout.write('\r');
    log(`✓ S3 deletion complete: ${s3DeletedCount} deleted, ${s3FailedCount} failed`, s3FailedCount > 0 ? 'yellow' : 'green');
  } else {
    log('\n✓ No S3 images to delete', 'green');
  }

  // Step 4: Delete from database
  if (dbCount > 0) {
    log(`\n🗑️  Step 4: Deleting ${dbCount} records from database...`, 'cyan');

    try {
      // Try using the RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_all_images');

      if (rpcError) {
        // If RPC doesn't exist, use direct delete with TRUNCATE approach
        log('  RPC function not found, using alternative delete method...', 'yellow');

        // Delete all by using a range that covers all possible IDs
        const { error: deleteError } = await supabase
          .from('images')
          .delete()
          .not('id', 'is', null);

        if (deleteError) {
          throw deleteError;
        }
      } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        dbCount = rpcData[0]?.deleted_count || dbCount;
      }

      log(`✓ Database deletion complete: ${dbCount} records deleted`, 'green');
    } catch (error) {
      log(`✗ Error deleting from database: ${error.message}`, 'red');
      log('  S3 files were deleted but database records remain!', 'yellow');
    }
  } else {
    log('\n✓ No database records to delete', 'green');
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(60));
  log('✅ FACTORY RESET COMPLETE', 'green');
  console.log('='.repeat(60));
  log(`  Time elapsed: ${duration} seconds`, 'cyan');
  log(`  S3 images deleted: ${s3DeletedCount}`, 'green');
  log(`  S3 images failed: ${s3FailedCount}`, s3FailedCount > 0 ? 'red' : 'green');
  log(`  Database records deleted: ${dbCount}`, 'green');

  if (errors.length > 0) {
    log(`\n⚠️  Errors encountered (${errors.length}):`, 'yellow');
    errors.slice(0, 10).forEach(err => log(`  - ${err}`, 'yellow'));
    if (errors.length > 10) {
      log(`  ... and ${errors.length - 10} more errors`, 'yellow');
    }
  }

  console.log('='.repeat(60) + '\n');
  log('Your system has been reset to factory state!', 'green');
  log('You can now sync fresh data from S3 if needed', 'cyan');
}

// Run the factory reset
factoryReset().catch(error => {
  log('\n❌ FATAL ERROR:', 'red');
  log(error.message, 'red');
  if (error.stack) {
    console.log('\nStack trace:');
    console.log(error.stack);
  }
  process.exit(1);
});
