import React from 'react';
import PropTypes from 'prop-types';
import { cn, formatRelativeTime } from '../../../utils/helpers';
import { LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

// Rarity colors
const RARITY_COLORS = {
  common: { border: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-600' },
  uncommon: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rare: { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-600' },
  epic: { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-600' },
  legendary: { border: 'border-orange-400', bg: 'bg-gradient-to-br from-orange-50 to-yellow-50', text: 'text-orange-600' },
};

/**
 * BadgeCard - Display a single badge
 */
const BadgeCard = ({
  badge,
  earned = false,
  earnedAt,
  progress = 0,
  currentValue,
  requiredValue,
  onClick,
  size = 'medium',
  showProgress = true,
  className = '',
}) => {
  const {
    badgeId,
    name,
    description,
    icon,
    rarity = 'common',
  } = badge || {};

  const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;

  const sizeClasses = {
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };

  const iconSizes = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 transition-all duration-200',
        colors.border,
        earned ? colors.bg : 'bg-gray-100 dark:bg-gray-800',
        onClick && 'cursor-pointer hover:shadow-md hover:scale-105',
        !earned && 'opacity-70',
        sizeClasses[size],
        className
      )}
    >
      {/* Icon */}
      <div className="relative mb-2 text-center">
        <span className={cn(
          iconSizes[size],
          !earned && 'grayscale opacity-50'
        )}>
          {icon || '🏅'}
        </span>
        
        {/* Earned/Locked indicator */}
        {earned ? (
          <CheckCircleIcon className="absolute -top-1 -right-1 w-5 h-5 text-emerald-500" />
        ) : (
          <LockClosedIcon className="absolute -top-1 -right-1 w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Name */}
      <h3 className={cn(
        'font-semibold text-center mb-1',
        size === 'small' ? 'text-xs' : 'text-sm',
        earned ? 'text-gray-900 dark:text-white' : 'text-gray-500'
      )}>
        {name}
      </h3>

      {/* Rarity label */}
      <div className="text-center mb-2">
        <span className={cn(
          'text-xs font-medium capitalize',
          colors.text
        )}>
          {rarity}
        </span>
      </div>

      {/* Progress bar (for unearned) */}
      {!earned && showProgress && requiredValue && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500 text-center">
            {currentValue || 0} / {requiredValue}
          </div>
        </div>
      )}

      {/* Earned date */}
      {earned && earnedAt && size !== 'small' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Earned {formatRelativeTime(earnedAt)}
        </div>
      )}
    </div>
  );
};

BadgeCard.propTypes = {
  badge: PropTypes.shape({
    badgeId: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    icon: PropTypes.string,
    rarity: PropTypes.string,
  }),
  earned: PropTypes.bool,
  earnedAt: PropTypes.string,
  progress: PropTypes.number,
  currentValue: PropTypes.number,
  requiredValue: PropTypes.number,
  onClick: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showProgress: PropTypes.bool,
  className: PropTypes.string,
};

export default BadgeCard;

