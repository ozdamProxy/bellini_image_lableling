'use client';

import { useEffect, useState } from 'react';
import { ImageData, Label } from '@/types/image';
import ImageCard from './ImageCard';
import RelabelModal from './RelabelModal';

export default function GalleryTab() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Label | 'all'>('all');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/api/images' : `/api/images?label=${filter}`;
      const response = await fetch(url);
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
  }, [filter]);

  const filteredImages = images;

  const stats = {
    total: images.length,
    pass: images.filter(img => img.label === 'pass').length,
    faulty: images.filter(img => img.label === 'faulty').length,
    maybe: images.filter(img => img.label === 'maybe').length,
    unlabeled: images.filter(img => img.label === 'unlabeled').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4">Gallery Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
          <div className="text-center p-2 sm:p-4 bg-blue-50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-xs sm:text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-green-50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-green-600">{stats.pass}</p>
            <p className="text-xs sm:text-sm text-gray-600">Pass</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-red-50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-red-600">{stats.faulty}</p>
            <p className="text-xs sm:text-sm text-gray-600">Faulty</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-yellow-50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-yellow-600">{stats.maybe}</p>
            <p className="text-xs sm:text-sm text-gray-600">Maybe</p>
          </div>
          <div className="text-center p-2 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-gray-600">{stats.unlabeled}</p>
            <p className="text-xs sm:text-sm text-gray-600">Unlabeled</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unlabeled')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              filter === 'unlabeled'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Unlabeled
          </button>
          <button
            onClick={() => setFilter('pass')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              filter === 'pass'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pass
          </button>
          <button
            onClick={() => setFilter('faulty')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              filter === 'faulty'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Faulty
          </button>
          <button
            onClick={() => setFilter('maybe')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              filter === 'maybe'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Maybe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading images...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">No images found</p>
          <p className="text-gray-500 text-sm mt-2">
            Add images to the public/images/unlabeled folder
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map(image => (
            <ImageCard
              key={image.id}
              image={image}
              onClick={(img) => setSelectedImage(img)}
            />
          ))}
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
