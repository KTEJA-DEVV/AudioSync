import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const Waveform = ({ audioRef, isPlaying, currentTime, duration, onSeek, height = 60 }) => {
  const canvasRef = useRef(null);
  const [waveformData, setWaveformData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Generate random waveform data (in a real app, this would come from your audio analysis)
  useEffect(() => {
    const generateWaveform = () => {
      const points = [];
      const pointCount = 200;
      
      for (let i = 0; i < pointCount; i++) {
        points.push({
          x: i / pointCount,
          y: 0.2 + Math.random() * 0.8, // Random height between 0.2 and 1
          active: false
        });
      }
      
      setWaveformData(points);
    };

    generateWaveform();
  }, []);

  // Draw waveform on canvas
  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2; // For retina displays
    const height = canvas.height = canvas.offsetHeight * 2;
    const centerY = height / 2;
    const barWidth = 2;
    const gap = 1;
    const barCount = waveformData.length;
    const totalBarWidth = barWidth + gap;
    const startX = (width - (barCount * totalBarWidth - gap)) / 2;

    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform bars
    waveformData.forEach((point, i) => {
      const barHeight = point.y * (height * 0.7);
      const x = startX + i * totalBarWidth;
      const y = centerY - barHeight / 2;
      
      // Determine if this part of the waveform has been played
      const progress = currentTime / duration;
      const isPlayed = i / barCount < progress;
      
      // Draw bar
      ctx.fillStyle = isPlayed ? '#5B8CFF' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [waveformData, currentTime, duration]);

  // Handle seek on click or drag
  const handleInteraction = (e) => {
    if (!audioRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.min(Math.max(x / rect.width, 0), 1);
    
    if (onSeek) {
      onSeek(progress * duration);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full relative cursor-pointer"
      style={{ height: `${height}px` }}
      onClick={handleInteraction}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={(e) => isDragging && handleInteraction(e)}
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          transform: 'scaleY(0.8)',
          transformOrigin: 'center',
          transition: 'all 0.2s ease-out'
        }}
      />
      
      {/* Playhead indicator */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-primary"
        style={{
          left: `${(currentTime / duration) * 100}%`,
          transform: 'translateX(-50%)',
          height: '100%',
          transition: isDragging ? 'none' : 'left 0.1s linear'
        }}
      />
      
      {/* Hover effect */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-20 bg-primary transition-opacity"
        style={{
          width: `${(currentTime / duration) * 100}%`,
          transition: isDragging ? 'none' : 'width 0.1s linear, opacity 0.2s ease'
        }}
      />
    </div>
  );
};

export default Waveform;
