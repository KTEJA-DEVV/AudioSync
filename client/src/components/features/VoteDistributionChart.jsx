import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

const VoteDistributionChart = ({
  options = [],
  showPercentages = true,
  showVoteCounts = true,
  highlightWinner = true,
  animated = true,
  className = '',
}) => {
  const [animatedWidths, setAnimatedWidths] = useState(options.map(() => 0));

  // Calculate total votes
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);

  // Get percentage for an option
  const getPercentage = (votes) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  // Find winner (highest votes)
  const maxVotes = Math.max(...options.map(opt => opt.votes || 0));
  const winnerIndex = options.findIndex(opt => opt.votes === maxVotes);

  // Animate on mount and when options change
  useEffect(() => {
    if (!animated) {
      setAnimatedWidths(options.map(opt => getPercentage(opt.votes || 0)));
      return;
    }

    // Start with 0 widths
    setAnimatedWidths(options.map(() => 0));

    // Animate to final widths
    const timer = setTimeout(() => {
      setAnimatedWidths(options.map(opt => getPercentage(opt.votes || 0)));
    }, 100);

    return () => clearTimeout(timer);
  }, [options, animated, totalVotes]);

  // Color palette for bars
  const barColors = [
    'bg-indigo-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-pink-500',
  ];

  if (options.length === 0) {
    return (
      <div className={cn('text-center text-gray-500 py-4', className)}>
        No options to display
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {options.map((option, index) => {
        const percentage = getPercentage(option.votes || 0);
        const isWinner = highlightWinner && index === winnerIndex && maxVotes > 0;
        const colorClass = barColors[index % barColors.length];

        return (
          <div key={option.optionId || option.id || index} className="space-y-1">
            {/* Label row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium',
                  isWinner && 'text-indigo-600 dark:text-indigo-400'
                )}>
                  {option.label}
                </span>
                {isWinner && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    Leading
                  </span>
                )}
                {option.hasVoted && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Your vote
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                {showVoteCounts && (
                  <span>{option.votes || 0} vote{(option.votes || 0) !== 1 ? 's' : ''}</span>
                )}
                {showPercentages && (
                  <span className="font-medium w-12 text-right">{percentage}%</span>
                )}
              </div>
            </div>

            {/* Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  colorClass,
                  isWinner && 'ring-2 ring-offset-2 ring-indigo-500'
                )}
                style={{ width: `${animatedWidths[index]}%` }}
              />
            </div>

            {/* Optional description */}
            {option.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </p>
            )}
          </div>
        );
      })}

      {/* Total votes footer */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Total: {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

VoteDistributionChart.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      optionId: PropTypes.string,
      label: PropTypes.string.isRequired,
      votes: PropTypes.number,
      hasVoted: PropTypes.bool,
      description: PropTypes.string,
    })
  ),
  showPercentages: PropTypes.bool,
  showVoteCounts: PropTypes.bool,
  highlightWinner: PropTypes.bool,
  animated: PropTypes.bool,
  className: PropTypes.string,
};

export default VoteDistributionChart;

