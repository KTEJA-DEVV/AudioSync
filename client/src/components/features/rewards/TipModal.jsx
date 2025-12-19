import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import { Button, Modal } from '../../ui';
import {
  SparklesIcon,
  CheckCircleIcon,
  HeartIcon,
} from '@heroicons/react/24/solid';

// Preset tip amounts
const PRESET_AMOUNTS = [1, 5, 10, 25];

/**
 * TipModal - Send a tip to another user
 */
const TipModal = ({
  isOpen,
  onClose,
  recipient,
  onSendTip,
  isLoading = false,
  userTokenBalance = 0,
  className = '',
}) => {
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAmountSelect = (value) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCustomAmount(value);
      if (value) {
        setAmount(parseInt(value));
      }
    }
  };

  const handleSend = async () => {
    if (!amount || amount <= 0) return;
    if (amount > userTokenBalance) return;

    try {
      await onSendTip({
        toUserId: recipient.id || recipient._id,
        amount,
        currency: 'tokens',
        message: message.trim() || undefined,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setAmount(5);
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Failed to send tip:', error);
    }
  };

  const canSend = amount > 0 && amount <= userTokenBalance;

  if (!recipient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={cn('p-6', className)}>
        {/* Success State */}
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tip Sent!</h3>
            <p className="text-gray-600">
              You sent {amount} tokens to {recipient.displayName || recipient.username}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                <HeartIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Send a Tip
              </h3>
            </div>

            {/* Recipient */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <img
                src={recipient.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recipient.username}`}
                alt=""
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {recipient.displayName || recipient.username}
                </div>
                <div className="text-sm text-gray-500">@{recipient.username}</div>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAmountSelect(preset)}
                    className={cn(
                      'py-2 rounded-lg font-medium transition-colors',
                      amount === preset && !customAmount
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="relative">
                <SparklesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Custom amount"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 text-right">
                Your balance: {userTokenBalance} tokens
              </div>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="Say something nice..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {message.length}/200
              </div>
            </div>

            {/* Insufficient balance warning */}
            {amount > userTokenBalance && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                Insufficient balance. You need {amount - userTokenBalance} more tokens.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!canSend || isLoading}
                loading={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Send {amount} Tokens
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

TipModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  recipient: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    username: PropTypes.string,
    displayName: PropTypes.string,
    avatar: PropTypes.string,
  }),
  onSendTip: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  userTokenBalance: PropTypes.number,
  className: PropTypes.string,
};

export default TipModal;

