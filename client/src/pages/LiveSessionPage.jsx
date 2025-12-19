import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import useLiveSession from '../hooks/useLiveSession';
import {
  VideoPlayer,
  HypeMeter,
  ChatFeed,
  ChatInput,
  ReactionBar,
  FloatingReactions,
  useFloatingReactions,
  VotingRoundCard,
  HostControlPanel,
} from '../components/features/live';
import { FeedbackInterface } from '../components/features';
import { Badge, Spinner } from '../components/ui';
import {
  ChatBubbleLeftIcon,
  HandRaisedIcon,
  SparklesIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { id: 'chat', label: 'Chat', icon: ChatBubbleLeftIcon },
  { id: 'vote', label: 'Vote', icon: HandRaisedIcon },
  { id: 'participate', label: 'Participate', icon: SparklesIcon },
  { id: 'info', label: 'Info', icon: InformationCircleIcon },
];

const LiveSessionPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const { reactions: floatingReactions, addReaction } = useFloatingReactions();

  const isHost = useMemo(() => {
    if (!user) return false;
    return true; // Will be checked properly with session data
  }, [user]);

  const {
    session,
    messages,
    viewerCount,
    hypeLevel,
    currentVotingRound,
    userVotes,
    reactions,
    isConnected,
    isLoading,
    error,
    sendMessage,
    sendReaction,
    castVote,
    goLive,
    endStream,
    pauseStream,
    changeActivity,
    startVotingRound,
  } = useLiveSession(id, { isHost });

  // Add reactions to floating component
  React.useEffect(() => {
    reactions.forEach(r => addReaction(r));
  }, [reactions, addReaction]);

  // Check if current user is host
  const isSessionHost = useMemo(() => {
    if (!session || !user) return false;
    return session.host?._id === user.id || 
           session.coHosts?.some(h => h._id === user.id);
  }, [session, user]);

  // Handle reaction click
  const handleReaction = (type) => {
    sendReaction(type);
    addReaction({ type });
  };

  // Handle vote
  const handleVote = (optionId) => {
    castVote(optionId);
  };

  // Current activity type
  const currentActivity = session?.currentActivity?.type || 'none';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Session not found
          </h2>
          <p className="text-gray-600">{error || 'This live session does not exist.'}</p>
        </div>
      </div>
    );
  }

  const isLive = session.status === 'live';
  const isPaused = session.status === 'paused';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Main Content (70%) */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Video Section */}
          <div className="relative">
            <VideoPlayer
              platform={session.streamConfig?.platform || 'none'}
              streamUrl={session.streamConfig?.streamUrl}
              isLive={isLive}
              viewerCount={viewerCount}
              className="w-full"
            >
              {/* Hype Meter overlay */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                <HypeMeter level={hypeLevel} size="medium" />
              </div>

              {/* Floating Reactions */}
              <FloatingReactions reactions={floatingReactions} />
            </VideoPlayer>
          </div>

          {/* Session Info */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isLive && <Badge variant="error" className="animate-pulse">LIVE</Badge>}
                  {isPaused && <Badge variant="warning">PAUSED</Badge>}
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {session.title}
                  </h1>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <img
                    src={session.host?.avatar}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{session.host?.displayName || session.host?.username}</span>
                  <span>•</span>
                  <span>{viewerCount} watching</span>
                </div>
              </div>

              {/* Reactions */}
              <ReactionBar onReact={handleReaction} disabled={!isAuthenticated} />
            </div>

            {session.description && (
              <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm">
                {session.description}
              </p>
            )}
          </div>

          {/* Activity Panel */}
          {currentActivity !== 'none' && (
            <div className="mt-4 flex-1 overflow-auto">
              {currentActivity === 'feedback' && (
                <FeedbackInterface
                  sessionId={session.linkedSession || id}
                  isHost={isSessionHost}
                />
              )}
            </div>
          )}

          {/* Host Controls (if host) */}
          {isSessionHost && (
            <div className="mt-4">
              <HostControlPanel
                session={session}
                onGoLive={goLive}
                onEndStream={endStream}
                onPause={pauseStream}
                onChangeActivity={changeActivity}
                onStartVoting={() => startVotingRound({
                  type: 'poll',
                  question: 'Quick Poll',
                  options: [
                    { id: 'a', label: 'Option A' },
                    { id: 'b', label: 'Option B' },
                  ],
                  duration: 30,
                })}
              />
            </div>
          )}
        </div>

        {/* Sidebar (30%) */}
        <div className="w-96 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <>
                <ChatFeed messages={messages} className="flex-1" />
                <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                  <ChatInput
                    onSend={sendMessage}
                    disabled={!isAuthenticated || !session.streamConfig?.chatEnabled}
                    slowModeSeconds={session.streamConfig?.slowModeSeconds || 0}
                    placeholder={isAuthenticated ? 'Send a message...' : 'Login to chat'}
                  />
                </div>
              </>
            )}

            {/* Vote Tab */}
            {activeTab === 'vote' && (
              <div className="p-4">
                <VotingRoundCard
                  round={currentVotingRound}
                  onVote={handleVote}
                  userVote={userVotes[currentVotingRound?.roundNumber]}
                  disabled={!isAuthenticated}
                />
              </div>
            )}

            {/* Participate Tab */}
            {activeTab === 'participate' && (
              <div className="p-4">
                {currentActivity === 'lyrics-submission' && (
                  <div className="text-center text-gray-500">
                    <p>Lyrics submission is open!</p>
                    {/* Add lyrics submission form */}
                  </div>
                )}
                {currentActivity === 'feedback' && (
                  <div className="text-center text-gray-500">
                    <p>Share your feedback in the main panel</p>
                  </div>
                )}
                {currentActivity === 'none' && (
                  <div className="text-center text-gray-500 py-8">
                    <SparklesIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active participation right now</p>
                    <p className="text-sm mt-1">Wait for the host to start an activity</p>
                  </div>
                )}
              </div>
            )}

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">About</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {session.description || 'No description provided.'}
                  </p>
                </div>
                {session.tags?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {session.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Stats</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                      <div className="font-bold">{viewerCount}</div>
                      <div className="text-gray-500">Viewers</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                      <div className="font-bold">{session.engagement?.peakViewers || 0}</div>
                      <div className="text-gray-500">Peak</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                      <div className="font-bold">{session.engagement?.chatMessages || 0}</div>
                      <div className="text-gray-500">Messages</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                      <div className="font-bold">{hypeLevel}%</div>
                      <div className="text-gray-500">Hype</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Video */}
        <div className="sticky top-0 z-10">
          <VideoPlayer
            platform={session.streamConfig?.platform || 'none'}
            streamUrl={session.streamConfig?.streamUrl}
            isLive={isLive}
            viewerCount={viewerCount}
          >
            <FloatingReactions reactions={floatingReactions} />
          </VideoPlayer>
        </div>

        {/* Reactions Bar */}
        <div className="bg-white dark:bg-gray-800 py-2 px-4 border-b border-gray-200 dark:border-gray-700">
          <ReactionBar onReact={handleReaction} disabled={!isAuthenticated} />
        </div>

        {/* Mobile Tabs */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4 pb-24">
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <ChatFeed messages={messages} className="max-h-96" />
            </div>
          )}
          {activeTab === 'vote' && (
            <VotingRoundCard
              round={currentVotingRound}
              onVote={handleVote}
              userVote={userVotes[currentVotingRound?.roundNumber]}
              disabled={!isAuthenticated}
            />
          )}
          {activeTab === 'participate' && currentActivity === 'feedback' && (
            <FeedbackInterface
              sessionId={session.linkedSession || id}
              isHost={isSessionHost}
            />
          )}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold">{session.title}</h1>
              <p className="text-gray-600">{session.description}</p>
            </div>
          )}
        </div>

        {/* Mobile Chat Input (fixed bottom) */}
        {activeTab === 'chat' && (
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <ChatInput
              onSend={sendMessage}
              disabled={!isAuthenticated || !session.streamConfig?.chatEnabled}
              slowModeSeconds={session.streamConfig?.slowModeSeconds || 0}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSessionPage;

