import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import { FaceSmileIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

// Quick emoji picker
const QUICK_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎵', '🎤', '🤯', '💯', '✨', '🙌'];

/**
 * ChatInput - Text input with emoji picker and send button
 */
const ChatInput = ({
  onSend,
  disabled = false,
  slowModeSeconds = 0,
  placeholder = 'Send a message...',
  maxLength = 500,
  className = '',
}) => {
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef(null);
  const cooldownRef = useRef(null);

  // Handle send
  const handleSend = useCallback(() => {
    if (!message.trim() || disabled || cooldown > 0) return;

    onSend?.(message.trim());
    setMessage('');
    setShowEmojis(false);

    // Start cooldown if slow mode is active
    if (slowModeSeconds > 0) {
      setCooldown(slowModeSeconds);
      cooldownRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [message, disabled, cooldown, slowModeSeconds, onSend]);

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Add emoji to message
  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const isDisabled = disabled || cooldown > 0;

  return (
    <div className={cn('relative', className)}>
      {/* Slow mode indicator */}
      {slowModeSeconds > 0 && cooldown === 0 && (
        <div className="text-xs text-gray-500 mb-1 text-center">
          Slow mode: {slowModeSeconds}s between messages
        </div>
      )}

      {/* Cooldown indicator */}
      {cooldown > 0 && (
        <div className="absolute -top-8 left-0 right-0 text-center">
          <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
            Wait {cooldown}s to send another message
          </span>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="p-1.5 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <div className={cn(
        'flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-transparent',
        'focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500',
        isDisabled && 'opacity-50'
      )}>
        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          disabled={isDisabled}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            showEmojis ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500',
            isDisabled && 'cursor-not-allowed'
          )}
        >
          <FaceSmileIcon className="w-5 h-5" />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowEmojis(false)}
          disabled={isDisabled}
          placeholder={isDisabled ? 'Chat is disabled' : placeholder}
          className={cn(
            'flex-1 bg-transparent border-none outline-none text-sm',
            'text-gray-900 dark:text-white placeholder-gray-500',
            isDisabled && 'cursor-not-allowed'
          )}
        />

        {/* Character count */}
        {message.length > maxLength * 0.8 && (
          <span className={cn(
            'text-xs tabular-nums',
            message.length >= maxLength ? 'text-red-500' : 'text-gray-500'
          )}>
            {message.length}/{maxLength}
          </span>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || isDisabled}
          className={cn(
            'p-1.5 rounded-full transition-colors',
            message.trim() && !isDisabled
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

ChatInput.propTypes = {
  onSend: PropTypes.func,
  disabled: PropTypes.bool,
  slowModeSeconds: PropTypes.number,
  placeholder: PropTypes.string,
  maxLength: PropTypes.number,
  className: PropTypes.string,
};

export default ChatInput;

