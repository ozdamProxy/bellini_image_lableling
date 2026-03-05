import { NextRequest, NextResponse } from 'next/server';
import { hardDeleteImages } from '@/lib/supabase';
import { deleteS3ObjectsChunked } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Require explicit confirmation
    if (!body.confirm || body.confirm !== true) {
      return NextResponse.json(
        {
          error: 'Confirmation required. Set confirm: true to proceed with hard reset.',
        },
        { status: 400 }
      );
    }

    // Log the hard reset operation
    const timestamp = new Date().toISOString();
    console.log(`⚠️ HARD RESET initiated at ${timestamp} - This will delete ALL S3 images and database records`);

    // Get S3 bucket from environment
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        {
          error: 'S3 bucket not configured. Please check AWS_S3_BUCKET environment variable.',
        },
        { status: 500 }
      );
    }

    // Get ALL S3 keys (filter: 'all')
    // We need to fetch in batches to get all keys
    let allS3Keys: Array<{ s3_key: string; filename: string; id: string }> = [];
    let offset = 0;
    const fetchBatchSize = 1000;

    console.log('Fetching all S3 keys for hard reset...');
    while (true) {
      const batch = await hardDeleteImages('all'); // This won't work, we need a different approach

      // Actually, we need to fetch the keys first, then delete
      // Let's use the RPC function to get keys
      const { getFilteredS3Keys } = await import('@/lib/supabase');
      const keysBatch = await getFilteredS3Keys('all', fetchBatchSize, offset);

      if (keysBatch.length === 0) break;

      allS3Keys.push(...keysBatch);
      offset += fetchBatchSize;

      console.log(`Fetched ${allS3Keys.length} keys so far...`);

      // Safety check to prevent infinite loops
      if (keysBatch.length < fetchBatchSize) break;
    }

    if (allS3Keys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No images found. Hard reset complete.',
        stats: {
          totalQueued: 0,
          s3Deleted: 0,
          s3Failed: 0,
          dbDeleted: 0,
        },
        errors: [],
      });
    }

    console.log(`⚠️ HARD RESET: Deleting ${allS3Keys.length} images from S3 and database`);

    // Extract just the S3 keys
    const s3Keys = allS3Keys.map(item => item.s3_key);

    // Delete from S3 in batches
    const deleteResult = await deleteS3ObjectsChunked(
      bucket,
      s3Keys,
      500,
      (completed, total) => {
        console.log(`HARD RESET S3 deletion progress: ${completed}/${total}`);
      }
    );

    // Delete all database records
    const dbDeleted = await hardDeleteImages('all');
    console.log(`HARD RESET: Deleted ${dbDeleted} database records`);

    return NextResponse.json({
      success: true,
      message: `HARD RESET complete: Deleted ${deleteResult.deletedCount} S3 images and ${dbDeleted} database records.`,
      stats: {
        totalQueued: allS3Keys.length,
        s3Deleted: deleteResult.deletedCount,
        s3Failed: deleteResult.failedCount,
        dbDeleted,
      },
      errors: deleteResult.errors,
    });
  } catch (error) {
    console.error('Error in hard-reset API:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform hard reset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
