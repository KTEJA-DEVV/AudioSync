import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

// Category color mapping
const CATEGORY_COLORS = {
  positive: '#34d399', // emerald-400
  negative: '#f87171', // red-400
  technical: '#818cf8', // indigo-400
  mood: '#c084fc', // purple-400
  genre: '#fbbf24', // amber-400
  element: '#60a5fa', // blue-400
  general: '#d1d5db', // gray-300
};

// Simple word placement algorithm (spiral layout)
const calculateWordPositions = (words, width, height) => {
  if (!words.length || !width || !height) return [];

  const positions = [];
  const placed = [];
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Calculate font sizes based on counts
  const maxCount = Math.max(...words.map(w => w.count), 1);
  const minCount = Math.min(...words.map(w => w.count), 1);
  const countRange = maxCount - minCount || 1;

  // Sort by count (largest first for better placement)
  const sortedWords = [...words].sort((a, b) => b.count - a.count);

  for (const word of sortedWords) {
    // Calculate font size (14-48px range)
    const normalizedCount = (word.count - minCount) / countRange;
    const fontSize = Math.round(14 + normalizedCount * 34);
    
    // Estimate word dimensions
    const charWidth = fontSize * 0.6;
    const wordWidth = word.word.length * charWidth;
    const wordHeight = fontSize * 1.2;

    // Spiral placement
    let angle = 0;
    let radius = 0;
    let attempts = 0;
    let placed_successfully = false;
    let x, y;

    while (!placed_successfully && attempts < 500) {
      x = centerX + radius * Math.cos(angle);
      y = centerY + radius * Math.sin(angle);

      // Check bounds
      const inBounds = 
        x - wordWidth / 2 > 10 &&
        x + wordWidth / 2 < width - 10 &&
        y - wordHeight / 2 > 10 &&
        y + wordHeight / 2 < height - 10;

      // Check overlaps
      let overlaps = false;
      if (inBounds) {
        for (const p of placed) {
          const dx = Math.abs(x - p.x);
          const dy = Math.abs(y - p.y);
          const minDx = (wordWidth + p.width) / 2 + 5;
          const minDy = (wordHeight + p.height) / 2 + 2;
          
          if (dx < minDx && dy < minDy) {
            overlaps = true;
            break;
          }
        }
      }

      if (inBounds && !overlaps) {
        placed_successfully = true;
      } else {
        angle += 0.5;
        radius += 0.5;
        attempts++;
      }
    }

    if (placed_successfully) {
      const position = {
        word: word.word,
        x,
        y,
        fontSize,
        width: wordWidth,
        height: wordHeight,
        count: word.count,
        category: word.category || 'general',
        color: CATEGORY_COLORS[word.category] || CATEGORY_COLORS.general,
      };
      positions.push(position);
      placed.push(position);
    }
  }

  return positions;
};

const WordCloud = ({
  words = [],
  width = 800,
  height = 450,
  onWordClick = null,
  className = '',
  animated = true,
  showTooltip = true,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);
  const previousPositionsRef = useRef([]);

  // Calculate word positions
  const wordPositions = useMemo(() => {
    return calculateWordPositions(words, dimensions.width, dimensions.height);
  }, [words, dimensions.width, dimensions.height]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Draw canvas
  const draw = useCallback((positions, progress = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with DPR
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw words
    positions.forEach((pos, index) => {
      const prevPos = previousPositionsRef.current.find(p => p.word === pos.word);
      
      let x = pos.x;
      let y = pos.y;
      let fontSize = pos.fontSize;
      let opacity = 1;

      // Animate from previous position
      if (animated && prevPos && progress < 1) {
        x = prevPos.x + (pos.x - prevPos.x) * progress;
        y = prevPos.y + (pos.y - prevPos.y) * progress;
        fontSize = prevPos.fontSize + (pos.fontSize - prevPos.fontSize) * progress;
      } else if (animated && !prevPos) {
        // Fade in new words
        opacity = progress;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `600 ${Math.round(fontSize)}px "Inter", system-ui, sans-serif`;
      ctx.fillStyle = pos.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Add subtle shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(pos.word, x, y);
      ctx.restore();
    });

    // Update previous positions for next animation
    if (progress >= 1) {
      previousPositionsRef.current = positions;
    }
  }, [dimensions, animated]);

  // Animate word positions
  useEffect(() => {
    if (!animated) {
      draw(wordPositions, 1);
      return;
    }

    let startTime = null;
    const duration = 300; // Animation duration in ms

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      draw(wordPositions, easedProgress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [wordPositions, draw, animated]);

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback((e) => {
    if (!showTooltip) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find word under cursor
    const hoveredWordData = wordPositions.find(pos => {
      const dx = Math.abs(x - pos.x);
      const dy = Math.abs(y - pos.y);
      return dx < pos.width / 2 && dy < pos.height / 2;
    });

    if (hoveredWordData) {
      setHoveredWord(hoveredWordData);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredWord(null);
    }
  }, [wordPositions, showTooltip]);

  // Handle click
  const handleClick = useCallback((e) => {
    if (!onWordClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedWord = wordPositions.find(pos => {
      const dx = Math.abs(x - pos.x);
      const dy = Math.abs(y - pos.y);
      return dx < pos.width / 2 && dy < pos.height / 2;
    });

    if (clickedWord) {
      onWordClick(clickedWord);
    }
  }, [wordPositions, onWordClick]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden',
        className
      )}
      style={{ minHeight: 200 }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: onWordClick ? 'pointer' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredWord(null)}
        onClick={handleClick}
      />

      {/* Tooltip */}
      {showTooltip && hoveredWord && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 30,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold">{hoveredWord.word}</div>
          <div className="text-gray-400">
            {hoveredWord.count} vote{hoveredWord.count !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Empty state */}
      {words.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p>No feedback yet</p>
            <p className="text-sm">Submit words to see the cloud</p>
          </div>
        </div>
      )}
    </div>
  );
};

WordCloud.propTypes = {
  words: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      category: PropTypes.string,
    })
  ),
  width: PropTypes.number,
  height: PropTypes.number,
  onWordClick: PropTypes.func,
  className: PropTypes.string,
  animated: PropTypes.bool,
  showTooltip: PropTypes.bool,
};

export default WordCloud;

