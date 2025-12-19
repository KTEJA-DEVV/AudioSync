import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ShieldExclamationIcon,
  UserMinusIcon,
  TrashIcon,
  EyeSlashIcon,
  StarIcon,
  DocumentCheckIcon,
  XCircleIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/helpers';

const actionIcons = {
  warn: ShieldExclamationIcon,
  mute: UserMinusIcon,
  unmute: UserMinusIcon,
  ban: XCircleIcon,
  unban: XCircleIcon,
  'delete-content': TrashIcon,
  'hide-content': EyeSlashIcon,
  'restore-content': EyeSlashIcon,
  'feature-content': StarIcon,
  'unfeature-content': StarIcon,
  'resolve-report': DocumentCheckIcon,
  'dismiss-report': XCircleIcon,
  'update-user': PencilSquareIcon,
  'update-session': PencilSquareIcon,
  'cancel-session': XCircleIcon,
  'update-setting': Cog6ToothIcon,
  'create-announcement': MegaphoneIcon,
  'update-announcement': MegaphoneIcon,
};

const actionColors = {
  warn: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  mute: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  unmute: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  ban: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  unban: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  'delete-content': 'text-red-600 bg-red-100 dark:bg-red-900/30',
  'hide-content': 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  'restore-content': 'text-green-600 bg-green-100 dark:bg-green-900/30',
  'feature-content': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  'resolve-report': 'text-green-600 bg-green-100 dark:bg-green-900/30',
  'dismiss-report': 'text-gray-600 bg-gray-100 dark:bg-gray-800',
  default: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30',
};

const AuditLog = ({ actions, loading, showUser = true, compact = false }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No actions recorded
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', compact ? '' : 'space-y-4')}>
      {actions.map((action, index) => {
        const Icon = actionIcons[action.actionType] || PencilSquareIcon;
        const colorClass = actionColors[action.actionType] || actionColors.default;

        return (
          <div
            key={action._id || index}
            className={cn(
              'relative flex gap-3',
              compact ? 'py-2' : 'py-3',
              index < actions.length - 1 && !compact && 'border-b border-gray-100 dark:border-gray-800'
            )}
          >
            {/* Timeline connector */}
            {!compact && index < actions.length - 1 && (
              <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Icon */}
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10', colorClass)}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {action.actionType.replace(/-/g, ' ')}
                </span>
                {action.targetType && (
                  <>
                    <span className="text-gray-400">on</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {action.targetType}
                    </span>
                  </>
                )}
              </div>

              {showUser && action.moderator && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  by {action.moderator.displayName || action.moderator.username || action.moderatorSnapshot?.username}
                </p>
              )}

              {action.targetUser && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Target: {action.targetUser.displayName || action.targetUser.username}
                </p>
              )}

              {action.reason && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  "{action.reason}"
                </p>
              )}

              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                {!compact && (
                  <span className="ml-2">
                    ({format(new Date(action.createdAt), 'MMM d, yyyy h:mm a')})
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditLog;

