import React from 'react';
import { cn } from '../../utils/helpers';

const statusStyles = {
  // General
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  
  // User status
  banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  muted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  verified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  
  // Report status
  reviewing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  dismissed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  
  // Session status
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'lyrics-open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'lyrics-voting': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  generation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'song-voting': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  
  // Announcement status
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  
  // Announcement types
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  feature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  celebration: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  
  // Priority
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  
  // User roles
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  moderator: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  creator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const StatusBadge = ({ status, size = 'sm', className, withDot = false }) => {
  const normalizedStatus = status?.toLowerCase?.().replace(/\s+/g, '-') || 'unknown';
  const style = statusStyles[normalizedStatus] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full capitalize',
        sizeClasses[size],
        style,
        className
      )}
    >
      {withDot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          normalizedStatus === 'active' || normalizedStatus === 'resolved' || normalizedStatus === 'completed' ? 'bg-green-500' :
          normalizedStatus === 'banned' || normalizedStatus === 'cancelled' || normalizedStatus === 'critical' ? 'bg-red-500' :
          normalizedStatus === 'pending' || normalizedStatus === 'reviewing' ? 'bg-yellow-500' :
          'bg-current'
        )} />
      )}
      {status?.replace?.(/-/g, ' ') || 'Unknown'}
    </span>
  );
};

export default StatusBadge;

