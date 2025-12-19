import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { cn } from '../utils/helpers';
import { Button, Card, Badge, AudioPlayer } from '../components/ui';
import {
  ElementVoter,
  SongStructureTimeline,
  VoteDistributionChart,
  TechnicalUserPanel,
  ElementCompetitionCard,
  CompetitionSubmissionModal,
  StemUploadModal,
} from '../components/features';
import {
  MusicalNoteIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// Element type categories
const ELEMENT_CATEGORIES = {
  tempo: {
    name: 'Tempo & Key',
    icon: '🎵',
    types: ['bpm', 'tempo', 'key'],
  },
  drums: {
    name: 'Drum Elements',
    icon: '🥁',
    types: ['kick', 'snare', 'hihat', 'drums'],
  },
  melodic: {
    name: 'Melodic Elements',
    icon: '🎶',
    types: ['bass', 'melody', 'synth', 'pad', 'lead'],
  },
  sections: {
    name: 'Song Sections',
    icon: '📋',
    types: ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'hook', 'outro'],
  },
  vocals: {
    name: 'Vocals',
    icon: '🎤',
    types: ['vocals'],
  },
  overall: {
    name: 'Overall',
    icon: '🎧',
    types: ['overall', 'mix', 'master', 'arrangement'],
  },
};

const GranularVotingPage = () => {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState('tempo');
  const [selectedSection, setSelectedSection] = useState(null);
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showStemModal, setShowStemModal] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [votedOptions, setVotedOptions] = useState({});

  const isTechnicalUser = user?.userType === 'technical' || ['creator', 'admin'].includes(user?.role);

  // Fetch session data
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data.data.session;
    },
  });

  // Fetch granular breakdown
  const { data: breakdownData, isLoading: breakdownLoading, refetch: refetchBreakdown } = useQuery({
    queryKey: ['granularBreakdown', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/granular-breakdown`);
      return response.data.data;
    },
  });

  // Fetch songs for reference
  const { data: songsData } = useQuery({
    queryKey: ['sessionSongs', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/songs?status=ready`);
      return response.data.data.songs;
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ optionId }) => {
      const response = await api.post(`/sessions/${sessionId}/element-options/${optionId}/vote`);
      return response.data;
    },
    onSuccess: (data, { optionId }) => {
      setVotedOptions(prev => ({ ...prev, [optionId]: true }));
      queryClient.invalidateQueries(['granularBreakdown', sessionId]);
    },
  });

  // Remove vote mutation
  const removeVoteMutation = useMutation({
    mutationFn: async ({ optionId }) => {
      const response = await api.delete(`/sessions/${sessionId}/element-options/${optionId}/vote`);
      return response.data;
    },
    onSuccess: (data, { optionId }) => {
      setVotedOptions(prev => {
        const newVotes = { ...prev };
        delete newVotes[optionId];
        return newVotes;
      });
      queryClient.invalidateQueries(['granularBreakdown', sessionId]);
    },
  });

  // Competition submission mutation
  const submitToCompetitionMutation = useMutation({
    mutationFn: async ({ competitionId, data }) => {
      const response = await api.post(`/elements/competitions/${competitionId}/submit`, data);
      return response.data;
    },
    onSuccess: () => {
      setShowCompetitionModal(false);
      setSelectedCompetition(null);
      queryClient.invalidateQueries(['granularBreakdown', sessionId]);
    },
  });

  // Socket listeners
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('joinSession', sessionId);

    const handleVoteUpdate = () => {
      refetchBreakdown();
    };

    socket.on('element:voted', handleVoteUpdate);
    socket.on('element:voteRemoved', handleVoteUpdate);
    socket.on('competition:submission', handleVoteUpdate);

    return () => {
      socket.off('element:voted', handleVoteUpdate);
      socket.off('element:voteRemoved', handleVoteUpdate);
      socket.off('competition:submission', handleVoteUpdate);
      socket.emit('leaveSession', sessionId);
    };
  }, [socket, connected, sessionId, refetchBreakdown]);

  // Initialize voted options from user's votes
  useEffect(() => {
    if (breakdownData?.options) {
      const voted = {};
      Object.values(breakdownData.options).forEach(category => {
        category.options?.forEach(opt => {
          if (opt.voterIds?.includes(user?.id)) {
            voted[opt.optionId] = true;
          }
        });
      });
      setVotedOptions(voted);
    }
  }, [breakdownData, user?.id]);

  const handleVote = async (optionId) => {
    await voteMutation.mutateAsync({ optionId });
  };

  const handleRemoveVote = async (optionId) => {
    await removeVoteMutation.mutateAsync({ optionId });
  };

  const handleEnterCompetition = (competition) => {
    setSelectedCompetition(competition);
    setShowCompetitionModal(true);
  };

  const handleCompetitionSubmit = async (data) => {
    if (selectedCompetition) {
      await submitToCompetitionMutation.mutateAsync({
        competitionId: selectedCompetition.id,
        data,
      });
    }
  };

  // Get options for active category
  const getOptionsForCategory = (category) => {
    if (!breakdownData?.options) return [];
    
    const options = [];
    category.types.forEach(type => {
      if (breakdownData.options[type]) {
        options.push(...breakdownData.options[type].options.map(opt => ({
          ...opt,
          hasVoted: votedOptions[opt.optionId] || false,
        })));
      }
    });
    return options;
  };

  // Get first song for reference
  const referenceSong = songsData?.[0];

  if (sessionLoading || breakdownLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Session</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{sessionData?.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <AdjustmentsHorizontalIcon className="w-8 h-8 text-indigo-600" />
              Granular Voting
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="default">{sessionData?.genre}</Badge>
              <Badge variant="warning">Refinement Stage</Badge>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reference song player */}
            {referenceSong && (
              <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MusicalNoteIcon className="w-5 h-5 text-indigo-600" />
                  Reference Track
                </h2>
                <AudioPlayer
                  src={referenceSong.audioUrl}
                  title={referenceSong.title}
                  waveformData={referenceSong.waveformData}
                  coverArt={referenceSong.coverArt}
                  showWaveform
                />
              </Card>
            )}

            {/* Song structure timeline */}
            {referenceSong?.sections && (
              <Card className="p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                  Song Structure
                </h2>
                <SongStructureTimeline
                  sections={referenceSong.sections}
                  duration={referenceSong.duration || 0}
                  selectedSection={selectedSection}
                  onSectionClick={setSelectedSection}
                  isTechnicalUser={isTechnicalUser}
                />
              </Card>
            )}

            {/* Progress indicator */}
            {breakdownData?.progress && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Decision Progress
                  </h3>
                  <span className="text-sm text-gray-500">
                    {breakdownData.progress.decided}/{breakdownData.progress.total} elements decided
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${breakdownData.progress.percentage}%` }}
                  />
                </div>
              </Card>
            )}

            {/* Element category tabs */}
            <div className="flex overflow-x-auto gap-2 pb-2">
              {Object.entries(ELEMENT_CATEGORIES).map(([key, category]) => {
                const options = getOptionsForCategory(category);
                const hasOptions = options.length > 0;
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    disabled={!hasOptions}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors',
                      activeTab === key
                        ? 'bg-indigo-600 text-white'
                        : hasOptions
                          ? 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed',
                      activeTab === key && 'border-b-2 border-indigo-500'
                    )}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    {hasOptions && (
                      <span className="px-1.5 py-0.5 bg-black/10 rounded text-xs">
                        {options.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active category content */}
            <Card className="p-6">
              {(() => {
                const category = ELEMENT_CATEGORIES[activeTab];
                const categoryOptions = getOptionsForCategory(category);

                if (categoryOptions.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No options available</p>
                      <p className="text-sm">Options for {category.name} will appear here</p>
                    </div>
                  );
                }

                // Group by element type within category
                const groupedByType = {};
                categoryOptions.forEach(opt => {
                  if (!groupedByType[opt.elementType]) {
                    groupedByType[opt.elementType] = [];
                  }
                  groupedByType[opt.elementType].push(opt);
                });

                return (
                  <div className="space-y-8">
                    {Object.entries(groupedByType).map(([type, options]) => (
                      <ElementVoter
                        key={type}
                        elementType={type}
                        options={options}
                        votedOptionId={Object.keys(votedOptions).find(
                          optId => options.some(o => o.optionId === optId && votedOptions[optId])
                        )}
                        onVote={handleVote}
                        onRemoveVote={handleRemoveVote}
                        showResults={true}
                        showTechnicalDetails={isTechnicalUser}
                        disabled={voteMutation.isPending || removeVoteMutation.isPending}
                      />
                    ))}
                  </div>
                );
              })()}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Session Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Genre</span>
                  <span className="font-medium">{sessionData?.genre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="warning">{sessionData?.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Participants</span>
                  <span className="font-medium">{sessionData?.stats?.totalParticipants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Votes</span>
                  <span className="font-medium">{sessionData?.stats?.totalVotes || 0}</span>
                </div>
              </div>
            </Card>

            {/* Winning elements */}
            {breakdownData?.winners && Object.keys(breakdownData.winners).length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  Decided Elements
                </h3>
                <div className="space-y-2">
                  {Object.entries(breakdownData.winners).map(([type, winner]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {type}
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {winner.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Active competitions */}
            {breakdownData?.competitions?.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-amber-500" />
                  Active Competitions
                </h3>
                <div className="space-y-3">
                  {breakdownData.competitions.map(comp => (
                    <div
                      key={comp.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comp.title}</span>
                        <Badge variant={comp.status === 'open' ? 'success' : 'warning'} size="sm">
                          {comp.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <ClockIcon className="w-3 h-3" />
                        <span>{new Date(comp.deadline).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{comp.submissionCount} entries</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Technical user panel */}
            {isTechnicalUser && (
              <TechnicalUserPanel
                competitions={breakdownData?.competitions || []}
                leaderboard={[]} // Would come from API
                onEnterCompetition={handleEnterCompetition}
                onUploadStem={() => setShowStemModal(true)}
                sessionId={sessionId}
              />
            )}

            {/* Help */}
            <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                How Granular Voting Works
              </h3>
              <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
                <li>• Vote on individual song elements</li>
                <li>• Your votes shape the final sound</li>
                <li>• Higher reputation = more vote weight</li>
                <li>• Technical users can submit custom elements</li>
                <li>• Winning elements are combined in final mix</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CompetitionSubmissionModal
        isOpen={showCompetitionModal}
        onClose={() => {
          setShowCompetitionModal(false);
          setSelectedCompetition(null);
        }}
        onSubmit={handleCompetitionSubmit}
        competition={selectedCompetition}
      />

      <StemUploadModal
        isOpen={showStemModal}
        onClose={() => setShowStemModal(false)}
        sessionId={sessionId}
      />
    </div>
  );
};

export default GranularVotingPage;

