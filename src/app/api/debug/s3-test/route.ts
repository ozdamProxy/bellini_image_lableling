import { NextResponse } from 'next/server';
import { getS3ImageUrl, listS3Images } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = {
    envVars: {
      AWS_REGION: !!process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
      bucketName: process.env.AWS_S3_BUCKET || 'NOT SET',
    },
    s3Test: {
      success: false,
      error: null as string | null,
      imageCount: 0,
      sampleImageUrl: null as string | null,
    },
  };

  try {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    // Test 1: List images
    const images = await listS3Images(bucket);
    results.s3Test.imageCount = images.length;

    // Test 2: Generate presigned URL for first image
    if (images.length > 0) {
      const firstImage = images[0];
      const signedUrl = await getS3ImageUrl(bucket, firstImage);
      results.s3Test.sampleImageUrl = signedUrl;
      results.s3Test.success = true;
    } else {
      results.s3Test.error = 'No images found in bucket';
    }
  } catch (error) {
    results.s3Test.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('S3 test failed:', error);
  }

  return NextResponse.json(results);
}
