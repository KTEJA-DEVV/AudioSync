import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/helpers';

const AdminStatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  sparklineData,
  className,
  color = 'primary',
}) => {
  const isPositiveTrend = trend > 0;
  const isNegativeTrend = trend < 0;

  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('p-2.5 rounded-lg', colorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>

        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              isPositiveTrend && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              isNegativeTrend && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              !isPositiveTrend && !isNegativeTrend && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {isPositiveTrend && <ArrowUpIcon className="w-3 h-3" />}
            {isNegativeTrend && <ArrowDownIcon className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {trendLabel && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{trendLabel}</p>
      )}

      {/* Simple sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4 h-12">
          <Sparkline data={sparklineData} color={color} />
        </div>
      )}
    </div>
  );
};

const Sparkline = ({ data, color }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 48;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const colorMap = {
    primary: '#8b5cf6',
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    amber: '#f59e0b',
    red: '#ef4444',
  };

  const strokeColor = colorMap[color] || colorMap.primary;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AdminStatCard;

