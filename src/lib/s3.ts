import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy initialization to ensure env vars are available at runtime
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      console.error('Missing AWS credentials:', {
        hasRegion: !!region,
        hasAccessKeyId: !!accessKeyId,
        hasSecretAccessKey: !!secretAccessKey,
      });
      throw new Error('AWS credentials not configured. Please check environment variables.');
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function listS3Images(bucket: string, prefix: string = ''): Promise<string[]> {
  try {
    const client = getS3Client();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    let allKeys: string[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await client.send(command);

      if (!response.Contents) {
        break;
      }

      // Filter and add keys from this page
      const keys = response.Contents
        .filter(item => {
          const key = item.Key || '';
          return imageExtensions.some(ext => key.toLowerCase().endsWith(ext));
        })
        .map(item => item.Key || '')
        .filter(key => key !== '');

      allKeys = allKeys.concat(keys);

      // Check if there are more objects to fetch
      continuationToken = response.NextContinuationToken;

      console.log(`Fetched ${keys.length} images from S3 (total so far: ${allKeys.length})`);

    } while (continuationToken); // Continue until there's no more continuation token

    console.log(`Total images found in S3: ${allKeys.length}`);
    return allKeys;
  } catch (error) {
    console.error('Error listing S3 images:', error);
    throw error;
  }
}

export async function getS3ImageUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error getting S3 image URL:', error);
    throw error;
  }
}

export async function getS3ImageBuffer(bucket: string, key: string): Promise<Buffer> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      throw new Error('No image data received from S3');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error getting S3 image buffer:', error);
    throw error;
  }
}

export function getFilenameFromS3Key(key: string): string {
  return key.split('/').pop() || key;
}

// ============================================
// S3 Deletion Functions
// ============================================

export async function deleteS3Object(bucket: string, key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    console.log(`Successfully deleted S3 object: ${key}`);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting S3 object ${key}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteS3ObjectsBatch(
  bucket: string,
  keys: string[]
): Promise<{ deleted: string[]; failed: Array<{ key: string; error: string }> }> {
  try {
    const client = getS3Client();

    // S3 supports up to 1000 keys in a single delete request
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false, // Get detailed results
      },
    });

    const response = await client.send(command);

    const deleted: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];

    if (response.Deleted) {
      deleted.push(...response.Deleted.map(item => item.Key || ''));
    }

    if (response.Errors) {
      failed.push(...response.Errors.map(err => ({
        key: err.Key || '',
        error: err.Message || 'Unknown error'
      })));
    }

    console.log(`Batch delete completed: ${deleted.length} deleted, ${failed.length} failed`);
    return { deleted, failed };
  } catch (error) {
    console.error('Error in batch delete:', error);
    // If the entire batch fails, mark all as failed
    return {
      deleted: [],
      failed: keys.map(key => ({
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    };
  }
}

export async function deleteS3ObjectsChunked(
  bucket: string,
  keys: string[],
  batchSize: number = 500,
  onProgress?: (completed: number, total: number) => void
): Promise<{ deletedCount: number; failedCount: number; errors: string[] }> {
  const totalKeys = keys.length;
  let deletedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  console.log(`Starting chunked delete of ${totalKeys} images with batch size ${batchSize}`);

  // Process in chunks
  for (let i = 0; i < totalKeys; i += batchSize) {
    const chunk = keys.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalKeys / batchSize)} (${chunk.length} keys)`);

    const result = await deleteS3ObjectsBatch(bucket, chunk);

    deletedCount += result.deleted.length;
    failedCount += result.failed.length;

    // Collect errors
    result.failed.forEach(({ key, error }) => {
      errors.push(`${key}: ${error}`);
    });

    // Report progress
    if (onProgress) {
      const completed = i + chunk.length;
      onProgress(Math.min(completed, totalKeys), totalKeys);
    }
  }

  console.log(`Chunked delete completed: ${deletedCount} deleted, ${failedCount} failed`);

  return { deletedCount, failedCount, errors };
}
