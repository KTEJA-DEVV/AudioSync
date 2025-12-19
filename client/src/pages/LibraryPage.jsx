import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  SparklesIcon,
  FireIcon,
  ClockIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { cn } from '../utils/helpers';
import { SongCard } from '../components/features/library';
import { Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest', icon: ClockIcon },
  { id: 'popular', label: 'Most Played', icon: SparklesIcon },
  { id: 'likes', label: 'Most Liked', icon: HeartIcon },
  { id: 'trending', label: 'Trending', icon: FireIcon },
];

const LibraryPage = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || '');
  const [selectedMood, setSelectedMood] = useState(searchParams.get('mood') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);

  // Fetch songs
  const { data: songsData, isLoading, error } = useQuery({
    queryKey: ['librarySongs', { page, sortBy, genre: selectedGenre, mood: selectedMood, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 20);
      params.set('sortBy', sortBy);
      if (selectedGenre) params.set('genre', selectedGenre);
      if (selectedMood) params.set('mood', selectedMood);
      if (searchQuery) params.set('search', searchQuery);
      
      const { data } = await api.get(`/library?${params.toString()}`);
      return data.data;
    },
  });

  // Fetch featured songs
  const { data: featuredData } = useQuery({
    queryKey: ['featuredSongs'],
    queryFn: async () => {
      const { data } = await api.get('/library/featured?limit=5');
      return data.data.songs;
    },
  });

  // Fetch genres
  const { data: genresData } = useQuery({
    queryKey: ['songGenres'],
    queryFn: async () => {
      const { data } = await api.get('/library/genres');
      return data.data.genres;
    },
  });

  // Fetch moods
  const { data: moodsData } = useQuery({
    queryKey: ['songMoods'],
    queryFn: async () => {
      const { data } = await api.get('/library/moods');
      return data.data.moods;
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (songId) => {
      const { data } = await api.post(`/library/${songId}/like`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['librarySongs']);
      queryClient.invalidateQueries(['featuredSongs']);
    },
  });

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedGenre) params.set('genre', selectedGenre);
    if (selectedMood) params.set('mood', selectedMood);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedGenre, selectedMood, sortBy, setSearchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleLike = async (songId) => {
    if (!isAuthenticated) {
      // Redirect to login or show modal
      return;
    }
    await likeMutation.mutateAsync(songId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero/Header */}
      <div className="bg-gradient-to-br from-primary-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">Song Library</h1>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl">
            Discover songs created collaboratively by our community. Every track tells a story of teamwork and creativity.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists, lyrics..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Featured Section */}
      {featuredData && featuredData.length > 0 && (
        <div className="container mx-auto px-4 -mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" />
              Featured Songs
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {featuredData.map((song) => (
                <SongCard
                  key={song._id}
                  song={song}
                  onLike={handleLike}
                  size="medium"
                  className="flex-shrink-0"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters & Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Genre Pills */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedGenre('')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  !selectedGenre 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                All Genres
              </button>
              {genresData?.slice(0, 8).map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre === selectedGenre ? '' : genre)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize',
                    selectedGenre === genre 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                )}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                )}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mood Pills (secondary filter) */}
          {moodsData && moodsData.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 overflow-x-auto scrollbar-hide">
              <span className="text-sm text-gray-500 mr-2">Mood:</span>
              {moodsData.slice(0, 10).map((mood) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood === selectedMood ? '' : mood)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize',
                    selectedMood === mood 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {mood}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Count */}
        {songsData?.pagination && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {songsData.songs.length} of {songsData.pagination.total} songs
          </p>
        )}

        {/* Songs Grid/List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Failed to load songs. Please try again.</p>
          </div>
        ) : songsData?.songs?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">No songs found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className={cn(
              viewMode === 'grid' 
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
                : 'space-y-2'
            )}>
              {songsData?.songs?.map((song) => (
                <SongCard
                  key={song._id}
                  song={song}
                  onLike={handleLike}
                  size={viewMode === 'grid' ? 'medium' : 'small'}
                />
              ))}
            </div>

            {/* Pagination */}
            {songsData?.pagination?.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {songsData.pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(songsData.pagination.pages, p + 1))}
                  disabled={page === songsData.pagination.pages}
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

export default LibraryPage;

