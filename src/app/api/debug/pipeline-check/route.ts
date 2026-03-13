import { NextResponse } from 'next/server';
import { listS3Images } from '@/lib/s3';
import { syncS3ImagesToDatabase, getAllImagesFromDB } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      envVars: {} as Record<string, boolean>,
      s3: {
        accessible: false,
        error: null as string | null,
        imageCount: 0,
        sampleImages: [] as string[],
      },
      database: {
        accessible: false,
        error: null as string | null,
        imageCount: 0,
      },
      sync: {
        attempted: false,
        success: false,
        error: null as string | null,
        syncedCount: 0,
      },
    },
  };

  // Step 1: Check Environment Variables
  results.checks.envVars = {
    AWS_REGION: !!process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const bucket = process.env.AWS_S3_BUCKET;
  const prefix = process.env.AWS_S3_PREFIX || '';

  if (!bucket) {
    results.checks.s3.error = 'AWS_S3_BUCKET environment variable is not set';
    return NextResponse.json(results);
  }

  // Step 2: Test S3 Connection
  try {
    console.log('[PIPELINE] Testing S3 connection...');
    console.log('[PIPELINE] Bucket:', bucket);
    console.log('[PIPELINE] Prefix:', prefix);
    console.log('[PIPELINE] Region:', process.env.AWS_REGION);

    const s3Images = await listS3Images(bucket, prefix);

    results.checks.s3.accessible = true;
    results.checks.s3.imageCount = s3Images.length;
    results.checks.s3.sampleImages = s3Images.slice(0, 5); // First 5 images

    console.log('[PIPELINE] S3 connection successful. Found', s3Images.length, 'images');
  } catch (error) {
    results.checks.s3.error = error instanceof Error ? error.message : 'Unknown S3 error';
    console.error('[PIPELINE] S3 connection failed:', error);
    return NextResponse.json(results);
  }

  // Step 3: Test Database Connection
  try {
    console.log('[PIPELINE] Testing database connection...');
    const dbImages = await getAllImagesFromDB();

    results.checks.database.accessible = true;
    results.checks.database.imageCount = dbImages.length;

    console.log('[PIPELINE] Database connection successful. Found', dbImages.length, 'images');
  } catch (error) {
    results.checks.database.error = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[PIPELINE] Database connection failed:', error);
    // Don't return yet, continue to sync attempt
  }

  // Step 4: Attempt Sync (if S3 is accessible)
  if (results.checks.s3.accessible && results.checks.s3.imageCount > 0) {
    try {
      console.log('[PIPELINE] Attempting to sync S3 images to database...');
      results.checks.sync.attempted = true;

      await syncS3ImagesToDatabase(results.checks.s3.sampleImages, bucket);

      // Verify sync worked
      const dbImagesAfter = await getAllImagesFromDB();
      results.checks.sync.syncedCount = dbImagesAfter.length;
      results.checks.sync.success = true;

      console.log('[PIPELINE] Sync successful! Database now has', dbImagesAfter.length, 'images');
    } catch (error) {
      results.checks.sync.error = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('[PIPELINE] Sync failed:', error);
    }
  } else {
    results.checks.sync.error = results.checks.s3.error || 'No images found in S3';
  }

  return NextResponse.json(results);
}
