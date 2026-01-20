'use client';

import { useEffect, useState } from 'react';
import { ImageData } from '@/types/image';
import ImageCard from './ImageCard';
import DownloadButton from './DownloadButton';

export default function TrainingTab() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  const fetchUntrainedImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/images');
      const data = await response.json();
      const untrained = (data.images || []).filter(
        (img: ImageData) => img.label !== 'unlabeled' && !img.is_trained
      );
      setImages(untrained);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUntrainedImages();
  }, []);

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.filename)));
    }
  };

  const handleToggleImage = (filename: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedImages(newSelected);
  };

  const handleMarkAsTrained = async () => {
    if (selectedImages.size === 0) {
      alert('Please select at least one image to mark as trained');
      return;
    }

    if (!confirm(`Mark ${selectedImages.size} image(s) as trained?`)) {
      return;
    }

    try {
      setMarking(true);
      const response = await fetch('/api/mark-trained', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filenames: Array.from(selectedImages),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark images as trained');
      }

      setSelectedImages(new Set());
      await fetchUntrainedImages();
      alert(`Successfully marked ${selectedImages.size} image(s) as trained`);
    } catch (error) {
      console.error('Error marking images as trained:', error);
      alert('Failed to mark images as trained. Please try again.');
    } finally {
      setMarking(false);
    }
  };

  const stats = {
    total: images.length,
    pass: images.filter(img => img.label === 'pass').length,
    faulty: images.filter(img => img.label === 'faulty').length,
    maybe: images.filter(img => img.label === 'maybe').length,
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading images...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Training Data Management</h2>
        <p className="text-gray-600 mb-4">
          Download labeled images for training and mark them as trained to avoid duplicates
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-600">Untrained Labeled</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.pass}</p>
            <p className="text-sm text-gray-600">Pass</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.faulty}</p>
            <p className="text-sm text-gray-600">Faulty</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.maybe}</p>
            <p className="text-sm text-gray-600">Maybe</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <DownloadButton
            untrainedOnly={true}
            text="Download All Untrained"
            className="font-semibold"
          />
          <DownloadButton
            label="pass"
            untrainedOnly={true}
            text="Download Pass Only"
          />
          <DownloadButton
            label="faulty"
            untrainedOnly={true}
            text="Download Faulty Only"
          />
          <DownloadButton
            label="maybe"
            untrainedOnly={true}
            text="Download Maybe Only"
          />
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-gray-900">All Caught Up!</h3>
          <p className="mt-2 text-gray-600">
            All labeled images have been marked as trained
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Untrained Images ({images.length})
            </h3>
            <div className="flex gap-3">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {selectedImages.size === images.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleMarkAsTrained}
                disabled={selectedImages.size === 0 || marking}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {marking
                  ? 'Marking...'
                  : `Mark as Trained (${selectedImages.size})`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
              <div
                key={image.id}
                className={`relative cursor-pointer ${
                  selectedImages.has(image.filename) ? 'ring-4 ring-blue-500' : ''
                }`}
                onClick={() => handleToggleImage(image.filename)}
              >
                <ImageCard image={image} />
                {selectedImages.has(image.filename) && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
