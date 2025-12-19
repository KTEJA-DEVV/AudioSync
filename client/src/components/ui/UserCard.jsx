import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import Avatar from './Avatar';
import ReputationBadge from './ReputationBadge';

const UserCard = ({ 
  user, 
  showStats = false,
  showReputation = true,
  compact = false,
  linkToProfile = true,
  className = '',
}) => {
  if (!user) return null;

  const {
    id,
    username,
    displayName,
    avatar,
    reputation,
    stats,
  } = user;

  const CardWrapper = linkToProfile ? Link : 'div';
  const wrapperProps = linkToProfile ? { to: `/profile/${username}` } : {};

  if (compact) {
    return (
      <CardWrapper
        {...wrapperProps}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors',
          className
        )}
      >
        <Avatar src={avatar} name={displayName || username} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayName || username}
          </p>
          {showReputation && reputation && (
            <ReputationBadge 
              level={reputation.level} 
              size="sm" 
            />
          )}
        </div>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper
      {...wrapperProps}
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar src={avatar} name={displayName || username} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {displayName || username}
          </h3>
          <p className="text-sm text-gray-500 truncate">@{username}</p>
          
          {showReputation && reputation && (
            <div className="mt-2">
              <ReputationBadge 
                level={reputation.level} 
                score={reputation.score}
                showScore
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {showStats && stats && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {stats.songsContributed || 0}
              </p>
              <p className="text-xs text-gray-500">Contributions</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {stats.votesCast || 0}
              </p>
              <p className="text-xs text-gray-500">Votes</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {stats.sessionsAttended || 0}
              </p>
              <p className="text-xs text-gray-500">Sessions</p>
            </div>
          </div>
        </div>
      )}
    </CardWrapper>
  );
};

UserCard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    avatar: PropTypes.string,
    reputation: PropTypes.shape({
      level: PropTypes.string,
      score: PropTypes.number,
    }),
    stats: PropTypes.shape({
      songsContributed: PropTypes.number,
      votesCast: PropTypes.number,
      sessionsAttended: PropTypes.number,
    }),
  }),
  showStats: PropTypes.bool,
  showReputation: PropTypes.bool,
  compact: PropTypes.bool,
  linkToProfile: PropTypes.bool,
  className: PropTypes.string,
};

export default UserCard;

