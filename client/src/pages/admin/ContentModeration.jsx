import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  MusicalNoteIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  StarIcon,
  CheckCircleIcon,
  FunnelIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { format } from 'date-fns';

// Content Type Badge
const TypeBadge = ({ type }) => {
  const configs = {
    submission: { icon: DocumentTextIcon, color: 'bg-blue-100 text-blue-600', label: 'Lyrics' },
    song: { icon: MusicalNoteIcon, color: 'bg-purple-100 text-purple-600', label: 'Song' },
    stem: { icon: MusicalNoteIcon, color: 'bg-green-100 text-green-600', label: 'Stem' },
    message: { icon: ChatBubbleLeftIcon, color: 'bg-gray-100 text-gray-600', label: 'Message' },
  };
  const config = configs[type] || configs.submission;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Content Status Badge
const StatusBadge = ({ isHidden, isDeleted, isFeatured }) => {
  if (isDeleted) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
        Deleted
      </span>
    );
  }
  if (isHidden) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
        Hidden
      </span>
    );
  }
  if (isFeatured) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
        Featured
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
      Active
    </span>
  );
};

// Content Card
const ContentCard = ({ content, type, onHide, onDelete, onFeature, onApprove }) => {
  const getPreview = () => {
    switch (type) {
      case 'submission':
        return content.content?.fullLyrics?.substring(0, 150) || 'No content';
      case 'song':
        return content.title || 'Untitled Song';
      case 'message':
        return content.message?.substring(0, 150) || 'No message';
      default:
        return 'Content preview unavailable';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <TypeBadge type={type} />
            <StatusBadge 
              isHidden={content.isHidden} 
              isDeleted={content.isDeleted} 
              isFeatured={content.isFeatured} 
            />
          </div>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {getPreview()}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            {content.author && (
              <span>By @{content.author?.username || content.author}</span>
            )}
            <span>{format(new Date(content.createdAt), 'MMM d, yyyy')}</span>
            {content.flagReason && (
              <span className="text-red-500">Flag: {content.flagReason}</span>
            )}
          </div>
        </div>

        {/* Audio Player (for songs/stems) */}
        {(type === 'song' || type === 'stem') && content.audioUrl && (
          <div className="flex-shrink-0">
            <button className="p-3 bg-primary-100 text-primary-600 rounded-full hover:bg-primary-200">
              <PlayIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        {content.autoFlagged && (
          <button
            onClick={() => onApprove(content._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
          >
            <CheckCircleIcon className="w-4 h-4" />
            Approve
          </button>
        )}
        
        <button
          onClick={() => onHide(content._id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${
            content.isHidden
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          {content.isHidden ? (
            <>
              <EyeIcon className="w-4 h-4" />
              Unhide
            </>
          ) : (
            <>
              <EyeSlashIcon className="w-4 h-4" />
              Hide
            </>
          )}
        </button>

        {(type === 'song' || type === 'session') && (
          <button
            onClick={() => onFeature(content._id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${
              content.isFeatured
                ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <StarIcon className={`w-4 h-4 ${content.isFeatured ? 'fill-current' : ''}`} />
            {content.isFeatured ? 'Unfeature' : 'Feature'}
          </button>
        )}

        <button
          onClick={() => onDelete(content._id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 ml-auto"
        >
          <TrashIcon className="w-4 h-4" />
          Delete
        </button>
      </div>
    </motion.div>
  );
};

const ContentModeration = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('flagged');
  const [contentType, setContentType] = useState('');

  const tabs = [
    { id: 'flagged', label: 'Flagged' },
    { id: 'reported', label: 'Reported' },
    { id: 'hidden', label: 'Hidden' },
  ];

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      // For now, fetch flagged content
      const params = new URLSearchParams({
        ...(contentType && { type: contentType }),
      });

      const response = await api.get(`/admin/content/flagged?${params}`);
      setContent(response.data.data.items || []);
    } catch (err) {
      console.error('Failed to fetch content:', err);
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, contentType]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleHide = async (id) => {
    try {
      const type = contentType || 'submission';
      await api.post(`/admin/content/${type}/${id}/hide`, { reason: 'Manual moderation' });
      fetchContent();
    } catch (err) {
      console.error('Failed to hide content:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    
    try {
      const type = contentType || 'submission';
      await api.post(`/admin/content/${type}/${id}/delete`, { reason: 'Manual moderation' });
      fetchContent();
    } catch (err) {
      console.error('Failed to delete content:', err);
    }
  };

  const handleFeature = async (id) => {
    try {
      const type = contentType || 'song';
      await api.post(`/admin/content/${type}/${id}/feature`);
      fetchContent();
    } catch (err) {
      console.error('Failed to feature content:', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      // Dismiss the auto-flag report
      // This would need a specific endpoint to dismiss auto-flags
      console.log('Approving content:', id);
      fetchContent();
    } catch (err) {
      console.error('Failed to approve content:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Review and manage platform content
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
          >
            <option value="">All Types</option>
            <option value="submission">Lyrics</option>
            <option value="song">Songs</option>
            <option value="stem">Stems</option>
            <option value="message">Messages</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* Content Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No content to review</p>
          </div>
        ) : (
          content.map((item) => (
            <ContentCard
              key={item._id}
              content={item}
              type={item.targetType || contentType || 'submission'}
              onHide={handleHide}
              onDelete={handleDelete}
              onFeature={handleFeature}
              onApprove={handleApprove}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ContentModeration;
