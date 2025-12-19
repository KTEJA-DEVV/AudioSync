import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import { Badge } from '../ui';
import {
  TrophyIcon,
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const ElementCompetitionCard = ({
  competition,
  onEnter,
  onVote,
  onViewResults,
  className = '',
}) => {
  const isOpen = competition.status === 'open';
  const isVoting = competition.status === 'voting';
  const isClosed = competition.status === 'closed';

  // Calculate time remaining
  const getTimeRemaining = () => {
    const deadline = isOpen
      ? new Date(competition.submissionDeadline)
      : new Date(competition.votingDeadline);
    
    const now = new Date();
    const diff = deadline - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m left`;
  };

  // Status badge
  const getStatusBadge = () => {
    if (isOpen) return <Badge variant="success">Open for Submissions</Badge>;
    if (isVoting) return <Badge variant="warning">Voting</Badge>;
    if (isClosed) return <Badge variant="default">Completed</Badge>;
    return <Badge>Draft</Badge>;
  };

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-gradient-to-r from-indigo-500 to-purple-500 p-0.5',
        className
      )}
    >
      <div className="bg-white dark:bg-gray-800 rounded-[10px] p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-block px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-medium rounded-full mb-1">
              {competition.elementType}
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {competition.title}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {/* Description */}
        {competition.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {competition.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{getTimeRemaining()}</span>
          </div>
          <div className="flex items-center gap-1">
            <UserGroupIcon className="w-4 h-4" />
            <span>{competition.submissionCount || 0} submissions</span>
          </div>
          {competition.stats?.totalVotes > 0 && (
            <div className="flex items-center gap-1">
              <span>{competition.stats.totalVotes} votes</span>
            </div>
          )}
        </div>

        {/* Prize */}
        {competition.prize && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
            <TrophyIcon className="w-5 h-5 text-amber-500" />
            <div className="text-sm">
              <span className="font-medium text-amber-700 dark:text-amber-300">Prize: </span>
              {competition.prize.reputationPoints && (
                <span>{competition.prize.reputationPoints} reputation points</span>
              )}
              {competition.prize.badgeName && (
                <span> + "{competition.prize.badgeName}" badge</span>
              )}
              {competition.prize.monetary?.amount > 0 && (
                <span> + ${competition.prize.monetary.amount}</span>
              )}
            </div>
          </div>
        )}

        {/* Winner display (if closed) */}
        {isClosed && competition.winner && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
            <SparklesIcon className="w-5 h-5 text-green-500" />
            <div className="text-sm">
              <span className="font-medium text-green-700 dark:text-green-300">Winner: </span>
              <span>{competition.winner.username || competition.winner.displayName}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {isOpen && competition.canSubmit?.allowed && (
            <button
              onClick={() => onEnter?.(competition)}
              className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Enter Competition
            </button>
          )}
          {isVoting && (
            <button
              onClick={() => onVote?.(competition)}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Vote Now
            </button>
          )}
          {(isClosed || isVoting) && (
            <button
              onClick={() => onViewResults?.(competition)}
              className={cn(
                'py-2 px-4 font-medium rounded-lg transition-colors',
                isVoting
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  : 'flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              )}
            >
              View Results
            </button>
          )}
          {!isOpen && !isVoting && !isClosed && (
            <span className="flex-1 text-center py-2 text-gray-500 text-sm">
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

ElementCompetitionCard.propTypes = {
  competition: PropTypes.shape({
    id: PropTypes.string.isRequired,
    elementType: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    submissionDeadline: PropTypes.string,
    votingDeadline: PropTypes.string,
    submissionCount: PropTypes.number,
    stats: PropTypes.shape({
      totalVotes: PropTypes.number,
    }),
    prize: PropTypes.shape({
      reputationPoints: PropTypes.number,
      badgeName: PropTypes.string,
      monetary: PropTypes.shape({
        amount: PropTypes.number,
      }),
    }),
    winner: PropTypes.shape({
      username: PropTypes.string,
      displayName: PropTypes.string,
    }),
    canSubmit: PropTypes.shape({
      allowed: PropTypes.bool,
    }),
  }).isRequired,
  onEnter: PropTypes.func,
  onVote: PropTypes.func,
  onViewResults: PropTypes.func,
  className: PropTypes.string,
};

export default ElementCompetitionCard;

