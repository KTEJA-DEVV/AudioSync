import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

/**
 * Platform-aware video player component
 * Supports Twitch, YouTube embeds, and custom video sources
 */
const VideoPlayer = ({
  platform = 'custom',
  streamUrl,
  channelName,
  videoId,
  isLive = false,
  viewerCount = 0,
  showOverlay = true,
  className = '',
  children, // For overlay content
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  // Handle video ready state
  const handleVideoReady = () => {
    setIsLoading(false);
    setError(null);
  };

  // Toggle play/pause for custom player
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Render Twitch embed
  const renderTwitch = () => {
    if (!channelName) return renderOffline();
    
    const embedUrl = `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}&muted=true`;
    
    return (
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        onLoad={handleVideoReady}
      />
    );
  };

  // Render YouTube embed
  const renderYouTube = () => {
    if (!videoId && !streamUrl) return renderOffline();
    
    const id = videoId || extractYouTubeId(streamUrl);
    if (!id) return renderOffline();
    
    const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&enablejsapi=1`;
    
    return (
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={handleVideoReady}
      />
    );
  };

  // Render custom video player
  const renderCustom = () => {
    if (!streamUrl) return renderOffline();
    
    return (
      <>
        <video
          ref={videoRef}
          src={streamUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted={isMuted}
          playsInline
          onLoadedData={handleVideoReady}
          onError={() => setError('Failed to load video')}
        />
        
        {/* Custom controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
          <button
            onClick={togglePlay}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </>
    );
  };

  // Render offline/no stream state
  const renderOffline = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-800 flex items-center justify-center">
        <PlayIcon className="w-8 h-8 text-gray-600" />
      </div>
      <p className="text-lg font-medium">Stream Offline</p>
      <p className="text-sm text-gray-400 mt-1">The stream will start soon</p>
    </div>
  );

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  // Render based on platform
  const renderPlayer = () => {
    if (error) return renderOffline();
    
    switch (platform) {
      case 'twitch':
        return renderTwitch();
      case 'youtube':
        return renderYouTube();
      case 'custom':
      default:
        return renderCustom();
    }
  };

  return (
    <div className={cn('relative aspect-video bg-black rounded-2xl overflow-hidden', className)}>
      {/* Loading state */}
      {isLoading && platform !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-white text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Video player */}
      {renderPlayer()}

      {/* Overlay content */}
      {showOverlay && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* LIVE badge */}
          {isLive && (
            <div className="absolute top-4 left-4 pointer-events-auto">
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full" />
                LIVE
              </span>
            </div>
          )}

          {/* Viewer count */}
          {viewerCount > 0 && (
            <div className="absolute top-4 right-4 pointer-events-auto">
              <span className="bg-black/50 backdrop-blur text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {viewerCount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Custom overlay content (children) */}
          {children}
        </div>
      )}
    </div>
  );
};

VideoPlayer.propTypes = {
  platform: PropTypes.oneOf(['twitch', 'youtube', 'custom', 'none']),
  streamUrl: PropTypes.string,
  channelName: PropTypes.string,
  videoId: PropTypes.string,
  isLive: PropTypes.bool,
  viewerCount: PropTypes.number,
  showOverlay: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default VideoPlayer;

