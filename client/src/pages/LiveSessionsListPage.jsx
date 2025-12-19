import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn, formatRelativeTime } from '../utils/helpers';
import api from '../services/api';
import { Badge, Button, Spinner } from '../components/ui';
import {
  PlayIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon,
  BellIcon,
} from '@heroicons/react/24/solid';

/**
 * Live session card component
 */
const LiveSessionCard = ({ session, variant = 'default' }) => {
  const isLive = session.status === 'live';
  const isUpcoming = session.status === 'scheduled';
  const isEnded = session.status === 'ended';

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatScheduledTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = d - now;
    
    if (diff < 0) return 'Starting soon';
    if (diff < 3600000) return `In ${Math.ceil(diff / 60000)} min`;
    if (diff < 86400000) return `In ${Math.ceil(diff / 3600000)} hours`;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (variant === 'hero' && isLive) {
    return (
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Thumbnail */}
            <div className="md:w-2/5 aspect-video bg-black/20 rounded-xl overflow-hidden">
              {session.thumbnail ? (
                <img src={session.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PlayIcon className="w-16 h-16 text-white/50" />
                </div>
              )}
              {/* LIVE badge */}
              <div className="absolute top-4 left-4">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  LIVE
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-center text-white">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{session.title}</h2>
              
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={session.host?.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-white/30"
                />
                <span className="font-medium">
                  {session.host?.displayName || session.host?.username}
                </span>
              </div>

              <div className="flex items-center gap-4 text-white/80 mb-6">
                <span className="flex items-center gap-1">
                  <UserGroupIcon className="w-5 h-5" />
                  {session.engagement?.currentViewers?.toLocaleString() || 0} watching
                </span>
                {session.category && (
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {session.category}
                  </Badge>
                )}
              </div>

              <Link to={`/live/${session._id}`}>
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Join Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={isEnded ? `/live/${session._id}/replay` : `/live/${session._id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
        {session.thumbnail ? (
          <img src={session.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayIcon className="w-10 h-10 text-gray-400" />
          </div>
        )}

        {/* Status badge */}
        {isLive && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}
        {isUpcoming && (
          <div className="absolute top-2 left-2">
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs font-medium">
              {formatScheduledTime(session.scheduledStart)}
            </span>
          </div>
        )}

        {/* Viewer count or duration */}
        <div className="absolute bottom-2 right-2">
          {isLive && (
            <span className="bg-black/70 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
              <UserGroupIcon className="w-3 h-3" />
              {session.engagement?.currentViewers?.toLocaleString() || 0}
            </span>
          )}
          {isEnded && session.duration && (
            <span className="bg-black/70 text-white px-2 py-0.5 rounded text-xs">
              {formatDuration(session.duration)}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex gap-3">
          <img
            src={session.host?.avatar}
            alt=""
            className="w-9 h-9 rounded-full flex-shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {session.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {session.host?.displayName || session.host?.username}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEnded && formatRelativeTime(session.endedAt)}
              {isUpcoming && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {formatScheduledTime(session.scheduledStart)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

/**
 * LiveSessionsListPage - Browse live, upcoming, and past sessions
 */
const LiveSessionsListPage = () => {
  const [liveSessions, setLiveSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const [liveRes, upcomingRes, pastRes] = await Promise.all([
          api.get('/live-sessions/live'),
          api.get('/live-sessions/upcoming'),
          api.get('/live-sessions/past'),
        ]);

        setLiveSessions(liveRes.data.data.sessions || []);
        setUpcomingSessions(upcomingRes.data.data.sessions || []);
        setPastSessions(pastRes.data.data.sessions || []);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const featuredLive = liveSessions[0];
  const otherLive = liveSessions.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero - Currently Live */}
      {featuredLive && (
        <section className="mb-8">
          <LiveSessionCard session={featuredLive} variant="hero" />
        </section>
      )}

      {/* Other Live Sessions */}
      {otherLive.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherLive.map((session) => (
              <LiveSessionCard key={session._id} session={session} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-indigo-600" />
            Upcoming
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {upcomingSessions.map((session) => (
              <LiveSessionCard key={session._id} session={session} />
            ))}
          </div>
        </section>
      )}

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Past Sessions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pastSessions.map((session) => (
              <LiveSessionCard key={session._id} session={session} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {liveSessions.length === 0 && upcomingSessions.length === 0 && pastSessions.length === 0 && (
        <div className="text-center py-16">
          <PlayIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Live Sessions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There are no live sessions right now. Check back later or create your own!
          </p>
          <Link to="/create-live-session">
            <Button>Create a Live Session</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default LiveSessionsListPage;

