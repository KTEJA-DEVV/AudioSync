import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/helpers';
import BadgeCard from './BadgeCard';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * BadgeShowcase - Horizontal scrollable badge display for profiles
 */
const BadgeShowcase = ({
  badges = [],
  pinnedBadges = [],
  maxDisplay = 6,
  showViewAll = true,
  userId,
  onBadgeClick,
  className = '',
}) => {
  // Combine pinned first, then others
  const displayBadges = [
    ...pinnedBadges,
    ...badges.filter(b => !pinnedBadges.some(pb => pb.badgeId === b.badgeId)),
  ].slice(0, maxDisplay);

  if (displayBadges.length === 0) {
    return (
      <div className={cn('text-center py-4 text-gray-500 text-sm', className)}>
        No badges earned yet
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Scrollable container */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {displayBadges.map((badge, index) => {
          const isPinned = pinnedBadges.some(pb => pb.badgeId === badge.badgeId);
          
          return (
            <div
              key={badge.badgeId || index}
              className={cn(
                'flex-shrink-0',
                isPinned && 'relative'
              )}
            >
              {isPinned && (
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-xs z-10">
                  📌
                </div>
              )}
              <BadgeCard
                badge={badge}
                earned={true}
                earnedAt={badge.earnedAt}
                size="small"
                onClick={() => onBadgeClick?.(badge)}
                className={cn(
                  'w-20',
                  isPinned && 'ring-2 ring-yellow-400'
                )}
              />
            </div>
          );
        })}

        {/* View all button */}
        {showViewAll && badges.length > maxDisplay && (
          <Link
            to={userId ? `/profile/${userId}/badges` : '/profile/badges'}
            className="flex-shrink-0 w-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors p-2"
          >
            <span className="text-2xl mb-1">+{badges.length - maxDisplay}</span>
            <span className="text-xs text-gray-500">View All</span>
          </Link>
        )}
      </div>

      {/* View all link */}
      {showViewAll && badges.length > 0 && (
        <div className="mt-2 text-right">
          <Link
            to={userId ? `/profile/${userId}/badges` : '/rewards?tab=badges'}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            View all badges
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

BadgeShowcase.propTypes = {
  badges: PropTypes.arrayOf(
    PropTypes.shape({
      badgeId: PropTypes.string,
      name: PropTypes.string,
      icon: PropTypes.string,
      rarity: PropTypes.string,
      earnedAt: PropTypes.string,
    })
  ),
  pinnedBadges: PropTypes.array,
  maxDisplay: PropTypes.number,
  showViewAll: PropTypes.bool,
  userId: PropTypes.string,
  onBadgeClick: PropTypes.func,
  className: PropTypes.string,
};

export default BadgeShowcase;

