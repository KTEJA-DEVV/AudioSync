import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Avatar, Badge } from '../ui';
import { Users, Clock, Radio, Calendar, ChevronRight } from 'lucide-react';
import { cn, formatDuration } from '../../utils/helpers';

const genreColors = {
  'pop': 'border-l-pink-500 bg-pink-50',
  'rock': 'border-l-red-500 bg-red-50',
  'hip-hop': 'border-l-purple-500 bg-purple-50',
  'r&b': 'border-l-indigo-500 bg-indigo-50',
  'electronic': 'border-l-cyan-500 bg-cyan-50',
  'jazz': 'border-l-amber-500 bg-amber-50',
  'classical': 'border-l-gray-500 bg-gray-50',
  'country': 'border-l-orange-500 bg-orange-50',
  'folk': 'border-l-green-500 bg-green-50',
  'indie': 'border-l-teal-500 bg-teal-50',
  'metal': 'border-l-slate-500 bg-slate-50',
  'punk': 'border-l-lime-500 bg-lime-50',
  'soul': 'border-l-rose-500 bg-rose-50',
  'funk': 'border-l-yellow-500 bg-yellow-50',
  'reggae': 'border-l-emerald-500 bg-emerald-50',
  'blues': 'border-l-blue-500 bg-blue-50',
  'latin': 'border-l-red-400 bg-red-50',
  'world': 'border-l-violet-500 bg-violet-50',
  'other': 'border-l-gray-400 bg-gray-50',
};

const stageLabels = {
  1: 'Setup',
  2: 'Lyrics Open',
  3: 'Voting',
  4: 'Generating',
  5: 'Complete',
};

const StageIndicator = ({ currentStage, status }) => {
  const stages = [1, 2, 3, 4, 5];
  
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage) => (
        <div
          key={stage}
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            stage < currentStage && 'bg-green-500',
            stage === currentStage && status !== 'completed' && 'bg-indigo-500 animate-pulse',
            stage === currentStage && status === 'completed' && 'bg-green-500',
            stage > currentStage && 'bg-gray-200'
          )}
          title={stageLabels[stage]}
        />
      ))}
    </div>
  );
};

const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = React.useState('');
  const [urgency, setUrgency] = React.useState('normal');

  React.useEffect(() => {
    const updateTimer = () => {
      if (!deadline) {
        setTimeLeft('');
        return;
      }

      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        setUrgency('ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
        setUrgency(hours > 1 ? 'normal' : 'warning');
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
        setUrgency(minutes > 5 ? 'warning' : 'urgent');
      } else {
        setTimeLeft(`${seconds}s`);
        setUrgency('urgent');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft) return null;

  return (
    <span className={cn(
      'font-medium',
      urgency === 'normal' && 'text-green-600',
      urgency === 'warning' && 'text-yellow-600',
      urgency === 'urgent' && 'text-red-600',
      urgency === 'ended' && 'text-gray-500'
    )}>
      {timeLeft}
    </span>
  );
};

const SessionCard = ({ session, className = '' }) => {
  const {
    _id,
    id,
    title,
    genre,
    mood,
    host,
    status,
    stage,
    participantCount,
    stats,
    settings,
    schedule,
    isActive,
  } = session;

  const sessionId = _id || id;
  const genreColor = genreColors[genre] || genreColors.other;
  const participants = participantCount || stats?.totalParticipants || 0;

  const getStatusBadge = () => {
    if (status === 'lyrics-open') {
      return <Badge variant="primary" className="animate-pulse">Accepting Lyrics</Badge>;
    }
    if (status === 'lyrics-voting') {
      return <Badge variant="accent">Voting Now</Badge>;
    }
    if (isActive || ['generation', 'song-voting'].includes(status)) {
      return (
        <Badge variant="live" className="flex items-center gap-1">
          <Radio className="w-3 h-3" /> LIVE
        </Badge>
      );
    }
    if (status === 'completed') {
      return <Badge variant="success">Completed</Badge>;
    }
    if (status === 'draft' && schedule?.scheduledStart) {
      return <Badge variant="default">Upcoming</Badge>;
    }
    return <Badge variant="default">Draft</Badge>;
  };

  const getDeadline = () => {
    if (status === 'lyrics-open') return settings?.lyricsDeadline;
    if (status === 'lyrics-voting') return settings?.votingDeadline;
    return null;
  };

  return (
    <Link
      to={`/session/${sessionId}`}
      className={cn(
        'block bg-white rounded-lg border border-gray-100 border-l-4 p-4 hover:shadow-md transition-all group',
        genreColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="text-xs capitalize">{genre}</Badge>
            {getStatusBadge()}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
            {title}
          </h3>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
      </div>

      {/* Host Info */}
      {host && (
        <div className="flex items-center gap-2 mb-3">
          <Avatar src={host.avatar} name={host.displayName || host.username} size="sm" />
          <span className="text-sm text-gray-600">
            Hosted by <span className="font-medium">{host.displayName || host.username}</span>
          </span>
        </div>
      )}

      {/* Stage & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Participants */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{participants}</span>
          </div>

          {/* Stage Progress */}
          <StageIndicator currentStage={stage || 1} status={status} />
        </div>

        {/* Timer or Schedule */}
        <div className="flex items-center gap-1 text-sm">
          {getDeadline() ? (
            <>
              <Clock className="w-4 h-4 text-gray-400" />
              <CountdownTimer deadline={getDeadline()} />
            </>
          ) : schedule?.scheduledStart && status === 'draft' ? (
            <>
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">
                {new Date(schedule.scheduledStart).toLocaleDateString()}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Mood Tag */}
      {mood && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Mood: </span>
          <span className="text-xs font-medium text-gray-700 capitalize">{mood}</span>
        </div>
      )}
    </Link>
  );
};

SessionCard.propTypes = {
  session: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    genre: PropTypes.string.isRequired,
    mood: PropTypes.string,
    host: PropTypes.object,
    status: PropTypes.string,
    stage: PropTypes.number,
    participantCount: PropTypes.number,
    stats: PropTypes.object,
    settings: PropTypes.object,
    schedule: PropTypes.object,
    isActive: PropTypes.bool,
  }).isRequired,
  className: PropTypes.string,
};

export default SessionCard;

