'use client';

import { useState } from 'react';
import GalleryTab from '@/components/GalleryTab';
import LabelingTab from '@/components/LabelingTab';
import ReviewTab from '@/components/ReviewTab';
import TrainingTab from '@/components/TrainingTab';
import AdminTab from '@/components/AdminTab';
import LeaderboardTab from '@/components/LeaderboardTab';

type Tab = 'gallery' | 'labeling' | 'review' | 'training' | 'leaderboard' | 'admin';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [syncing, setSyncing] = useState(false);

  const tabs = [
    { id: 'gallery' as Tab, name: 'Gallery', icon: '🖼️' },
    { id: 'labeling' as Tab, name: 'Label Images', icon: '🏷️' },
    { id: 'review' as Tab, name: 'Review', icon: '📊' },
    { id: 'training' as Tab, name: 'Training Data', icon: '🤖' },
    { id: 'leaderboard' as Tab, name: 'Leaderboard', icon: '🏆' },
    { id: 'admin' as Tab, name: 'Admin', icon: '👥' },
  ];

  const handleSync = async () => {
    if (!confirm('Sync new images from S3? This may take a moment.')) {
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error syncing images:', error);
      alert('Failed to sync images from S3');
    } finally {
      setSyncing(false);
    }
  };

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
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
            >
              {syncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Syncing...</span>
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
        {activeTab === 'gallery' && <GalleryTab />}
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
