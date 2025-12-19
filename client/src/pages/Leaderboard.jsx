import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Avatar, ReputationBadge, Button } from '../components/ui';
import { useLeaderboardStore } from '../stores/useStore';
import { Trophy, Medal, Award, TrendingUp, Clock, Users } from 'lucide-react';
import { cn } from '../utils/helpers';

const RankBadge = ({ rank }) => {
  if (rank === 1) {
    return (
      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
        <Trophy className="w-5 h-5 text-yellow-600" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <Medal className="w-5 h-5 text-gray-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
        <Award className="w-5 h-5 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
      <span className="text-sm font-semibold text-gray-500">#{rank}</span>
    </div>
  );
};

const Leaderboard = () => {
  const { leaderboard, isLoading, fetchLeaderboard, filters, setFilters } = useLeaderboardStore();
  const [activeTab, setActiveTab] = useState('reputation');
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    fetchLeaderboard({ sortBy: activeTab, timeframe, limit: 50 });
  }, [activeTab, timeframe, fetchLeaderboard]);

  const tabs = [
    { id: 'reputation', label: 'Reputation', icon: TrendingUp },
    { id: 'contributions', label: 'Contributions', icon: Users },
    { id: 'votes', label: 'Votes', icon: Award },
  ];

  const timeframes = [
    { id: 'all', label: 'All Time' },
    { id: 'month', label: 'This Month' },
    { id: 'week', label: 'This Week' },
  ];

  const getStatValue = (user) => {
    switch (activeTab) {
      case 'contributions':
        return user.stats?.songsContributed || 0;
      case 'votes':
        return user.stats?.votesCast || 0;
      case 'reputation':
      default:
        return user.reputation?.score || 0;
    }
  };

  const getStatLabel = () => {
    switch (activeTab) {
      case 'contributions':
        return 'contributions';
      case 'votes':
        return 'votes';
      case 'reputation':
      default:
        return 'points';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-600">Top contributors in the CrowdBeat community</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Timeframe */}
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                timeframe === tf.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard List */}
      <Card className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found for this period.</p>
          </div>
        ) : (
          leaderboard.map((user, index) => (
            <Link
              key={user.id}
              to={`/profile/${user.username}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              <RankBadge rank={user.rank || index + 1} />

              {/* Avatar */}
              <Avatar 
                src={user.avatar} 
                name={user.displayName || user.username} 
                size="md"
              />

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {user.displayName || user.username}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">@{user.username}</span>
                  <ReputationBadge 
                    level={user.reputation?.level || 'bronze'} 
                    size="sm"
                  />
                </div>
              </div>

              {/* Stat */}
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {getStatValue(user).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{getStatLabel()}</p>
              </div>
            </Link>
          ))
        )}
      </Card>

      {/* Top 3 Badges */}
      {leaderboard.length >= 3 && (
        <div className="mt-8 hidden md:block">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h2>
          <div className="grid grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((user, index) => (
              <Link 
                key={user.id}
                to={`/profile/${user.username}`}
                className={cn(
                  'bg-white rounded-xl border p-6 text-center transition-shadow hover:shadow-md',
                  index === 0 && 'border-yellow-300 bg-yellow-50',
                  index === 1 && 'border-gray-300 bg-gray-50',
                  index === 2 && 'border-amber-300 bg-amber-50'
                )}
              >
                <div className="mx-auto mb-3">
                  <RankBadge rank={index + 1} />
                </div>
                <Avatar 
                  src={user.avatar} 
                  name={user.displayName || user.username}
                  size="lg"
                  className="mx-auto mb-3"
                />
                <p className="font-semibold text-gray-900 truncate">
                  {user.displayName || user.username}
                </p>
                <ReputationBadge 
                  level={user.reputation?.level || 'bronze'}
                  score={user.reputation?.score || 0}
                  showScore
                  size="sm"
                  className="mt-2"
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

