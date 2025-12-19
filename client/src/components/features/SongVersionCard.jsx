import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { AudioPlayer, WaveformVisualizer } from '../ui';
import {
  PlayIcon,
  PauseIcon,
  HandThumbUpIcon,
  ClockIcon,
  MusicalNoteIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const SongVersionCard = ({
  song,
  isVotingOpen = false,
  onVote,
  onRemoveVote,
  hasVoted = false,
  showFullPlayer = false,
  className = '',
  isGenerating = false,
  generationProgress = 0,
  generationStage = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleVote = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isVoting) return;
    setIsVoting(true);
    
    try {
      if (hasVoted) {
        await onRemoveVote?.(song.id);
      } else {
        await onVote?.(song.id);
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Cover art style
  const coverArtStyle = song.coverArt?.startsWith('linear-gradient')
    ? { background: song.coverArt }
    : { backgroundImage: `url(${song.coverArt || ''})`, backgroundColor: '#6366f1' };

  // Render generating state
  if (isGenerating) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700',
          'aspect-square md:aspect-video',
          className
        )}
      >
        {/* Cover art / gradient background */}
        <div className="relative h-2/5 md:h-1/2" style={coverArtStyle}>
          {/* Animated waveform placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-end gap-1 h-12">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-white/60 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 80}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Version label */}
          <div className="absolute top-3 left-3 bg-black/50 text-white text-sm font-semibold px-3 py-1 rounded-full">
            Version {song.versionLabel || song.version}
          </div>
        </div>

        {/* Progress section */}
        <div className="p-4 flex flex-col justify-center h-3/5 md:h-1/2">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {generationStage || 'Generating...'}
            </p>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{generationProgress}%</p>
          </div>

          {/* Loading spinner */}
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg',
        'aspect-square md:aspect-video',
        className
      )}
    >
      {/* Cover art section */}
      <div
        className="relative h-2/5 md:h-1/2 bg-cover bg-center"
        style={coverArtStyle}
      >
        {/* Play button overlay */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
        >
          <div className="w-16 h-16 flex items-center justify-center bg-white/90 group-hover:bg-white rounded-full shadow-lg transition-all">
            {isPlaying ? (
              <PauseIcon className="w-8 h-8 text-indigo-600" />
            ) : (
              <PlayIcon className="w-8 h-8 text-indigo-600 ml-1" />
            )}
          </div>
        </button>

        {/* Version label */}
        <div className="absolute top-3 left-3 bg-black/50 text-white text-sm font-semibold px-3 py-1 rounded-full">
          Version {song.versionLabel || song.version}
        </div>

        {/* Status badge */}
        {song.status === 'selected' && (
          <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            WINNER
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-4 h-3/5 md:h-1/2 flex flex-col">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-2">
          {song.title || `Version ${song.versionLabel}`}
        </h3>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            {Math.floor((song.duration || 0) / 60)}:{String(Math.floor((song.duration || 0) % 60)).padStart(2, '0')}
          </span>
          {song.generationParams?.tempo && (
            <span className="flex items-center gap-1">
              <MusicalNoteIcon className="w-4 h-4" />
              {song.generationParams.tempo} BPM
            </span>
          )}
          {song.generationParams?.key && (
            <span>{song.generationParams.key}</span>
          )}
        </div>

        {/* Waveform mini preview */}
        {song.waveformData?.length > 0 && !showFullPlayer && (
          <div className="mb-3">
            <WaveformVisualizer
              waveformData={song.waveformData}
              height={24}
              barWidth={2}
              barGap={1}
              interactive={false}
            />
          </div>
        )}

        {/* Full player (when expanded) */}
        {showFullPlayer && isPlaying && song.audioUrl && (
          <AudioPlayer
            src={song.audioUrl}
            waveformData={song.waveformData}
            compact
            className="mb-3"
            autoPlay
            onPause={() => setIsPlaying(false)}
          />
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center justify-between">
          {/* Vote button */}
          {isVotingOpen && (
            <button
              onClick={handleVote}
              disabled={isVoting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all',
                hasVoted
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900',
                isVoting && 'opacity-50 cursor-not-allowed'
              )}
            >
              <HandThumbUpIcon className="w-5 h-5" />
              <span>{song.votes || 0}</span>
            </button>
          )}

          {/* Like button (when not voting) */}
          {!isVotingOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLiking(true);
                // TODO: Implement like functionality
                setTimeout(() => setIsLiking(false), 500);
              }}
              className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
            >
              {song.isLiked ? (
                <HeartIconSolid className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
              <span className="text-sm">{song.likes || 0}</span>
            </button>
          )}

          {/* View details link */}
          <Link
            to={`/songs/${song.id}`}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            View Details
            <ChevronRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

SongVersionCard.propTypes = {
  song: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    version: PropTypes.number,
    versionLabel: PropTypes.string,
    audioUrl: PropTypes.string,
    coverArt: PropTypes.string,
    waveformData: PropTypes.arrayOf(PropTypes.number),
    duration: PropTypes.number,
    status: PropTypes.string,
    votes: PropTypes.number,
    likes: PropTypes.number,
    isLiked: PropTypes.bool,
    generationParams: PropTypes.shape({
      tempo: PropTypes.number,
      key: PropTypes.string,
    }),
  }).isRequired,
  isVotingOpen: PropTypes.bool,
  onVote: PropTypes.func,
  onRemoveVote: PropTypes.func,
  hasVoted: PropTypes.bool,
  showFullPlayer: PropTypes.bool,
  className: PropTypes.string,
  isGenerating: PropTypes.bool,
  generationProgress: PropTypes.number,
  generationStage: PropTypes.string,
};

export default SongVersionCard;

