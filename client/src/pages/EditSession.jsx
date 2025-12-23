import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Save,
  Trash2
} from 'lucide-react';
import { cn } from '../utils/helpers';

const genreOptions = [
  'Hip Hop', 'Pop', 'Rock', 'R&B', 'Electronic', 'Jazz', 'Classical', 
  'Country', 'Metal', 'Folk', 'Reggae', 'Blues', 'Punk', 'Soul', 'Funk'
];

const sessionTypes = [
  { id: 'lyrics', label: 'Lyrics Writing', icon: <Music className="w-5 h-5" /> },
  { id: 'mixing', label: 'Mixing', icon: <Settings className="w-5 h-5" /> },
  { id: 'mastering', label: 'Mastering', icon: <ShieldAlert className="w-5 h-5" /> },
  { id: 'listening', label: 'Listening Party', icon: <Users className="w-5 h-5" /> },
];

const EditSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sessionType: '',
    genre: '',
    startTime: '',
    duration: 60,
    maxParticipants: 10,
    isPrivate: false,
    password: '',
    requirements: ''
  });

  // Fetch session data
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/sessions/${id}`);
      return data;
    },
    onSuccess: (data) => {
      setFormData({
        title: data.title,
        description: data.description,
        sessionType: data.sessionType,
        genre: data.genre,
        startTime: new Date(data.startTime).toISOString().slice(0, 16),
        duration: data.duration,
        maxParticipants: data.maxParticipants,
        isPrivate: data.isPrivate,
        password: data.password || '',
        requirements: data.requirements || ''
      });
    },
    enabled: !!id
  });

  const updateSession = useMutation({
    mutationFn: (data) => api.put(`/sessions/${id}`, data),
    onSuccess: () => {
      toast.success('Session updated successfully');
      navigate(`/session/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update session');
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSession.mutate(formData);
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-elevated transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Edit Session</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-6">Session Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Session Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Genre</label>
                  <select
                    name="genre"
                    value={formData.genre}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Select a genre</option>
                    {genreOptions.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Session Settings */}
          {step === 2 && (
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-6">Session Settings</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    min="15"
                    max="240"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Participants</label>
                  <input
                    type="number"
                    name="maxParticipants"
                    min="1"
                    max="50"
                    value={formData.maxParticipants}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      name="isPrivate"
                      checked={formData.isPrivate}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="isPrivate" className="ml-2 text-sm font-medium">
                      Private Session
                    </label>
                  </div>
                </div>

                {formData.isPrivate && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Password (optional)</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Leave empty for no password"
                      className="w-full p-3 rounded-lg bg-elevated border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 3: Review & Update */}
          {step === 3 && (
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-6">Review & Update</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Session Details</h3>
                  <div className="bg-elevated p-4 rounded-lg">
                    <p className="text-lg font-semibold">{formData.title}</p>
                    <p className="text-text-secondary mt-1">{formData.description}</p>
                    <div className="mt-2 flex items-center text-sm text-text-tertiary">
                      <Music className="w-4 h-4 mr-1" />
                      <span>{formData.genre}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Session Settings</h3>
                  <div className="bg-elevated p-4 rounded-lg space-y-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-text-tertiary" />
                      <span>{new Date(formData.startTime).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-text-tertiary" />
                      <span>{formData.duration} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-text-tertiary" />
                      <span>Max {formData.maxParticipants} participants</span>
                      {formData.isPrivate && (
                        <Badge variant="secondary" className="ml-2">
                          {formData.password ? 'Password Protected' : 'Private'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="confirm"
                      required
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="confirm" className="ml-2 text-sm">
                      I confirm that all information is correct
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <div>
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
            </div>

            <div className="flex space-x-4">
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex items-center bg-green-600 hover:bg-green-700"
                  isLoading={updateSession.isLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Session
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSession;
