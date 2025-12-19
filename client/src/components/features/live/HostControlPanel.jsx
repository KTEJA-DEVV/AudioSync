import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/helpers';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  ChatBubbleLeftIcon,
  MusicalNoteIcon,
  ChartBarIcon,
  HandRaisedIcon,
  ClockIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { Button, Badge } from '../../ui';

/**
 * HostControlPanel - Controls for stream host
 */
const HostControlPanel = ({
  session,
  onGoLive,
  onEndStream,
  onPause,
  onStartVoting,
  onStartFeedback,
  onChangeActivity,
  onToggleSlowMode,
  onClearChat,
  isLoading = false,
  className = '',
}) => {
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const isLive = session?.status === 'live';
  const isPaused = session?.status === 'paused';
  const isScheduled = session?.status === 'scheduled';
  const isEnded = session?.status === 'ended';

  const currentActivity = session?.currentActivity?.type || 'none';
  const slowModeSeconds = session?.streamConfig?.slowModeSeconds || 0;

  const activities = [
    { type: 'none', label: 'None', icon: null },
    { type: 'lyrics-submission', label: 'Lyrics', icon: MusicalNoteIcon },
    { type: 'voting', label: 'Voting', icon: ChartBarIcon },
    { type: 'feedback', label: 'Feedback', icon: ChatBubbleLeftIcon },
    { type: 'break', label: 'Break', icon: ClockIcon },
  ];

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Host Controls</h3>
          {isLive && (
            <Badge variant="error" className="animate-pulse">LIVE</Badge>
          )}
          {isPaused && (
            <Badge variant="warning">PAUSED</Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stream Controls */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase">Stream</label>
          <div className="flex gap-2">
            {isScheduled && (
              <Button
                onClick={onGoLive}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            )}

            {isLive && (
              <>
                <Button
                  onClick={onPause}
                  disabled={isLoading}
                  variant="secondary"
                  className="flex-1"
                >
                  <PauseIcon className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={() => setShowEndConfirm(true)}
                  disabled={isLoading}
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <StopIcon className="w-4 h-4" />
                </Button>
              </>
            )}

            {isPaused && (
              <>
                <Button
                  onClick={onPause}
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button
                  onClick={() => setShowEndConfirm(true)}
                  disabled={isLoading}
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <StopIcon className="w-4 h-4" />
                </Button>
              </>
            )}

            {isEnded && (
              <div className="flex-1 text-center py-2 text-gray-500">
                Stream ended
              </div>
            )}
          </div>
        </div>

        {/* Current Activity */}
        {(isLive || isPaused) && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Current Activity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activities.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => onChangeActivity?.(type)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                    currentActivity === type
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {(isLive || isPaused) && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Quick Actions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowVotingModal(true)}
                variant="outline"
                size="sm"
              >
                <HandRaisedIcon className="w-4 h-4 mr-1" />
                Start Vote
              </Button>
              <Button
                onClick={onStartFeedback}
                variant="outline"
                size="sm"
              >
                <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                Feedback
              </Button>
            </div>
          </div>
        )}

        {/* Chat Moderation */}
        {(isLive || isPaused) && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Chat Moderation
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => onToggleSlowMode?.(slowModeSeconds > 0 ? 0 : 5)}
                variant={slowModeSeconds > 0 ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
              >
                <ClockIcon className="w-4 h-4 mr-1" />
                Slow Mode {slowModeSeconds > 0 ? 'ON' : 'OFF'}
              </Button>
              <Button
                onClick={onClearChat}
                variant="outline"
                size="sm"
                className="text-red-600"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        {(isLive || isPaused) && session?.engagement && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase">
              Engagement
            </label>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {session.engagement.currentViewers || 0}
                </div>
                <div className="text-xs text-gray-500">Viewers</div>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {session.engagement.chatMessages || 0}
                </div>
                <div className="text-xs text-gray-500">Messages</div>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {session.engagement.hypeLevel || 0}%
                </div>
                <div className="text-xs text-gray-500">Hype</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Stream Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ExclamationTriangleIcon className="w-8 h-8" />
              <h3 className="text-lg font-semibold">End Stream?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will end the live stream for all viewers. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowEndConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onEndStream?.();
                  setShowEndConfirm(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                End Stream
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Voting Modal Placeholder */}
      {showVotingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Start Voting Round</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create a quick poll for your viewers.
            </p>
            {/* Add voting form here */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowVotingModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onStartVoting?.();
                  setShowVotingModal(false);
                }}
                className="flex-1"
              >
                Start Vote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

HostControlPanel.propTypes = {
  session: PropTypes.object,
  onGoLive: PropTypes.func,
  onEndStream: PropTypes.func,
  onPause: PropTypes.func,
  onStartVoting: PropTypes.func,
  onStartFeedback: PropTypes.func,
  onChangeActivity: PropTypes.func,
  onToggleSlowMode: PropTypes.func,
  onClearChat: PropTypes.func,
  isLoading: PropTypes.bool,
  className: PropTypes.string,
};

export default HostControlPanel;

