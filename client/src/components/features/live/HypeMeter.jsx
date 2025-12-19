import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import { FireIcon } from '@heroicons/react/24/solid';

/**
 * HypeMeter - Visual gauge showing engagement level 0-100
 * Color gradient from gray to rainbow at max
 */
const HypeMeter = ({
  level = 0,
  showNumber = true,
  showLabel = true,
  size = 'medium',
  orientation = 'vertical',
  animated = true,
  className = '',
}) => {
  const [displayLevel, setDisplayLevel] = useState(level);
  const [particles, setParticles] = useState([]);
  const particleIdRef = useRef(0);

  // Animate level changes
  useEffect(() => {
    if (!animated) {
      setDisplayLevel(level);
      return;
    }

    const diff = level - displayLevel;
    if (Math.abs(diff) < 1) {
      setDisplayLevel(level);
      return;
    }

    const step = diff > 0 ? 1 : -1;
    const timer = setTimeout(() => {
      setDisplayLevel(prev => prev + step);
    }, 20);

    return () => clearTimeout(timer);
  }, [level, displayLevel, animated]);

  // Spawn particles at high levels
  useEffect(() => {
    if (displayLevel < 60) return;

    const spawnRate = displayLevel >= 90 ? 200 : displayLevel >= 75 ? 400 : 800;
    
    const interval = setInterval(() => {
      const id = particleIdRef.current++;
      const newParticle = {
        id,
        x: Math.random() * 100,
        size: 4 + Math.random() * 4,
        duration: 1 + Math.random() * 0.5,
      };
      
      setParticles(prev => [...prev.slice(-10), newParticle]);
      
      // Remove particle after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== id));
      }, newParticle.duration * 1000);
    }, spawnRate);

    return () => clearInterval(interval);
  }, [displayLevel]);

  // Get gradient color based on level
  const getGradient = () => {
    if (displayLevel >= 100) {
      return 'bg-gradient-to-t from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500';
    }
    if (displayLevel >= 80) {
      return 'bg-gradient-to-t from-orange-500 to-red-500';
    }
    if (displayLevel >= 50) {
      return 'bg-gradient-to-t from-yellow-500 to-orange-500';
    }
    if (displayLevel >= 20) {
      return 'bg-gradient-to-t from-gray-400 to-yellow-500';
    }
    return 'bg-gray-400';
  };

  // Get label based on level
  const getLabel = () => {
    if (displayLevel >= 100) return 'MAX HYPE!';
    if (displayLevel >= 80) return 'On Fire!';
    if (displayLevel >= 50) return 'Getting Hot';
    if (displayLevel >= 20) return 'Warming Up';
    return 'Chill';
  };

  // Size configurations
  const sizeConfig = {
    small: { width: 'w-6', height: 'h-32', text: 'text-xs' },
    medium: { width: 'w-8', height: 'h-48', text: 'text-sm' },
    large: { width: 'w-12', height: 'h-64', text: 'text-base' },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {showLabel && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Hype Level</span>
            <span className={cn('font-bold', config.text, displayLevel >= 80 && 'text-red-500')}>
              {getLabel()}
            </span>
          </div>
        )}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
              getGradient(),
              displayLevel >= 80 && 'animate-pulse'
            )}
            style={{ width: `${displayLevel}%` }}
          />
        </div>
        {showNumber && (
          <div className="text-right text-xs text-gray-500">
            {Math.round(displayLevel)}%
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Fire icon */}
      <div className={cn(
        'relative p-2 rounded-full transition-all duration-300',
        displayLevel >= 80 && 'bg-red-500/20 animate-pulse',
        displayLevel >= 100 && 'animate-bounce'
      )}>
        <FireIcon className={cn(
          'w-6 h-6 transition-colors duration-300',
          displayLevel >= 80 ? 'text-red-500' :
          displayLevel >= 50 ? 'text-orange-500' :
          displayLevel >= 20 ? 'text-yellow-500' : 'text-gray-400'
        )} />
      </div>

      {/* Meter bar */}
      <div className={cn(
        'relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700',
        config.width,
        config.height
      )}>
        {/* Fill */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300',
            getGradient(),
            displayLevel >= 100 && 'animate-pulse'
          )}
          style={{ height: `${displayLevel}%` }}
        />

        {/* Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute animate-float-up pointer-events-none"
            style={{
              left: `${particle.x}%`,
              bottom: `${displayLevel}%`,
              width: particle.size,
              height: particle.size,
              animationDuration: `${particle.duration}s`,
            }}
          >
            <span className="text-xs">✨</span>
          </div>
        ))}

        {/* Level markers */}
        <div className="absolute inset-x-0 h-px bg-white/30" style={{ bottom: '25%' }} />
        <div className="absolute inset-x-0 h-px bg-white/30" style={{ bottom: '50%' }} />
        <div className="absolute inset-x-0 h-px bg-white/30" style={{ bottom: '75%' }} />
      </div>

      {/* Number display */}
      {showNumber && (
        <div className={cn(
          'font-bold tabular-nums',
          config.text,
          displayLevel >= 80 ? 'text-red-500' :
          displayLevel >= 50 ? 'text-orange-500' :
          displayLevel >= 20 ? 'text-yellow-500' : 'text-gray-500'
        )}>
          {Math.round(displayLevel)}
        </div>
      )}

      {/* Label */}
      {showLabel && (
        <div className={cn(
          'text-xs font-medium text-center max-w-[60px]',
          displayLevel >= 80 ? 'text-red-500' :
          displayLevel >= 50 ? 'text-orange-500' : 'text-gray-500'
        )}>
          {getLabel()}
        </div>
      )}
    </div>
  );
};

HypeMeter.propTypes = {
  level: PropTypes.number,
  showNumber: PropTypes.bool,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  orientation: PropTypes.oneOf(['vertical', 'horizontal']),
  animated: PropTypes.bool,
  className: PropTypes.string,
};

export default HypeMeter;

