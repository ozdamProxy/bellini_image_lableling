import { NextRequest, NextResponse } from 'next/server';
import { getAllImagesFromDB, getImagesByLabel, syncS3ImagesToDatabase, getImageStats } from '@/lib/supabase';
import { listS3Images, getS3ImageUrl } from '@/lib/s3';
import { Label } from '@/types/image';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const label = searchParams.get('label') as Label | null;
    const sync = searchParams.get('sync') === 'true';

    const bucket = process.env.AWS_S3_BUCKET || '';
    const prefix = process.env.AWS_S3_PREFIX || '';

    if (sync) {
      const s3Keys = await listS3Images(bucket, prefix);
      await syncS3ImagesToDatabase(s3Keys, bucket);
    }

    const images = label ? await getImagesByLabel(label) : await getAllImagesFromDB();

    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await getS3ImageUrl(bucket, image.s3_key);
        return {
          ...image,
          path: url,
        };
      })
    );

    const stats = await getImageStats();

    return NextResponse.json({
      images: imagesWithUrls,
      total: imagesWithUrls.length,
      stats,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
