import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ImageData, Label, ImageStats, DeletionFilterType, DeletionStats } from '@/types/image';
import { parseCaptureDate } from '@/lib/imageDate';

// Lazy initialization to ensure env vars are available at runtime
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      throw new Error('Supabase credentials not configured. Please check environment variables.');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// Export for backward compatibility
export const supabase = {
  from: (table: string) => getSupabase().from(table),
  rpc: (fn: string, params?: object) => getSupabase().rpc(fn, params),
};

export async function getAllImagesFromDB(): Promise<ImageData[]> {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .order('captured_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching images from Supabase:', error);
    throw error;
  }

  return data || [];
}

export async function getImagesPaginated(
  label: Label | null,
  limit: number = 100,
  offset: number = 0
): Promise<{ images: ImageData[]; total: number }> {
  // First, get the total count
  const countQuery = label
    ? supabase.from('images').select('*', { count: 'exact', head: true }).eq('label', label)
    : supabase.from('images').select('*', { count: 'exact', head: true });

  const { count: totalCount, error: countError } = await countQuery;

  if (countError) {
    console.error('Error getting image count:', countError);
    throw countError;
  }

  // Then get the paginated images
  // Sort by captured_at (parsed from filename) so newest photos always appear first
  let query = supabase
    .from('images')
    .select('*')
    .order('captured_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (label) {
    query = query.eq('label', label);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching paginated images from Supabase:', error);
    throw error;
  }

  return {
    images: data || [],
    total: totalCount || 0,
  };
}

export async function getImagesByLabel(label: Label): Promise<ImageData[]> {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('label', label)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching images by label:', error);
    throw error;
  }

  return data || [];
}

export async function getImagesByTrainingStatus(isTrained: boolean): Promise<ImageData[]> {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('is_trained', isTrained)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching images by training status:', error);
    throw error;
  }

  return data || [];
}

export async function getLabeledUntrainedImages(): Promise<ImageData[]> {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .neq('label', 'unlabeled')
    .eq('is_trained', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching labeled untrained images:', error);
    throw error;
  }

  return data || [];
}

export async function upsertImage(imageData: Partial<ImageData>): Promise<ImageData> {
  const { data, error } = await supabase
    .from('images')
    .upsert(imageData, { onConflict: 'filename' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting image:', error);
    throw error;
  }

  return data;
}

export async function updateImageLabel(filename: string, label: Label): Promise<ImageData> {
  const { data, error } = await supabase
    .from('images')
    .update({
      label,
      labeled_at: new Date().toISOString(),
    })
    .eq('filename', filename)
    .select()
    .single();

  if (error) {
    console.error('Error updating image label:', error);
    throw error;
  }

  return data;
}

export async function markImagesAsTrained(filenames: string[]): Promise<void> {
  const { error } = await supabase
    .from('images')
    .update({
      is_trained: true,
      trained_at: new Date().toISOString(),
    })
    .in('filename', filenames);

  if (error) {
    console.error('Error marking images as trained:', error);
    throw error;
  }
}

export async function getImageStats(): Promise<ImageStats> {
  const { data, error } = await supabase
    .from('image_stats')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching image stats:', error);
    throw error;
  }

  return data;
}

export async function getLatestS3Key(): Promise<string | null> {
  const { data, error } = await supabase
    .from('images')
    .select('s3_key')
    .order('s3_key', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].s3_key;
}

export async function syncS3ImagesToDatabase(
  s3Keys: string[],
  bucket: string
): Promise<{ newCount: number; skippedCount: number }> {
  console.log(`=== syncS3ImagesToDatabase ===`);
  console.log(`Keys to process: ${s3Keys.length}, Bucket: ${bucket}`);

  if (s3Keys.length === 0) {
    console.log('No new images to insert');
    return { newCount: 0, skippedCount: 0 };
  }

  const images = s3Keys.map(key => {
    const filename = key.split('/').pop() || key;
    const capturedAt = parseCaptureDate(filename);
    return {
      filename,
      s3_key: key,
      s3_bucket: bucket,
      label: 'unlabeled' as Label,
      is_trained: false,
      captured_at: capturedAt ? capturedAt.toISOString() : null,
    };
  });

  // Upsert in batches — DB handles duplicates via ON CONFLICT DO NOTHING,
  // so no need to manually check existing filenames first.
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('images')
      .upsert(batch, { onConflict: 'filename', ignoreDuplicates: true });

    if (error) {
      console.error('Error upserting batch:', error);
      throw error;
    }

    inserted += batch.length;
    console.log(`Upserted ${inserted}/${images.length}`);
  }

  console.log(`Done — ${images.length} rows upserted (duplicates silently skipped by DB)`);
  return { newCount: images.length, skippedCount: 0 };
}

export async function backfillCapturedAt(): Promise<number> {
  const { data, error } = await supabase
    .from('images')
    .select('id, filename')
    .is('captured_at', null)
    .limit(5000);

  if (error || !data || data.length === 0) return 0;

  console.log(`Backfilling captured_at for ${data.length} images...`);

  const updates = data
    .map(row => {
      const date = parseCaptureDate(row.filename);
      return date ? { id: row.id, captured_at: date.toISOString() } : null;
    })
    .filter(Boolean) as { id: string; captured_at: string }[];

  // Batch upsert instead of one UPDATE per row
  const BATCH_SIZE = 500;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const { error: updateError } = await supabase
      .from('images')
      .upsert(batch, { onConflict: 'id' });
    if (updateError) console.error('Backfill batch error:', updateError);
  }

  console.log(`Backfilled ${updates.length} images`);
  return updates.length;
}

// ============================================
// Deletion-related functions
// ============================================

export async function getDeletionStats(): Promise<DeletionStats> {
  const { data, error } = await supabase.rpc('get_deletion_stats');

  if (error) {
    console.error('Error fetching deletion stats:', error);
    throw error;
  }

  // The RPC returns a single row, not an array
  if (!data || Array.isArray(data)) {
    throw new Error('Unexpected response from get_deletion_stats');
  }

  return data as DeletionStats;
}

export async function getFilteredS3Keys(
  filterType: DeletionFilterType,
  batchSize: number = 500,
  offset: number = 0
): Promise<Array<{ s3_key: string; filename: string; id: string }>> {
  const { data, error } = await supabase.rpc('get_s3_keys_by_filter', {
    p_filter_type: filterType,
    p_batch_size: batchSize,
    p_batch_offset: offset,
  });

  if (error) {
    console.error('Error fetching filtered S3 keys:', error);
    throw error;
  }

  return data || [];
}

export async function softDeleteImages(filterType: DeletionFilterType): Promise<number> {
  const { data, error } = await supabase.rpc('soft_delete_images_by_filter', {
    p_filter_type: filterType,
  });

  if (error) {
    console.error('Error performing soft delete:', error);
    throw error;
  }

  // The RPC returns a table with updated_count
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 0;
  }

  // Extract the count from the first row
  const result = data[0] as { updated_count: number };
  return result.updated_count || 0;
}

export async function hardDeleteImages(filterType: DeletionFilterType): Promise<number> {
  const { data, error } = await supabase.rpc('hard_delete_images_by_filter', {
    p_filter_type: filterType,
  });

  if (error) {
    console.error('Error performing hard delete:', error);
    throw error;
  }

  // The RPC returns a table with deleted_count
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 0;
  }

  // Extract the count from the first row
  const result = data[0] as { deleted_count: number };
  return result.deleted_count || 0;
}

// ============================================
// Factory Reset Functions
// ============================================

export async function factoryResetDatabase(): Promise<number> {
  const { data, error } = await supabase.rpc('delete_all_images');

  if (error) {
    console.error('Error performing factory reset:', error);
    throw error;
  }

  // The RPC returns a table with deleted_count
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 0;
  }

  // Extract the count from the first row
  const result = data[0] as { deleted_count: number };
  return result.deleted_count || 0;
}
