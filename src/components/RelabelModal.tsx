'use client';

import { ImageData, Label } from '@/types/image';
import Image from 'next/image';
import { useState } from 'react';
import LabelButton from './LabelButton';

interface RelabelModalProps {
  image: ImageData;
  onClose: () => void;
  onRelabel: (filename: string, newLabel: Label) => Promise<void>;
}

export default function RelabelModal({ image, onClose, onRelabel }: RelabelModalProps) {
  const [relabeling, setRelabeling] = useState(false);

  const handleRelabel = async (newLabel: Label) => {
    if (relabeling) return;

    try {
      setRelabeling(true);
      await onRelabel(image.filename, newLabel);
      onClose();
    } catch (error) {
      console.error('Error relabeling:', error);
      alert('Failed to relabel image. Please try again.');
    } finally {
      setRelabeling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-3 sm:p-4 flex justify-between items-center z-10">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold">Re-label Image</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-3 sm:p-6">
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden mb-4 border-2 border-gray-300" style={{ aspectRatio: '2/1', maxHeight: '70vh' }}>
            <Image
              src={image.path}
              alt={image.filename}
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 100vw, 90vw"
            />
          </div>

          <div className="mb-4 text-center">
            <p className="text-sm sm:text-base font-medium text-gray-700 break-all px-2">
              {image.filename}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Current label: <span className="font-semibold capitalize">{image.label}</span>
            </p>
            {image.labeled_at && (
              <p className="text-xs text-gray-500">
                Labeled: {new Date(image.labeled_at).toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 text-center">
              Select new label:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <LabelButton
                label="pass"
                onClick={handleRelabel}
                disabled={relabeling}
              />
              <LabelButton
                label="maybe"
                onClick={handleRelabel}
                disabled={relabeling}
              />
              <LabelButton
                label="faulty"
                onClick={handleRelabel}
                disabled={relabeling}
              />
              <LabelButton
                label="unlabeled"
                onClick={handleRelabel}
                disabled={relabeling}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              disabled={relabeling}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
