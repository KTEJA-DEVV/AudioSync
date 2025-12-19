import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  MusicalNoteIcon,
  UserGroupIcon,
  ChartPieIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import api from '../utils/api';
import { cn, formatDuration, formatNumber } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { usePlay } from '../context/PlayContext';
import {
  SongCard,
  LyricsDisplay,
  ContributorsSection,
  OwnershipChart,
} from '../components/features/library';
import { Spinner } from '../components/ui';
import { WaveformVisualizer } from '../components/ui';

const TABS = [
  { id: 'about', label: 'About', icon: MusicalNoteIcon },
  { id: 'lyrics', label: 'Lyrics', icon: MusicalNoteIcon },
  { id: 'contributors', label: 'Contributors', icon: UserGroupIcon },
  { id: 'ownership', label: 'Ownership', icon: ChartPieIcon },
  { id: 'comments', label: 'Comments', icon: ChatBubbleLeftIcon },
];

const SongDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlay();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('about');

  // Fetch song details
  const { data: songData, isLoading, error } = useQuery({
    queryKey: ['song', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/${id}`);
      return data.data;
    },
  });

  // Fetch lyrics
  const { data: lyricsData } = useQuery({
    queryKey: ['songLyrics', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/${id}/lyrics`);
      return data.data;
    },
    enabled: activeTab === 'lyrics',
  });

  // Fetch ownership
  const { data: ownershipData } = useQuery({
    queryKey: ['songOwnership', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/${id}/ownership`);
      return data.data;
    },
    enabled: activeTab === 'ownership',
  });

  // Record play
  useEffect(() => {
    if (id) {
      api.post(`/library/${id}/play`).catch(console.error);
    }
  }, [id]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/library/${id}/like`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['song', id]);
    },
  });

  const song = songData?.song;
  const relatedSongs = songData?.relatedSongs || [];
  const isCurrentSong = currentSong?.id === id || currentSong?._id === id;
  const isCurrentlyPlaying = isCurrentSong && isPlaying;

  const handlePlayClick = () => {
    if (isCurrentSong) {
      togglePlay();
    } else if (song) {
      playSong(song);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) return;
    await likeMutation.mutateAsync();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: song?.title || 'CrowdBeat Song',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Show toast
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Failed to load song.</p>
        <Link to="/library" className="text-primary-600 hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Cover Art */}
            <div className="flex-shrink-0">
              <img
                src={song.coverArt || '/images/default-cover.jpg'}
                alt={song.title}
                className="w-64 h-64 md:w-80 md:h-80 rounded-xl shadow-2xl object-cover mx-auto md:mx-0"
              />
            </div>

            {/* Song Info */}
            <div className="flex-1 text-white">
              <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider">
                {song.generationParams?.genre || 'Song'}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {song.title || 'Untitled Song'}
              </h1>

              {/* Primary Contributors */}
              <p className="text-gray-300 mb-6">
                {song.contributors?.slice(0, 3).map((c, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    <Link
                      to={`/profile/${c.user?._id}`}
                      className="hover:text-white hover:underline"
                    >
                      {c.user?.displayName || c.user?.username}
                    </Link>
                  </span>
                ))}
                {song.contributors?.length > 3 && (
                  <span className="text-gray-500">
                    {' '}+{song.contributors.length - 3} more
                  </span>
                )}
              </p>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm text-gray-400 mb-8">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {formatDuration(song.duration || 0)}
                </span>
                <span>{formatNumber(song.plays || 0)} plays</span>
                <span>{formatNumber(song.likes || 0)} likes</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handlePlayClick}
                  className={cn(
                    'flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-colors',
                    isCurrentlyPlaying
                      ? 'bg-white text-gray-900'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  )}
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <PauseIcon className="w-5 h-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-5 h-5" />
                      Play
                    </>
                  )}
                </button>

                <button
                  onClick={handleLike}
                  disabled={!isAuthenticated}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-full font-medium border transition-colors',
                    song.isLiked
                      ? 'border-red-500 text-red-500'
                      : 'border-gray-600 text-gray-300 hover:border-gray-400'
                  )}
                >
                  {song.isLiked ? (
                    <HeartIcon className="w-5 h-5" />
                  ) : (
                    <HeartOutline className="w-5 h-5" />
                  )}
                  {formatNumber(song.likes || 0)}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-medium border border-gray-600 text-gray-300 hover:border-gray-400 transition-colors"
                >
                  <ShareIcon className="w-5 h-5" />
                  Share
                </button>

                {song.downloadEnabled && (
                  <a
                    href={song.audioUrl}
                    download
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-medium border border-gray-600 text-gray-300 hover:border-gray-400 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Waveform */}
          {song.waveformData && song.waveformData.length > 0 && (
            <div className="mt-8">
              <WaveformVisualizer
                waveformData={song.waveformData}
                progress={isCurrentSong ? (currentSong.progress / currentSong.duration) * 100 : 0}
                height={80}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2',
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              {activeTab === 'about' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">About this Song</h2>
                  {song.description ? (
                    <p className="text-gray-600 mb-6">{song.description}</p>
                  ) : (
                    <p className="text-gray-500 italic mb-6">No description available.</p>
                  )}

                  {/* Session Link */}
                  {song.session && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h3 className="font-medium text-gray-900 mb-2">Created in Session</h3>
                      <Link
                        to={`/session/${song.session._id || song.session}`}
                        className="text-primary-600 hover:underline"
                      >
                        View Original Session →
                      </Link>
                    </div>
                  )}

                  {/* Generation Params */}
                  {song.generationParams && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Song Details</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {song.generationParams.genre && (
                          <div>
                            <span className="text-gray-500">Genre:</span>
                            <span className="ml-2 text-gray-900 capitalize">{song.generationParams.genre}</span>
                          </div>
                        )}
                        {song.generationParams.tempo && (
                          <div>
                            <span className="text-gray-500">Tempo:</span>
                            <span className="ml-2 text-gray-900">{song.generationParams.tempo} BPM</span>
                          </div>
                        )}
                        {song.generationParams.key && (
                          <div>
                            <span className="text-gray-500">Key:</span>
                            <span className="ml-2 text-gray-900">{song.generationParams.key}</span>
                          </div>
                        )}
                        {song.generationParams.mood?.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Mood:</span>
                            <span className="ml-2 text-gray-900 capitalize">
                              {song.generationParams.mood.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'lyrics' && (
                <LyricsDisplay
                  lyrics={lyricsData?.lyrics}
                  sections={lyricsData?.sections || song.sections}
                />
              )}

              {activeTab === 'contributors' && (
                <ContributorsSection
                  contributors={song.contributors}
                  showOwnership={true}
                />
              )}

              {activeTab === 'ownership' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Ownership Distribution</h2>
                  <OwnershipChart
                    distribution={ownershipData?.distribution || song.ownership?.distribution}
                    totalShares={ownershipData?.totalShares || song.ownership?.totalShares}
                  />
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="text-center py-8 text-gray-500">
                  <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Comments coming soon!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* More from Session */}
            {relatedSongs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">More from this Session</h3>
                <div className="space-y-3">
                  {relatedSongs.map((related) => (
                    <Link
                      key={related._id}
                      to={`/library/${related._id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={related.coverArt || '/images/default-cover.jpg'}
                        alt={related.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{related.title}</p>
                        <p className="text-sm text-gray-500">
                          {formatNumber(related.plays || 0)} plays
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Share this Song</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-2 px-4 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetailPage;

