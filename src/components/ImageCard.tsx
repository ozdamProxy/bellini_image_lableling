'use client';

import { ImageData } from '@/types/image';
import Image from 'next/image';
import { useState } from 'react';

interface ImageCardProps {
  image: ImageData;
  onClick?: (image: ImageData) => void;
}

export default function ImageCard({ image, onClick }: ImageCardProps) {
  const [imageError, setImageError] = useState(false);

  const labelColors = {
    pass: 'bg-green-100 text-green-800 border-green-300',
    faulty: 'bg-red-100 text-red-800 border-red-300',
    maybe: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    unfit: 'bg-purple-100 text-purple-800 border-purple-300',
    unlabeled: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const handleImageError = () => {
    console.error('Image failed to load:', image.path);
    setImageError(true);
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 ${
        labelColors[image.label]
      }`}
      onClick={() => onClick?.(image)}
    >
      <div className="aspect-square relative bg-gray-200">
        {imageError ? (
          // Fallback to regular img tag
          <img
            src={image.path}
            alt={image.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#fee" width="200" height="200"/><text fill="#c00" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14">Load Error</text></svg>'
              )}`;
            }}
          />
        ) : (
          // Try Next.js Image first
          <Image
            src={image.path}
            alt={image.filename}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={handleImageError}
            unoptimized={true}
          />
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={image.filename}>
          {image.filename}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs px-2 py-1 rounded-full bg-white border capitalize">
            {image.label}
          </span>
          {image.labeled_at && (
            <span className="text-xs text-gray-500">
              {new Date(image.labeled_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
