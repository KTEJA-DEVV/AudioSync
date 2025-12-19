import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import useFeedback from '../../hooks/useFeedback';
import WordCloud from './WordCloud';
import VoiceRecorder from './VoiceRecorder';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

// Quick feedback suggestions
const QUICK_FEEDBACK = [
  { text: 'Fire 🔥', words: ['fire'] },
  { text: 'More Bass', words: ['more', 'bass'] },
  { text: 'Love It ❤️', words: ['love'] },
  { text: 'Too Fast', words: ['fast'] },
  { text: 'Chill Vibes', words: ['chill', 'vibes'] },
  { text: 'Needs Work', words: ['needs', 'work'] },
];

const FeedbackInterface = ({
  sessionId,
  isHost = false,
  showStats = true,
  showVoice = true,
  className = '',
}) => {
  const [textInput, setTextInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  const {
    words,
    stats,
    isConnected,
    isLoading,
    error,
    cooldown,
    recentSubmissions,
    submitWords,
    submitVoice,
    getWordColor,
  } = useFeedback(sessionId);

  // Handle text submission
  const handleTextSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!textInput.trim() || cooldown > 0) return;

    await submitWords(textInput.trim());
    setTextInput('');
  }, [textInput, cooldown, submitWords]);

  // Handle quick feedback click
  const handleQuickFeedback = useCallback(async (text) => {
    if (cooldown > 0) return;
    await submitWords(text);
  }, [cooldown, submitWords]);

  // Handle voice input
  const handleVoiceTranscript = useCallback(async (transcript) => {
    if (transcript && cooldown === 0) {
      await submitVoice(transcript);
    }
  }, [cooldown, submitVoice]);

  // Sentiment gauge
  const SentimentGauge = () => {
    const score = stats.sentiment?.score || 0;
    const percentage = ((score + 1) / 2) * 100;
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Negative</span>
          <span>Positive</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-gray-400 to-emerald-500"
            style={{ width: '100%' }}
          />
        </div>
        <div
          className="w-3 h-3 bg-white border-2 border-gray-800 rounded-full -mt-2.5 transition-all duration-300"
          style={{ marginLeft: `calc(${percentage}% - 6px)` }}
        />
      </div>
    );
  };

  // Stats panel content
  const StatsContent = () => (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalInputs || 0}</div>
          <div className="text-xs text-gray-400">Total Inputs</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.uniqueWords || 0}</div>
          <div className="text-xs text-gray-400">Unique Words</div>
        </div>
      </div>

      {/* Top 5 Words */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Top Words</h4>
        <div className="space-y-1">
          {words.slice(0, 5).map((word, index) => (
            <div key={word.word} className="flex items-center justify-between text-sm">
              <span className={cn('font-medium', getWordColor(word.word))}>
                {index + 1}. {word.word}
              </span>
              <span className="text-gray-500">{word.count}</span>
            </div>
          ))}
          {words.length === 0 && (
            <p className="text-gray-500 text-sm">No words yet</p>
          )}
        </div>
      </div>

      {/* Sentiment */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Sentiment</h4>
        <SentimentGauge />
      </div>

      {/* Contributors */}
      {stats.contributors?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1">
            <UserGroupIcon className="w-4 h-4" />
            Top Contributors
          </h4>
          <div className="space-y-1">
            {stats.contributors.slice(0, 5).map((contributor, index) => (
              <div key={contributor.userId} className="flex items-center gap-2 text-sm">
                <img
                  src={contributor.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-gray-300 truncate flex-1">
                  {contributor.displayName || contributor.username}
                </span>
                <span className="text-gray-500">{contributor.wordCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Word Cloud Section */}
      <div className={cn(
        'relative',
        isFullscreen && 'fixed inset-0 z-50 bg-gray-900 p-4'
      )}>
        {/* Toolbar */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {/* Connection indicator */}
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-emerald-500' : 'bg-red-500'
          )} />
          
          {/* Stats toggle */}
          {showStats && (
            <button
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Toggle stats"
            >
              <ChartBarIcon className="w-5 h-5 text-white" />
            </button>
          )}
          
          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5 text-white" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Status badge */}
        {stats.status === 'open' && (
          <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Live
          </div>
        )}

        {/* Word Cloud */}
        <WordCloud
          words={words}
          className={isFullscreen ? 'w-full h-full' : ''}
        />

        {/* Stats Panel (overlay) */}
        {showStatsPanel && (
          <div className="absolute top-12 right-2 w-64 bg-white/10 backdrop-blur rounded-xl p-4 z-20">
            <StatsContent />
          </div>
        )}
      </div>

      {/* Input Section */}
      {stats.status === 'open' && (
        <div className="space-y-4">
          {/* Recent submissions */}
          {recentSubmissions.length > 0 && (
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs text-gray-500">Recent:</span>
              {recentSubmissions.slice(0, 3).map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs rounded-full animate-fade-in"
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="relative">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your feedback..."
              disabled={cooldown > 0}
              className={cn(
                'w-full text-lg px-6 py-4 rounded-full',
                'border-2 border-gray-200 dark:border-gray-700',
                'focus:border-indigo-500 focus:ring-0 focus:outline-none',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400',
                'transition-colors',
                cooldown > 0 && 'opacity-50'
              )}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || cooldown > 0}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'px-4 py-2 rounded-full',
                'bg-indigo-600 hover:bg-indigo-700 text-white font-medium',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {cooldown > 0 ? `${cooldown}s` : 'Send'}
            </button>
          </form>

          {/* Voice input */}
          {showVoice && (
            <div className="flex justify-center">
              <VoiceRecorder
                onTranscript={handleVoiceTranscript}
                disabled={cooldown > 0}
              />
            </div>
          )}

          {/* Quick feedback buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_FEEDBACK.map((item) => (
              <button
                key={item.text}
                onClick={() => handleQuickFeedback(item.text)}
                disabled={cooldown > 0}
                className={cn(
                  'px-4 py-2 rounded-full',
                  'bg-gray-100 dark:bg-gray-700',
                  'hover:bg-gray-200 dark:hover:bg-gray-600',
                  'text-sm font-medium text-gray-700 dark:text-gray-300',
                  'transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {item.text}
              </button>
            ))}
          </div>

          {/* Cooldown indicator */}
          {cooldown > 0 && (
            <p className="text-center text-sm text-gray-500">
              Wait {cooldown} seconds before sending more feedback
            </p>
          )}
        </div>
      )}

      {/* Closed state */}
      {stats.status === 'closed' && (
        <div className="text-center py-6 text-gray-500">
          <p className="font-medium">Feedback collection is closed</p>
          {isHost && (
            <p className="text-sm mt-1">
              Start feedback collection to allow audience input
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

FeedbackInterface.propTypes = {
  sessionId: PropTypes.string.isRequired,
  isHost: PropTypes.bool,
  showStats: PropTypes.bool,
  showVoice: PropTypes.bool,
  className: PropTypes.string,
};

export default FeedbackInterface;

