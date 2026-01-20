import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get labeler names mapping
    const { data: labelerData, error: labelerError } = await supabase
      .from('labelers')
      .select('user_id, user_name');

    if (labelerError) throw labelerError;

    // Create a map of userId to userName
    const userNameMap: Record<string, string> = {};
    labelerData?.forEach((labeler: any) => {
      userNameMap[labeler.user_id] = labeler.user_name;
    });

    // Get all labeled images (not unlabeled)
    const { data: labeledImages, error: labeledError } = await supabase
      .from('images')
      .select('claimed_by, label, labeled_at')
      .not('claimed_by', 'is', null)
      .neq('label', 'unlabeled');

    if (labeledError) throw labeledError;

    // Aggregate stats by user
    const userStats: Record<string, any> = {};

    labeledImages?.forEach((image: any) => {
      if (!userStats[image.claimed_by]) {
        userStats[image.claimed_by] = {
          userId: image.claimed_by,
          userName: userNameMap[image.claimed_by] || image.claimed_by,
          totalLabeled: 0,
          passCount: 0,
          faultyCount: 0,
          maybeCount: 0,
          lastActivity: image.labeled_at,
        };
      }

      userStats[image.claimed_by].totalLabeled++;

      if (image.label === 'pass') userStats[image.claimed_by].passCount++;
      if (image.label === 'faulty') userStats[image.claimed_by].faultyCount++;
      if (image.label === 'maybe') userStats[image.claimed_by].maybeCount++;

      const activityDate = new Date(image.labeled_at);
      const lastActivity = new Date(userStats[image.claimed_by].lastActivity);
      if (activityDate > lastActivity) {
        userStats[image.claimed_by].lastActivity = image.labeled_at;
      }
    });

    // Sort by total labeled (descending)
    const leaderboard = Object.values(userStats).sort((a: any, b: any) =>
      b.totalLabeled - a.totalLabeled
    );

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
