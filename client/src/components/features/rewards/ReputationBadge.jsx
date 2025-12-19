import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';

// Level colors
const LEVEL_COLORS = {
  bronze: { bg: '#CD7F32', text: '#fff' },
  silver: { bg: '#C0C0C0', text: '#1f2937' },
  gold: { bg: '#FFD700', text: '#1f2937' },
  platinum: { bg: '#E5E4E2', text: '#1f2937' },
  diamond: { bg: '#B9F2FF', text: '#1f2937' },
};

// Level icons
const LEVEL_ICONS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
};

/**
 * ReputationBadge - Shows user's reputation level
 */
const ReputationBadge = ({
  level = 'bronze',
  score,
  showScore = false,
  size = 'medium',
  className = '',
}) => {
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS.bronze;
  const icon = LEVEL_ICONS[level] || '🥉';

  const sizeClasses = {
    small: 'text-xs px-1.5 py-0.5 gap-0.5',
    medium: 'text-sm px-2 py-1 gap-1',
    large: 'text-base px-3 py-1.5 gap-1.5',
  };

  const iconSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
      title={`${level.charAt(0).toUpperCase() + level.slice(1)} level${score ? ` - ${score} reputation` : ''}`}
    >
      <span className={iconSizes[size]}>{icon}</span>
      <span className="capitalize">{level}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75 ml-0.5">({score.toLocaleString()})</span>
      )}
    </div>
  );
};

ReputationBadge.propTypes = {
  level: PropTypes.oneOf(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  score: PropTypes.number,
  showScore: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

export default ReputationBadge;

