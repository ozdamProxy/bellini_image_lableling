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
    .order('filename', { ascending: false });

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
    .order('filename', { ascending: false })
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

export async function syncS3ImagesToDatabase(
  s3Keys: string[],
  bucket: string
): Promise<{ newCount: number; skippedCount: number }> {
  console.log(`=== syncS3ImagesToDatabase ===`);
  console.log(`Total S3 keys to process: ${s3Keys.length}`);
  console.log(`Bucket: ${bucket}`);

  // Instead of fetching ALL images, just get the filenames we need to check
  const filenames = s3Keys.map(key => key.split('/').pop() || key);
  console.log(`Extracted ${filenames.length} filenames`);
  console.log('Sample filenames:', filenames.slice(0, 5));

  // Query in batches to avoid Headers Overflow Error
  // The issue: too many filenames in a single .in() clause creates headers that are too large
  const batchSize = 50; // Small batch size to avoid header overflow (tested with 1099 images)
  const existingFilenames = new Set<string>();

  for (let i = 0; i < filenames.length; i += batchSize) {
    const batch = filenames.slice(i, i + batchSize);
    const { data: existingImages, error: queryError } = await supabase
      .from('images')
      .select('filename')
      .in('filename', batch);

    if (queryError) {
      console.error('Error checking existing images:', queryError);
      throw queryError;
    }

    if (existingImages) {
      existingImages.forEach(img => existingFilenames.add(img.filename));
    }

    console.log(`Checked ${Math.min(i + batchSize, filenames.length)}/${filenames.length} filenames... (found ${existingImages?.length || 0} existing)`);
  }

  console.log(`Total existing filenames found: ${existingFilenames.size}`);

  const newImages = s3Keys
    .filter(key => {
      const filename = key.split('/').pop() || key;
      return !existingFilenames.has(filename);
    })
    .map(key => {
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

  const skippedCount = s3Keys.length - newImages.length;

  console.log(`New images to insert: ${newImages.length}`);
  console.log(`Images to skip: ${skippedCount}`);

  if (newImages.length > 0) {
    console.log('Sample new images:', newImages.slice(0, 3));

    // Insert in batches of 1000 to avoid timeout
    const batchSize = 1000;
    for (let i = 0; i < newImages.length; i += batchSize) {
      const batch = newImages.slice(i, i + batchSize);
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newImages.length / batchSize)} (${batch.length} images)`);

      const { error } = await supabase.from('images').insert(batch);

      if (error) {
        console.error('Error syncing batch to database:', error);
        throw error;
      }

      console.log(`Batch inserted successfully`);
    }
  } else {
    console.log('No new images to insert');
  }

  // Backfill captured_at for any existing rows that are missing it
  await backfillCapturedAt();

  return { newCount: newImages.length, skippedCount };
}

async function backfillCapturedAt(): Promise<void> {
  const { data, error } = await supabase
    .from('images')
    .select('id, filename')
    .is('captured_at', null);

  if (error || !data || data.length === 0) return;

  console.log(`Backfilling captured_at for ${data.length} images...`);

  const updates = data
    .map(row => {
      const date = parseCaptureDate(row.filename);
      return date ? { id: row.id, captured_at: date.toISOString() } : null;
    })
    .filter(Boolean) as { id: string; captured_at: string }[];

  for (const update of updates) {
    await supabase.from('images').update({ captured_at: update.captured_at }).eq('id', update.id);
  }

  console.log(`Backfilled ${updates.length} images`);
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
