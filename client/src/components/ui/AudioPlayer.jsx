import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import WaveformVisualizer from './WaveformVisualizer';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowDownTrayIcon,
  ForwardIcon,
  BackwardIcon,
} from '@heroicons/react/24/solid';

const AudioPlayer = ({
  src,
  title = '',
  artist = '',
  coverArt = '',
  waveformData = [],
  className = '',
  showWaveform = true,
  showDownload = true,
  showSpeedControl = true,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  autoPlay = false,
  compact = false,
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Format time helper
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime, audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay) onPlay();
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPause) onPause();
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [onPlay, onPause, onEnded, onTimeUpdate]);

  // Auto play
  useEffect(() => {
    if (autoPlay && audioRef.current && src) {
      audioRef.current.play().catch(() => {});
    }
  }, [autoPlay, src]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  // Seek
  const handleSeek = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  }, []);

  // Volume control
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Playback speed
  const cyclePlaybackSpeed = useCallback(() => {
    const currentIndex = playbackSpeeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackSpeeds.length;
    const newRate = playbackSpeeds[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  }, [playbackRate, playbackSpeeds]);

  // Download
  const handleDownload = useCallback(() => {
    if (src) {
      const link = document.createElement('a');
      link.href = src;
      link.download = title || 'audio';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [src, title]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 bg-gray-900 rounded-lg p-3', className)}>
        <audio ref={audioRef} src={src} preload="metadata" />
        
        {/* Play button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <PauseIcon className="w-5 h-5 text-white" />
          ) : (
            <PlayIcon className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Progress */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>

        {/* Volume */}
        <button onClick={toggleMute} className="text-gray-400 hover:text-white p-1">
          {isMuted ? (
            <SpeakerXMarkIcon className="w-5 h-5" />
          ) : (
            <SpeakerWaveIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('bg-gray-900 text-white rounded-xl p-4', className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header with cover art and info */}
      {(coverArt || title || artist) && (
        <div className="flex items-center gap-4 mb-4">
          {coverArt && (
            <div
              className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
              style={{ 
                backgroundImage: coverArt.startsWith('linear-gradient') 
                  ? coverArt 
                  : `url(${coverArt})`,
                backgroundColor: '#6366f1',
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            {title && <h3 className="font-semibold truncate">{title}</h3>}
            {artist && <p className="text-sm text-gray-400 truncate">{artist}</p>}
          </div>
        </div>
      )}

      {/* Waveform visualizer */}
      {showWaveform && (
        <div className="mb-4">
          <WaveformVisualizer
            waveformData={waveformData}
            progress={progress}
            duration={duration}
            onSeek={handleSeek}
            height={48}
            barColor="#4f46e5"
            playedColor="#a5b4fc"
          />
        </div>
      )}

      {/* Progress bar (if no waveform) */}
      {!showWaveform && (
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}

      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left controls */}
        <div className="flex items-center gap-2">
          {/* Speed control */}
          {showSpeedControl && (
            <button
              onClick={cyclePlaybackSpeed}
              className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors min-w-[40px]"
            >
              {playbackRate}x
            </button>
          )}
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-3">
          {/* Skip back */}
          <button
            onClick={() => skip(-10)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <BackwardIcon className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <PauseIcon className="w-7 h-7" />
            ) : (
              <PlayIcon className="w-7 h-7 ml-1" />
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={() => skip(10)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ForwardIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Volume */}
          <div
            className="relative"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              {isMuted || volume === 0 ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>

            {/* Volume slider */}
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-800 rounded-lg shadow-lg">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  style={{ writingMode: 'bt-lr' }}
                />
              </div>
            )}
          </div>

          {/* Download */}
          {showDownload && src && (
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

AudioPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  title: PropTypes.string,
  artist: PropTypes.string,
  coverArt: PropTypes.string,
  waveformData: PropTypes.arrayOf(PropTypes.number),
  className: PropTypes.string,
  showWaveform: PropTypes.bool,
  showDownload: PropTypes.bool,
  showSpeedControl: PropTypes.bool,
  onPlay: PropTypes.func,
  onPause: PropTypes.func,
  onEnded: PropTypes.func,
  onTimeUpdate: PropTypes.func,
  autoPlay: PropTypes.bool,
  compact: PropTypes.bool,
};

export default AudioPlayer;

