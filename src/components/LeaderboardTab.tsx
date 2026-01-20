'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalLabeled: number;
  passCount: number;
  faultyCount: number;
  maybeCount: number;
  lastActivity: string;
}

export default function LeaderboardTab() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && leaderboard.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-600 text-lg">No labelers yet</p>
        <p className="text-gray-500 text-sm mt-2">Start labeling to appear on the leaderboard!</p>
      </div>
    );
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Leaderboard</h2>
            <p className="text-gray-600 text-sm mt-1">Top performers by total images labeled</p>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop view - Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Labeled
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pass
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faulty
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maybe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={entry.userId}
                    className={rank <= 3 ? 'bg-blue-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${getRankColor(rank)}`}>
                        {getRankEmoji(rank)} {rank <= 3 ? '' : rank}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-lg font-bold text-gray-900">{entry.totalLabeled}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-green-600">{entry.passCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-red-600">{entry.faultyCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-yellow-600">{entry.maybeCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.lastActivity).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile view - Cards */}
        <div className="sm:hidden space-y-4 p-4">
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            return (
              <div
                key={entry.userId}
                className={`rounded-lg shadow p-4 ${rank <= 3 ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${getRankColor(rank)}`}>
                    {getRankEmoji(rank)} {rank <= 3 ? '' : rank}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{entry.userName}</h3>
                    <p className="text-xs text-gray-500">
                      Last active: {new Date(entry.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{entry.totalLabeled}</div>
                    <div className="text-xs text-gray-500">total</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{entry.passCount}</div>
                    <div className="text-xs text-gray-500">Pass</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{entry.faultyCount}</div>
                    <div className="text-xs text-gray-500">Faulty</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-yellow-600">{entry.maybeCount}</div>
                    <div className="text-xs text-gray-500">Maybe</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
