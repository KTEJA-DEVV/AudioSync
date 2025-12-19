import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/helpers';

// Color palette for pie chart
const CHART_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
  '#a855f7', // violet
];

const OwnershipChart = ({
  distribution = [],
  totalShares = 10000,
  size = 200,
  showLegend = true,
  interactive = true,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Calculate percentages and create chart data
  const chartData = useMemo(() => {
    return distribution.map((entry, index) => {
      const percentage = entry.percentage || (entry.shares / totalShares) * 100;
      return {
        ...entry,
        percentage: percentage,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [distribution, totalShares]);

  // Calculate SVG pie chart paths
  const pieSlices = useMemo(() => {
    const slices = [];
    let currentAngle = -90; // Start from top

    chartData.forEach((data, index) => {
      const angle = (data.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calculate arc path
      const radius = size / 2 - 10;
      const centerX = size / 2;
      const centerY = size / 2;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = `
        M ${centerX} ${centerY}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      slices.push({
        ...data,
        path,
        index,
      });

      currentAngle = endAngle;
    });

    return slices;
  }, [chartData, size]);

  if (!distribution || distribution.length === 0) {
    return (
      <div className={cn('text-center py-6 text-gray-500', className)}>
        No ownership data available
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl', className)}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-0">
            {pieSlices.map((slice, index) => (
              <path
                key={index}
                d={slice.path}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
                className={cn(
                  'transition-all duration-200',
                  interactive && 'cursor-pointer',
                  hoveredIndex === index && 'opacity-80'
                )}
                style={{
                  transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
                onMouseEnter={() => interactive && setHoveredIndex(index)}
                onMouseLeave={() => interactive && setHoveredIndex(null)}
              />
            ))}
            {/* Center hole for donut effect */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 4}
              fill="white"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hoveredIndex !== null ? (
              <>
                <span className="text-xl font-bold text-gray-900">
                  {chartData[hoveredIndex].percentage.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 text-center px-2 truncate max-w-[80px]">
                  {chartData[hoveredIndex].user?.displayName || 
                   chartData[hoveredIndex].user?.username}
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-gray-900">
                  {distribution.length}
                </span>
                <span className="text-xs text-gray-500">Owners</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex-1 space-y-2 max-h-[250px] overflow-y-auto">
            {chartData.map((entry, index) => {
              const user = entry.user || {};
              return (
                <Link
                  key={user._id || index}
                  to={`/profile/${user._id || user.id}`}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    hoveredIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                  )}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />

                  {/* Avatar */}
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />

                  {/* Name and percentage */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.shares?.toLocaleString()} shares
                    </p>
                  </div>

                  {/* Percentage */}
                  <span className="text-sm font-bold text-gray-900">
                    {entry.percentage.toFixed(1)}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Total shares info */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
        Total: {totalShares.toLocaleString()} shares
      </div>
    </div>
  );
};

OwnershipChart.propTypes = {
  distribution: PropTypes.arrayOf(PropTypes.shape({
    user: PropTypes.shape({
      _id: PropTypes.string,
      id: PropTypes.string,
      username: PropTypes.string,
      displayName: PropTypes.string,
      avatar: PropTypes.string,
    }),
    shares: PropTypes.number,
    percentage: PropTypes.number,
  })),
  totalShares: PropTypes.number,
  size: PropTypes.number,
  showLegend: PropTypes.bool,
  interactive: PropTypes.bool,
  className: PropTypes.string,
};

export default OwnershipChart;

