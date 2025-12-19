import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

const levelColors = {
  bronze: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    gradient: 'from-amber-500 to-amber-700',
    hex: '#CD7F32',
  },
  silver: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-400',
    gradient: 'from-gray-400 to-gray-600',
    hex: '#C0C0C0',
  },
  gold: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-400',
    gradient: 'from-yellow-400 to-yellow-600',
    hex: '#FFD700',
  },
  platinum: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-400',
    gradient: 'from-slate-400 to-slate-600',
    hex: '#E5E4E2',
  },
  diamond: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-400',
    gradient: 'from-cyan-400 to-cyan-600',
    hex: '#B9F2FF',
  },
};

const levelThresholds = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 10000,
};

const ReputationBadge = ({ 
  level = 'bronze', 
  score = 0, 
  showScore = false,
  showProgress = false,
  size = 'md',
  className = '',
}) => {
  const colors = levelColors[level] || levelColors.bronze;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Calculate progress to next level
  const getProgress = () => {
    const levels = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = levels.indexOf(level);
    
    if (currentIndex === levels.length - 1) {
      return { progress: 100, nextLevel: null, needed: 0 };
    }
    
    const nextLevel = levels[currentIndex + 1];
    const currentThreshold = levelThresholds[level];
    const nextThreshold = levelThresholds[nextLevel];
    const range = nextThreshold - currentThreshold;
    const progress = Math.min(((score - currentThreshold) / range) * 100, 100);
    const needed = nextThreshold - score;
    
    return { progress, nextLevel, needed };
  };

  const { progress, nextLevel, needed } = getProgress();

  return (
    <div className={cn('inline-flex flex-col', className)}>
      {/* Badge */}
      <div 
        className={cn(
          'inline-flex items-center font-medium rounded-full border',
          colors.bg,
          colors.text,
          colors.border,
          sizeClasses[size]
        )}
        title={`${level.charAt(0).toUpperCase() + level.slice(1)} Level - ${score} reputation points`}
      >
        {/* Level icon */}
        <span className="mr-1.5">
          {level === 'bronze' && '🥉'}
          {level === 'silver' && '🥈'}
          {level === 'gold' && '🥇'}
          {level === 'platinum' && '💠'}
          {level === 'diamond' && '💎'}
        </span>
        
        <span className="capitalize">{level}</span>
        
        {showScore && (
          <span className="ml-1.5 opacity-75">({score.toLocaleString()})</span>
        )}
      </div>

      {/* Progress bar to next level */}
      {showProgress && nextLevel && (
        <div className="mt-2 w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{score.toLocaleString()} pts</span>
            <span>{needed.toLocaleString()} to {nextLevel}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

ReputationBadge.propTypes = {
  level: PropTypes.oneOf(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  score: PropTypes.number,
  showScore: PropTypes.bool,
  showProgress: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default ReputationBadge;

