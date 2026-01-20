'use client';

import { useEffect, useState } from 'react';
import { ImageData, Label } from '@/types/image';
import Image from 'next/image';
import LabelButton from './LabelButton';
import { getUserId, getUserName, setUserName, clearUserSession } from '@/lib/userSession';

export default function LabelingTab() {
  const [claimedImages, setClaimedImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [labeling, setLabeling] = useState(false);
  const [userId, setUserId] = useState('');
  const [userName, setUserNameState] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [claimExpiry, setClaimExpiry] = useState<Date | null>(null);

  useEffect(() => {
    const id = getUserId();
    setUserId(id);
    const name = getUserName();
    if (name) {
      setUserNameState(name);
      // Check if user has existing claimed images on load
      checkExistingClaims(id);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  const checkExistingClaims = async (uid: string) => {
    try {
      const response = await fetch(`/api/my-claims?userId=${uid}`);
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setClaimedImages(data.images);
        setCurrentIndex(0);
        const firstImage = data.images[0];
        if (firstImage.claim_expires_at) {
          setClaimExpiry(new Date(firstImage.claim_expires_at));
        }
      }
    } catch (error) {
      console.error('Error checking existing claims:', error);
    }
  };

  const claimNextBatch = async (batchSize: number = 10) => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName,
          batchSize,
        }),
      });

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        setClaimedImages(data.images);
        setCurrentIndex(0);
        const firstImage = data.images[0];
        if (firstImage.claim_expires_at) {
          setClaimExpiry(new Date(firstImage.claim_expires_at));
        }
      } else {
        // Check if user already has claimed images
        const myClaimsResponse = await fetch(`/api/my-claims?userId=${userId}`);
        const myClaimsData = await myClaimsResponse.json();

        if (myClaimsData.images && myClaimsData.images.length > 0) {
          // User already has claimed images
          setClaimedImages(myClaimsData.images);
          setCurrentIndex(0);
          const firstImage = myClaimsData.images[0];
          if (firstImage.claim_expires_at) {
            setClaimExpiry(new Date(firstImage.claim_expires_at));
          }
          alert(`You already have ${myClaimsData.images.length} claimed images. Please finish labeling them first.`);
        } else {
          alert('No more unlabeled images available.\n\nAll images may be:\n- Already claimed by other users\n- Already labeled\n\nWait for claims to expire (10 min) or ask an admin to unclaim stuck images.');
        }
      }
    } catch (error) {
      console.error('Error claiming images:', error);
      alert('Failed to claim images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLabel = async (label: Label) => {
    if (labeling || currentImage === null) return;

    try {
      setLabeling(true);

      const response = await fetch('/api/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: currentImage.filename,
          label,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to label image');
      }

      const newImages = claimedImages.filter(
        img => img.filename !== currentImage.filename
      );
      setClaimedImages(newImages);

      if (newImages.length === 0) {
        await claimNextBatch(10);
      } else if (currentIndex >= newImages.length) {
        setCurrentIndex(Math.max(0, newImages.length - 1));
      }
    } catch (error) {
      console.error('Error labeling image:', error);
      alert('Failed to label image. Please try again.');
    } finally {
      setLabeling(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (labeling) return;

    switch (e.key) {
      case '1':
        handleLabel('pass');
        break;
      case '2':
        handleLabel('maybe');
        break;
      case '3':
        handleLabel('faulty');
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
        break;
      case 'ArrowRight':
        if (currentIndex < claimedImages.length - 1) setCurrentIndex(currentIndex + 1);
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, claimedImages, labeling]);

  const handleSetName = (name: string) => {
    setUserName(name);
    setUserNameState(name);
    setShowNamePrompt(false);
    claimNextBatch(10);
  };

  const handleLogout = () => {
    if (!confirm('Are you sure you want to log out? Any unclaimed images will remain saved.')) {
      return;
    }
    clearUserSession();
    setUserNameState('');
    setClaimedImages([]);
    setShowNamePrompt(true);
    window.location.reload();
  };

  if (showNamePrompt) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Welcome! What's your name?</h2>
        <p className="text-gray-600 mb-4 text-sm">
          This helps us track who labeled which images and prevents overlap with other labelers.
        </p>
        <input
          type="text"
          placeholder="Enter your name"
          className="w-full px-4 py-2 border rounded-lg mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              handleSetName(e.currentTarget.value.trim());
            }
          }}
          autoFocus
        />
        <button
          onClick={(e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            if (input.value.trim()) {
              handleSetName(input.value.trim());
            }
          }}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Start Labeling
        </button>
      </div>
    );
  }

  if (loading && claimedImages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Claiming images...</p>
      </div>
    );
  }

  const currentImage = claimedImages[currentIndex] || null;

  if (claimedImages.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to label!</h3>
        <p className="text-gray-600 mb-2">Logged in as: <span className="font-semibold">{userName}</span></p>
        <p className="text-gray-600 mb-6">Click below to claim a batch of images</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => claimNextBatch(10)}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-semibold"
          >
            {loading ? 'Claiming...' : 'Claim 10 Images'}
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
          >
            Switch User
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base sm:text-xl font-bold">
                Progress: {currentIndex + 1} / {claimedImages.length}
              </h2>
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Switch User
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Labeler: {userName} • Remaining: {claimedImages.length - currentIndex - 1}
            </p>
          </div>
          {claimExpiry && (
            <div className="text-xs sm:text-sm text-orange-600">
              Claim expires: {claimExpiry.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / claimedImages.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {currentImage && (
            <>
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg touch-manipulation border-2 border-gray-300" style={{ aspectRatio: '2/1', maxHeight: '70vh' }}>
                <Image
                  src={currentImage.path}
                  alt={currentImage.filename}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, 90vw"
                />
              </div>

              <div className="mt-3 sm:mt-4 text-center">
                <p className="text-sm sm:text-lg font-medium text-gray-700 break-all px-2">
                  {currentImage.filename}
                </p>
              </div>

              <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-6">
                <LabelButton
                  label="pass"
                  onClick={handleLabel}
                  disabled={labeling}
                />
                <LabelButton
                  label="maybe"
                  onClick={handleLabel}
                  disabled={labeling}
                />
                <LabelButton
                  label="faulty"
                  onClick={handleLabel}
                  disabled={labeling}
                />
              </div>

              <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 space-y-1">
                <p className="hidden sm:block">Keyboard shortcuts: 1 = Pass, 2 = Maybe, 3 = Faulty</p>
                <p className="hidden sm:block">Arrow keys to navigate</p>
                <p className="sm:hidden">Tap buttons to label</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0 || labeling}
          className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
        >
          Previous
        </button>
        <button
          onClick={() =>
            setCurrentIndex(Math.min(claimedImages.length - 1, currentIndex + 1))
          }
          disabled={currentIndex === claimedImages.length - 1 || labeling}
          className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
        >
          Next
        </button>
      </div>
    </div>
  );
}
