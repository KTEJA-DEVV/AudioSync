import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import { ScaleIcon } from '@heroicons/react/24/solid';

/**
 * VoteWeightIndicator - Shows vote weight multiplier
 */
const VoteWeightIndicator = ({
  weight = 1,
  showTooltip = true,
  size = 'medium',
  className = '',
}) => {
  const getColor = () => {
    if (weight >= 4) return 'text-purple-600 bg-purple-100';
    if (weight >= 3) return 'text-yellow-600 bg-yellow-100';
    if (weight >= 2) return 'text-emerald-600 bg-emerald-100';
    if (weight > 1) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const sizeClasses = {
    small: 'text-xs px-1.5 py-0.5',
    medium: 'text-sm px-2 py-1',
    large: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  const tooltipText = `Your votes count ${weight}x. Higher reputation = more voting power (max 5x).`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold',
        getColor(),
        sizeClasses[size],
        className
      )}
      title={showTooltip ? tooltipText : undefined}
    >
      <ScaleIcon className={iconSizes[size]} />
      <span>x{weight.toFixed(1)}</span>
    </div>
  );
};

VoteWeightIndicator.propTypes = {
  weight: PropTypes.number,
  showTooltip: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

export default VoteWeightIndicator;

