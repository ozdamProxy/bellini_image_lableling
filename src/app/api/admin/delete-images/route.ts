import { NextRequest, NextResponse } from 'next/server';
import { getFilteredS3Keys, softDeleteImages, hardDeleteImages } from '@/lib/supabase';
import { deleteS3ObjectsChunked } from '@/lib/s3';
import { DeletionFilterType, DeleteImagesRequest } from '@/types/image';

export const dynamic = 'force-dynamic';

const VALID_FILTER_TYPES: DeletionFilterType[] = [
  'all',
  'trained',
  'untrained',
  'faulty',
  'pass',
  'maybe',
  'unlabeled',
];

export async function POST(request: NextRequest) {
  try {
    const body: DeleteImagesRequest = await request.json();
    const { filterType, hardDelete = false, batchSize = 500 } = body;

    // Validate filterType
    if (!filterType || !VALID_FILTER_TYPES.includes(filterType)) {
      return NextResponse.json(
        {
          error: `Invalid filterType: '${filterType}'. Must be one of: ${VALID_FILTER_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

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

    console.log(`Starting deletion: filter=${filterType}, hardDelete=${hardDelete}, batchSize=${batchSize}`);

    // Fetch all S3 keys matching the filter
    // We'll fetch in batches to get all keys
    let allS3Keys: Array<{ s3_key: string; filename: string; id: string }> = [];
    let offset = 0;
    const fetchBatchSize = 1000;

    while (true) {
      const batch = await getFilteredS3Keys(filterType, fetchBatchSize, offset);
      if (batch.length === 0) break;

      allS3Keys.push(...batch);
      offset += fetchBatchSize;

      // Safety check to prevent infinite loops
      if (batch.length < fetchBatchSize) break;
    }

    if (allS3Keys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No images found matching the specified filter.',
        stats: {
          totalQueued: 0,
          s3Deleted: 0,
          s3Failed: 0,
          dbUpdated: 0,
        },
        errors: [],
      });
    }

    console.log(`Found ${allS3Keys.length} images to delete`);

    // Extract just the S3 keys
    const s3Keys = allS3Keys.map(item => item.s3_key);

    // Delete from S3 in batches
    const deleteResult = await deleteS3ObjectsChunked(
      bucket,
      s3Keys,
      batchSize,
      (completed, total) => {
        console.log(`S3 deletion progress: ${completed}/${total}`);
      }
    );

    // Update database
    let dbUpdated = 0;
    if (hardDelete) {
      dbUpdated = await hardDeleteImages(filterType);
      console.log(`Hard deleted ${dbUpdated} database records`);
    } else {
      dbUpdated = await softDeleteImages(filterType);
      console.log(`Soft deleted ${dbUpdated} database records (set s3_key to NULL)`);
    }

    // Build response
    const message = hardDelete
      ? `Successfully deleted ${deleteResult.deletedCount} S3 images and removed ${dbUpdated} database records.`
      : `Successfully deleted ${deleteResult.deletedCount} S3 images and updated ${dbUpdated} database records (s3_key set to NULL).`;

    return NextResponse.json({
      success: true,
      message,
      stats: {
        totalQueued: allS3Keys.length,
        s3Deleted: deleteResult.deletedCount,
        s3Failed: deleteResult.failedCount,
        dbUpdated,
      },
      errors: deleteResult.errors,
    });
  } catch (error) {
    console.error('Error in delete-images API:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete images',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
