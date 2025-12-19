import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../utils/helpers';

// Contribution type badges with colors
const CONTRIBUTION_BADGES = {
  lyrics: { label: 'Lyrics', color: 'bg-purple-100 text-purple-700' },
  'melody-stem': { label: 'Melody', color: 'bg-blue-100 text-blue-700' },
  'drum-stem': { label: 'Drums', color: 'bg-orange-100 text-orange-700' },
  'bass-stem': { label: 'Bass', color: 'bg-red-100 text-red-700' },
  'vocal-stem': { label: 'Vocals', color: 'bg-pink-100 text-pink-700' },
  'synth-stem': { label: 'Synth', color: 'bg-cyan-100 text-cyan-700' },
  'guitar-stem': { label: 'Guitar', color: 'bg-amber-100 text-amber-700' },
  'piano-stem': { label: 'Piano', color: 'bg-indigo-100 text-indigo-700' },
  production: { label: 'Producer', color: 'bg-emerald-100 text-emerald-700' },
  host: { label: 'Host', color: 'bg-emerald-100 text-emerald-700' },
  vocal: { label: 'Vocals', color: 'bg-pink-100 text-pink-700' },
  concept: { label: 'Concept', color: 'bg-violet-100 text-violet-700' },
  vote: { label: 'Voter', color: 'bg-green-100 text-green-700' },
  mixing: { label: 'Mixing', color: 'bg-slate-100 text-slate-700' },
  mastering: { label: 'Mastering', color: 'bg-gray-100 text-gray-700' },
};

const ContributorCard = ({ contributor, showOwnership = true }) => {
  const badge = CONTRIBUTION_BADGES[contributor.contributionType] || {
    label: contributor.contributionType,
    color: 'bg-gray-100 text-gray-700',
  };

  const user = contributor.user || {};

  return (
    <Link
      to={`/profile/${user._id || user.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {/* Avatar */}
      <img
        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
        alt={user.username}
        className="w-10 h-10 rounded-full object-cover"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {user.displayName || user.username}
          </span>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            badge.color
          )}>
            {badge.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">
          @{user.username}
        </p>
      </div>

      {/* Ownership percentage */}
      {showOwnership && contributor.percentage > 0 && (
        <div className="text-right">
          <span className="text-lg font-bold text-gray-900">
            {contributor.percentage.toFixed(1)}%
          </span>
          <p className="text-xs text-gray-500">ownership</p>
        </div>
      )}
    </Link>
  );
};

ContributorCard.propTypes = {
  contributor: PropTypes.shape({
    user: PropTypes.shape({
      _id: PropTypes.string,
      id: PropTypes.string,
      username: PropTypes.string,
      displayName: PropTypes.string,
      avatar: PropTypes.string,
    }),
    contributionType: PropTypes.string,
    percentage: PropTypes.number,
  }).isRequired,
  showOwnership: PropTypes.bool,
};

const ContributorsSection = ({
  contributors = [],
  maxDisplay = 5,
  showOwnership = true,
  title = 'Contributors',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!contributors || contributors.length === 0) {
    return (
      <div className={cn('text-center py-6 text-gray-500', className)}>
        No contributors found
      </div>
    );
  }

  // Sort by percentage (ownership) descending
  const sortedContributors = [...contributors].sort(
    (a, b) => (b.percentage || 0) - (a.percentage || 0)
  );

  const displayedContributors = isExpanded 
    ? sortedContributors 
    : sortedContributors.slice(0, maxDisplay);

  const hasMore = sortedContributors.length > maxDisplay;

  return (
    <div className={cn('bg-white rounded-xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">
          {contributors.length} contributor{contributors.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 mb-4">
        This song was created by {contributors.length} contributor{contributors.length !== 1 ? 's' : ''} 
        during a collaborative session.
      </p>

      {/* Contributors List */}
      <div className="divide-y divide-gray-100">
        {displayedContributors.map((contributor, index) => (
          <ContributorCard
            key={contributor.user?._id || index}
            contributor={contributor}
            showOwnership={showOwnership}
          />
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 py-2 flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUpIcon className="w-4 h-4" />
            </>
          ) : (
            <>
              Show All ({sortedContributors.length - maxDisplay} more) <ChevronDownIcon className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

ContributorsSection.propTypes = {
  contributors: PropTypes.arrayOf(PropTypes.shape({
    user: PropTypes.shape({
      _id: PropTypes.string,
      username: PropTypes.string,
      displayName: PropTypes.string,
      avatar: PropTypes.string,
    }),
    contributionType: PropTypes.string,
    percentage: PropTypes.number,
    attribution: PropTypes.string,
  })),
  maxDisplay: PropTypes.number,
  showOwnership: PropTypes.bool,
  title: PropTypes.string,
  className: PropTypes.string,
};

export default ContributorsSection;

