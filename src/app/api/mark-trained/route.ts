import { NextRequest, NextResponse } from 'next/server';
import { markImagesAsTrained } from '@/lib/supabase';
import { MarkTrainedRequest } from '@/types/image';

export async function POST(request: NextRequest) {
  try {
    const body: MarkTrainedRequest = await request.json();
    const { filenames } = body;

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { error: 'Filenames array is required' },
        { status: 400 }
      );
    }

    await markImagesAsTrained(filenames);

    return NextResponse.json({
      success: true,
      count: filenames.length,
      message: `${filenames.length} image(s) marked as trained`,
    });
  } catch (error) {
    console.error('Error marking images as trained:', error);
    return NextResponse.json(
      { error: 'Failed to mark images as trained' },
      { status: 500 }
    );
  }
}
