import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

const WaveformVisualizer = ({
  waveformData = [],
  progress = 0,
  duration = 0,
  onSeek,
  className = '',
  barColor = '#6366f1',
  playedColor = '#a5b4fc',
  backgroundColor = 'transparent',
  barWidth = 3,
  barGap = 2,
  barRadius = 2,
  height = 60,
  interactive = true,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Generate default waveform if none provided
  const data = waveformData.length > 0 ? waveformData : Array(50).fill(0.5).map(() => 0.2 + Math.random() * 0.6);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerWidth === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    canvas.width = containerWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, height);

    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, containerWidth, height);
    }

    const totalBars = Math.floor(containerWidth / (barWidth + barGap));
    const samplesPerBar = Math.ceil(data.length / totalBars);
    const progressPosition = (progress / 100) * containerWidth;

    for (let i = 0; i < totalBars; i++) {
      const startSample = i * samplesPerBar;
      const endSample = Math.min(startSample + samplesPerBar, data.length);
      
      // Get average value for this bar
      let sum = 0;
      for (let j = startSample; j < endSample; j++) {
        sum += data[j] || 0;
      }
      const avgValue = sum / (endSample - startSample) || 0.1;
      
      const x = i * (barWidth + barGap);
      const barHeight = Math.max(4, avgValue * (height - 4));
      const y = (height - barHeight) / 2;

      // Determine color based on progress
      ctx.fillStyle = x < progressPosition ? playedColor : barColor;
      
      // Draw rounded bar
      if (barRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    // Draw hover indicator
    if (isHovering && interactive) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(hoverPosition - 1, 0, 2, height);
    }
  }, [data, progress, containerWidth, height, barColor, playedColor, backgroundColor, barWidth, barGap, barRadius, isHovering, hoverPosition, interactive]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || !interactive) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverPosition(e.clientX - rect.left);
  }, [interactive]);

  const handleClick = useCallback((e) => {
    if (!containerRef.current || !onSeek || !interactive) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    onSeek(clickPosition * duration);
  }, [duration, onSeek, interactive]);

  const formatTime = (position) => {
    const time = (position / containerWidth) * duration;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full cursor-pointer',
        !interactive && 'cursor-default',
        className
      )}
      style={{ height }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Hover time tooltip */}
      {isHovering && interactive && duration > 0 && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
          style={{ left: hoverPosition }}
        >
          {formatTime(hoverPosition)}
        </div>
      )}
    </div>
  );
};

WaveformVisualizer.propTypes = {
  waveformData: PropTypes.arrayOf(PropTypes.number),
  progress: PropTypes.number,
  duration: PropTypes.number,
  onSeek: PropTypes.func,
  className: PropTypes.string,
  barColor: PropTypes.string,
  playedColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  barWidth: PropTypes.number,
  barGap: PropTypes.number,
  barRadius: PropTypes.number,
  height: PropTypes.number,
  interactive: PropTypes.bool,
};

export default WaveformVisualizer;

