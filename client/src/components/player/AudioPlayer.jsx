import React from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, RotateCw, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Waveform from './Waveform';
import { formatTime } from '../../utils/formatTime';

const AudioPlayer = ({ 
  isPlaying, 
  currentTime, 
  duration, 
  volume, 
  isMuted,
  onPlayPause, 
  onSeek, 
  onVolumeChange, 
  onToggleMute,
  onSkipForward,
  onSkipBackward,
  onToggleLoop,
  isExpanded,
  onToggleExpand,
  currentTrack
}) => {
  // Animation variants for the play/pause button
  const playButtonVariants = {
    play: { scale: 1 },
    pause: { scale: 1.1 }
  };

  return (
    <div className={`bg-surface border-t border-border transition-all duration-300 ${isExpanded ? 'h-full' : 'h-24'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
        {/* Track info and expand button */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-surface rounded-md overflow-hidden">
              {currentTrack?.cover ? (
                <img 
                  src={currentTrack.cover} 
                  alt={currentTrack.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-text-secondary" />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-primary">
                {currentTrack?.title || 'No track selected'}
              </h4>
              <p className="text-xs text-text-secondary">
                {currentTrack?.artist || 'Select a track to begin'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onToggleExpand}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={isExpanded ? 'Minimize player' : 'Expand player'}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {/* Main player area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="py-6"
              >
                {/* Waveform */}
                <div className="mb-8">
                  <Waveform 
                    audioRef={null}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={onSeek}
                  />
                </div>
                
                {/* Time display */}
                <div className="flex items-center justify-between text-xs text-text-secondary mb-6 px-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Main controls */}
                <div className="flex items-center justify-center space-x-6 my-6">
                  <button 
                    onClick={onSkipBackward}
                    className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Skip backward"
                  >
                    <SkipBack size={20} />
                  </button>
                  
                  <button 
                    onClick={onPlayPause}
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    <motion.div
                      variants={playButtonVariants}
                      animate={isPlaying ? 'pause' : 'play'}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      {isPlaying ? (
                        <div className="flex space-x-1 w-5 h-5">
                          <span className="block w-1.5 h-full bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                          <span className="block w-1.5 h-full bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="block w-1.5 h-full bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <Play size={24} className="ml-0.5" />
                      )}
                    </motion.div>
                  </button>
                  
                  <button 
                    onClick={onSkipForward}
                    className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Skip forward"
                  >
                    <SkipForward size={20} />
                  </button>
                </div>

                {/* Secondary controls */}
                <div className="flex items-center justify-between px-6 mt-8">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={onToggleLoop}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                      aria-label="Toggle loop"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <span className="text-xs text-text-tertiary">
                      {formatTime(duration - currentTime)} left
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={onToggleMute}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={onVolumeChange}
                      className="w-20 accent-primary"
                      aria-label="Volume control"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
