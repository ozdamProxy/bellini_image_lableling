import { NextRequest, NextResponse } from 'next/server';
import { updateImageLabel } from '@/lib/supabase';
import { LabelRequest } from '@/types/image';

export async function POST(request: NextRequest) {
  try {
    const body: LabelRequest = await request.json();
    const { filename, label } = body;

    if (!filename || !label) {
      return NextResponse.json(
        { error: 'Filename and label are required' },
        { status: 400 }
      );
    }

    if (!['pass', 'faulty', 'maybe', 'unlabeled'].includes(label)) {
      return NextResponse.json(
        { error: 'Invalid label' },
        { status: 400 }
      );
    }

    const updatedImage = await updateImageLabel(filename, label);

    if (!updatedImage) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error('Error labeling image:', error);
    return NextResponse.json(
      { error: 'Failed to label image' },
      { status: 500 }
    );
  }
}
