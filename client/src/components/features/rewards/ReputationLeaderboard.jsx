import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import api from '../../../utils/api';
import { Link } from 'react-router-dom';
import { FaCrown, FaMedal } from 'react-icons/fa';
import ReputationBadge from './ReputationBadge';
import { useAuth } from '../../../hooks/useAuth';

const ReputationLeaderboard = ({ limit = 10 }) => {
  const { user: currentUser } = useAuth();
  const [timeFrame, setTimeFrame] = useState('all-time');

  const { data: leaderboard, isLoading, error } = useQuery({
    queryKey: ['reputationLeaderboard', timeFrame, limit],
    queryFn: async () => {
      const { data } = await api.get(`/rewards/reputation/leaderboard`, {
        params: { limit, timeFrame },
      });
      return data.data.leaderboard;
    },
    staleTime: 5 * 60 * 1000,
  });

  const timeFrameTabs = [
    { id: 'all-time', label: 'All Time' },
    { id: 'monthly', label: 'This Month' },
    { id: 'weekly', label: 'This Week' },
  ];

  const getRankIcon = (rank) => {
    if (rank === 1) return <FaCrown className="text-yellow-500 text-xl" />;
    if (rank === 2) return <FaMedal className="text-gray-400 text-lg" />;
    if (rank === 3) return <FaMedal className="text-amber-600 text-lg" />;
    return <span className="text-gray-500 font-semibold">{rank}</span>;
  };

  const getRowStyle = (rank, userId) => {
    const isCurrentUser = userId === currentUser?.id;
    let baseStyle = 'flex items-center gap-4 p-3 rounded-lg transition-all duration-200 ';
    
    if (isCurrentUser) {
      baseStyle += 'bg-primary-50 border-2 border-primary-300 ';
    } else if (rank === 1) {
      baseStyle += 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 ';
    } else if (rank === 2) {
      baseStyle += 'bg-gray-50 border border-gray-200 ';
    } else if (rank === 3) {
      baseStyle += 'bg-orange-50 border border-orange-200 ';
    } else {
      baseStyle += 'bg-white border border-gray-100 hover:bg-gray-50 ';
    }

    return baseStyle;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        Failed to load leaderboard. Please try again.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header with time filter tabs */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Top Contributors</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {timeFrameTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeFrame(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeFrame === tab.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="p-4 space-y-2">
        {leaderboard && leaderboard.length > 0 ? (
          leaderboard.map((user, index) => {
            const rank = index + 1;
            return (
              <Link
                key={user._id}
                to={`/profile/${user._id}`}
                className={getRowStyle(rank, user._id)}
              >
                {/* Rank */}
                <div className="w-8 h-8 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {user.displayName || user.username}
                    </span>
                    {user._id === currentUser?.id && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>

                {/* Reputation info */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-bold text-gray-900">
                      {user.reputation?.score?.toLocaleString() || 0}
                    </span>
                    <ReputationBadge
                      level={user.reputation?.level || 'bronze'}
                      score={user.reputation?.score || 0}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.stats?.songsContributed || 0} contributions
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8">
            No contributors found yet. Be the first!
          </div>
        )}
      </div>

      {/* View all link */}
      {leaderboard && leaderboard.length >= limit && (
        <div className="border-t border-gray-200 px-4 py-3 text-center">
          <Link
            to="/leaderboard"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View Full Leaderboard →
          </Link>
        </div>
      )}
    </div>
  );
};

ReputationLeaderboard.propTypes = {
  limit: PropTypes.number,
};

export default ReputationLeaderboard;
