import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

/**
 * VotingRoundCard - Display for live voting rounds
 */
const VotingRoundCard = ({
  round,
  onVote,
  userVote = null,
  disabled = false,
  showResults = false,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);

  const {
    roundNumber,
    question,
    options = [],
    status,
    startedAt,
    duration = 30,
    winner,
  } = round || {};

  // Calculate time left
  useEffect(() => {
    if (status !== 'active' || !startedAt) {
      setTimeLeft(0);
      return;
    }

    const endTime = new Date(startedAt).getTime() + duration * 1000;
    
    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        setIsRevealing(true);
        setTimeout(() => setIsRevealing(false), 2000);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt, duration]);

  // Calculate total votes and percentages
  const { totalVotes, percentages } = useMemo(() => {
    const total = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    const percs = {};
    
    options.forEach(opt => {
      percs[opt.id] = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
    });
    
    return { totalVotes: total, percentages: percs };
  }, [options]);

  // Handle vote
  const handleVote = (optionId) => {
    if (disabled || userVote || status !== 'active') return;
    setSelectedOption(optionId);
    onVote?.(optionId);
  };

  // Timer color based on time left
  const getTimerColor = () => {
    if (timeLeft <= 5) return 'text-red-500';
    if (timeLeft <= 10) return 'text-orange-500';
    return 'text-gray-600';
  };

  if (!round) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <p>No active voting round</p>
      </div>
    );
  }

  const isEnded = status === 'ended';
  const canVote = status === 'active' && !userVote && !disabled;
  const myVote = userVote || selectedOption;

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden',
      isRevealing && 'animate-pulse',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            Round {roundNumber}
          </span>
          {status === 'active' && (
            <div className={cn('flex items-center gap-1 font-mono text-sm font-bold', getTimerColor())}>
              <ClockIcon className="w-4 h-4" />
              {timeLeft}s
            </div>
          )}
          {isEnded && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              Ended
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      {question && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white">{question}</h3>
        </div>
      )}

      {/* Options */}
      <div className="p-4 space-y-3">
        {options.map((option) => {
          const percentage = percentages[option.id] || 0;
          const isWinner = winner === option.id;
          const isMyVote = myVote === option.id;
          const shouldShowResults = showResults || isEnded || myVote;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!canVote}
              className={cn(
                'relative w-full text-left rounded-xl overflow-hidden transition-all',
                'border-2',
                canVote && 'hover:border-indigo-400 hover:shadow-md cursor-pointer',
                !canVote && 'cursor-default',
                isMyVote ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700',
                isWinner && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
              )}
            >
              {/* Progress bar background */}
              {shouldShowResults && (
                <div
                  className={cn(
                    'absolute inset-0 transition-all duration-500',
                    isWinner ? 'bg-emerald-200 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-700/50'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Content */}
              <div className="relative px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Vote indicator */}
                  {isMyVote && (
                    <CheckCircleIcon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  )}
                  {isWinner && !isMyVote && (
                    <span className="text-lg">🏆</span>
                  )}

                  {/* Label */}
                  <span className={cn(
                    'font-medium',
                    isMyVote ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'
                  )}>
                    {option.label}
                  </span>
                </div>

                {/* Percentage/votes */}
                {shouldShowResults && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn(
                      'font-bold',
                      isWinner ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'
                    )}>
                      {percentage}%
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({option.votes || 0})
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </span>
          {myVote && (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              ✓ You voted
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

VotingRoundCard.propTypes = {
  round: PropTypes.shape({
    roundNumber: PropTypes.number,
    question: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
        votes: PropTypes.number,
      })
    ),
    status: PropTypes.string,
    startedAt: PropTypes.string,
    duration: PropTypes.number,
    winner: PropTypes.string,
  }),
  onVote: PropTypes.func,
  userVote: PropTypes.string,
  disabled: PropTypes.bool,
  showResults: PropTypes.bool,
  className: PropTypes.string,
};

export default VotingRoundCard;

