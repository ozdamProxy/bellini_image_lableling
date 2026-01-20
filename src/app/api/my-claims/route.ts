import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getS3ImageUrl } from '@/lib/s3';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const bucket = process.env.AWS_S3_BUCKET || '';

    const { data, error } = await supabase.rpc('get_user_claimed_images', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    const imagesWithUrls = await Promise.all(
      (data || []).map(async (image: any) => {
        const url = await getS3ImageUrl(bucket, image.s3_key);
        return {
          ...image,
          path: url,
        };
      })
    );

    return NextResponse.json({
      images: imagesWithUrls,
      total: imagesWithUrls.length,
    });
  } catch (error) {
    console.error('Error fetching claimed images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claimed images' },
      { status: 500 }
    );
  }
}
