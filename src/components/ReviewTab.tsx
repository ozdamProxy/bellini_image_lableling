'use client';

import { useEffect, useState } from 'react';
import { ImageData, Label } from '@/types/image';
import ImageCard from './ImageCard';
import RelabelModal from './RelabelModal';

type ReviewFilter = 'labeled' | 'unlabeled';

export default function ReviewTab() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReviewFilter>('labeled');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/images');
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRelabel = async (filename: string, newLabel: Label) => {
    const response = await fetch('/api/label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, label: newLabel }),
    });

    if (!response.ok) {
      throw new Error('Failed to relabel image');
    }

    await fetchImages();
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const labeledImages = images.filter(img => img.label !== 'unlabeled');
  const unlabeledImages = images.filter(img => img.label === 'unlabeled');

  const displayImages = filter === 'labeled' ? labeledImages : unlabeledImages;

  const labeledStats = {
    pass: labeledImages.filter(img => img.label === 'pass').length,
    faulty: labeledImages.filter(img => img.label === 'faulty').length,
    maybe: labeledImages.filter(img => img.label === 'maybe').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Review Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">
              {labeledImages.length}
            </p>
            <p className="text-sm text-gray-600">Labeled</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{labeledStats.pass}</p>
            <p className="text-sm text-gray-600">Pass</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{labeledStats.faulty}</p>
            <p className="text-sm text-gray-600">Faulty</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{labeledStats.maybe}</p>
            <p className="text-sm text-gray-600">Maybe</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-3xl font-bold text-gray-600">
            {unlabeledImages.length}
          </p>
          <p className="text-sm text-gray-600">Unlabeled Remaining</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('labeled')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              filter === 'labeled'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Labeled ({labeledImages.length})
          </button>
          <button
            onClick={() => setFilter('unlabeled')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              filter === 'unlabeled'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Unlabeled ({unlabeledImages.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading images...</p>
        </div>
      ) : displayImages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">
            No {filter} images found
          </p>
          {filter === 'unlabeled' && (
            <p className="text-gray-500 text-sm mt-2">
              All images have been labeled!
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 capitalize">
            {filter} Images ({displayImages.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayImages.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={(img) => setSelectedImage(img)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedImage && (
        <RelabelModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onRelabel={handleRelabel}
        />
      )}
    </div>
  );
}
