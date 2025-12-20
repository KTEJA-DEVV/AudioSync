import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Badge, Input } from '../components/ui';
import SessionCard from '../components/features/SessionCard';
import api from '../services/api';
import { 
  Search, 
  Plus, 
  Radio, 
  Calendar, 
  Clock, 
  CheckCircle,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const genreOptions = [
  'all', 'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'jazz', 
  'classical', 'country', 'folk', 'indie', 'metal', 'punk',
  'soul', 'funk', 'reggae', 'blues', 'latin', 'world', 'other'
];

const Sessions = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { id: 'all', label: 'All Sessions', icon: SlidersHorizontal },
    { id: 'live', label: 'Live Now', icon: Radio },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
    { id: 'past', label: 'Completed', icon: CheckCircle },
  ];

  // Build query params
  const getQueryParams = () => {
    const params = { limit: 20 };
    
    if (activeTab === 'live') {
      params.live = 'true';
    } else if (activeTab === 'upcoming') {
      params.upcoming = 'true';
    } else if (activeTab === 'past') {
      params.past = 'true';
    }
    
    if (selectedGenre !== 'all') {
      params.genre = selectedGenre;
    }
    
    return params;
  };

  // Fetch sessions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', activeTab, selectedGenre],
    queryFn: async () => {
      const response = await api.get('/sessions', { params: getQueryParams() });
      return response.data.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Filter by search query (client-side)
  const filteredSessions = React.useMemo(() => {
    if (!data?.sessions) return [];
    if (!searchQuery.trim()) return data.sessions;
    
    const query = searchQuery.toLowerCase();
    return data.sessions.filter(session => 
      session.title.toLowerCase().includes(query) ||
      session.host?.username?.toLowerCase().includes(query) ||
      session.host?.displayName?.toLowerCase().includes(query)
    );
  }, [data?.sessions, searchQuery]);

  // Count live sessions for badge
  const liveCount = data?.sessions?.filter(s => 
    ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting'].includes(s.status)
  ).length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-600">Join a session or create your own</p>
        </div>
        
        {isAdmin && (
          <Link to="/create-session">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Session
            </Button>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {/* Genre Filter */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            {genreOptions.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all',
                  selectedGenre === genre
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                )}
              >
                {genre === 'all' ? 'All Genres' : genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'live' && liveCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {liveCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Session Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <Card className="text-center py-12">
          <p className="text-red-500 mb-4">Failed to load sessions</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'No sessions match your search' : 'No sessions found'}
          </p>
          {isAdmin && (
            <Link to="/create-session">
              <Button variant="primary">Create the first session</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard key={session._id || session.id} session={session} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="mt-8 flex justify-center">
          <p className="text-sm text-gray-500">
            Showing {filteredSessions.length} of {data.pagination.total} sessions
          </p>
        </div>
      )}
    </div>
  );
};

export default Sessions;

