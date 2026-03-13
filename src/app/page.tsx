'use client';

import { useState, useEffect, useRef } from 'react';
import GalleryTab from '@/components/GalleryTab';
import LabelingTab from '@/components/LabelingTab';
import ReviewTab from '@/components/ReviewTab';
import TrainingTab from '@/components/TrainingTab';
import AdminTab from '@/components/AdminTab';
import LeaderboardTab from '@/components/LeaderboardTab';

type Tab = 'gallery' | 'labeling' | 'review' | 'training' | 'leaderboard' | 'admin';

const COOLDOWN_SECONDS = 30;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [syncing, setSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTabRef = useRef<Tab>('gallery');

  const tabs = [
    { id: 'gallery' as Tab, name: 'Gallery', icon: '🖼️' },
    { id: 'labeling' as Tab, name: 'Label Images', icon: '🏷️' },
    { id: 'review' as Tab, name: 'Review', icon: '📊' },
    { id: 'training' as Tab, name: 'Training Data', icon: '🤖' },
    { id: 'leaderboard' as Tab, name: 'Leaderboard', icon: '🏆' },
    { id: 'admin' as Tab, name: 'Admin', icon: '👥' },
  ];

  const handleSync = async (isAutoSync = false) => {
    // Only show confirmation for manual sync
    if (!isAutoSync && !confirm('Sync new images from S3? This may take a moment.')) {
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        // Start cooldown after successful sync
        setCooldownTime(COOLDOWN_SECONDS);

        // Only reload and show alert for manual sync
        if (!isAutoSync) {
          alert(data.message);
          window.location.reload();
        } else {
          console.log('Auto-sync completed:', data.message);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error syncing images:', error);
      if (!isAutoSync) {
        alert('Failed to sync images from S3');
      }
    } finally {
      setSyncing(false);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownTime]);

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncEnabled && cooldownTime === 0 && !syncing) {
      syncIntervalRef.current = setInterval(() => {
        if (cooldownTime === 0 && !syncing) {
          handleSync(true);
        }
      }, COOLDOWN_SECONDS * 1000);

      // Initial sync when enabled
      handleSync(true);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSyncEnabled, cooldownTime, syncing]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Refresh gallery when switching to it from another tab
  useEffect(() => {
    if (activeTab === 'gallery' && lastActiveTabRef.current !== 'gallery') {
      setGalleryRefreshKey(prev => prev + 1);
    }
    lastActiveTabRef.current = activeTab;
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Image Labeling System
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                Organize and label your images efficiently
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-sync toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="hidden sm:inline">Auto-sync</span>
              </label>
              <button
                onClick={() => handleSync(false)}
                disabled={syncing || cooldownTime > 0}
                className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Syncing...</span>
                  </>
                ) : cooldownTime > 0 ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{cooldownTime}s</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync S3</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1 sm:mr-2">{tab.icon}</span>
                <span className="hidden xs:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'gallery' && <GalleryTab key={galleryRefreshKey} />}
        {activeTab === 'labeling' && <LabelingTab />}
        {activeTab === 'review' && <ReviewTab />}
        {activeTab === 'training' && <TrainingTab />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        {activeTab === 'admin' && <AdminTab />}
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 text-sm">
            Image Labeling System - Organize your images into Pass, Faulty, and Maybe categories
          </p>
        </div>
      </footer>
    </div>
  );
}
