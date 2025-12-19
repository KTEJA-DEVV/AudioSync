import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  MusicalNoteIcon,
  PlayCircleIcon,
  CurrencyDollarIcon,
  FlagIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, trend, trendValue, color = 'primary', onClick }) => {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className="w-4 h-4" />
            ) : (
              <ArrowTrendingDownIcon className="w-4 h-4" />
            )}
            {trendValue}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </motion.div>
  );
};

// Activity Item Component
const ActivityItem = ({ icon: Icon, title, description, time, color = 'gray' }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      <p className="text-xs text-gray-400">{time}</p>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of CrowdBeat platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/users">
          <StatCard
            icon={UsersIcon}
            label="Total Users"
            value={stats?.users?.total?.toLocaleString() || '0'}
            trend={stats?.users?.growth > 0 ? 'up' : 'down'}
            trendValue={Math.abs(stats?.users?.growth || 0)}
            color="primary"
          />
        </Link>
        <Link to="/admin/sessions">
          <StatCard
            icon={MusicalNoteIcon}
            label="Active Sessions"
            value={stats?.sessions?.active?.toLocaleString() || '0'}
            color="green"
          />
        </Link>
        <StatCard
          icon={PlayCircleIcon}
          label="Songs Created"
          value={stats?.songs?.total?.toLocaleString() || '0'}
          color="purple"
        />
        <StatCard
          icon={CurrencyDollarIcon}
          label="Revenue (30d)"
          value={`$${(stats?.revenue?.thisMonth / 100 || 0).toFixed(2)}`}
          color="amber"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">User Activity</h3>
            <span className="text-xs text-gray-400">Last 24h</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Active Users</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.users?.active24h?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">New This Week</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.users?.newThisWeek?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">New This Month</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.users?.newThisMonth?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Sessions</h3>
            <span className="text-xs text-gray-400">All time</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Sessions</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.sessions?.total?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Completed</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.sessions?.completed?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Completion Rate</span>
              <span className="font-medium text-green-600">
                {stats?.sessions?.completionRate || '0'}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Moderation</h3>
            <span className="text-xs text-gray-400">Status</span>
          </div>
          <div className="mt-4 space-y-3">
            <Link to="/admin/reports" className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded">
              <span className="text-sm text-gray-500">Pending Reports</span>
              <span className={`font-medium ${
                stats?.reports?.pending > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {stats?.reports?.pending || '0'}
              </span>
            </Link>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Reports</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.reports?.total?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Actions Today</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {stats?.modActions?.last24h || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/admin/reports?status=pending"
              className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <FlagIcon className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Review Reports</p>
                <p className="text-xs text-gray-500">{stats?.reports?.pending || 0} pending</p>
              </div>
            </Link>
            <Link
              to="/admin/sessions?status=active"
              className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <PlayCircleIcon className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Active Sessions</p>
                <p className="text-xs text-gray-500">{stats?.sessions?.active || 0} live</p>
              </div>
            </Link>
            <Link
              to="/admin/announcements"
              className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Announcements</p>
                <p className="text-xs text-gray-500">Manage platform news</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <Link
              to="/admin/mod-actions"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <ActivityItem
              icon={UsersIcon}
              title="New user registered"
              description="user@example.com joined the platform"
              time="2m ago"
              color="green"
            />
            <ActivityItem
              icon={FlagIcon}
              title="Content reported"
              description="Submission flagged for review"
              time="15m ago"
              color="red"
            />
            <ActivityItem
              icon={CheckCircleIcon}
              title="Report resolved"
              description="Spam report dismissed"
              time="32m ago"
              color="blue"
            />
            <ActivityItem
              icon={MusicalNoteIcon}
              title="Session completed"
              description="Summer Vibes session finished"
              time="1h ago"
              color="green"
            />
            <ActivityItem
              icon={ClockIcon}
              title="User muted"
              description="User @spammer muted for 24 hours"
              time="2h ago"
              color="amber"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
