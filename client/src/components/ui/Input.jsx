import PropTypes from 'prop-types';
import { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helper,
  className = '',
  containerClassName = '',
  leftIcon = null,
  rightIcon = null,
  ...props
}, ref) => {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{leftIcon}</span>
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'bg-white border text-gray-900 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:border-transparent',
            'transition-shadow duration-200',
            error
              ? 'border-error-500 focus:ring-error-500'
              : 'border-gray-300 focus:ring-primary-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-gray-400">{rightIcon}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error-500">{error}</p>
      )}
      {helper && !error && (
        <p className="mt-1 text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  helper: PropTypes.string,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
};

export default Input;
