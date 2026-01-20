import { NextRequest, NextResponse } from 'next/server';
import { getImagesByLabel, getLabeledUntrainedImages } from '@/lib/supabase';
import { getS3ImageBuffer } from '@/lib/s3';
import { Label } from '@/types/image';
import JSZip from 'jszip';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const label = searchParams.get('label') as Label | null;
    const untrainedOnly = searchParams.get('untrained') === 'true';

    const bucket = process.env.AWS_S3_BUCKET || '';

    let images;
    if (untrainedOnly) {
      images = await getLabeledUntrainedImages();
      if (label) {
        images = images.filter(img => img.label === label);
      }
    } else if (label) {
      images = await getImagesByLabel(label);
    } else {
      return NextResponse.json(
        { error: 'Please specify a label or use untrained filter' },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found matching the criteria' },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (const image of images) {
      try {
        const buffer = await getS3ImageBuffer(bucket, image.s3_key);
        zip.file(image.filename, buffer);
      } catch (error) {
        console.error(`Error adding ${image.filename} to zip:`, error);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const filename = untrainedOnly
      ? `untrained_${label || 'all'}_images.zip`
      : `${label}_images.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error creating download:', error);
    return NextResponse.json(
      { error: 'Failed to create download' },
      { status: 500 }
    );
  }
}
