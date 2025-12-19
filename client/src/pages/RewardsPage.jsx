import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { format } from 'date-fns';
import { FaTrophy, FaMedal, FaCoins, FaDollarSign, FaChartLine, FaGift, FaHistory } from 'react-icons/fa';
import {
  ReputationBadge,
  VoteWeightIndicator,
  BadgeCard,
  EarningsCard,
  ReputationLeaderboard,
  ContributorBadge,
} from '../components/features/rewards';

const RewardsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch user reputation data
  const { data: reputationData, isLoading: repLoading } = useQuery({
    queryKey: ['userReputation', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/rewards/users/${user?.id}/reputation`);
      return data.data;
    },
    enabled: !!user?.id,
  });

  // Fetch user badges
  const { data: badgesData, isLoading: badgesLoading } = useQuery({
    queryKey: ['userBadges', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/rewards/users/${user?.id}/badges`);
      return data.data;
    },
    enabled: !!user?.id,
  });

  // Fetch user earnings
  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ['myEarnings'],
    queryFn: async () => {
      const { data } = await api.get('/rewards/me/earnings');
      return data.data;
    },
    enabled: !!user?.id,
  });

  // Fetch user rewards history
  const { data: rewardsHistory, isLoading: rewardsLoading } = useQuery({
    queryKey: ['myRewards'],
    queryFn: async () => {
      const { data } = await api.get('/rewards/me/rewards');
      return data.data.rewards;
    },
    enabled: !!user?.id,
  });

  // Fetch vote weight
  const { data: voteWeightData } = useQuery({
    queryKey: ['myVoteWeight'],
    queryFn: async () => {
      const { data } = await api.get('/rewards/me/vote-weight');
      return data.data;
    },
    enabled: !!user?.id,
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'reputation', label: 'Reputation', icon: FaTrophy },
    { id: 'badges', label: 'Badges', icon: FaMedal },
    { id: 'earnings', label: 'Earnings', icon: FaDollarSign },
    { id: 'history', label: 'History', icon: FaHistory },
  ];

  const getRewardTypeColor = (type) => {
    const colors = {
      'lyrics-winner': 'bg-yellow-100 text-yellow-800',
      'stem-accepted': 'bg-blue-100 text-blue-800',
      'competition-winner': 'bg-purple-100 text-purple-800',
      'badge-earned': 'bg-green-100 text-green-800',
      'tip-received': 'bg-pink-100 text-pink-800',
      'level-up': 'bg-indigo-100 text-indigo-800',
      'streak': 'bg-orange-100 text-orange-800',
      'royalty': 'bg-emerald-100 text-emerald-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EarningsCard
          title="Total Reputation"
          amount={reputationData?.reputation?.score || 0}
          currency="reputation"
        />
        <EarningsCard
          title="Available Balance"
          amount={earningsData?.pendingPayout || 0}
          currency="usd"
        />
        <EarningsCard
          title="Token Balance"
          amount={user?.wallet?.tokenBalance || 0}
          currency="tokens"
        />
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Badges Earned</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary-600">
              {badgesData?.earned?.length || 0}
            </span>
            <span className="text-sm text-gray-500">badges</span>
          </div>
        </div>
      </div>

      {/* User Status Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              alt={user?.username}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary-200"
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.displayName || user?.username}</h2>
              <p className="text-gray-500">@{user?.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ReputationBadge
              level={reputationData?.reputation?.level || user?.reputation?.level || 'bronze'}
              score={reputationData?.reputation?.score || user?.reputation?.score || 0}
            />
            <ContributorBadge tier={reputationData?.contributorTier || user?.contributorTier || 'casual'} />
            {voteWeightData && (
              <VoteWeightIndicator
                weight={voteWeightData.voteWeight}
                reputationScore={voteWeightData.reputationScore}
                reputationLevel={voteWeightData.reputationLevel}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Badges */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Badges</h3>
          {badgesData?.earned && badgesData.earned.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {badgesData.earned.slice(0, 6).map((userBadge) => (
                <BadgeCard
                  key={userBadge._id}
                  badge={userBadge.badge}
                  earnedAt={userBadge.earnedAt}
                  onClick={() => setActiveTab('badges')}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No badges earned yet</p>
          )}
        </div>

        {/* Leaderboard Preview */}
        <div>
          <ReputationLeaderboard limit={5} />
        </div>
      </div>
    </div>
  );

  const renderReputationTab = () => (
    <div className="space-y-6">
      {/* Reputation Level Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {reputationData?.reputation?.level?.charAt(0).toUpperCase() + 
               reputationData?.reputation?.level?.slice(1) || 'Bronze'} Level
            </h2>
            <p className="text-primary-100 text-lg">
              {reputationData?.reputation?.score?.toLocaleString() || 0} Reputation Points
            </p>
          </div>
          <div className="text-6xl">
            {reputationData?.reputation?.level === 'diamond' && '👑'}
            {reputationData?.reputation?.level === 'platinum' && '💎'}
            {reputationData?.reputation?.level === 'gold' && '🥇'}
            {reputationData?.reputation?.level === 'silver' && '🥈'}
            {(!reputationData?.reputation?.level || reputationData?.reputation?.level === 'bronze') && '🥉'}
          </div>
        </div>

        {/* Progress to next level */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress to next level</span>
            <span>75%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full">
            <div className="h-full bg-white rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
      </div>

      {/* Vote Weight Explanation */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Vote Weight</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl font-bold text-primary-600">
            x{voteWeightData?.voteWeight?.toFixed(1) || '1.0'}
          </div>
          <div className="text-gray-600">
            <p>Your votes are {voteWeightData?.voteWeight?.toFixed(1) || '1'}x more influential</p>
            <p className="text-sm text-gray-500">Based on your reputation level and score</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">How Vote Weight Works:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Base weight starts at 1.0</li>
            <li>• +0.1 for every 100 reputation points</li>
            <li>• Multiplied by your reputation level bonus</li>
            <li>• Maximum weight is capped at 5.0</li>
          </ul>
        </div>
      </div>

      {/* Reputation History */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {reputationData?.history && reputationData.history.length > 0 ? (
          <div className="space-y-3">
            {reputationData.history.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : '-'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.type.replace(/-/g, ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No reputation history yet</p>
        )}
      </div>

      {/* Full Leaderboard */}
      <ReputationLeaderboard limit={20} />
    </div>
  );

  const renderBadgesTab = () => (
    <div className="space-y-6">
      {/* Earned Badges */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Earned Badges ({badgesData?.earned?.length || 0})
        </h3>
        {badgesData?.earned && badgesData.earned.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badgesData.earned.map((userBadge) => (
              <BadgeCard
                key={userBadge._id}
                badge={userBadge.badge}
                earnedAt={userBadge.earnedAt}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaMedal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No badges earned yet</p>
            <p className="text-sm text-gray-400">Start contributing to earn your first badge!</p>
          </div>
        )}
      </div>

      {/* Badges in Progress */}
      {badgesData?.progress && badgesData.progress.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">In Progress</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badgesData.progress.map((progressItem, index) => (
              <div key={index} className="opacity-60">
                <BadgeCard
                  badge={badgesData.unearned?.find(b => 
                    progressItem.criteriaDescription === b.description
                  ) || { name: 'Unknown', icon: '❓', rarity: 'common' }}
                  progress={progressItem}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Available Badges */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Badges</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {badgesData?.unearned?.map((badge) => (
            <div key={badge._id} className="opacity-40 grayscale">
              <BadgeCard badge={badge} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEarningsTab = () => (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EarningsCard
          title="Total Earned"
          amount={earningsData?.totalEarnings || 0}
          currency="usd"
        />
        <EarningsCard
          title="Pending Payout"
          amount={earningsData?.pendingPayout || 0}
          currency="usd"
        />
        <EarningsCard
          title="Available to Withdraw"
          amount={earningsData?.availableToWithdraw || 0}
          currency="usd"
        />
      </div>

      {/* Earnings Breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Breakdown</h3>
        {earningsData?.earningsBreakdown && earningsData.earningsBreakdown.length > 0 ? (
          <div className="space-y-4">
            {earningsData.earningsBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRewardTypeColor(item._id)}`}>
                    {item._id.replace(/-/g, ' ')}
                  </span>
                  <span className="text-gray-500 text-sm">{item.count} earnings</span>
                </div>
                <span className="font-bold text-gray-900">${item.totalAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No earnings breakdown available</p>
        )}
      </div>

      {/* Payout Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Settings</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-700">
              {earningsData?.payoutMethod?.type 
                ? `${earningsData.payoutMethod.type.charAt(0).toUpperCase() + earningsData.payoutMethod.type.slice(1)} Connected`
                : 'No payout method configured'}
            </p>
            <p className="text-sm text-gray-500">
              {earningsData?.payoutMethod?.type 
                ? 'Your earnings will be sent to this account'
                : 'Set up a payout method to withdraw your earnings'}
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            {earningsData?.payoutMethod?.type ? 'Update' : 'Set Up'}
          </button>
        </div>
      </div>

      {/* Request Payout */}
      {earningsData?.availableToWithdraw > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Ready to Withdraw</h3>
              <p className="text-emerald-100">
                You have ${earningsData.availableToWithdraw.toFixed(2)} available
              </p>
            </div>
            <button className="px-6 py-3 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors">
              Request Payout
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Rewards History</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {rewardsHistory && rewardsHistory.length > 0 ? (
          rewardsHistory.map((reward, index) => (
            <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  reward.currency === 'usd' ? 'bg-emerald-100' :
                  reward.currency === 'tokens' ? 'bg-yellow-100' : 'bg-primary-100'
                }`}>
                  {reward.currency === 'usd' && <FaDollarSign className="text-emerald-600" />}
                  {reward.currency === 'tokens' && <FaCoins className="text-yellow-600" />}
                  {reward.currency === 'reputation' && <FaTrophy className="text-primary-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {reward.type.replace(/-/g, ' ').charAt(0).toUpperCase() + 
                     reward.type.replace(/-/g, ' ').slice(1)}
                  </p>
                  {reward.description && (
                    <p className="text-sm text-gray-500">{reward.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {format(new Date(reward.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-bold ${
                  reward.currency === 'usd' ? 'text-emerald-600' :
                  reward.currency === 'tokens' ? 'text-yellow-600' : 'text-primary-600'
                }`}>
                  {reward.currency === 'usd' && '$'}
                  {reward.currency === 'usd' ? reward.amount.toFixed(2) : reward.amount.toLocaleString()}
                </span>
                <p className="text-xs text-gray-500">{reward.currency.toUpperCase()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  reward.status === 'credited' ? 'bg-green-100 text-green-700' :
                  reward.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {reward.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <FaGift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No rewards history yet</p>
            <p className="text-sm text-gray-400">Start contributing to earn rewards!</p>
          </div>
        )}
      </div>
    </div>
  );

  const isLoading = repLoading || badgesLoading || earningsLoading || rewardsLoading;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rewards & Reputation</h1>
          <p className="text-gray-600 mt-1">Track your contributions, badges, and earnings</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'reputation' && renderReputationTab()}
            {activeTab === 'badges' && renderBadgesTab()}
            {activeTab === 'earnings' && renderEarningsTab()}
            {activeTab === 'history' && renderHistoryTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default RewardsPage;

