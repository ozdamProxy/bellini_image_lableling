import { NextRequest, NextResponse } from 'next/server';
import { listS3Images } from '@/lib/s3';

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

    // Get S3 configuration from environment
    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_PREFIX || '';

    if (!bucket) {
      return NextResponse.json(
        {
          error: 'S3 bucket not configured. Please check AWS_S3_BUCKET environment variable.',
        },
        { status: 500 }
      );
    }

    // Step 1: Get ALL images from S3 (not just those in the database)
    console.log('Step 1: Listing all images from S3...');
    const s3Keys = await listS3Images(bucket, prefix);
    console.log(`Found ${s3Keys.length} images in S3`);

    // Step 2: Delete all images from S3
    let s3DeletedCount = 0;
    let s3FailedCount = 0;
    const errors: string[] = [];

    if (s3Keys.length > 0) {
      console.log(`Step 2: Deleting ${s3Keys.length} images from S3...`);

      const { deleteS3ObjectsChunked } = await import('@/lib/s3');
      const deleteResult = await deleteS3ObjectsChunked(
        bucket,
        s3Keys,
        500,
        (completed, total) => {
          console.log(`S3 deletion progress: ${completed}/${total}`);
        }
      );

      s3DeletedCount = deleteResult.deletedCount;
      s3FailedCount = deleteResult.failedCount;
      errors.push(...deleteResult.errors);

      console.log(`S3 deletion completed: ${s3DeletedCount} deleted, ${s3FailedCount} failed`);
    }

    // Step 3: Delete ALL records from database using RPC function
    console.log('Step 3: Deleting all records from database...');

    const { factoryResetDatabase } = await import('@/lib/supabase');

    // Use the helper function to delete all records
    const dbDeletedCount = await factoryResetDatabase();
    console.log(`Deleted ${dbDeletedCount} records from database`);

    // Build response
    const message = `HARD RESET complete: Deleted ${s3DeletedCount} S3 images and ${dbDeletedCount} database records.`;

    return NextResponse.json({
      success: true,
      message,
      stats: {
        s3ImagesFound: s3Keys.length,
        s3Deleted: s3DeletedCount,
        s3Failed: s3FailedCount,
        dbDeleted: dbDeletedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
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
