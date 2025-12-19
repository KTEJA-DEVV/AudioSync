import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  StarIcon,
} from '@heroicons/react/24/solid';

// Currency icons and colors
const CURRENCY_CONFIG = {
  reputation: {
    icon: StarIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Reputation',
  },
  tokens: {
    icon: SparklesIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Tokens',
  },
  usd: {
    icon: CurrencyDollarIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    label: 'USD',
  },
};

/**
 * EarningsCard - Display earnings amount with trend
 */
const EarningsCard = ({
  amount = 0,
  currency = 'reputation',
  label,
  trend,
  trendValue,
  onClick,
  size = 'medium',
  className = '',
}) => {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.reputation;
  const Icon = config.icon;

  const formatAmount = () => {
    if (currency === 'usd') {
      return `$${amount.toFixed(2)}`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  const amountSizes = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-4xl',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        sizeClasses[size],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">
          {label || config.label}
        </span>
        <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
      </div>

      {/* Amount */}
      <div className={cn('font-bold', config.color, amountSizes[size])}>
        {formatAmount()}
      </div>

      {/* Trend */}
      {trend && trendValue !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-sm">
          {trend === 'up' ? (
            <>
              <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600">+{trendValue}</span>
            </>
          ) : trend === 'down' ? (
            <>
              <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
              <span className="text-red-600">-{Math.abs(trendValue)}</span>
            </>
          ) : (
            <span className="text-gray-500">No change</span>
          )}
          <span className="text-gray-400 ml-1">this week</span>
        </div>
      )}
    </div>
  );
};

EarningsCard.propTypes = {
  amount: PropTypes.number,
  currency: PropTypes.oneOf(['reputation', 'tokens', 'usd']),
  label: PropTypes.string,
  trend: PropTypes.oneOf(['up', 'down', 'neutral']),
  trendValue: PropTypes.number,
  onClick: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

export default EarningsCard;

