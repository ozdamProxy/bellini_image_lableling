import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get labeler names mapping
    const { data: labelerData, error: labelerError } = await supabase
      .from('labelers')
      .select('user_id, user_name');

    // Don't fail if labelers table doesn't exist - just continue without names
    if (labelerError) {
      console.warn('Could not fetch labelers table (may not exist yet):', labelerError.message);
    }

    // Create a map of userId to userName
    const userNameMap: Record<string, string> = {};
    labelerData?.forEach((labeler: any) => {
      userNameMap[labeler.user_id] = labeler.user_name;
    });

    // Get all active claims with user stats
    const { data: claims, error: claimsError } = await supabase
      .from('images')
      .select('claimed_by, claimed_at, claim_expires_at, filename, label')
      .not('claimed_by', 'is', null)
      .order('claimed_at', { ascending: false });

    if (claimsError) throw claimsError;

    // Get labeling stats per user
    const { data: labeledImages, error: labeledError } = await supabase
      .from('images')
      .select('claimed_by, label, labeled_at')
      .not('claimed_by', 'is', null)
      .neq('label', 'unlabeled');

    if (labeledError) throw labeledError;

    // Aggregate data by user
    const labelerStats: Record<string, any> = {};

    // Debug logging
    console.log('Unique claimed_by values:', [...new Set(claims?.map(c => c.claimed_by))]);
    console.log('Total claims found:', claims?.length);

    // Process active claims
    claims?.forEach((claim: any) => {
      if (!labelerStats[claim.claimed_by]) {
        labelerStats[claim.claimed_by] = {
          userId: claim.claimed_by,
          userName: userNameMap[claim.claimed_by] || claim.claimed_by,
          activeClaims: 0,
          claimedImages: [],
          totalLabeled: 0,
          passCount: 0,
          faultyCount: 0,
          maybeCount: 0,
          lastActivity: claim.claimed_at,
        };
      }

      // Count all unlabeled claims (including expired ones for admin visibility)
      if (claim.label === 'unlabeled') {
        labelerStats[claim.claimed_by].activeClaims++;
        labelerStats[claim.claimed_by].claimedImages.push({
          filename: claim.filename,
          claimed_at: claim.claimed_at,
          claim_expires_at: claim.claim_expires_at,
        });
      }

      const activityDate = new Date(claim.claimed_at);
      const lastActivity = new Date(labelerStats[claim.claimed_by].lastActivity);
      if (activityDate > lastActivity) {
        labelerStats[claim.claimed_by].lastActivity = claim.claimed_at;
      }
    });

    // Process labeled images
    labeledImages?.forEach((image: any) => {
      if (!labelerStats[image.claimed_by]) {
        labelerStats[image.claimed_by] = {
          userId: image.claimed_by,
          userName: userNameMap[image.claimed_by] || image.claimed_by,
          activeClaims: 0,
          claimedImages: [],
          totalLabeled: 0,
          passCount: 0,
          faultyCount: 0,
          maybeCount: 0,
          lastActivity: image.labeled_at,
        };
      }

      labelerStats[image.claimed_by].totalLabeled++;

      if (image.label === 'pass') labelerStats[image.claimed_by].passCount++;
      if (image.label === 'faulty') labelerStats[image.claimed_by].faultyCount++;
      if (image.label === 'maybe') labelerStats[image.claimed_by].maybeCount++;

      const activityDate = new Date(image.labeled_at);
      const lastActivity = new Date(labelerStats[image.claimed_by].lastActivity);
      if (activityDate > lastActivity) {
        labelerStats[image.claimed_by].lastActivity = image.labeled_at;
      }
    });

    const labelers = Object.values(labelerStats).sort((a: any, b: any) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    // Debug logging
    console.log('Final labeler count:', labelers.length);
    console.log('Final labelers:', labelers.map((l: any) => ({ userId: l.userId, userName: l.userName, activeClaims: l.activeClaims })));

    return NextResponse.json({
      labelers,
      total: labelers.length,
    });
  } catch (error) {
    console.error('Error fetching labeler stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch labeler stats' },
      { status: 500 }
    );
  }
}
