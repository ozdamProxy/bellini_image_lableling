import { NextRequest, NextResponse } from 'next/server';
import { getAllImagesFromDB, getImagesByLabel, syncS3ImagesToDatabase, getImageStats, getImagesPaginated } from '@/lib/supabase';
import { listS3Images, getS3ImageUrl } from '@/lib/s3';
import { getImageUrl, getPublicS3Url } from '@/lib/s3Urls';
import { Label } from '@/types/image';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const label = searchParams.get('label') as Label | null;
    const sync = searchParams.get('sync') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = searchParams.get('offset');

    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_PREFIX || '';

    if (!bucket) {
      console.error('AWS_S3_BUCKET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error: AWS_S3_BUCKET not configured' },
        { status: 500 }
      );
    }

    if (sync) {
      const s3Keys = await listS3Images(bucket, prefix);
      await syncS3ImagesToDatabase(s3Keys, bucket);
    }

    // Always use pagination - no cap, no legacy behavior
    const offsetValue = offset ? parseInt(offset, 10) : (page - 1) * limit;
    const result = await getImagesPaginated(label, limit, offsetValue);
    const images = result.images;
    const totalCount = result.total;
    const totalPages = Math.ceil(totalCount / limit);

    // Try presigned URLs first, fall back to public URLs if it fails
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        let path: string;

        try {
          // Try presigned URL first (works with private buckets)
          path = await getS3ImageUrl(bucket, image.s3_key, 86400); // 24 hours
        } catch (error) {
          // Fall back to public URL (works with public buckets)
          console.warn(`Presigned URL failed for ${image.filename}, using public URL`);
          path = getPublicS3Url(bucket, image.s3_key);
        }

        return {
          ...image,
          path,
        };
      })
    );

    const stats = await getImageStats();

    return NextResponse.json(
      {
        images: imagesWithUrls,
        pagination: {
          page,
          limit,
          offset: offsetValue,
          total: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        stats,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
