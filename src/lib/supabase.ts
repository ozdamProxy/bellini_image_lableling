import { createClient } from '@supabase/supabase-js';
import { ImageData, Label, ImageStats } from '@/types/image';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getAllImagesFromDB(): Promise<ImageData[]> {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching images from Supabase:', error);
    throw error;
  }

  return data || [];
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
    .order('labeled_at', { ascending: false });

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
  // Instead of fetching ALL images, just get the filenames we need to check
  const filenames = s3Keys.map(key => key.split('/').pop() || key);

  // Query only for these specific filenames (much faster than fetching all)
  const { data: existingImages, error: queryError } = await supabase
    .from('images')
    .select('filename')
    .in('filename', filenames);

  if (queryError) {
    console.error('Error checking existing images:', queryError);
    throw queryError;
  }

  const existingFilenames = new Set((existingImages || []).map(img => img.filename));

  const newImages = s3Keys
    .filter(key => {
      const filename = key.split('/').pop() || key;
      return !existingFilenames.has(filename);
    })
    .map(key => {
      const filename = key.split('/').pop() || key;
      return {
        filename,
        s3_key: key,
        s3_bucket: bucket,
        label: 'unlabeled' as Label,
        is_trained: false,
      };
    });

  const skippedCount = s3Keys.length - newImages.length;

  if (newImages.length > 0) {
    // Insert in batches of 1000 to avoid timeout
    const batchSize = 1000;
    for (let i = 0; i < newImages.length; i += batchSize) {
      const batch = newImages.slice(i, i + batchSize);
      const { error } = await supabase.from('images').insert(batch);

      if (error) {
        console.error('Error syncing batch to database:', error);
        throw error;
      }
    }
  }

  return { newCount: newImages.length, skippedCount };
}
