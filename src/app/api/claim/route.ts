import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getS3ImageUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const { userId, userName, batchSize = 1 } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update labeler info if userName is provided
    if (userName) {
      await supabase.rpc('upsert_labeler', {
        p_user_id: userId,
        p_user_name: userName,
      });
    }

    const bucket = process.env.AWS_S3_BUCKET || '';
    const claimedImages = [];

    // Claim multiple images in a batch
    for (let i = 0; i < batchSize; i++) {
      const { data, error } = await supabase.rpc('claim_next_image', {
        p_user_id: userId,
        p_claim_duration_minutes: 10,
      });

      if (error) {
        console.error('Error claiming image:', error);
        break;
      }

      if (data && data.length > 0) {
        const image = data[0];
        const url = await getS3ImageUrl(bucket, image.s3_key);
        claimedImages.push({
          ...image,
          path: url,
        });
      } else {
        break; // No more images available
      }
    }

    return NextResponse.json({
      images: claimedImages,
      claimed: claimedImages.length,
    });
  } catch (error) {
    console.error('Error claiming images:', error);
    return NextResponse.json(
      { error: 'Failed to claim images' },
      { status: 500 }
    );
  }
}

// Release a claim
export async function DELETE(request: NextRequest) {
  try {
    const { userId, filename } = await request.json();

    if (!userId || !filename) {
      return NextResponse.json(
        { error: 'User ID and filename are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc('release_claim', {
      p_user_id: userId,
      p_filename: filename,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error releasing claim:', error);
    return NextResponse.json(
      { error: 'Failed to release claim' },
      { status: 500 }
    );
  }
}

// Extend claim expiration
export async function PATCH(request: NextRequest) {
  try {
    const { userId, filename, additionalMinutes = 5 } = await request.json();

    if (!userId || !filename) {
      return NextResponse.json(
        { error: 'User ID and filename are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('extend_claim', {
      p_user_id: userId,
      p_filename: filename,
      p_additional_minutes: additionalMinutes,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: data });
  } catch (error) {
    console.error('Error extending claim:', error);
    return NextResponse.json(
      { error: 'Failed to extend claim' },
      { status: 500 }
    );
  }
}
