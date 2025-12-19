import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';

const LiveIndicator = ({ 
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'bg-live/10 text-live font-bold uppercase rounded-full',
        sizes[size],
        className
      )}
    >
      <span 
        className={cn(
          'rounded-full bg-live animate-pulse-live',
          dotSizes[size]
        )} 
      />
      {showText && 'LIVE'}
    </span>
  );
};

LiveIndicator.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showText: PropTypes.bool,
};

export default LiveIndicator;

