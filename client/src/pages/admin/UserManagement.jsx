import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { format } from 'date-fns';

// User Status Badge
const StatusBadge = ({ user }) => {
  if (user.isBanned) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
        Banned
      </span>
    );
  }
  if (user.isMuted) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
        Muted
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
      Active
    </span>
  );
};

// Role Badge
const RoleBadge = ({ role }) => {
  const colors = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    moderator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    creator: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${colors[role] || colors.user}`}>
      {role}
    </span>
  );
};

// User Detail Modal
const UserDetailModal = ({ user, onClose, onAction }) => {
  const [modHistory, setModHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState(24);

  useEffect(() => {
    fetchUserDetails();
  }, [user._id]);

  const fetchUserDetails = async () => {
    try {
      const response = await api.get(`/admin/users/${user._id}`);
      setModHistory(response.data.data.modHistory || []);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionReason.trim()) return;
    
    try {
      await onAction(user._id, activeAction, {
        reason: actionReason,
        duration: activeAction === 'mute' ? actionDuration : undefined,
      });
      setActiveAction(null);
      setActionReason('');
      onClose();
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
              alt={user.username}
              className="w-14 h-14 rounded-full"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user.displayName || user.username}
              </h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* User Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Role</p>
              <RoleBadge role={user.role} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <StatusBadge user={user} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Reputation</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.reputation?.score || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Joined</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {format(new Date(user.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Warnings</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.warnings || 0}</p>
            </div>
          </div>

          {/* Mod History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Moderation History</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : modHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No moderation history</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {modHistory.map((action) => (
                  <div
                    key={action._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {action.actionType.replace(/-/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">{action.reason}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {format(new Date(action.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Form */}
          <AnimatePresence>
            {activeAction && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 capitalize">
                  {activeAction} User
                </h4>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
                {activeAction === 'mute' && (
                  <div className="mt-3">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Duration (hours)
                    </label>
                    <select
                      value={actionDuration}
                      onChange={(e) => setActionDuration(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                    >
                      <option value={1}>1 hour</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={72}>3 days</option>
                      <option value={168}>1 week</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAction}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setActiveAction(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center gap-2 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveAction('warn')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            Warn
          </button>
          {!user.isMuted ? (
            <button
              onClick={() => setActiveAction('mute')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            >
              <NoSymbolIcon className="w-4 h-4" />
              Mute
            </button>
          ) : (
            <button
              onClick={() => onAction(user._id, 'unmute', { reason: 'Manual unmute' })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Unmute
            </button>
          )}
          {!user.isBanned ? (
            <button
              onClick={() => setActiveAction('ban')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
            >
              <NoSymbolIcon className="w-4 h-4" />
              Ban
            </button>
          ) : (
            <button
              onClick={() => onAction(user._id, 'unban', { reason: 'Manual unban' })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Unban
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.data.users);
      setPagination((prev) => ({ ...prev, ...response.data.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (userId, action, data) => {
    try {
      await api.post(`/admin/users/${userId}/${action}`, data);
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {pagination.total} total users
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border ${
              showFilters || filters.role || filters.status
                ? 'bg-primary-100 border-primary-300 text-primary-600'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="creator">Creator</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="muted">Muted</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <button
                onClick={() => setFilters({ role: '', status: '' })}
                className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reputation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.reputation?.score || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
