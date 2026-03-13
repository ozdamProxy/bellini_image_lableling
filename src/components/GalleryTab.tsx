'use client';

import { useEffect, useState } from 'react';
import { ImageData, Label } from '@/types/image';
import ImageCard from './ImageCard';
import RelabelModal from './RelabelModal';

interface PaginationInfo {
  page: number;
  limit: number;
  offset: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function GalleryTab() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Label | 'all'>('all');
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [itemsPerPage] = useState(100); // 100 images per page

  const fetchImages = async (page: number = 1) => {
    try {
      setLoading(true);
      const labelParam = filter === 'all' ? '' : `&label=${filter}`;
      const url = `/api/images?page=${page}&limit=${itemsPerPage}${labelParam}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      setImages(data.images || []);
      setPagination(data.pagination);
      setCurrentPage(page);
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
    fetchImages(1);
  }, [filter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      fetchImages(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    if (!pagination) return [];

    const pages: (number | string)[] = [];
    const totalPages = pagination.totalPages;
    const current = currentPage;

    // Always show first page
    pages.push(1);

    // Show ellipsis if needed
    if (current > 3) {
      pages.push('...');
    }

    // Show pages around current
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      pages.push(i);
    }

    // Show ellipsis if needed
    if (current < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const filteredImages = images;

  const stats = {
    total: pagination?.total || 0,
    pass: images.filter(img => img.label === 'pass').length,
    faulty: images.filter(img => img.label === 'faulty').length,
    maybe: images.filter(img => img.label === 'maybe').length,
    unfit: images.filter(img => img.label === 'unfit').length,
    unlabeled: images.filter(img => img.label === 'unlabeled').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Bar with Pagination Info */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-lg sm:text-2xl font-bold">Gallery Statistics</h2>
          {pagination && pagination.total > 0 && (
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, pagination.total)}-{Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total.toLocaleString()} images
              {pagination.totalPages > 1 && ` (Page ${currentPage}/${pagination.totalPages})`}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-4 mt-4">
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
          <div className="text-center p-2 sm:p-4 bg-purple-50 rounded-lg">
            <p className="text-xl sm:text-3xl font-bold text-purple-600">{stats.unfit}</p>
            <p className="text-xs sm:text-sm text-gray-600">Unfit</p>
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
          <button
            onClick={() => setFilter('unfit')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              filter === 'unfit'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Unfit
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
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={(img) => setSelectedImage(img)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page Navigation */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, index) => {
                      if (pageNum === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => handlePageChange(pageNum as number)}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>

                {/* Page Info */}
                <div className="text-sm text-gray-600 text-center">
                  Page {currentPage} of {pagination.totalPages}
                </div>
              </div>

              {/* Page Size Selector (Optional) */}
              <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4">
                <label className="text-sm text-gray-600">Images per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    // Update itemsPerPage and refetch
                    window.location.href = `?page=1&limit=${newSize}${filter !== 'all' ? `&label=${filter}` : ''}`;
                  }}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {selectedImage && (() => {
        const idx = images.findIndex(img => img.id === selectedImage.id);
        return (
          <RelabelModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onRelabel={handleRelabel}
            hasPrev={idx > 0}
            hasNext={idx < images.length - 1}
            onPrev={() => idx > 0 && setSelectedImage(images[idx - 1])}
            onNext={() => idx < images.length - 1 && setSelectedImage(images[idx + 1])}
          />
        );
      })()}
    </div>
  );
}
