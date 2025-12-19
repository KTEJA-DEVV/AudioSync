import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ThumbsUp, Check, Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/helpers';

const VotingInterface = ({
  hasVoted = false,
  votes = 0,
  votingSystem = 'simple',
  userVoteWeight = 1,
  remainingWeight = 10,
  onVote,
  onRemoveVote,
  showCount = true,
  size = 'md',
  className = '',
}) => {
  const [weightValue, setWeightValue] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (hasVoted) {
        await onRemoveVote?.();
      } else {
        const voteValue = votingSystem === 'weighted' ? weightValue : 1;
        await onVote?.(voteValue);
      }
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5 text-lg',
  };

  // Simple voting UI
  if (votingSystem === 'simple') {
    return (
      <button
        onClick={handleVote}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 rounded-full font-medium transition-all',
          sizeClasses[size],
          hasVoted
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700',
          isLoading && 'opacity-50 cursor-wait',
          className
        )}
      >
        {hasVoted ? (
          <Check className="w-4 h-4" />
        ) : (
          <ThumbsUp className="w-4 h-4" />
        )}
        {showCount && <span>{votes}</span>}
        {hasVoted && <span className="text-xs opacity-75">Voted</span>}
      </button>
    );
  }

  // Weighted voting UI
  if (votingSystem === 'weighted') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {!hasVoted ? (
          <>
            {/* Weight Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg">
              <button
                onClick={() => setWeightValue(Math.max(1, weightValue - 1))}
                disabled={weightValue <= 1 || isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-medium">{weightValue}</span>
              <button
                onClick={() => setWeightValue(Math.min(remainingWeight, weightValue + 1))}
                disabled={weightValue >= remainingWeight || isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Vote Button */}
            <button
              onClick={handleVote}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 rounded-full font-medium transition-all',
                sizeClasses[size],
                'bg-indigo-600 text-white hover:bg-indigo-700',
                isLoading && 'opacity-50 cursor-wait'
              )}
            >
              <ThumbsUp className="w-4 h-4" />
              Vote ({weightValue}x)
            </button>
          </>
        ) : (
          <button
            onClick={handleVote}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 rounded-full font-medium transition-all',
              sizeClasses[size],
              'bg-indigo-600 text-white hover:bg-red-600',
              isLoading && 'opacity-50 cursor-wait'
            )}
          >
            <Check className="w-4 h-4" />
            Voted {showCount && `(${votes})`}
          </button>
        )}

        {/* Weight Info */}
        {!hasVoted && (
          <span className="text-xs text-gray-500">
            Your weight: {userVoteWeight}x
          </span>
        )}
      </div>
    );
  }

  // Tokenized voting UI
  if (votingSystem === 'tokenized') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {!hasVoted ? (
          <>
            <input
              type="number"
              min={0}
              max={remainingWeight}
              value={weightValue}
              onChange={(e) => setWeightValue(Math.min(remainingWeight, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center"
            />
            <button
              onClick={handleVote}
              disabled={isLoading || weightValue === 0}
              className={cn(
                'flex items-center gap-2 rounded-full font-medium transition-all',
                sizeClasses[size],
                'bg-indigo-600 text-white hover:bg-indigo-700',
                (isLoading || weightValue === 0) && 'opacity-50 cursor-not-allowed'
              )}
            >
              Spend {weightValue} tokens
            </button>
          </>
        ) : (
          <button
            onClick={handleVote}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 rounded-full font-medium transition-all',
              sizeClasses[size],
              'bg-indigo-600 text-white hover:bg-red-600'
            )}
          >
            <Check className="w-4 h-4" />
            Tokens spent
          </button>
        )}
      </div>
    );
  }

  return null;
};

VotingInterface.propTypes = {
  hasVoted: PropTypes.bool,
  votes: PropTypes.number,
  votingSystem: PropTypes.oneOf(['simple', 'weighted', 'tokenized']),
  userVoteWeight: PropTypes.number,
  remainingWeight: PropTypes.number,
  onVote: PropTypes.func,
  onRemoveVote: PropTypes.func,
  showCount: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default VotingInterface;

