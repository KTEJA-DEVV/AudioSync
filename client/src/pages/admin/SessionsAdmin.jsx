import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MusicalNoteIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  XCircleIcon,
  StarIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { format } from 'date-fns';

// Session Status Badge
const StatusBadge = ({ status }) => {
  const configs = {
    draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
    'lyrics-open': { color: 'bg-blue-100 text-blue-700', label: 'Lyrics Open' },
    'lyrics-voting': { color: 'bg-purple-100 text-purple-700', label: 'Voting' },
    generation: { color: 'bg-amber-100 text-amber-700', label: 'Generating' },
    'song-voting': { color: 'bg-indigo-100 text-indigo-700', label: 'Song Voting' },
    live: { color: 'bg-red-100 text-red-700', label: 'Live' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
    cancelled: { color: 'bg-gray-100 text-gray-500', label: 'Cancelled' },
  };
  const config = configs[status] || configs.draft;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

// Session Card
const SessionCard = ({ session, onCancel, onFeature }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${
          session.status === 'live' 
            ? 'bg-red-100 text-red-600 animate-pulse' 
            : 'bg-primary-100 text-primary-600'
        }`}>
          <MusicalNoteIcon className="w-6 h-6" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {session.title}
            </h3>
            {session.isFeatured && (
              <StarIcon className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={session.status} />
            {session.genre && (
              <span className="text-xs text-gray-500 capitalize">{session.genre}</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <UsersIcon className="w-3 h-3" />
              {session.stats?.totalParticipants || 0} participants
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {format(new Date(session.createdAt), 'MMM d, yyyy')}
            </span>
          </div>

          {/* Host */}
          <div className="flex items-center gap-2 mt-3">
            <img
              src={session.host?.avatar || `https://ui-avatars.com/api/?name=${session.host?.username}`}
              alt={session.host?.username}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-xs text-gray-500">
              Hosted by @{session.host?.username}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link
            to={`/sessions/${session._id}`}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <EyeIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={() => onFeature(session._id)}
            className={`p-2 rounded-lg ${
              session.isFeatured
                ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <StarIcon className={`w-5 h-5 ${session.isFeatured ? 'fill-current' : ''}`} />
          </button>
          {['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'live'].includes(session.status) && (
            <button
              onClick={() => onCancel(session._id)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SessionsAdmin = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'lyrics-open', label: 'Lyrics Open' },
    { value: 'lyrics-voting', label: 'Lyrics Voting' },
    { value: 'generation', label: 'Generating' },
    { value: 'song-voting', label: 'Song Voting' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await api.get(`/admin/sessions?${params}`);
      setSessions(response.data.data.sessions);
      setPagination((prev) => ({ ...prev, ...response.data.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCancel = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    
    try {
      await api.post(`/admin/sessions/${sessionId}/cancel`, {
        reason: 'Cancelled by admin',
      });
      fetchSessions();
    } catch (err) {
      console.error('Failed to cancel session:', err);
    }
  };

  const handleFeature = async (sessionId) => {
    try {
      await api.post(`/admin/sessions/${sessionId}/feature`);
      fetchSessions();
    } catch (err) {
      console.error('Failed to feature session:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {pagination.total} total sessions
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border ${
              showFilters || statusFilter
                ? 'bg-primary-100 border-primary-300 text-primary-600'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm"
          >
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setStatusFilter('')}
                className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl">
            <MusicalNoteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No sessions found</p>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              onCancel={handleCancel}
              onFeature={handleFeature}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsAdmin;
