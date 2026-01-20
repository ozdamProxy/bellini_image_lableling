'use client';

import { Label } from '@/types/image';
import { useState } from 'react';

interface DownloadButtonProps {
  label?: Label;
  untrainedOnly?: boolean;
  text?: string;
  className?: string;
}

export default function DownloadButton({
  label,
  untrainedOnly = false,
  text,
  className = '',
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const params = new URLSearchParams();
      if (label) params.append('label', label);
      if (untrainedOnly) params.append('untrained', 'true');

      const response = await fetch(`/api/download?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading images:', error);
      alert('Failed to download images. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${className}`}
    >
      {downloading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Downloading...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {text || 'Download'}
        </>
      )}
    </button>
  );
}
