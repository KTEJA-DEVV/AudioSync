import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Music,
  Users,
  Clock,
  Play,
  Edit,
  Trash2,
  Radio,
  Calendar,
  ChevronRight,
  Send,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';

// Import components
import LyricsSubmissionForm from '../components/sessions/LyricsSubmissionForm';
import LyricsList from '../components/sessions/LyricsList';
import VotingInterface from '../components/sessions/VotingInterface';
import FeedbackSection from '../components/sessions/FeedbackSection';

const SessionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Check if current user is the host
  const isHost = session?.host?._id === user?._id || session?.host === user?._id;
  const canManageSession = isAdmin || isHost;

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/sessions/${id}`);
      setSession(response.data.data);
    } catch (error) {
      toast.error('Failed to load session');
      navigate('/sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await api.delete(`/sessions/${id}`);
      toast.success('Session deleted successfully');
      navigate('/sessions');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  const handleAdvanceStage = async () => {
    try {
      const response = await api.put(`/sessions/${id}/stage`);
      setSession(response.data.data);
      toast.success('Session stage advanced');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to advance stage');
    }
  };

  const handleGoLive = async () => {
    try {
      const response = await api.post(`/sessions/${id}/go-live`);
      setSession(response.data.data);
      toast.success('Session is now live!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to go live');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div className="flex-1">
          {/* Genre Badge */}
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full mb-3">
            {session.genre}
          </span>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.title}</h1>
          <p className="text-gray-600 mb-4">{session.description}</p>
          
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {session.stats?.totalParticipants || 0} participants
            </span>
            <span className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              {session.stats?.totalSubmissions || 0} submissions
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Stage {session.stage} of 5
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Join/Watch Live - Available to all authenticated users */}
          {session.status === 'live' && (
            <Link
              to={`/live/${session._id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              Watch Live
            </Link>
          )}

          {/* Participate Button - Available to all authenticated users during appropriate stages */}
          {isAuthenticated && ['lyrics-open', 'lyrics-voting'].includes(session.status) && (
            <button
              onClick={() => setActiveTab(session.status === 'lyrics-open' ? 'submit' : 'vote')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {session.status === 'lyrics-open' ? (
                <>
                  <Send className="w-5 h-5" />
                  Submit Lyrics
                </>
              ) : (
                <>
                  <ThumbsUp className="w-5 h-5" />
                  Vote Now
                </>
              )}
            </button>
          )}

          {/* Admin/Host Only Actions */}
          {canManageSession && (
            <>
              <Link
                to={`/sessions/${session._id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <Edit className="w-5 h-5" />
                Edit
              </Link>
              
              {session.status !== 'live' && session.status !== 'completed' && (
                <button
                  onClick={handleAdvanceStage}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                  Advance Stage
                </button>
              )}
              
              {session.status === 'scheduled' && (
                <button
                  onClick={handleGoLive}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                >
                  <Radio className="w-5 h-5" />
                  Go Live
                </button>
              )}
              
              {isAdmin && (
                <button
                  onClick={handleDeleteSession}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Banner for Non-Authenticated Users */}
      {!isAuthenticated && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-8">
          <p className="text-indigo-800">
            <Link to="/login" className="font-medium underline">Login</Link> or{' '}
            <Link to="/register" className="font-medium underline">create an account</Link> to participate in this session, submit lyrics, vote, and give feedback.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'submissions', label: 'Submissions' },
            { id: 'vote', label: 'Vote', show: session.status === 'lyrics-voting' },
            { id: 'submit', label: 'Submit', show: session.status === 'lyrics-open' && isAuthenticated },
            { id: 'feedback', label: 'Feedback' },
          ]
            .filter(tab => tab.show !== false)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></span>
                )}
              </button>
            ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Session Info Card */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Session</h3>
                <p className="text-gray-600">{session.description || 'No description provided.'}</p>
              </div>
              
              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
                <LyricsList sessionId={session._id} limit={5} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Host Info */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Hosted By</h3>
                <div className="flex items-center gap-3">
                  <img
                    src={session.host?.avatar || `https://ui-avatars.com/api/?name=${session.host?.username}`}
                    alt={session.host?.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{session.host?.displayName || session.host?.username}</p>
                    <p className="text-sm text-gray-500">@{session.host?.username}</p>
                  </div>
                </div>
              </div>

              {/* Session Stats */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants</span>
                    <span className="font-medium">{session.stats?.totalParticipants || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submissions</span>
                    <span className="font-medium">{session.stats?.totalSubmissions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Votes</span>
                    <span className="font-medium">{session.stats?.totalVotes || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <LyricsList sessionId={session._id} />
        )}

        {activeTab === 'submit' && isAuthenticated && session.status === 'lyrics-open' && (
          <LyricsSubmissionForm sessionId={session._id} onSubmit={fetchSession} />
        )}

        {activeTab === 'vote' && session.status === 'lyrics-voting' && (
          <VotingInterface sessionId={session._id} />
        )}

        {activeTab === 'feedback' && (
          <FeedbackSection sessionId={session._id} canSubmit={isAuthenticated} />
        )}
      </div>
    </div>
  );
};

export default SessionDetailPage;
