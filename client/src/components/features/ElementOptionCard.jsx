import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import { WaveformVisualizer } from '../ui';
import {
  PlayIcon,
  PauseIcon,
  CheckIcon,
  HandThumbUpIcon,
} from '@heroicons/react/24/solid';

const ElementOptionCard = ({
  option,
  isSelected = false,
  hasVoted = false,
  showTechnicalDetails = false,
  onVote,
  onRemoveVote,
  onSelect,
  disabled = false,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  // Calculate percentage if total votes available
  const percentage = option.percentage || 0;

  // Handle audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleVote = async (e) => {
    e.stopPropagation();
    if (disabled || isVoting) return;

    setIsVoting(true);
    try {
      if (hasVoted) {
        await onRemoveVote?.(option.optionId);
      } else {
        await onVote?.(option.optionId);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(option);
    }
  };

  const progress = option.metadata?.duration
    ? (currentTime / option.metadata.duration) * 100
    : 0;

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'relative p-4 border rounded-xl transition-all cursor-pointer',
        'hover:border-indigo-300 dark:hover:border-indigo-600',
        isSelected && 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
        hasVoted && !isSelected && 'border-green-300 bg-green-50 dark:bg-green-900/10',
        !isSelected && !hasVoted && 'border-gray-200 dark:border-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Hidden audio element */}
      {option.audioUrl && (
        <audio ref={audioRef} src={option.audioUrl} preload="metadata" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Element type badge */}
          <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full mb-1">
            {option.elementType}
          </span>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {option.label}
          </h3>
          {option.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {option.description}
            </p>
          )}
        </div>

        {/* Vote count badge */}
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <HandThumbUpIcon className="w-4 h-4" />
          <span className="font-medium">{option.votes || 0}</span>
          {percentage > 0 && (
            <span className="text-xs text-gray-500">({percentage}%)</span>
          )}
        </div>
      </div>

      {/* Audio player (if has audio) */}
      {option.audioUrl && (
        <div className="mb-3">
          <div className="flex items-center gap-3">
            {/* Play button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-full transition-colors',
                'bg-indigo-600 hover:bg-indigo-700 text-white'
              )}
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* Waveform or progress */}
            <div className="flex-1">
              {option.waveformData?.length > 0 ? (
                <WaveformVisualizer
                  waveformData={option.waveformData}
                  progress={progress}
                  duration={option.metadata?.duration || 0}
                  height={32}
                  barWidth={2}
                  barGap={1}
                  interactive={false}
                />
              ) : (
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Technical details */}
      {showTechnicalDetails && option.metadata && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
          {option.metadata.bpm && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {option.metadata.bpm} BPM
            </span>
          )}
          {option.metadata.key && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {option.metadata.key}
            </span>
          )}
          {option.metadata.duration && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {Math.floor(option.metadata.duration / 60)}:{String(Math.floor(option.metadata.duration % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
      )}

      {/* Value display (for non-audio options like BPM) */}
      {!option.audioUrl && option.value && (
        <div className="mb-3 text-center py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {option.value}
          </span>
        </div>
      )}

      {/* Vote button */}
      <button
        onClick={handleVote}
        disabled={disabled || isVoting}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all',
          hasVoted
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900',
          (disabled || isVoting) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {hasVoted ? (
          <>
            <CheckIcon className="w-5 h-5" />
            Voted
          </>
        ) : (
          <>
            <HandThumbUpIcon className="w-5 h-5" />
            Vote
          </>
        )}
      </button>

      {/* Percentage bar */}
      {percentage > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* User submitted badge */}
      {option.isUserSubmitted && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
          User Submitted
        </div>
      )}
    </div>
  );
};

ElementOptionCard.propTypes = {
  option: PropTypes.shape({
    optionId: PropTypes.string.isRequired,
    elementType: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    audioUrl: PropTypes.string,
    waveformData: PropTypes.arrayOf(PropTypes.number),
    value: PropTypes.any,
    votes: PropTypes.number,
    percentage: PropTypes.number,
    isUserSubmitted: PropTypes.bool,
    metadata: PropTypes.shape({
      bpm: PropTypes.number,
      key: PropTypes.string,
      duration: PropTypes.number,
    }),
  }).isRequired,
  isSelected: PropTypes.bool,
  hasVoted: PropTypes.bool,
  showTechnicalDetails: PropTypes.bool,
  onVote: PropTypes.func,
  onRemoveVote: PropTypes.func,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ElementOptionCard;

