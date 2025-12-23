import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const SessionDetailAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModerating, setIsModerating] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await api.get(`/admin/sessions/${id}`);
        // setSession(response.data);
        
        // Mock data for now
        setTimeout(() => {
          setSession({
            id,
            title: 'Songwriting Session #123',
            creator: 'user123',
            status: 'active',
            participants: 12,
            createdAt: '2023-01-15T10:30:00Z',
            updatedAt: '2023-01-15T12:45:00Z',
            description: 'Collaborative songwriting session for our new single',
            isFlagged: false,
            reportedBy: []
          });
          setLoading(false);
        }, 500);
      } catch (err) {
        setError('Failed to load session details');
        setLoading(false);
        console.error('Error fetching session:', err);
      }
    };

    fetchSession();
  }, [id]);

  const handleModerate = async (action) => {
    try {
      setIsModerating(true);
      // TODO: Replace with actual API call
      // await api.post(`/admin/sessions/${id}/moderate`, { action });
      
      toast.success(`Session ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      navigate('/admin/sessions');
    } catch (err) {
      toast.error(`Failed to ${action} session`);
      console.error(`Error ${action}ing session:`, err);
    } finally {
      setIsModerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">Session not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">The requested session could not be found.</p>
        <div className="mt-6">
          <Button onClick={() => navigate('/admin/sessions')} variant="outline">
            <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
            Back to sessions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="-ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="mt-2 text-2xl font-bold">Session Details</h1>
        </div>
        
        <div className="flex space-x-2">
          {session.status === 'pending' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleModerate('reject')}
                disabled={isModerating}
              >
                {isModerating ? 'Processing...' : 'Reject'}
              </Button>
              <Button
                onClick={() => handleModerate('approve')}
                disabled={isModerating}
              >
                {isModerating ? 'Processing...' : 'Approve'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{session.title}</h2>
            <div className="flex items-center">
              {session.status === 'active' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Session ID</h3>
              <p className="mt-1">{session.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Creator</h3>
              <p className="mt-1">{session.creator}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Participants</h3>
              <p className="mt-1">{session.participants}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
              <p className="mt-1">{new Date(session.createdAt).toLocaleString()}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
              <p className="mt-1 text-foreground">{session.description}</p>
            </div>
          </div>

          {session.isFlagged && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    This session has been flagged for review. Reported by {session.reportedBy.length} user(s).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SessionDetailAdmin;
