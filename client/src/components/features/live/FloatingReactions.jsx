import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';

// Emoji mapping
const REACTION_EMOJIS = {
  fire: '🔥',
  heart: '❤️',
  clap: '👏',
  mindblown: '🤯',
  rocket: '🚀',
  hundred: '💯',
};

/**
 * Single floating emoji animation
 */
const FloatingEmoji = ({ emoji, x, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="absolute bottom-0 animate-float-up pointer-events-none"
      style={{
        left: `${x}%`,
        fontSize: `${24 + Math.random() * 12}px`,
      }}
    >
      {emoji}
    </div>
  );
};

/**
 * FloatingReactions - Container for floating emoji animations
 * Spawns emojis that float up and fade out
 */
const FloatingReactions = ({
  reactions = [],
  maxVisible = 30,
  className = '',
}) => {
  const [visibleReactions, setVisibleReactions] = useState([]);
  const idCounterRef = useRef(0);

  // Add new reactions
  useEffect(() => {
    if (reactions.length === 0) return;

    const newReactions = reactions.map((reaction, index) => ({
      id: `${idCounterRef.current++}-${index}`,
      emoji: REACTION_EMOJIS[reaction.type] || reaction.emoji || '❤️',
      x: 10 + Math.random() * 80, // Random x position (10-90%)
    }));

    setVisibleReactions(prev => [...prev, ...newReactions].slice(-maxVisible));
  }, [reactions, maxVisible]);

  // Remove completed animation
  const handleComplete = useCallback((id) => {
    setVisibleReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <div className={cn(
      'absolute inset-0 overflow-hidden pointer-events-none z-20',
      className
    )}>
      {visibleReactions.map((reaction) => (
        <FloatingEmoji
          key={reaction.id}
          emoji={reaction.emoji}
          x={reaction.x}
          onComplete={() => handleComplete(reaction.id)}
        />
      ))}
    </div>
  );
};

FloatingReactions.propTypes = {
  reactions: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      emoji: PropTypes.string,
    })
  ),
  maxVisible: PropTypes.number,
  className: PropTypes.string,
};

/**
 * Hook to manage floating reactions with socket integration
 */
export const useFloatingReactions = () => {
  const [reactions, setReactions] = useState([]);
  const timeoutRef = useRef(null);

  // Add a reaction (from socket event)
  const addReaction = useCallback((reaction) => {
    setReactions(prev => [...prev, reaction]);

    // Clear queue after animations complete
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setReactions([]);
    }, 2500);
  }, []);

  // Add burst of reactions
  const addBurst = useCallback((type, count = 5) => {
    const burstReactions = Array.from({ length: count }, () => ({
      type,
      emoji: REACTION_EMOJIS[type],
    }));
    setReactions(prev => [...prev, ...burstReactions]);
  }, []);

  return { reactions, addReaction, addBurst };
};

export default FloatingReactions;

