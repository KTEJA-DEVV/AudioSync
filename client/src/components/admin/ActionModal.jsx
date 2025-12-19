import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/helpers';
import { Spinner } from '../ui';

const ActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'default', // 'default', 'danger', 'warning'
  loading = false,
  children,
  icon: CustomIcon,
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    default: {
      icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
      button: 'bg-primary-600 hover:bg-primary-700 text-white',
    },
    danger: {
      icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
  };

  const styles = typeStyles[type] || typeStyles.default;
  const Icon = CustomIcon || (type === 'danger' || type === 'warning' ? ExclamationTriangleIcon : null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Icon */}
            {Icon && (
              <div className={cn('mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4', styles.icon)}>
                <Icon className="w-6 h-6" />
              </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
              {title}
            </h3>

            {/* Description */}
            {description && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {description}
              </p>
            )}

            {/* Custom content */}
            {children && <div className="mt-4">{children}</div>}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                  styles.button
                )}
              >
                {loading && <Spinner size="sm" color="white" />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable form fields for action modals
export const ActionModalField = ({ label, children, required }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

export const ActionModalTextarea = ({ value, onChange, placeholder, rows = 3, maxLength }) => (
  <div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
    />
    {maxLength && (
      <p className="mt-1 text-xs text-gray-500 text-right">
        {value.length}/{maxLength}
      </p>
    )}
  </div>
);

export const ActionModalSelect = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export default ActionModal;

