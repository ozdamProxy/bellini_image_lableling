import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Release all expired claims
    const { error } = await supabase.rpc('release_expired_claims');

    if (error) {
      throw error;
    }

    // Get count of released claims
    const { count } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .is('claimed_by', null)
      .eq('label', 'unlabeled');

    return NextResponse.json({
      success: true,
      message: 'Successfully released all expired claims',
      available_count: count || 0,
    });
  } catch (error) {
    console.error('Error releasing expired claims:', error);
    return NextResponse.json(
      { error: 'Failed to release expired claims' },
      { status: 500 }
    );
  }
}
