import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Release all claims for this user
    const { data, error } = await supabase
      .from('images')
      .update({
        claimed_by: null,
        claimed_at: null,
        claim_expires_at: null,
      })
      .eq('claimed_by', userId)
      .select('filename');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Released ${data?.length || 0} claims for user ${userId}`,
      released_count: data?.length || 0,
    });
  } catch (error) {
    console.error('Error releasing claims:', error);
    return NextResponse.json(
      { error: 'Failed to release claims' },
      { status: 500 }
    );
  }
}
