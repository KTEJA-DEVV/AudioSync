import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { cn } from '../utils/helpers';
import { Button, Card, Badge } from '../components/ui';
import {
  SongVersionCard,
  StemUploadModal,
  SongComparisonView,
  LyricsCard,
} from '../components/features';
import {
  SparklesIcon,
  MusicalNoteIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Genre options with icons
const GENRES = [
  { value: 'pop', label: 'Pop', icon: '🎵', color: 'bg-pink-100 text-pink-700' },
  { value: 'rock', label: 'Rock', icon: '🎸', color: 'bg-red-100 text-red-700' },
  { value: 'hip-hop', label: 'Hip-Hop', icon: '🎤', color: 'bg-purple-100 text-purple-700' },
  { value: 'r&b', label: 'R&B', icon: '💜', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'electronic', label: 'Electronic', icon: '🎛️', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'country', label: 'Country', icon: '🤠', color: 'bg-amber-100 text-amber-700' },
  { value: 'jazz', label: 'Jazz', icon: '🎷', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'lo-fi', label: 'Lo-fi', icon: '🌙', color: 'bg-slate-100 text-slate-700' },
  { value: 'indie', label: 'Indie', icon: '🌿', color: 'bg-green-100 text-green-700' },
  { value: 'classical', label: 'Classical', icon: '🎻', color: 'bg-orange-100 text-orange-700' },
];

// Mood options
const MOODS = [
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'chill', label: 'Chill', emoji: '😌' },
  { value: 'dark', label: 'Dark', emoji: '🌑' },
  { value: 'uplifting', label: 'Uplifting', emoji: '🌅' },
  { value: 'melancholic', label: 'Melancholic', emoji: '🌧️' },
  { value: 'aggressive', label: 'Aggressive', emoji: '🔥' },
  { value: 'dreamy', label: 'Dreamy', emoji: '✨' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
];

// Vocal style options
const VOCAL_STYLES = [
  { value: 'male', label: 'Male', description: 'Deep, masculine vocals' },
  { value: 'female', label: 'Female', description: 'Bright, feminine vocals' },
  { value: 'duet', label: 'Duet', description: 'Male & female harmonies' },
  { value: 'instrumental', label: 'Instrumental', description: 'No vocals' },
  { value: 'ai-voice', label: 'AI Voice', description: 'Unique AI-generated voice' },
];

// Musical keys
const MUSICAL_KEYS = [
  'Auto-detect', 'C Major', 'C Minor', 'C# Major', 'C# Minor',
  'D Major', 'D Minor', 'Eb Major', 'Eb Minor',
  'E Major', 'E Minor', 'F Major', 'F Minor',
  'F# Major', 'F# Minor', 'G Major', 'G Minor',
  'Ab Major', 'Ab Minor', 'A Major', 'A Minor',
  'Bb Major', 'Bb Minor', 'B Major', 'B Minor',
];

const GenerationPage = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const queryClient = useQueryClient();

  // State
  const [showParamsForm, setShowParamsForm] = useState(true);
  const [showHumanInputs, setShowHumanInputs] = useState(false);
  const [showStemModal, setShowStemModal] = useState(false);
  const [selectedParams, setSelectedParams] = useState({
    genre: 'pop',
    mood: ['energetic'],
    tempo: 120,
    key: 'Auto-detect',
    vocalStyle: 'ai-voice',
    instruments: [],
    style: '',
    referenceTrack: '',
  });
  const [numVersions, setNumVersions] = useState(3);
  const [generationJobs, setGenerationJobs] = useState([]);
  const [humanInstructions, setHumanInstructions] = useState('');

  // Fetch session data
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data.data.session;
    },
  });

  // Fetch winning lyrics
  const { data: winningLyrics } = useQuery({
    queryKey: ['winningLyrics', sessionId],
    queryFn: async () => {
      if (!sessionData?.results?.winningLyrics) return null;
      const response = await api.get(`/sessions/${sessionId}/lyrics/${sessionData.results.winningLyrics}`);
      return response.data.data.lyrics;
    },
    enabled: !!sessionData?.results?.winningLyrics,
  });

  // Fetch generation status
  const { data: generationStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['generationStatus', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/generation-status`);
      return response.data.data;
    },
    refetchInterval: generationJobs.some(j => ['queued', 'processing'].includes(j.status)) ? 2000 : false,
  });

  // Fetch songs
  const { data: songsData } = useQuery({
    queryKey: ['sessionSongs', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/songs`);
      return response.data.data.songs;
    },
    enabled: generationStatus?.summary?.completed > 0,
  });

  // Fetch stems
  const { data: stemsData, refetch: refetchStems } = useQuery({
    queryKey: ['sessionStems', sessionId],
    queryFn: async () => {
      const response = await api.get(`/sessions/${sessionId}/stems`);
      return response.data.data;
    },
  });

  // Trigger generation mutation
  const generateMutation = useMutation({
    mutationFn: async (params) => {
      const response = await api.post(`/sessions/${sessionId}/generate`, {
        params: {
          ...params,
          key: params.key === 'Auto-detect' ? null : params.key,
        },
        numVersions,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      setGenerationJobs(data.jobs);
      setShowParamsForm(false);
      queryClient.invalidateQueries(['generationStatus', sessionId]);
    },
  });

  // Cancel generation mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${sessionId}/cancel-generation`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['generationStatus', sessionId]);
    },
  });

  // Upload stem mutation
  const uploadStemMutation = useMutation({
    mutationFn: async (stemData) => {
      const response = await api.post(`/sessions/${sessionId}/stems`, stemData);
      return response.data.data.stem;
    },
    onSuccess: () => {
      refetchStems();
      setShowStemModal(false);
    },
  });

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('joinSession', sessionId);

    const handleProgress = (data) => {
      setGenerationJobs(prev => 
        prev.map(job => 
          job.id === data.jobId
            ? { ...job, progress: data.progress, currentStage: data.currentStage, status: data.status }
            : job
        )
      );
    };

    const handleComplete = (data) => {
      queryClient.invalidateQueries(['sessionSongs', sessionId]);
      queryClient.invalidateQueries(['generationStatus', sessionId]);
    };

    const handleAllComplete = () => {
      queryClient.invalidateQueries(['sessionSongs', sessionId]);
      queryClient.invalidateQueries(['generationStatus', sessionId]);
    };

    socket.on('generation:progress', handleProgress);
    socket.on('generation:complete', handleComplete);
    socket.on('generation:allComplete', handleAllComplete);

    return () => {
      socket.off('generation:progress', handleProgress);
      socket.off('generation:complete', handleComplete);
      socket.off('generation:allComplete', handleAllComplete);
      socket.emit('leaveSession', sessionId);
    };
  }, [socket, connected, sessionId, queryClient]);

  // Update jobs from status polling
  useEffect(() => {
    if (generationStatus?.jobs) {
      setGenerationJobs(generationStatus.jobs);
    }
  }, [generationStatus]);

  // Handlers
  const handleParamChange = (key, value) => {
    setSelectedParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleMood = (mood) => {
    setSelectedParams(prev => ({
      ...prev,
      mood: prev.mood.includes(mood)
        ? prev.mood.filter(m => m !== mood)
        : [...prev.mood, mood],
    }));
  };

  const handleGenerate = () => {
    generateMutation.mutate(selectedParams);
  };

  const isHost = sessionData?.host?._id === user?.id || sessionData?.host === user?.id;
  const isGenerating = generationJobs.some(j => ['queued', 'processing'].includes(j.status));
  const hasCompletedSongs = songsData?.length > 0;

  if (sessionLoading) {
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
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Session</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{sessionData?.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-indigo-600" />
              AI Song Generation
            </h1>
            <Badge variant={sessionData?.status === 'generation' ? 'success' : 'default'}>
              Stage 3: Generation
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Winning Lyrics Card */}
            {winningLyrics && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-green-600" />
                    Winning Lyrics
                  </h2>
                  <Badge variant="success">Winner</Badge>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium mb-2">{winningLyrics.content?.title || 'Untitled'}</h3>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                    {winningLyrics.content?.fullLyrics}
                  </pre>
                </div>
              </Card>
            )}

            {/* Host Controls - Generation Parameters */}
            {isHost && !isGenerating && !hasCompletedSongs && (
              <Card className="overflow-hidden">
                <button
                  onClick={() => setShowParamsForm(!showParamsForm)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5 text-indigo-600" />
                    Generation Parameters
                  </h2>
                  {showParamsForm ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {showParamsForm && (
                  <div className="p-6 pt-0 space-y-6">
                    {/* Genre selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Genre
                      </label>
                      <div className="grid grid-cols-5 gap-3">
                        {GENRES.map(genre => (
                          <button
                            key={genre.value}
                            onClick={() => handleParamChange('genre', genre.value)}
                            className={cn(
                              'p-3 rounded-xl border-2 text-center transition-all',
                              selectedParams.genre === genre.value
                                ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                            )}
                          >
                            <span className="text-2xl block mb-1">{genre.icon}</span>
                            <span className="text-xs font-medium">{genre.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tempo slider */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tempo: <span className="text-indigo-600">{selectedParams.tempo} BPM</span>
                      </label>
                      <input
                        type="range"
                        min={60}
                        max={180}
                        value={selectedParams.tempo}
                        onChange={(e) => handleParamChange('tempo', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>60 BPM</span>
                        <span>Slow • Medium • Fast</span>
                        <span>180 BPM</span>
                      </div>
                    </div>

                    {/* Mood multi-select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Mood (select multiple)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {MOODS.map(mood => (
                          <button
                            key={mood.value}
                            onClick={() => toggleMood(mood.value)}
                            className={cn(
                              'px-4 py-2 rounded-full text-sm font-medium transition-all',
                              selectedParams.mood.includes(mood.value)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                            )}
                          >
                            {mood.emoji} {mood.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vocal style */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Vocal Style
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {VOCAL_STYLES.map(style => (
                          <button
                            key={style.value}
                            onClick={() => handleParamChange('vocalStyle', style.value)}
                            className={cn(
                              'p-3 rounded-xl border-2 text-center transition-all',
                              selectedParams.vocalStyle === style.value
                                ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                            )}
                          >
                            <span className="font-medium text-sm">{style.label}</span>
                            <span className="text-xs text-gray-500 block mt-1">{style.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Musical key */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Musical Key
                        </label>
                        <select
                          value={selectedParams.key}
                          onChange={(e) => handleParamChange('key', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        >
                          {MUSICAL_KEYS.map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Versions
                        </label>
                        <div className="flex gap-2">
                          {[3, 4, 5].map(num => (
                            <button
                              key={num}
                              onClick={() => setNumVersions(num)}
                              className={cn(
                                'flex-1 py-2 rounded-lg font-medium transition-all',
                                numVersions === num
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100'
                              )}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Style description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Style Description (optional)
                      </label>
                      <textarea
                        value={selectedParams.style}
                        onChange={(e) => handleParamChange('style', e.target.value)}
                        placeholder="E.g., '90s R&B vibes with modern production, smooth harmonies'"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                      />
                    </div>

                    {/* Reference track */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reference Track URL (optional)
                      </label>
                      <input
                        type="url"
                        value={selectedParams.referenceTrack}
                        onChange={(e) => handleParamChange('referenceTrack', e.target.value)}
                        placeholder="https://spotify.com/... or https://youtube.com/..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                      />
                    </div>

                    {/* Generate button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleGenerate}
                        disabled={generateMutation.isPending}
                        className="w-full py-3 text-lg"
                      >
                        {generateMutation.isPending ? (
                          <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                            Starting Generation...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate {numVersions} Song Versions
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Generation Progress */}
            {isGenerating && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-600 animate-pulse" />
                    Generating Songs...
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>

                {/* Overall progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
                    <span className="font-medium">{generationStatus?.summary?.overallProgress || 0}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${generationStatus?.summary?.overallProgress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Version cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generationJobs.map((job, index) => (
                    <div
                      key={job.id}
                      className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold">Version {job.params?.versionLabel || index + 1}</span>
                        {job.status === 'completed' ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : job.status === 'failed' ? (
                          <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Current stage */}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {job.currentStage || 'Queued'}
                      </p>

                      {/* Animated waveform placeholder */}
                      {job.status === 'processing' && (
                        <div className="flex items-end gap-0.5 h-8 mt-3">
                          {[...Array(20)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-indigo-400 rounded-full animate-pulse"
                              style={{
                                height: `${20 + Math.random() * 80}%`,
                                animationDelay: `${i * 0.05}s`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Completed Songs */}
            {hasCompletedSongs && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <MusicalNoteIcon className="w-5 h-5 text-indigo-600" />
                  Generated Songs
                </h2>
                <SongComparisonView
                  songs={songsData}
                  isVotingOpen={sessionData?.status === 'song-voting'}
                />
              </Card>
            )}

            {/* Human Inputs Section */}
            {isHost && (
              <Card className="overflow-hidden">
                <button
                  onClick={() => setShowHumanInputs(!showHumanInputs)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MusicalNoteIcon className="w-5 h-5 text-purple-600" />
                    Human Inputs (Optional)
                  </h2>
                  {showHumanInputs ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {showHumanInputs && (
                  <div className="p-6 pt-0 space-y-6">
                    {/* Stem upload area */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Uploaded Stems
                        </label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowStemModal(true)}
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Stem
                        </Button>
                      </div>

                      {/* Stems list */}
                      {stemsData?.stems?.length > 0 ? (
                        <div className="space-y-2">
                          {stemsData.stems.map(stem => (
                            <div
                              key={stem.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                                  <MusicalNoteIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{stem.filename}</p>
                                  <p className="text-xs text-gray-500">
                                    {stem.type} • {stem.bpm ? `${stem.bpm} BPM` : 'BPM not set'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={stem.status === 'approved' ? 'success' : 'default'}>
                                {stem.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <MusicalNoteIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No stems uploaded yet</p>
                        </div>
                      )}
                    </div>

                    {/* Instructions for AI */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Instructions for AI
                      </label>
                      <textarea
                        value={humanInstructions}
                        onChange={(e) => setHumanInstructions(e.target.value)}
                        placeholder="Tell the AI how to incorporate the stems (e.g., 'Use the drums stem as the main beat, layer the melody over the chorus')"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 resize-none"
                      />
                    </div>
                  </div>
                )}
              </Card>
            )}
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
                  <Badge variant={sessionData?.status === 'generation' ? 'warning' : 'default'}>
                    {sessionData?.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Host</span>
                  <span className="font-medium">{sessionData?.host?.username || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Participants</span>
                  <span className="font-medium">{sessionData?.stats?.totalParticipants || 0}</span>
                </div>
              </div>
            </Card>

            {/* Generation status summary */}
            {generationStatus?.summary && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Generation Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total</span>
                    <span className="font-medium">{generationStatus.summary.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completed</span>
                    <span className="font-medium text-green-600">{generationStatus.summary.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Processing</span>
                    <span className="font-medium text-indigo-600">{generationStatus.summary.processing}</span>
                  </div>
                  {generationStatus.summary.failed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Failed</span>
                      <span className="font-medium text-red-600">{generationStatus.summary.failed}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Help text */}
            <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                How it works
              </h3>
              <ol className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2 list-decimal list-inside">
                <li>Configure generation parameters</li>
                <li>Optionally add stems or audio files</li>
                <li>Generate multiple song versions</li>
                <li>Compare and vote on favorites</li>
                <li>Select the winning version!</li>
              </ol>
            </Card>
          </div>
        </div>
      </div>

      {/* Stem upload modal */}
      <StemUploadModal
        isOpen={showStemModal}
        onClose={() => setShowStemModal(false)}
        onUpload={uploadStemMutation.mutateAsync}
        sessionId={sessionId}
      />
    </div>
  );
};

export default GenerationPage;

