import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import ElementOptionCard from './ElementOptionCard';
import VoteDistributionChart from './VoteDistributionChart';
import { ChartBarIcon, ViewColumnsIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

// Element type configurations
const ELEMENT_CONFIGS = {
  bpm: { name: 'BPM', icon: '🎵', hasAudio: false },
  tempo: { name: 'Tempo', icon: '⏱️', hasAudio: false },
  key: { name: 'Key', icon: '🎹', hasAudio: false },
  hihat: { name: 'Hi-Hat', icon: '🥁', hasAudio: true },
  kick: { name: 'Kick', icon: '🥁', hasAudio: true },
  snare: { name: 'Snare', icon: '🥁', hasAudio: true },
  drums: { name: 'Drums', icon: '🥁', hasAudio: true },
  bass: { name: 'Bass', icon: '🎸', hasAudio: true },
  melody: { name: 'Melody', icon: '🎶', hasAudio: true },
  vocals: { name: 'Vocals', icon: '🎤', hasAudio: true },
  synth: { name: 'Synth', icon: '🎛️', hasAudio: true },
  pad: { name: 'Pad', icon: '🎹', hasAudio: true },
  lead: { name: 'Lead', icon: '🎸', hasAudio: true },
  intro: { name: 'Intro', icon: '▶️', hasAudio: true },
  verse: { name: 'Verse', icon: '📝', hasAudio: true },
  chorus: { name: 'Chorus', icon: '🎵', hasAudio: true },
  bridge: { name: 'Bridge', icon: '🌉', hasAudio: true },
  outro: { name: 'Outro', icon: '⏹️', hasAudio: true },
  overall: { name: 'Overall', icon: '🎵', hasAudio: true },
  mix: { name: 'Mix', icon: '🎚️', hasAudio: true },
  master: { name: 'Master', icon: '💿', hasAudio: true },
};

const ElementVoter = ({
  elementType,
  options = [],
  votedOptionId = null,
  onVote,
  onRemoveVote,
  showResults = false,
  showTechnicalDetails = false,
  disabled = false,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'chart'
  const [selectedOption, setSelectedOption] = useState(null);

  const config = ELEMENT_CONFIGS[elementType] || {
    name: elementType,
    icon: '🎵',
    hasAudio: false,
  };

  // Sort options by votes
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [options]);

  // Calculate total votes for percentages
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  const optionsWithPercentage = sortedOptions.map(opt => ({
    ...opt,
    percentage: totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0,
    hasVoted: opt.optionId === votedOptionId,
  }));

  const handleVote = async (optionId) => {
    if (onVote) {
      await onVote(optionId);
    }
  };

  const handleRemoveVote = async (optionId) => {
    if (onRemoveVote) {
      await onRemoveVote(optionId);
    }
  };

  if (options.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <p>No options available for {config.name}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {config.name}
          </h3>
          <span className="text-sm text-gray-500">
            ({options.length} options, {totalVotes} votes)
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
            title="Grid view"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
            title="List view"
          >
            <ViewColumnsIcon className="w-4 h-4" />
          </button>
          {showResults && (
            <button
              onClick={() => setViewMode('chart')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'chart'
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
              title="Chart view"
            >
              <ChartBarIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Options display based on view mode */}
      {viewMode === 'chart' && showResults ? (
        <VoteDistributionChart
          options={optionsWithPercentage}
          showPercentages
          showVoteCounts
          highlightWinner
          animated
        />
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {optionsWithPercentage.map((option) => (
            <ElementOptionCard
              key={option.optionId}
              option={option}
              isSelected={selectedOption?.optionId === option.optionId}
              hasVoted={option.hasVoted}
              showTechnicalDetails={showTechnicalDetails}
              onVote={handleVote}
              onRemoveVote={handleRemoveVote}
              onSelect={setSelectedOption}
              disabled={disabled}
              className="w-full"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {optionsWithPercentage.map((option) => (
            <ElementOptionCard
              key={option.optionId}
              option={option}
              isSelected={selectedOption?.optionId === option.optionId}
              hasVoted={option.hasVoted}
              showTechnicalDetails={showTechnicalDetails}
              onVote={handleVote}
              onRemoveVote={handleRemoveVote}
              onSelect={setSelectedOption}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Voted indicator */}
      {votedOptionId && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <span>✓</span>
          <span>
            You voted for: {options.find(o => o.optionId === votedOptionId)?.label || votedOptionId}
          </span>
        </div>
      )}
    </div>
  );
};

ElementVoter.propTypes = {
  elementType: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      optionId: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      audioUrl: PropTypes.string,
      value: PropTypes.any,
      votes: PropTypes.number,
    })
  ),
  votedOptionId: PropTypes.string,
  onVote: PropTypes.func,
  onRemoveVote: PropTypes.func,
  showResults: PropTypes.bool,
  showTechnicalDetails: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ElementVoter;

