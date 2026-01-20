import { NextRequest, NextResponse } from 'next/server';
import { syncS3ImagesToDatabase } from '@/lib/supabase';
import { listS3Images } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const bucket = process.env.AWS_S3_BUCKET || '';
    const prefix = process.env.AWS_S3_PREFIX || '';

    if (!bucket) {
      return NextResponse.json(
        { error: 'AWS S3 bucket not configured' },
        { status: 500 }
      );
    }

    console.log('Starting S3 sync...');
    const startTime = Date.now();

    const s3Keys = await listS3Images(bucket, prefix);
    console.log(`Found ${s3Keys.length} images in S3`);

    const { newCount, skippedCount } = await syncS3ImagesToDatabase(s3Keys, bucket);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Sync completed in ${duration}s - Added: ${newCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({
      success: true,
      message: `Sync complete! Added ${newCount} new images, skipped ${skippedCount} existing images (${duration}s)`,
      total: s3Keys.length,
      added: newCount,
      skipped: skippedCount,
      duration: `${duration}s`,
    });
  } catch (error) {
    console.error('Error syncing images:', error);
    return NextResponse.json(
      { error: 'Failed to sync images from S3' },
      { status: 500 }
    );
  }
}
