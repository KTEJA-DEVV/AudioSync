import React from 'react';
import PropTypes from 'prop-types';
import { FaStar, FaUserAlt, FaFire, FaCrown } from 'react-icons/fa';

const ContributorBadge = ({ tier, showLabel = true, size = 'sm', className = '' }) => {
  const tierConfig = {
    casual: {
      icon: FaUserAlt,
      label: 'Casual',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
    },
    active: {
      icon: FaStar,
      label: 'Active',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
    },
    dedicated: {
      icon: FaFire,
      label: 'Dedicated',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
    },
    elite: {
      icon: FaCrown,
      label: 'Elite',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
    },
  };

  const sizeConfig = {
    xs: { icon: 'w-3 h-3', padding: 'px-1.5 py-0.5', text: 'text-xs' },
    sm: { icon: 'w-3.5 h-3.5', padding: 'px-2 py-1', text: 'text-xs' },
    md: { icon: 'w-4 h-4', padding: 'px-2.5 py-1', text: 'text-sm' },
    lg: { icon: 'w-5 h-5', padding: 'px-3 py-1.5', text: 'text-base' },
  };

  const config = tierConfig[tier] || tierConfig.casual;
  const sizeStyles = sizeConfig[size] || sizeConfig.sm;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeStyles.padding} rounded-full border ${config.bgColor} ${config.borderColor} ${config.color} ${sizeStyles.text} font-medium ${className}`}
      title={`${config.label} Contributor`}
    >
      <Icon className={sizeStyles.icon} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

ContributorBadge.propTypes = {
  tier: PropTypes.oneOf(['casual', 'active', 'dedicated', 'elite']).isRequired,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default ContributorBadge;

