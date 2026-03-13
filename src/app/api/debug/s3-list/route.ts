import { NextRequest, NextResponse } from 'next/server';
import { listS3Images } from '@/lib/s3';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_PREFIX || '';

    if (!bucket) {
      return NextResponse.json(
        { error: 'AWS S3 bucket not configured' },
        { status: 500 }
      );
    }

    console.log('=== Debug S3 List ===');
    console.log('Bucket:', bucket);
    console.log('Prefix:', prefix || '(none)');

    const s3Keys = await listS3Images(bucket, prefix);

    console.log(`Found ${s3Keys.length} images in S3`);

    return NextResponse.json({
      bucket,
      prefix: prefix || '(none)',
      totalImages: s3Keys.length,
      sampleKeys: s3Keys.slice(0, 10),
      allKeys: s3Keys,
    });
  } catch (error) {
    console.error('Error listing S3 images:', error);
    return NextResponse.json(
      {
        error: 'Failed to list S3 images',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
