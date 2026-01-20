import JSZip from 'jszip';
import { ImageData } from '@/types/image';

export async function createZipFromImages(
  images: ImageData[],
  fetchImageBuffer: (s3Key: string) => Promise<Buffer>
): Promise<Blob> {
  const zip = new JSZip();

  for (const image of images) {
    try {
      const buffer = await fetchImageBuffer(image.s3_key);
      zip.file(image.filename, buffer);
    } catch (error) {
      console.error(`Error adding ${image.filename} to zip:`, error);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
