import { NextRequest, NextResponse } from 'next/server';
import { syncS3ImagesToDatabase, getLatestS3Key, backfillCapturedAt } from '@/lib/supabase';
import { listS3Images } from '@/lib/s3';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_PREFIX || '';
    const fullSync = request.nextUrl.searchParams.get('full') === 'true';

    if (!bucket) {
      return NextResponse.json(
        { error: 'AWS S3 bucket not configured' },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // Incremental sync: only list S3 objects after the latest key already in DB.
    // S3 lists in lexicographic order; since filenames start with YYYYMMDD_HHMMSS,
    // alphabetical == chronological, so StartAfter gives us only truly new images.
    let cursor: string | null = null;
    if (!fullSync) {
      cursor = await getLatestS3Key();
      if (cursor) {
        console.log(`Incremental sync — cursor: ${cursor}`);
      } else {
        console.log('No cursor found, performing full sync');
      }
    } else {
      console.log('Full sync requested');
    }

    const s3Keys = await listS3Images(bucket, prefix, cursor ?? undefined);
    console.log(`Found ${s3Keys.length} new images in S3`);

    const { newCount } = await syncS3ImagesToDatabase(s3Keys, bucket);

    // Backfill any rows still missing captured_at (e.g. after first migration)
    const backfilled = await backfillCapturedAt();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: `Sync complete! Added ${newCount} new images${backfilled > 0 ? `, backfilled ${backfilled} dates` : ''} (${duration}s)`,
      added: newCount,
      backfilled,
      duration: `${duration}s`,
      incremental: !fullSync && !!cursor,
    });
  } catch (error) {
    console.error('Error syncing images:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync images from S3',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
