import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, Button, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Music, 
  Clock, 
  Users, 
  Settings,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../utils/helpers';

const genreOptions = [
  { value: 'pop', label: 'Pop', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'rock', label: 'Rock', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'hip-hop', label: 'Hip Hop', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'r&b', label: 'R&B', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'electronic', label: 'Electronic', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { value: 'jazz', label: 'Jazz', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'folk', label: 'Folk', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'indie', label: 'Indie', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'soul', label: 'Soul', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

const moodOptions = [
  'happy', 'sad', 'energetic', 'chill', 'angry', 
  'romantic', 'inspirational', 'dark', 'uplifting', 'melancholic'
];

const CreateSession = () => {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    mood: '',
    theme: '',
    guidelines: '',
    targetBPM: '',
    maxParticipants: '',
    settings: {
      lyricsDeadline: '',
      votingDeadline: '',
      allowAnonymous: false,
      minReputationToSubmit: 0,
      votingSystem: 'simple',
      maxLyricsPerUser: 1,
      showVoteCountsDuringVoting: false,
    },
    schedule: {
      scheduledStart: '',
    },
    tags: '',
    visibility: 'public',
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/sessions', data);
      return response.data;
    },
    onSuccess: (data) => {
      navigate(`/session/${data.data.session._id}`);
    },
  });

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      targetBPM: formData.targetBPM ? parseInt(formData.targetBPM) : undefined,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      settings: {
        ...formData.settings,
        lyricsDeadline: formData.settings.lyricsDeadline || undefined,
        votingDeadline: formData.settings.votingDeadline || undefined,
      },
      schedule: {
        scheduledStart: formData.schedule.scheduledStart || undefined,
      },
    };

    createSessionMutation.mutate(submitData);
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.title.trim().length >= 3 && formData.genre;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Basic Information</h2>
              <p className="text-gray-500">Give your session a name and choose a genre.</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Session Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Summer Vibes Collab"
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {genreOptions.map((genre) => (
                  <button
                    key={genre.value}
                    type="button"
                    onClick={() => handleChange('genre', genre.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                      formData.genre === genre.value
                        ? cn(genre.color, 'border-current')
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {genre.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Tell participants what this session is about..."
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood
              </label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => handleChange('mood', formData.mood === mood ? '' : mood)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all',
                      formData.mood === mood
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Guidelines & Theme</h2>
              <p className="text-gray-500">Help participants understand what you're looking for.</p>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Theme
              </label>
              <input
                type="text"
                value={formData.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                placeholder="e.g., Summer love, Overcoming challenges"
                maxLength={200}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Guidelines */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Guidelines for Participants
              </label>
              <textarea
                value={formData.guidelines}
                onChange={(e) => handleChange('guidelines', e.target.value)}
                placeholder="Share any specific requirements or tips for participants..."
                rows={4}
                maxLength={1000}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Target BPM */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Target BPM (optional)
              </label>
              <input
                type="number"
                value={formData.targetBPM}
                onChange={(e) => handleChange('targetBPM', e.target.value)}
                placeholder="e.g., 120"
                min={40}
                max={220}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="e.g., summer, love, upbeat"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Settings & Schedule</h2>
              <p className="text-gray-500">Configure how the session works.</p>
            </div>

            {/* Voting System */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voting System
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'simple', label: 'Simple', desc: 'One vote per person' },
                  { value: 'weighted', label: 'Weighted', desc: 'Based on reputation' },
                  { value: 'tokenized', label: 'Tokenized', desc: 'Spend tokens to vote' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('settings.votingSystem', option.value)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      formData.settings.votingSystem === option.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Max Participants (leave empty for unlimited)
              </label>
              <input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleChange('maxParticipants', e.target.value)}
                placeholder="Unlimited"
                min={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Lyrics Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Lyrics Submission Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.settings.lyricsDeadline}
                onChange={(e) => handleChange('settings.lyricsDeadline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Voting Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Voting Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.settings.votingDeadline}
                onChange={(e) => handleChange('settings.votingDeadline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.allowAnonymous}
                  onChange={(e) => handleChange('settings.allowAnonymous', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Allow anonymous submissions</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.showVoteCountsDuringVoting}
                  onChange={(e) => handleChange('settings.showVoteCountsDuringVoting', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Show vote counts during voting</span>
              </label>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="flex gap-3">
                {['public', 'unlisted', 'private'].map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => handleChange('visibility', vis)}
                    className={cn(
                      'px-4 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all',
                      formData.visibility === vis
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {vis}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Check admin access
  useEffect(() => {
    if (!loading && isAuthenticated && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isAuthenticated, loading, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          Only administrators can create sessions. Contact an admin if you need session creation privileges.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Session</h1>
        <p className="text-gray-600">Set up a new music creation session</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all',
                s === step && 'bg-indigo-600 text-white',
                s < step && 'bg-green-500 text-white cursor-pointer',
                s > step && 'bg-gray-200 text-gray-500'
              )}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </button>
            {s < 3 && (
              <div className={cn(
                'flex-1 h-1 mx-2 rounded',
                s < step ? 'bg-green-500' : 'bg-gray-200'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6 mb-6">
        {renderStep()}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            variant="primary"
            onClick={() => setStep(step + 1)}
            disabled={!isStepValid()}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isStepValid() || createSessionMutation.isLoading}
            className="flex items-center gap-2"
          >
            {createSessionMutation.isLoading ? 'Creating...' : 'Create Session'}
            <Music className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Error */}
      {createSessionMutation.error && (
        <Card className="mt-4 p-4 bg-red-50 border-red-200">
          <p className="text-red-600 text-sm">
            {createSessionMutation.error.response?.data?.error?.message || 'Failed to create session'}
          </p>
        </Card>
      )}
    </div>
  );
};

export default CreateSession;

