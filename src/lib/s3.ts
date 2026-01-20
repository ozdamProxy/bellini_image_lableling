import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function listS3Images(bucket: string, prefix: string = ''): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    return response.Contents
      .filter(item => {
        const key = item.Key || '';
        return imageExtensions.some(ext => key.toLowerCase().endsWith(ext));
      })
      .map(item => item.Key || '')
      .filter(key => key !== '');
  } catch (error) {
    console.error('Error listing S3 images:', error);
    throw error;
  }
}

export async function getS3ImageUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error getting S3 image URL:', error);
    throw error;
  }
}

export async function getS3ImageBuffer(bucket: string, key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

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
