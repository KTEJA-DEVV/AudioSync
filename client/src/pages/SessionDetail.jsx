import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge, Avatar, ReputationBadge } from '../components/ui';
import LyricsCard from '../components/features/LyricsCard';
import LyricsSubmissionModal from '../components/features/LyricsSubmissionModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Clock,
  Users,
  Music,
  ArrowLeft,
  Plus,
  Trophy,
  Radio,
  CheckCircle,
  AlertCircle,
  Edit,
  Play,
} from 'lucide-react';
import { cn } from '../utils/helpers';

// Countdown Timer Component
const CountdownTimer = ({ deadline, label, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    const updateTimer = () => {
      if (!deadline) return;

      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setUrgency('ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
      
      if (hours > 1) setUrgency('normal');
      else if (hours > 0 || minutes > 10) setUrgency('warning');
      else setUrgency('urgent');
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  return (
    <div className={cn('text-center', className)}>
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <div className={cn(
          'px-3 py-2 rounded-lg',
          urgency === 'normal' && 'bg-green-100 text-green-700',
          urgency === 'warning' && 'bg-yellow-100 text-yellow-700',
          urgency === 'urgent' && 'bg-red-100 text-red-700 animate-pulse',
          urgency === 'ended' && 'bg-gray-100 text-gray-500'
        )}>
          <span className="text-2xl font-bold font-mono">
            {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};

// Leaderboard Sidebar
const LeaderboardSidebar = ({ submissions, votingSystem }) => {
  const topSubmissions = submissions?.slice(0, 10) || [];

  if (topSubmissions.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Top Submissions</h3>
        <p className="text-sm text-gray-500">No submissions yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Top Submissions</h3>
      <div className="space-y-2">
        {topSubmissions.map((sub, index) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
          >
            <span className={cn(
              'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
              index === 0 && 'bg-yellow-100 text-yellow-700',
              index === 1 && 'bg-gray-100 text-gray-600',
              index === 2 && 'bg-amber-100 text-amber-700',
              index > 2 && 'bg-gray-50 text-gray-500'
            )}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {sub.content?.title || 'Untitled'}
              </p>
              <p className="text-xs text-gray-500">
                {sub.isAnonymous ? 'Anonymous' : sub.author?.username}
              </p>
            </div>
            <span className="text-sm font-semibold text-indigo-600">
              {votingSystem === 'weighted' ? sub.weightedVoteScore : sub.votes}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const SessionDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  // Fetch session
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const response = await api.get(`/sessions/${id}`);
      return response.data.data;
    },
  });

  // Fetch lyrics
  const { data: lyricsData, isLoading: lyricsLoading, refetch: refetchLyrics } = useQuery({
    queryKey: ['session-lyrics', id],
    queryFn: async () => {
      const response = await api.get(`/sessions/${id}/lyrics`);
      return response.data.data;
    },
    enabled: !!sessionData?.session,
  });

  const session = sessionData?.session;
  const userSubmission = sessionData?.userSubmission;
  const userVotes = new Set(sessionData?.userVotes || []);
  const submissions = lyricsData?.submissions || [];
  const showVotes = lyricsData?.showVotes;
  const votingSystem = session?.settings?.votingSystem || 'simple';

  // Socket connection for real-time updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('session:join', { sessionId: id, userId: user?.id });

    socket.on('session:joined', ({ onlineCount }) => {
      setOnlineCount(onlineCount);
    });

    socket.on('session:userJoined', ({ onlineCount }) => {
      setOnlineCount(onlineCount);
    });

    socket.on('session:userLeft', ({ onlineCount }) => {
      setOnlineCount(onlineCount);
    });

    socket.on('lyrics:submitted', () => {
      refetchLyrics();
    });

    socket.on('lyrics:voteUpdate', () => {
      refetchLyrics();
    });

    socket.on('session:stageChanged', () => {
      queryClient.invalidateQueries(['session', id]);
      refetchLyrics();
    });

    return () => {
      socket.emit('session:leave', { sessionId: id });
      socket.off('session:joined');
      socket.off('session:userJoined');
      socket.off('session:userLeft');
      socket.off('lyrics:submitted');
      socket.off('lyrics:voteUpdate');
      socket.off('session:stageChanged');
    };
  }, [socket, id, user?.id, refetchLyrics, queryClient]);

  // Submit lyrics mutation
  const submitLyricsMutation = useMutation({
    mutationFn: async (lyricsData) => {
      const response = await api.post(`/sessions/${id}/lyrics`, lyricsData);
      return response.data;
    },
    onSuccess: () => {
      setIsSubmitModalOpen(false);
      queryClient.invalidateQueries(['session', id]);
      refetchLyrics();
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ lyricsId, value }) => {
      const response = await api.post(`/sessions/${id}/lyrics/${lyricsId}/vote`, { value });
      return response.data;
    },
    onSuccess: () => {
      refetchLyrics();
    },
  });

  // Remove vote mutation
  const removeVoteMutation = useMutation({
    mutationFn: async (lyricsId) => {
      const response = await api.delete(`/sessions/${id}/lyrics/${lyricsId}/vote`);
      return response.data;
    },
    onSuccess: () => {
      refetchLyrics();
    },
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ lyricsId, rating, comment }) => {
      const response = await api.post(`/sessions/${id}/lyrics/${lyricsId}/feedback`, { rating, comment });
      return response.data;
    },
    onSuccess: () => {
      refetchLyrics();
    },
  });

  const handleVote = useCallback((lyricsId, value = 1) => {
    voteMutation.mutate({ lyricsId, value });
  }, [voteMutation]);

  const handleRemoveVote = useCallback((lyricsId) => {
    removeVoteMutation.mutate(lyricsId);
  }, [removeVoteMutation]);

  const handleFeedback = useCallback((lyricsId, rating, comment) => {
    feedbackMutation.mutate({ lyricsId, rating, comment });
  }, [feedbackMutation]);

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
        <p className="text-gray-600 mb-6">This session may have been deleted or doesn't exist.</p>
        <Link to="/sessions">
          <Button variant="primary">Browse Sessions</Button>
        </Link>
      </div>
    );
  }

  const isHost = user?.id === session.host?._id;
  const canSubmitLyrics = session.status === 'lyrics-open' && 
    isAuthenticated && 
    !userSubmission;
  const isVotingOpen = session.status === 'lyrics-voting';

  // Render stage-specific content
  const renderStageContent = () => {
    switch (session.status) {
      case 'lyrics-open':
        return (
          <>
            {/* Deadline Timer */}
            {session.settings?.lyricsDeadline && (
              <CountdownTimer
                deadline={session.settings.lyricsDeadline}
                label="Time remaining to submit"
                className="mb-6"
              />
            )}

            {/* Submit CTA */}
            {canSubmitLyrics && (
              <Card className="p-6 mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Share Your Creativity!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Submit your lyrics and compete to be featured in the final song.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Submit Your Lyrics
                  </Button>
                </div>
              </Card>
            )}

            {/* User's Submission */}
            {userSubmission && (
              <Card className="p-4 mb-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">You've submitted your lyrics!</span>
                </div>
                <p className="text-sm text-green-700">
                  Your submission "{userSubmission.content?.title || 'Untitled'}" is in the queue.
                </p>
              </Card>
            )}

            {/* Submissions Feed */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Submissions ({submissions.length})
              </h3>
              {submissions.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">No submissions yet. Be the first!</p>
                </Card>
              ) : (
                submissions.map((sub) => (
                  <LyricsCard
                    key={sub.id}
                    submission={sub}
                    showVotes={showVotes}
                    votingSystem={votingSystem}
                    compact
                  />
                ))
              )}
            </div>
          </>
        );

      case 'lyrics-voting':
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Voting Timer */}
              {session.settings?.votingDeadline && (
                <CountdownTimer
                  deadline={session.settings.votingDeadline}
                  label="Voting ends in"
                  className="mb-6"
                />
              )}

              {/* Voting Progress */}
              {isAuthenticated && (
                <Card className="p-4 mb-6">
                  <p className="text-gray-600">
                    You've voted on <span className="font-semibold text-indigo-600">{userVotes.size}</span> of{' '}
                    <span className="font-semibold">{submissions.length}</span> submissions
                  </p>
                </Card>
              )}

              {/* Submissions for Voting */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vote for Your Favorites
                </h3>
                {submissions.map((sub) => (
                  <LyricsCard
                    key={sub.id}
                    submission={sub}
                    showVotes={showVotes}
                    votingSystem={votingSystem}
                    hasVoted={userVotes.has(sub.id)}
                    onVote={handleVote}
                    onRemoveVote={handleRemoveVote}
                    onFeedback={handleFeedback}
                    isVotingOpen={isVotingOpen && isAuthenticated}
                  />
                ))}
              </div>
            </div>

            {/* Leaderboard Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <LeaderboardSidebar 
                  submissions={submissions.sort((a, b) => 
                    (votingSystem === 'weighted' ? b.weightedVoteScore : b.votes) - 
                    (votingSystem === 'weighted' ? a.weightedVoteScore : a.votes)
                  )} 
                  votingSystem={votingSystem}
                />
              </div>
            </div>
          </div>
        );

      case 'generation':
        return (
          <Card className="p-8 text-center">
            <div className="animate-pulse mb-4">
              <Music className="w-16 h-16 text-indigo-500 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Generating Music...
            </h3>
            <p className="text-gray-600">
              The winning lyrics are being transformed into music. Check back soon!
            </p>
          </Card>
        );

      case 'completed':
        return (
          <>
            {/* Winner */}
            {session.results?.winningLyrics && (
              <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Winning Lyrics</h3>
                </div>
                {submissions.filter(s => s.status === 'winner').map(winner => (
                  <LyricsCard
                    key={winner.id}
                    submission={winner}
                    showVotes
                    votingSystem={votingSystem}
                  />
                ))}
              </Card>
            )}

            {/* All Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">All Submissions</h3>
              {submissions.map((sub) => (
                <LyricsCard
                  key={sub.id}
                  submission={sub}
                  showVotes
                  votingSystem={votingSystem}
                />
              ))}
            </div>
          </>
        );

      default:
        return (
          <Card className="p-8 text-center">
            <p className="text-gray-500">This session hasn't started yet.</p>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Back Button */}
      <Link
        to="/sessions"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sessions
      </Link>

      {/* Session Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="capitalize">{session.genre}</Badge>
              {session.status === 'lyrics-open' && (
                <Badge variant="primary" className="animate-pulse">Accepting Lyrics</Badge>
              )}
              {session.status === 'lyrics-voting' && (
                <Badge variant="accent">Voting Now</Badge>
              )}
              {['generation', 'song-voting'].includes(session.status) && (
                <Badge variant="live" className="flex items-center gap-1">
                  <Radio className="w-3 h-3" /> LIVE
                </Badge>
              )}
              {session.status === 'completed' && (
                <Badge variant="success">Completed</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
            {session.description && (
              <p className="text-gray-600 mt-2">{session.description}</p>
            )}
          </div>

          {/* Host Controls */}
          {isHost && session.status !== 'completed' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-1" /> Edit
              </Button>
              {session.status === 'draft' && (
                <Button variant="primary" size="sm">
                  <Play className="w-4 h-4 mr-1" /> Start Session
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Host & Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {/* Host */}
          <div className="flex items-center gap-2">
            <Avatar src={session.host?.avatar} name={session.host?.displayName} size="sm" />
            <span>Hosted by {session.host?.displayName || session.host?.username}</span>
            {session.host?.reputation?.level && (
              <ReputationBadge level={session.host.reputation.level} size="sm" />
            )}
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{session.participantCount || 0} participants</span>
          </div>

          {/* Online Count */}
          {onlineCount > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {onlineCount} online
            </div>
          )}

          {/* Submissions */}
          <div className="flex items-center gap-1">
            <Music className="w-4 h-4" />
            <span>{session.submissionCount || submissions.length} submissions</span>
          </div>
        </div>

        {/* Guidelines */}
        {session.guidelines && (
          <Card className="mt-4 p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">Guidelines</h4>
            <p className="text-sm text-gray-600">{session.guidelines}</p>
            {session.theme && (
              <p className="text-sm text-gray-600 mt-2">
                <strong>Theme:</strong> {session.theme}
              </p>
            )}
            {session.mood && (
              <p className="text-sm text-gray-600">
                <strong>Mood:</strong> <span className="capitalize">{session.mood}</span>
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Stage Content */}
      {renderStageContent()}

      {/* Submission Modal */}
      <LyricsSubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={(data) => submitLyricsMutation.mutate(data)}
        sessionInfo={{
          theme: session.theme,
          mood: session.mood,
          allowAnonymous: session.settings?.allowAnonymous,
        }}
        isLoading={submitLyricsMutation.isLoading}
      />

      {/* Mobile Sticky Vote Bar */}
      {isVotingOpen && isAuthenticated && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-10">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <p className="text-sm text-gray-600">
              Voted: {userVotes.size}/{submissions.length}
            </p>
            <CountdownTimer
              deadline={session.settings?.votingDeadline}
              label=""
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDetail;

