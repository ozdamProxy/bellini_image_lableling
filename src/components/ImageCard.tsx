'use client';

import { ImageData } from '@/types/image';
import Image from 'next/image';

interface ImageCardProps {
  image: ImageData;
  onClick?: (image: ImageData) => void;
}

export default function ImageCard({ image, onClick }: ImageCardProps) {
  const labelColors = {
    pass: 'bg-green-100 text-green-800 border-green-300',
    faulty: 'bg-red-100 text-red-800 border-red-300',
    maybe: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    unlabeled: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 ${
        labelColors[image.label]
      }`}
      onClick={() => onClick?.(image)}
    >
      <div className="aspect-square relative bg-gray-200">
        <Image
          src={image.path}
          alt={image.filename}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
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
