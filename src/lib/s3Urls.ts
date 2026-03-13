/**
 * Hybrid S3 URL generator
 * Tries to use presigned URLs first, falls back to public URLs
 *
 * This provides the best of both worlds:
 * - Works with private buckets (presigned URLs)
 * - Works with public buckets (direct URLs)
 * - Fallback for CORS issues
 */

import { getS3ImageUrl } from './s3';

export async function getImageUrl(
  bucket: string,
  key: string,
  options: {
    preferPublic?: boolean;
    expiresIn?: number;
  } = {}
): Promise<string> {
  const { preferPublic = false, expiresIn = 86400 } = options; // Default 24 hours

  // Option 1: Use public URL (if bucket is public or preferPublic is true)
  if (preferPublic || process.env.USE_PUBLIC_S3_URLS === 'true') {
    const region = process.env.AWS_REGION || 'eu-central-1';
    // Use S3 public URL format
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  }

  // Option 2: Use presigned URL (default)
  try {
    const url = await getS3ImageUrl(bucket, key, expiresIn);
    return url;
  } catch (error) {
    console.error('Error generating presigned URL, falling back to public URL:', error);
    // Fallback to public URL
    const region = process.env.AWS_REGION || 'eu-central-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  }
}

/**
 * Get a public S3 URL (no signing, no expiration)
 * Use this if your bucket is configured for public read access
 */
export function getPublicS3Url(bucket: string, key: string): string {
  const region = process.env.AWS_REGION || 'eu-central-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
}

/**
 * Get multiple image URLs in parallel
 */
export async function getImageUrls(
  bucket: string,
  keys: string[],
  options: {
    preferPublic?: boolean;
    expiresIn?: number;
  } = {}
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  await Promise.all(
    keys.map(async (key) => {
      try {
        const url = await getImageUrl(bucket, key, options);
        urlMap.set(key, url);
      } catch (error) {
        console.error(`Error getting URL for ${key}:`, error);
      }
    })
  );

  return urlMap;
}
