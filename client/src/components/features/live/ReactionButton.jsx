import React, { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';

/**
 * ReactionButton - Single reaction button with click animation
 */
const ReactionButton = ({
  emoji,
  type,
  count,
  onClick,
  showCount = false,
  disabled = false,
  size = 'medium',
  className = '',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const cooldownRef = useRef(false);

  const handleClick = useCallback(() => {
    if (disabled || cooldownRef.current) return;

    // Rate limit: prevent spam clicking (2 second cooldown)
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 2000);

    // Trigger animation
    setIsAnimating(true);
    setClickCount(prev => prev + 1);
    setTimeout(() => setIsAnimating(false), 300);

    onClick?.(type);
  }, [disabled, type, onClick]);

  const sizeClasses = {
    small: 'text-lg p-1.5',
    medium: 'text-2xl p-2',
    large: 'text-3xl p-3',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative rounded-full transition-all duration-150',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'active:scale-90',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        sizeClasses[size],
        isAnimating && 'scale-125',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={`React with ${type}`}
    >
      {/* Emoji */}
      <span className={cn(
        'block transition-transform',
        isAnimating && 'animate-bounce'
      )}>
        {emoji}
      </span>

      {/* Click burst effect */}
      {clickCount > 0 && (
        <span
          key={clickCount}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="absolute w-full h-full rounded-full bg-indigo-500/20 animate-ping" />
        </span>
      )}

      {/* Count badge */}
      {showCount && count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-gray-900 text-white text-xs font-bold rounded-full px-1">
          {count > 999 ? `${Math.floor(count / 1000)}k` : count}
        </span>
      )}
    </button>
  );
};

ReactionButton.propTypes = {
  emoji: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  count: PropTypes.number,
  onClick: PropTypes.func,
  showCount: PropTypes.bool,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

/**
 * ReactionBar - Row of all reaction buttons
 */
export const ReactionBar = ({
  onReact,
  counts = {},
  showCounts = false,
  disabled = false,
  className = '',
}) => {
  const REACTIONS = [
    { type: 'fire', emoji: '🔥' },
    { type: 'heart', emoji: '❤️' },
    { type: 'clap', emoji: '👏' },
    { type: 'mindblown', emoji: '🤯' },
    { type: 'rocket', emoji: '🚀' },
    { type: 'hundred', emoji: '💯' },
  ];

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {REACTIONS.map(({ type, emoji }) => (
        <ReactionButton
          key={type}
          type={type}
          emoji={emoji}
          count={counts[type] || 0}
          onClick={onReact}
          showCount={showCounts}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

ReactionBar.propTypes = {
  onReact: PropTypes.func,
  counts: PropTypes.object,
  showCounts: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ReactionButton;

