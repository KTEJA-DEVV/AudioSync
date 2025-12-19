import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { PlayIcon, PauseIcon, HeartIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { cn, formatDuration, formatNumber } from '../../../utils/helpers';
import { usePlay } from '../../../context/PlayContext';

const SongCard = ({
  song,
  onLike,
  showContributors = true,
  size = 'medium',
  className = '',
}) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlay();
  const [isHovered, setIsHovered] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const isCurrentSong = currentSong?.id === song.id || currentSong?._id === song._id;
  const isCurrentlyPlaying = isCurrentSong && isPlaying;

  const handlePlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onLike || isLikeLoading) return;
    
    setIsLikeLoading(true);
    try {
      await onLike(song.id || song._id);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const sizeClasses = {
    small: {
      container: 'w-36',
      cover: 'h-36',
      title: 'text-sm',
      meta: 'text-xs',
    },
    medium: {
      container: 'w-48',
      cover: 'h-48',
      title: 'text-base',
      meta: 'text-sm',
    },
    large: {
      container: 'w-64',
      cover: 'h-64',
      title: 'text-lg',
      meta: 'text-base',
    },
  };

  const sizes = sizeClasses[size] || sizeClasses.medium;

  // Format contributors display
  const contributorsDisplay = () => {
    if (!song.contributors || song.contributors.length === 0) return null;
    
    const primaryContributors = song.contributors
      .filter(c => ['lyrics', 'host', 'production'].includes(c.contributionType))
      .slice(0, 2);
    
    if (primaryContributors.length === 0) {
      return song.contributors.slice(0, 2);
    }
    
    const names = primaryContributors.map(c => 
      c.user?.displayName || c.user?.username || 'Unknown'
    );
    
    const extra = song.contributors.length - names.length;
    return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ');
  };

  return (
    <Link
      to={`/library/${song.id || song._id}`}
      className={cn(
        'group block rounded-xl transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-1',
        sizes.container,
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Art */}
      <div className={cn(
        'relative aspect-square rounded-lg overflow-hidden bg-gray-200',
        sizes.cover
      )}>
        <img
          src={song.coverArt || '/images/default-cover.jpg'}
          alt={song.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Play Button Overlay */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/40',
          'transition-opacity duration-200',
          isHovered || isCurrentlyPlaying ? 'opacity-100' : 'opacity-0'
        )}>
          <button
            onClick={handlePlayClick}
            className={cn(
              'w-12 h-12 flex items-center justify-center',
              'bg-white rounded-full shadow-lg',
              'transform transition-transform hover:scale-110',
              isCurrentlyPlaying && 'bg-primary-500'
            )}
          >
            {isCurrentlyPlaying ? (
              <PauseIcon className="w-6 h-6 text-white" />
            ) : (
              <PlayIcon className="w-6 h-6 text-gray-900 ml-0.5" />
            )}
          </button>
        </div>

        {/* Duration Badge */}
        {song.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
            {formatDuration(song.duration)}
          </span>
        )}

        {/* Now Playing Indicator */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-primary-500 text-white text-xs rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Playing
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="mt-3 px-1">
        <h3 className={cn(
          'font-semibold text-gray-900 truncate',
          sizes.title
        )}>
          {song.title || 'Untitled Song'}
        </h3>

        {/* Contributors */}
        {showContributors && (
          <p className={cn(
            'text-gray-500 truncate mt-0.5',
            sizes.meta
          )}>
            {contributorsDisplay() || 'Unknown Artist'}
          </p>
        )}

        {/* Stats Row */}
        <div className={cn(
          'flex items-center justify-between mt-2',
          sizes.meta
        )}>
          <div className="flex items-center gap-3 text-gray-400">
            <span title="Plays">
              {formatNumber(song.plays || 0)} plays
            </span>
          </div>

          {/* Like Button */}
          <button
            onClick={handleLikeClick}
            disabled={isLikeLoading}
            className={cn(
              'flex items-center gap-1 transition-colors',
              song.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            )}
          >
            {song.isLiked ? (
              <HeartIcon className="w-4 h-4" />
            ) : (
              <HeartOutline className="w-4 h-4" />
            )}
            <span>{formatNumber(song.likes || 0)}</span>
          </button>
        </div>
      </div>
    </Link>
  );
};

SongCard.propTypes = {
  song: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    title: PropTypes.string,
    coverArt: PropTypes.string,
    audioUrl: PropTypes.string,
    duration: PropTypes.number,
    plays: PropTypes.number,
    likes: PropTypes.number,
    isLiked: PropTypes.bool,
    contributors: PropTypes.arrayOf(PropTypes.shape({
      user: PropTypes.shape({
        username: PropTypes.string,
        displayName: PropTypes.string,
      }),
      contributionType: PropTypes.string,
    })),
  }).isRequired,
  onLike: PropTypes.func,
  showContributors: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

export default SongCard;

