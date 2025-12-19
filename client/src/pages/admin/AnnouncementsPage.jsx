import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MegaphoneIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  CalendarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// Type Badge
const TypeBadge = ({ type }) => {
  const configs = {
    info: { color: 'bg-blue-100 text-blue-700', label: 'Info' },
    warning: { color: 'bg-amber-100 text-amber-700', label: 'Warning' },
    feature: { color: 'bg-purple-100 text-purple-700', label: 'Feature' },
    maintenance: { color: 'bg-red-100 text-red-700', label: 'Maintenance' },
    update: { color: 'bg-green-100 text-green-700', label: 'Update' },
    event: { color: 'bg-pink-100 text-pink-700', label: 'Event' },
  };
  const config = configs[type] || configs.info;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

// Status Badge
const StatusBadge = ({ status }) => {
  const configs = {
    draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
    scheduled: { color: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
    active: { color: 'bg-green-100 text-green-700', label: 'Active' },
    archived: { color: 'bg-gray-100 text-gray-500', label: 'Archived' },
  };
  const config = configs[status] || configs.draft;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

// Announcement Form Modal
const AnnouncementModal = ({ announcement, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    type: 'info',
    status: 'draft',
    targetAudience: 'all',
    priority: 0,
    startDate: '',
    endDate: '',
    dismissible: true,
    showBanner: false,
    bannerColor: '#6366f1',
    actionUrl: '',
    actionText: '',
    ...(announcement || {}),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      console.error('Failed to save announcement:', err);
    } finally {
      setSaving(false);
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
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {announcement ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content *
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Summary (for preview)
              </label>
              <input
                type="text"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                maxLength={300}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="feature">Feature</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="update">Update</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Audience & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Audience
                </label>
                <select
                  value={form.targetAudience}
                  onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                >
                  <option value="all">All Users</option>
                  <option value="creators">Creators</option>
                  <option value="subscribers">Subscribers</option>
                  <option value="free-users">Free Users</option>
                  <option value="moderators">Moderators</option>
                  <option value="admins">Admins</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority (0-100)
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={form.startDate ? format(new Date(form.startDate), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={form.endDate ? format(new Date(form.endDate), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dismissible}
                  onChange={(e) => setForm((f) => ({ ...f, dismissible: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Dismissible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showBanner}
                  onChange={(e) => setForm((f) => ({ ...f, showBanner: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show as Banner</span>
              </label>
            </div>

            {/* Action Link */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action URL
                </label>
                <input
                  type="url"
                  value={form.actionUrl}
                  onChange={(e) => setForm((f) => ({ ...f, actionUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action Text
                </label>
                <input
                  type="text"
                  value={form.actionText}
                  onChange={(e) => setForm((f) => ({ ...f, actionText: e.target.value }))}
                  placeholder="Learn More"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Announcement'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Preview Card
const PreviewCard = ({ announcement }) => {
  return (
    <div 
      className="p-4 rounded-lg border-l-4"
      style={{ 
        borderLeftColor: announcement.bannerColor || '#6366f1',
        backgroundColor: announcement.type === 'warning' ? '#fef3c7' : '#f3f4f6'
      }}
    >
      <div className="flex items-start gap-3">
        <MegaphoneIcon className="w-5 h-5 text-gray-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{announcement.title}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {announcement.summary || announcement.content}
          </p>
          {announcement.actionUrl && announcement.actionText && (
            <a href={announcement.actionUrl} className="text-sm text-primary-600 hover:underline mt-2 inline-block">
              {announcement.actionText} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewAnnouncement, setPreviewAnnouncement] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/announcements');
      setAnnouncements(response.data.data.announcements || []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSave = async (form) => {
    try {
      if (selectedAnnouncement) {
        await api.put(`/admin/announcements/${selectedAnnouncement._id}`, form);
        toast.success('Announcement updated');
      } else {
        await api.post('/admin/announcements', form);
        toast.success('Announcement created');
      }
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      toast.error('Failed to save announcement');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await api.delete(`/admin/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      toast.error('Failed to delete announcement');
    }
  };

  const openEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  };

  const openCreate = () => {
    setSelectedAnnouncement(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage platform announcements and news
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="w-5 h-5" />
          New Announcement
        </button>
      </div>

      {/* Preview Section */}
      {previewAnnouncement && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Preview</h3>
            <button
              onClick={() => setPreviewAnnouncement(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close Preview
            </button>
          </div>
          <PreviewCard announcement={previewAnnouncement} />
        </div>
      )}

      {/* Announcements List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl">
            <MegaphoneIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No announcements yet</p>
            <button
              onClick={openCreate}
              className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Create your first announcement
            </button>
          </div>
        ) : (
          announcements.map((announcement) => (
            <motion.div
              key={announcement._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Icon with type color */}
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${announcement.bannerColor || '#6366f1'}20` }}
                >
                  <MegaphoneIcon 
                    className="w-6 h-6" 
                    style={{ color: announcement.bannerColor || '#6366f1' }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {announcement.title}
                    </h3>
                    <TypeBadge type={announcement.type} />
                    <StatusBadge status={announcement.status} />
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {announcement.summary || announcement.content}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="w-3 h-3" />
                      {announcement.targetAudience}
                    </span>
                    {announcement.startDate && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(announcement.startDate), 'MMM d, yyyy')}
                      </span>
                    )}
                    <span>Views: {announcement.views || 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewAnnouncement(announcement)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openEdit(announcement)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement._id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <AnnouncementModal
            announcement={selectedAnnouncement}
            onClose={() => {
              setShowModal(false);
              setSelectedAnnouncement(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementsPage;
