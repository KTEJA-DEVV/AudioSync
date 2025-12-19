import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import ElementCompetitionCard from './ElementCompetitionCard';
import { Button, Badge, Avatar } from '../ui';
import {
  WrenchScrewdriverIcon,
  TrophyIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

const TechnicalUserPanel = ({
  competitions = [],
  leaderboard = [],
  onEnterCompetition,
  onUploadStem,
  onOpenAdvancedControls,
  sessionId,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('competitions');

  const activeCompetitions = competitions.filter(c => ['open', 'voting'].includes(c.status));

  return (
    <div className={cn('bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <WrenchScrewdriverIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Technical User Panel
          </h3>
          <Badge variant="default" size="sm">Pro</Badge>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'competitions', label: 'Competitions', count: activeCompetitions.length },
              { id: 'upload', label: 'Upload' },
              { id: 'leaderboard', label: 'Leaderboard' },
              { id: 'advanced', label: 'Advanced' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Competitions tab */}
          {activeTab === 'competitions' && (
            <div className="space-y-4">
              {activeCompetitions.length > 0 ? (
                activeCompetitions.map(competition => (
                  <ElementCompetitionCard
                    key={competition.id}
                    competition={competition}
                    onEnter={onEnterCompetition}
                    onVote={onEnterCompetition}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrophyIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No active competitions</p>
                  <p className="text-sm">Check back later for new opportunities</p>
                </div>
              )}
            </div>
          )}

          {/* Upload tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload your own stems and elements to contribute to this session.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['drums', 'bass', 'melody', 'synth', 'vocals', 'other'].map(type => (
                  <button
                    key={type}
                    onClick={() => onUploadStem?.(type)}
                    className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left"
                  >
                    <ArrowUpTrayIcon className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard tab */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Top Technical Contributors
              </h4>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((user, index) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg"
                    >
                      <span className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold',
                        index === 0 && 'bg-amber-100 text-amber-700',
                        index === 1 && 'bg-gray-200 text-gray-700',
                        index === 2 && 'bg-orange-100 text-orange-700',
                        index > 2 && 'bg-gray-100 text-gray-600'
                      )}>
                        {index + 1}
                      </span>
                      <Avatar src={user.avatar} name={user.username} size="sm" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.contributions} contributions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-indigo-600">
                          {user.points} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No contributions yet
                </div>
              )}
            </div>
          )}

          {/* Advanced tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Advanced controls for technical users.
              </p>
              
              {/* BPM Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exact BPM
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Enter exact BPM"
                    min="40"
                    max="220"
                    step="0.1"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                  <Button variant="outline" size="sm">Apply</Button>
                </div>
              </div>

              {/* Key Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Musical Key
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <option value="">Select key...</option>
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
                    <React.Fragment key={note}>
                      <option value={`${note} Major`}>{note} Major</option>
                      <option value={`${note} Minor`}>{note} Minor</option>
                    </React.Fragment>
                  ))}
                </select>
              </div>

              {/* Time Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Signature
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="6/8">6/8</option>
                  <option value="2/4">2/4</option>
                  <option value="5/4">5/4</option>
                  <option value="7/8">7/8</option>
                </select>
              </div>

              <Button
                onClick={onOpenAdvancedControls}
                variant="outline"
                className="w-full"
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Open Full Advanced Panel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

TechnicalUserPanel.propTypes = {
  competitions: PropTypes.arrayOf(PropTypes.object),
  leaderboard: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      displayName: PropTypes.string,
      avatar: PropTypes.string,
      contributions: PropTypes.number,
      points: PropTypes.number,
    })
  ),
  onEnterCompetition: PropTypes.func,
  onUploadStem: PropTypes.func,
  onOpenAdvancedControls: PropTypes.func,
  sessionId: PropTypes.string,
  className: PropTypes.string,
};

export default TechnicalUserPanel;

