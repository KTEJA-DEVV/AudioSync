import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  FunnelIcon,
  UserIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  TrashIcon,
  StarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { format } from 'date-fns';

// Action Type Badge
const ActionTypeBadge = ({ type }) => {
  const configs = {
    warn: { color: 'bg-amber-100 text-amber-700', icon: ShieldExclamationIcon },
    mute: { color: 'bg-blue-100 text-blue-700', icon: NoSymbolIcon },
    unmute: { color: 'bg-green-100 text-green-700', icon: NoSymbolIcon },
    ban: { color: 'bg-red-100 text-red-700', icon: NoSymbolIcon },
    unban: { color: 'bg-green-100 text-green-700', icon: NoSymbolIcon },
    'delete-content': { color: 'bg-red-100 text-red-700', icon: TrashIcon },
    'hide-content': { color: 'bg-amber-100 text-amber-700', icon: DocumentTextIcon },
    'restore-content': { color: 'bg-green-100 text-green-700', icon: DocumentTextIcon },
    'feature-content': { color: 'bg-purple-100 text-purple-700', icon: StarIcon },
    'resolve-report': { color: 'bg-green-100 text-green-700', icon: DocumentTextIcon },
    'dismiss-report': { color: 'bg-gray-100 text-gray-700', icon: DocumentTextIcon },
    'update-settings': { color: 'bg-blue-100 text-blue-700', icon: Cog6ToothIcon },
    'cancel-session': { color: 'bg-red-100 text-red-700', icon: NoSymbolIcon },
  };

  const config = configs[type] || { color: 'bg-gray-100 text-gray-700', icon: ClipboardDocumentListIcon };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
      <Icon className="w-3 h-3" />
      {type.replace(/-/g, ' ')}
    </span>
  );
};

// Action Card
const ActionCard = ({ action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start gap-4">
        {/* Moderator Avatar */}
        <img
          src={action.moderator?.avatar || `https://ui-avatars.com/api/?name=${action.moderator?.username}`}
          alt={action.moderator?.username}
          className="w-10 h-10 rounded-full"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              @{action.moderator?.username || 'Unknown'}
            </span>
            <ActionTypeBadge type={action.actionType} />
          </div>

          {/* Target Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Target: <span className="capitalize">{action.targetType}</span>
            {action.targetUser && (
              <span className="ml-2">
                → @{action.targetUser?.username || 'Unknown User'}
              </span>
            )}
          </div>

          {/* Reason */}
          {action.reason && (
            <p className="text-sm text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
              {action.reason}
            </p>
          )}

          {/* Details */}
          {action.details && Object.keys(action.details).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                View details
              </summary>
              <pre className="mt-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg overflow-auto max-h-32">
                {JSON.stringify(action.details, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-400 whitespace-nowrap">
          {format(new Date(action.createdAt), 'MMM d, yyyy')}
          <br />
          {format(new Date(action.createdAt), 'h:mm a')}
        </div>
      </div>
    </motion.div>
  );
};

const ModActionsPage = () => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ actionType: '', targetType: '' });
  const [showFilters, setShowFilters] = useState(false);

  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'warn', label: 'Warn' },
    { value: 'mute', label: 'Mute' },
    { value: 'unmute', label: 'Unmute' },
    { value: 'ban', label: 'Ban' },
    { value: 'unban', label: 'Unban' },
    { value: 'delete-content', label: 'Delete Content' },
    { value: 'hide-content', label: 'Hide Content' },
    { value: 'feature-content', label: 'Feature Content' },
    { value: 'resolve-report', label: 'Resolve Report' },
    { value: 'dismiss-report', label: 'Dismiss Report' },
    { value: 'update-settings', label: 'Update Settings' },
    { value: 'cancel-session', label: 'Cancel Session' },
  ];

  const targetTypes = [
    { value: '', label: 'All Targets' },
    { value: 'user', label: 'User' },
    { value: 'submission', label: 'Submission' },
    { value: 'song', label: 'Song' },
    { value: 'session', label: 'Session' },
    { value: 'report', label: 'Report' },
    { value: 'setting', label: 'Setting' },
  ];

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.targetType && { targetType: filters.targetType }),
      });

      const response = await api.get(`/admin/mod-actions?${params}`);
      setActions(response.data.data.actions);
      setPagination((prev) => ({ ...prev, ...response.data.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch mod actions:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderation Log</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Audit trail of all moderator actions
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
            showFilters || filters.actionType || filters.targetType
              ? 'bg-primary-100 text-primary-600'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <FunnelIcon className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm"
        >
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
              <select
                value={filters.actionType}
                onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target Type</label>
              <select
                value={filters.targetType}
                onChange={(e) => setFilters((f) => ({ ...f, targetType: e.target.value }))}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                {targetTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setFilters({ actionType: '', targetType: '' })}
              className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Actions List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl">
            <ClipboardDocumentListIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No moderation actions found</p>
          </div>
        ) : (
          actions.map((action) => (
            <ActionCard key={action._id} action={action} />
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

export default ModActionsPage;
