import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn, formatRelativeTime } from '../../../utils/helpers';
import {
  StarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/solid';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Badge icon mapping
const BADGE_ICONS = {
  subscriber: StarIcon,
  moderator: ShieldCheckIcon,
  creator: SparklesIcon,
  vip: CheckBadgeIcon,
  verified: CheckBadgeIcon,
};

const BADGE_COLORS = {
  subscriber: 'text-yellow-500',
  moderator: 'text-green-500',
  creator: 'text-purple-500',
  vip: 'text-pink-500',
  verified: 'text-blue-500',
};

/**
 * Single chat message component
 */
const ChatMessage = ({ message, onHighlight, showTimestamp = false }) => {
  const {
    user,
    message: text,
    type,
    color,
    badges = [],
    isDeleted,
    createdAt,
    replyTo,
  } = message;

  const isSystem = type === 'system';
  const isHighlighted = type === 'highlighted';
  const isHost = type === 'host';

  if (isSystem) {
    return (
      <div className="text-center py-2 px-4">
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        isHighlighted && 'bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-500',
        isHost && 'bg-purple-50 dark:bg-purple-900/20'
      )}
    >
      {/* Reply indicator */}
      {replyTo && (
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <span>↱ Replying to</span>
          <span className="font-medium">{replyTo.user?.username}</span>
        </div>
      )}

      <div className="flex items-start gap-2">
        {/* Avatar */}
        <img
          src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
          alt=""
          className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Username row */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Badges */}
            {badges.map((badge) => {
              const Icon = BADGE_ICONS[badge];
              return Icon ? (
                <Icon
                  key={badge}
                  className={cn('w-4 h-4', BADGE_COLORS[badge])}
                  title={badge}
                />
              ) : null;
            })}

            {/* Username */}
            <span
              className="font-semibold text-sm"
              style={{ color: color || '#6366f1' }}
            >
              {user?.displayName || user?.username || 'Anonymous'}
            </span>

            {/* Timestamp on hover */}
            {showTimestamp && (
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatRelativeTime(createdAt)}
              </span>
            )}
          </div>

          {/* Message text */}
          <p className={cn(
            'text-sm break-words',
            isDeleted ? 'text-gray-400 italic' : 'text-gray-700 dark:text-gray-300'
          )}>
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * ChatFeed - Scrollable chat messages with auto-scroll
 */
const ChatFeed = ({
  messages = [],
  isLoading = false,
  onLoadMore,
  onHighlight,
  className = '',
}) => {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // Check if scrolled to bottom
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const threshold = 100;
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(isBottom);

    if (isBottom) {
      setNewMessageCount(0);
    }
  }, []);

  // Auto-scroll when new messages arrive (if at bottom)
  useEffect(() => {
    if (isAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (!isAtBottom) {
      setNewMessageCount(prev => prev + 1);
    }
  }, [messages.length, isAtBottom]);

  // Scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessageCount(0);
  };

  // Handle scroll
  const handleScroll = () => {
    checkScrollPosition();
    
    // Load more when scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop === 0 && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      {/* Messages container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say something!</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id || msg._id}
            message={msg}
            onHighlight={onHighlight}
            showTimestamp
          />
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {!isAtBottom && newMessageCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-1 transition-colors"
        >
          <ChevronDownIcon className="w-4 h-4" />
          {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
};

ChatFeed.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      user: PropTypes.object,
      message: PropTypes.string,
      type: PropTypes.string,
      color: PropTypes.string,
      badges: PropTypes.array,
      createdAt: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  onLoadMore: PropTypes.func,
  onHighlight: PropTypes.func,
  className: PropTypes.string,
};

export default ChatFeed;

