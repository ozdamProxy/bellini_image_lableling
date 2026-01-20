'use client';

import { useEffect, useState } from 'react';
import { isAdminAuthenticated, checkAdminPassword, setAdminAuth, logoutAdmin } from '@/lib/adminAuth';

interface ClaimedImage {
  filename: string;
  claimed_at: string;
  claim_expires_at: string;
}

interface LabelerStats {
  userId: string;
  userName: string;
  activeClaims: number;
  claimedImages: ClaimedImage[];
  totalLabeled: number;
  passCount: number;
  faultyCount: number;
  maybeCount: number;
  lastActivity: string;
}

export default function AdminTab() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [labelers, setLabelers] = useState<LabelerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [unclaiming, setUnclaiming] = useState<string | null>(null);

  const fetchLabelers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/labelers');
      const data = await response.json();
      setLabelers(data.labelers || []);
    } catch (error) {
      console.error('Error fetching labelers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if already authenticated
    if (isAdminAuthenticated()) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLabelers();
      // Refresh every 10 seconds
      const interval = setInterval(fetchLabelers, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAdminPassword(password)) {
      setAdminAuth(true);
      setIsAuthenticated(true);
      setShowPasswordError(false);
      setPassword('');
    } else {
      setShowPasswordError(true);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setLabelers([]);
  };

  const handleReleaseExpired = async () => {
    if (!confirm('Release all expired claims? This will free up images that have expired (10+ minutes old).')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/release-expired', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully released expired claims! ${data.available_count} images now available.`);
        fetchLabelers();
      } else {
        alert(`Failed to release claims: ${data.error}`);
      }
    } catch (error) {
      console.error('Error releasing expired claims:', error);
      alert('Failed to release expired claims. Please try again.');
    }
  };

  const handleUnclaim = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to release all claims for ${userName}?`)) {
      return;
    }

    try {
      setUnclaiming(userId);
      const response = await fetch('/api/admin/unclaim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully released ${data.released_count} claims`);
        fetchLabelers();
      } else {
        alert(`Failed to release claims: ${data.error}`);
      }
    } catch (error) {
      console.error('Error unclaiming:', error);
      alert('Failed to release claims. Please try again.');
    } finally {
      setUnclaiming(null);
    }
  };

  // Password prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Admin Access</h2>
        <p className="text-gray-600 mb-6 text-center text-sm">
          Please enter the admin password to continue
        </p>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setShowPasswordError(false);
            }}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {showPasswordError && (
            <p className="text-red-600 text-sm mb-4">Incorrect password. Please try again.</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            Access Admin Dashboard
          </button>
        </form>
      </div>
    );
  }

  if (loading && labelers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading labeler statistics...</p>
      </div>
    );
  }

  if (labelers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-600 text-lg">No active labelers found</p>
        <p className="text-gray-500 text-sm mt-2">Labelers will appear here once they start working</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReleaseExpired}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
            >
              Release Expired
            </button>
            <button
              onClick={fetchLabelers}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm sm:text-base">
          Total Active Labelers: <span className="font-semibold">{labelers.length}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {labelers.map((labeler) => (
          <div
            key={labeler.userId}
            className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {labeler.userName}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 break-all">
                  ID: {labeler.userId}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Last Activity: {new Date(labeler.lastActivity).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleUnclaim(labeler.userId, labeler.userName)}
                disabled={unclaiming === labeler.userId || labeler.activeClaims === 0}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                {unclaiming === labeler.userId ? 'Unclaiming...' : `Unclaim All (${labeler.activeClaims})`}
              </button>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Active Claims</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">
                  {labeler.activeClaims}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium">Total Labeled</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {labeler.totalLabeled}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Pass</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">
                  {labeler.passCount}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">Faulty</p>
                <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">
                  {labeler.faultyCount}
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 inline-block">
              <p className="text-xs text-yellow-600 font-medium">Maybe</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-900 mt-1">
                {labeler.maybeCount}
              </p>
            </div>

            {/* Claimed Images List */}
            {labeler.claimedImages.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
                  Currently Claimed Images ({labeler.claimedImages.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {labeler.claimedImages.map((image) => {
                    const expiresAt = new Date(image.claim_expires_at);
                    const now = new Date();
                    const isExpired = expiresAt < now;
                    const minutesLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 60000));

                    return (
                      <div
                        key={image.filename}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3 rounded ${
                          isExpired ? 'bg-red-50' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {image.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            Claimed: {new Date(image.claimed_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-xs sm:text-sm">
                          {isExpired ? (
                            <span className="text-red-600 font-semibold">Expired</span>
                          ) : (
                            <span className="text-orange-600 font-semibold">
                              {minutesLeft}m left
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
