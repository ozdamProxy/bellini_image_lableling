import { NextResponse } from 'next/server';
import { getDeletionStats } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getDeletionStats();

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    console.error('Error in delete-stats API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch deletion statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
