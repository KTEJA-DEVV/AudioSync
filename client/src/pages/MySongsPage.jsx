import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MusicalNoteIcon,
  ChartPieIcon,
  HeartIcon,
  QueueListIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { cn, formatNumber } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { SongCard } from '../components/features/library';
import { EarningsCard } from '../components/features/rewards';
import { Spinner } from '../components/ui';

const TABS = [
  { id: 'contributed', label: 'Contributed', icon: MusicalNoteIcon },
  { id: 'owned', label: 'Owned', icon: ChartPieIcon },
  { id: 'liked', label: 'Liked', icon: HeartIcon },
  { id: 'playlists', label: 'Playlists', icon: QueueListIcon },
];

const MySongsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('contributed');
  const [page, setPage] = useState(1);

  // Fetch contributed songs
  const { data: contributedData, isLoading: contributedLoading } = useQuery({
    queryKey: ['myContributions', page],
    queryFn: async () => {
      const { data } = await api.get(`/library/users/${user?.id}/songs?page=${page}&limit=20`);
      return data.data;
    },
    enabled: activeTab === 'contributed' && !!user?.id,
  });

  // Fetch owned songs
  const { data: ownedData, isLoading: ownedLoading } = useQuery({
    queryKey: ['myOwnedSongs', page],
    queryFn: async () => {
      const { data } = await api.get(`/library/users/${user?.id}/owned-songs?page=${page}&limit=20`);
      return data.data;
    },
    enabled: activeTab === 'owned' && !!user?.id,
  });

  // Fetch ownership summary
  const { data: ownershipSummary } = useQuery({
    queryKey: ['myOwnershipSummary'],
    queryFn: async () => {
      const { data } = await api.get('/library/users/me/ownership');
      return data.data;
    },
  });

  // Fetch revenue summary
  const { data: revenueSummary } = useQuery({
    queryKey: ['myRevenueSummary'],
    queryFn: async () => {
      const { data } = await api.get('/library/users/me/revenue');
      return data.data;
    },
  });

  // Fetch revenue history
  const { data: revenueHistory } = useQuery({
    queryKey: ['myRevenueHistory'],
    queryFn: async () => {
      const { data } = await api.get('/library/users/me/revenue/history?limit=6');
      return data.data.history;
    },
    enabled: activeTab === 'owned',
  });

  const renderSongCard = (song, showOwnership = false) => {
    const userOwnership = song.userOwnership || 
      song.ownership?.distribution?.find(d => d.user?._id === user?.id);

    return (
      <div key={song._id} className="relative">
        <SongCard song={song} />
        {showOwnership && userOwnership && (
          <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
            {userOwnership.percentage?.toFixed(1)}% owned
          </div>
        )}
        {song.contributionType && (
          <div className="mt-2 text-xs text-gray-500">
            Contribution: <span className="capitalize">{song.contributionType}</span>
          </div>
        )}
      </div>
    );
  };

  const isLoading = activeTab === 'contributed' ? contributedLoading : ownedLoading;
  const currentData = activeTab === 'contributed' ? contributedData : ownedData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Songs</h1>
          <p className="text-gray-600 mt-1">Track your contributions, ownership, and earnings</p>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <EarningsCard
            title="Songs Contributed"
            amount={contributedData?.pagination?.total || 0}
            currency="reputation"
            label="Songs Contributed"
          />
          <EarningsCard
            title="Songs Owned"
            amount={ownershipSummary?.summary?.totalSongsOwned || 0}
            currency="reputation"
            label="Songs Owned"
          />
          <EarningsCard
            title="Total Earned"
            amount={(revenueSummary?.totalEarned || 0) / 100}
            currency="usd"
            label="Total Earned"
          />
          <EarningsCard
            title="Pending Payout"
            amount={(revenueSummary?.totalPending || 0) / 100}
            currency="usd"
            label="Pending"
          />
        </div>

        {/* Revenue Breakdown (if owned tab) */}
        {activeTab === 'owned' && revenueHistory && revenueHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
              Recent Earnings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Song</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Period</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Your Share</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Amount</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueHistory.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {entry.songCoverArt && (
                            <img
                              src={entry.songCoverArt}
                              alt=""
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="font-medium text-gray-900 truncate max-w-[150px]">
                            {entry.songTitle || 'Unknown Song'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{entry.period}</td>
                      <td className="py-3 px-2 text-right text-gray-600">
                        {entry.userPercentage?.toFixed(1)}%
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-gray-900">
                        ${(entry.userAmount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          entry.status === 'paid' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(1); }}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'contributed' && contributedData?.pagination?.total && (
                    <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                      {contributedData.pagination.total}
                    </span>
                  )}
                  {tab.id === 'owned' && ownershipSummary?.summary?.totalSongsOwned && (
                    <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                      {ownershipSummary.summary.totalSongsOwned}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : activeTab === 'playlists' ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <QueueListIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Playlists coming soon!</p>
          </div>
        ) : activeTab === 'liked' ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Your liked songs will appear here.</p>
          </div>
        ) : currentData?.songs?.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {activeTab === 'contributed' 
                ? "You haven't contributed to any songs yet."
                : "You don't own any songs yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {currentData?.songs?.map((song) => renderSongCard(song, activeTab === 'owned'))}
            </div>

            {/* Pagination */}
            {currentData?.pagination?.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {currentData.pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(currentData.pagination.pages, p + 1))}
                  disabled={page === currentData.pagination.pages}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MySongsPage;

