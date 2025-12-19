import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlagIcon,
  FunnelIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  UserIcon,
  MusicalNoteIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { format } from 'date-fns';

// Status Badge
const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${colors[status]}`}>
      {status}
    </span>
  );
};

// Priority Badge
const PriorityBadge = ({ priority }) => {
  const colors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-amber-100 text-amber-600',
    urgent: 'bg-red-100 text-red-600',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${colors[priority]}`}>
      {priority}
    </span>
  );
};

// Target Type Icon
const TargetIcon = ({ type }) => {
  const icons = {
    user: UserIcon,
    submission: DocumentTextIcon,
    song: MusicalNoteIcon,
    message: ChatBubbleLeftIcon,
    session: MusicalNoteIcon,
  };
  const Icon = icons[type] || FlagIcon;
  return <Icon className="w-5 h-5" />;
};

// Report Detail Modal
const ReportDetailModal = ({ report, onClose, onResolve }) => {
  const [resolution, setResolution] = useState({
    action: 'no-action',
    note: '',
  });
  const [loading, setLoading] = useState(false);

  const handleResolve = async (dismiss = false) => {
    try {
      setLoading(true);
      await onResolve(report._id, {
        status: dismiss ? 'dismissed' : 'resolved',
        resolution: dismiss ? undefined : resolution,
      });
      onClose();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setLoading(false);
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <FlagIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Report Details
              </h2>
              <p className="text-sm text-gray-500">
                {format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Report Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Target Type</p>
              <div className="flex items-center gap-2">
                <TargetIcon type={report.targetType} />
                <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                  {report.targetType}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Reason</p>
              <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                {report.reason.replace(/-/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
              <StatusBadge status={report.status} />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Priority</p>
              <PriorityBadge priority={report.priority} />
            </div>
          </div>

          {/* Reporter */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Reporter</p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <img
                src={report.reporter?.avatar || `https://ui-avatars.com/api/?name=${report.reporter?.username}`}
                alt={report.reporter?.username}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {report.reporter?.displayName || report.reporter?.username}
                </p>
                <p className="text-xs text-gray-500">@{report.reporter?.username}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                {report.description}
              </p>
            </div>
          )}

          {/* Resolution Form */}
          {report.status === 'pending' || report.status === 'reviewing' ? (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Resolution
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Action Taken
                  </label>
                  <select
                    value={resolution.action}
                    onChange={(e) => setResolution((r) => ({ ...r, action: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                  >
                    <option value="no-action">No Action Required</option>
                    <option value="warning-issued">Warning Issued</option>
                    <option value="content-removed">Content Removed</option>
                    <option value="user-muted">User Muted</option>
                    <option value="user-banned">User Banned</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={resolution.note}
                    onChange={(e) => setResolution((r) => ({ ...r, note: e.target.value }))}
                    placeholder="Add notes about the resolution..."
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ) : report.resolution ? (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Resolution
              </h3>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {report.resolution.action?.replace(/-/g, ' ')}
                </p>
                {report.resolution.note && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {report.resolution.note}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Resolved by {report.resolution.resolvedBy?.username || 'Unknown'} on{' '}
                  {format(new Date(report.resolution.resolvedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions Footer */}
        {(report.status === 'pending' || report.status === 'reviewing') && (
          <div className="flex items-center gap-2 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => handleResolve(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Resolve
            </button>
            <button
              onClick={() => handleResolve(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300"
            >
              Dismiss
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', targetType: '', priority: '' });
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'reviewing', label: 'Reviewing' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'dismissed', label: 'Dismissed' },
  ];

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(activeTab !== 'all' && { status: activeTab }),
        ...(filters.targetType && { targetType: filters.targetType }),
        ...(filters.priority && { priority: filters.priority }),
      });

      const response = await api.get(`/admin/reports?${params}`);
      setReports(response.data.data.reports);
      setPagination((prev) => ({ ...prev, ...response.data.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTab, filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (reportId, data) => {
    try {
      await api.put(`/admin/reports/${reportId}`, data);
      fetchReports();
    } catch (err) {
      console.error('Failed to resolve report:', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {pagination.total} total reports
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl">
            <FlagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          reports.map((report) => (
            <motion.div
              key={report._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-start gap-4">
                {/* Target Icon */}
                <div className={`p-3 rounded-lg ${
                  report.status === 'pending' 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                }`}>
                  <TargetIcon type={report.targetType} />
                </div>

                {/* Report Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {report.targetType} Report
                    </span>
                    <StatusBadge status={report.status} />
                    <PriorityBadge priority={report.priority} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 capitalize">
                    Reason: {report.reason.replace(/-/g, ' ')}
                  </p>
                  {report.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                      {report.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {report.reporter?.username || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <EyeIcon className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onResolve={handleResolve}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
