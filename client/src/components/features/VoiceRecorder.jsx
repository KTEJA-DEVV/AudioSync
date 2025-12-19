import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import useVoiceRecognition from '../../hooks/useVoiceRecognition';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';

const VoiceRecorder = ({
  onTranscript,
  onError,
  disabled = false,
  autoSubmit = true,
  silenceTimeout = 1500,
  className = '',
}) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    recordingTime,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    silenceTimeout,
    onError,
  });

  // Auto-submit when transcript is finalized
  useEffect(() => {
    if (autoSubmit && transcript && !isListening) {
      onTranscript?.(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, autoSubmit, onTranscript, resetTranscript]);

  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Not supported message
  if (!isSupported) {
    return (
      <div className={cn('text-center text-gray-500 text-sm', className)}>
        <p>🎤 Voice input is not supported in this browser.</p>
        <p className="text-xs mt-1">Try Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-offset-2',
          isListening
            ? 'bg-red-500 text-white focus:ring-red-300 animate-pulse shadow-lg shadow-red-500/50'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
      >
        {isListening ? (
          <StopIcon className="w-6 h-6" />
        ) : (
          <MicrophoneIcon className="w-6 h-6" />
        )}
      </button>

      {/* Recording indicator */}
      {isListening && (
        <div className="flex flex-col items-center gap-1">
          {/* Waveform animation */}
          <div className="flex items-center gap-1 h-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.sin((Date.now() / 200) + i) * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          
          {/* Status and timer */}
          <div className="text-sm text-red-500 font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Listening... {formatTime(recordingTime)}
          </div>
        </div>
      )}

      {/* Preview of detected text */}
      {(transcript || interimTranscript) && (
        <div className="w-full max-w-xs p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            {transcript && <span className="font-medium">{transcript} </span>}
            {interimTranscript && (
              <span className="text-gray-400 italic">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 text-center max-w-xs">
          {error}
        </p>
      )}

      {/* Help text */}
      {!isListening && !transcript && !error && (
        <p className="text-xs text-gray-500 text-center">
          Click to speak your feedback
        </p>
      )}
    </div>
  );
};

VoiceRecorder.propTypes = {
  onTranscript: PropTypes.func,
  onError: PropTypes.func,
  disabled: PropTypes.bool,
  autoSubmit: PropTypes.bool,
  silenceTimeout: PropTypes.number,
  className: PropTypes.string,
};

export default VoiceRecorder;

