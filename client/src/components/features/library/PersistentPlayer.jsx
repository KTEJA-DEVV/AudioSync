import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  QueueListIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/solid';
import { cn, formatDuration } from '../../../utils/helpers';
import { usePlay } from '../../../context/PlayContext';

const PersistentPlayer = () => {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    shuffle,
    repeat,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekPercent,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    hasNext,
    hasPrevious,
    progressPercent,
  } = usePlay();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Don't render if no song
  if (!currentSong) return null;

  const handleProgressClick = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seekPercent(Math.max(0, Math.min(100, percent)));
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const getRepeatIcon = () => {
    if (repeat === 'one') {
      return (
        <div className="relative">
          <ArrowPathIcon className="w-5 h-5" />
          <span className="absolute -bottom-1 -right-1 text-[8px] font-bold">1</span>
        </div>
      );
    }
    return <ArrowPathIcon className="w-5 h-5" />;
  };

  return (
    <>
      {/* Main Player Bar */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white border-t border-gray-200 shadow-lg',
        'transition-all duration-300',
        isExpanded ? 'h-auto' : 'h-20'
      )}>
        {/* Progress Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gray-200 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-600 rounded-full',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>

        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center h-20 gap-4">
            {/* Song Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Link to={`/library/${currentSong.id || currentSong._id}`}>
                <img
                  src={currentSong.coverArt || '/images/default-cover.jpg'}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover shadow"
                />
              </Link>
              <div className="min-w-0">
                <Link
                  to={`/library/${currentSong.id || currentSong._id}`}
                  className="block font-medium text-gray-900 truncate hover:text-primary-600"
                >
                  {currentSong.title || 'Untitled'}
                </Link>
                <p className="text-sm text-gray-500 truncate">
                  {currentSong.contributors?.[0]?.user?.displayName || 
                   currentSong.contributors?.[0]?.user?.username || 
                   'Unknown Artist'}
                </p>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-2">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={cn(
                  'p-2 rounded-full transition-colors hidden sm:block',
                  shuffle ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600'
                )}
                title="Shuffle"
              >
                <ArrowsRightLeftIcon className="w-5 h-5" />
              </button>

              {/* Previous */}
              <button
                onClick={playPrevious}
                disabled={!hasPrevious}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  hasPrevious ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300'
                )}
                title="Previous"
              >
                <BackwardIcon className="w-5 h-5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6 ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={playNext}
                disabled={!hasNext}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  hasNext ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300'
                )}
                title="Next"
              >
                <ForwardIcon className="w-5 h-5" />
              </button>

              {/* Repeat */}
              <button
                onClick={toggleRepeat}
                className={cn(
                  'p-2 rounded-full transition-colors hidden sm:block',
                  repeat !== 'none' ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600'
                )}
                title={`Repeat: ${repeat}`}
              >
                {getRepeatIcon()}
              </button>
            </div>

            {/* Time Display */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 min-w-[100px]">
              <span>{formatDuration(progress)}</span>
              <span>/</span>
              <span>{formatDuration(duration)}</span>
            </div>

            {/* Volume & Extra Controls */}
            <div className="flex items-center gap-2">
              {/* Volume */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  {isMuted || volume === 0 ? (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
              </div>

              {/* Queue */}
              <button
                onClick={() => setShowQueue(!showQueue)}
                className={cn(
                  'p-2 rounded-full transition-colors hidden sm:block',
                  showQueue ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600'
                )}
                title="Queue"
              >
                <QueueListIcon className="w-5 h-5" />
              </button>

              {/* Expand/Minimize */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? (
                  <XMarkIcon className="w-5 h-5" />
                ) : (
                  <ArrowsPointingOutIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded View */}
          {isExpanded && (
            <div className="py-6 border-t border-gray-100">
              <div className="flex gap-8">
                {/* Large Cover Art */}
                <div className="hidden lg:block">
                  <img
                    src={currentSong.coverArt || '/images/default-cover.jpg'}
                    alt={currentSong.title}
                    className="w-48 h-48 rounded-xl object-cover shadow-lg"
                  />
                </div>

                {/* Song Details */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentSong.title || 'Untitled'}
                  </h2>
                  <p className="text-gray-500 mb-4">
                    {currentSong.contributors?.map(c => 
                      c.user?.displayName || c.user?.username
                    ).join(', ') || 'Unknown Artist'}
                  </p>

                  {/* Full Progress Bar */}
                  <div className="space-y-2">
                    <div
                      className="h-2 bg-gray-200 rounded-full cursor-pointer group"
                      onClick={handleProgressClick}
                    >
                      <div
                        className="h-full bg-primary-500 rounded-full relative"
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{formatDuration(progress)}</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Queue Panel */}
                {showQueue && queue.length > 0 && (
                  <div className="w-64 border-l border-gray-100 pl-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Up Next</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {queue.slice(queueIndex + 1, queueIndex + 6).map((song, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <img
                            src={song.coverArt || '/images/default-cover.jpg'}
                            alt={song.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">{song.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind player */}
      <div className="h-20" />
    </>
  );
};

export default PersistentPlayer;

