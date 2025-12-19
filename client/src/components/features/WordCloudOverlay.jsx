import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import useFeedback from '../../hooks/useFeedback';
import WordCloud from './WordCloud';

/**
 * WordCloudOverlay - Transparent overlay for OBS/streaming software
 * Access via: /overlay/wordcloud/:sessionId?position=bottom-right&size=medium
 */
const WordCloudOverlay = ({
  sessionId: propSessionId,
  className = '',
}) => {
  const { id: routeSessionId } = useParams();
  const [searchParams] = useSearchParams();
  
  const sessionId = propSessionId || routeSessionId;
  const position = searchParams.get('position') || 'bottom-right';
  const size = searchParams.get('size') || 'medium';
  const showTitle = searchParams.get('title') !== 'false';

  const {
    words,
    stats,
    isConnected,
  } = useFeedback(sessionId);

  // Size configurations
  const sizeConfig = {
    small: { width: 320, height: 180 },
    medium: { width: 480, height: 270 },
    large: { width: 640, height: 360 },
    full: { width: '100vw', height: '100vh' },
  };

  // Position configurations
  const positionConfig = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'full': 'inset-0',
  };

  const dimensions = sizeConfig[size] || sizeConfig.medium;
  const positionClass = positionConfig[position] || positionConfig['bottom-right'];
  const isFullSize = size === 'full';

  return (
    <div
      className={cn(
        'fixed z-50',
        !isFullSize && positionClass,
        isFullSize && 'inset-0',
        className
      )}
      style={{
        width: isFullSize ? '100%' : dimensions.width,
        height: isFullSize ? '100%' : dimensions.height,
        backgroundColor: 'transparent',
      }}
    >
      {/* Optional title */}
      {showTitle && !isFullSize && (
        <div className="absolute -top-6 left-0 right-0 text-center">
          <span className="text-white text-sm font-medium px-2 py-1 bg-black/30 rounded">
            Audience Feedback
          </span>
        </div>
      )}

      {/* Connection indicator */}
      <div className={cn(
        'absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs',
        isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
      )}>
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          isConnected ? 'bg-emerald-400' : 'bg-red-400'
        )} />
        {isConnected ? 'Live' : 'Offline'}
      </div>

      {/* Word Cloud */}
      <WordCloud
        words={words}
        className="w-full h-full bg-transparent"
        animated={true}
        showTooltip={false}
      />

      {/* Empty state */}
      {words.length === 0 && stats.status === 'open' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/50 text-center">
            <p className="text-lg">Waiting for feedback...</p>
          </div>
        </div>
      )}
    </div>
  );
};

WordCloudOverlay.propTypes = {
  sessionId: PropTypes.string,
  className: PropTypes.string,
};

/**
 * Standalone overlay page component
 * Renders just the word cloud on a transparent background
 */
export const WordCloudOverlayPage = () => {
  const { id: sessionId } = useParams();

  // Set body to transparent for OBS capture
  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-white text-center p-8 bg-black/50 rounded-xl">
          <h1 className="text-xl font-bold mb-2">Word Cloud Overlay</h1>
          <p className="text-gray-400 mb-4">Session ID is required</p>
          <p className="text-sm text-gray-500">
            Usage: /overlay/wordcloud/:sessionId
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Options: ?position=bottom-right&size=medium&title=true
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <WordCloudOverlay sessionId={sessionId} />
    </div>
  );
};

export default WordCloudOverlay;

