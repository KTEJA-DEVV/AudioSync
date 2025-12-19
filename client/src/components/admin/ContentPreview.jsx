import React from 'react';
import {
  UserIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/helpers';

const ContentPreview = ({ type, content, className }) => {
  if (!content) {
    return (
      <div className={cn('p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500', className)}>
        Content not available
      </div>
    );
  }

  const renderContent = () => {
    switch (type) {
      case 'user':
        return <UserPreview user={content} />;
      case 'song':
        return <SongPreview song={content} />;
      case 'submission':
        return <SubmissionPreview submission={content} />;
      case 'message':
        return <MessagePreview message={content} />;
      case 'session':
        return <SessionPreview session={content} />;
      default:
        return <GenericPreview data={content} />;
    }
  };

  return (
    <div className={cn('border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {getTypeIcon(type)}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">
          {type} Preview
        </span>
      </div>
      <div className="p-4">
        {renderContent()}
      </div>
    </div>
  );
};

const getTypeIcon = (type) => {
  const icons = {
    user: UserIcon,
    song: MusicalNoteIcon,
    submission: DocumentTextIcon,
    message: ChatBubbleLeftIcon,
    session: FolderIcon,
  };
  const Icon = icons[type] || DocumentTextIcon;
  return <Icon className="w-4 h-4 text-gray-500" />;
};

const UserPreview = ({ user }) => (
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
      {user.avatar ? (
        <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
      ) : (
        user.username?.[0]?.toUpperCase()
      )}
    </div>
    <div>
      <p className="font-medium text-gray-900 dark:text-white">{user.displayName || user.username}</p>
      <p className="text-sm text-gray-500">@{user.username}</p>
      {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
    </div>
    {user.role && (
      <span className={cn(
        'ml-auto px-2 py-1 text-xs font-medium rounded-full',
        user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
        user.role === 'moderator' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      )}>
        {user.role}
      </span>
    )}
  </div>
);

const SongPreview = ({ song }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-4">
      {song.coverArt ? (
        <img src={song.coverArt} alt={song.title} className="w-16 h-16 rounded-lg object-cover" />
      ) : (
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
          <MusicalNoteIcon className="w-8 h-8 text-white" />
        </div>
      )}
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{song.title || 'Untitled'}</p>
        {song.duration && (
          <p className="text-sm text-gray-500">
            {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
    {song.audioUrl && (
      <audio controls className="w-full h-10">
        <source src={song.audioUrl} />
      </audio>
    )}
  </div>
);

const SubmissionPreview = ({ submission }) => (
  <div className="space-y-3">
    {submission.content?.title && (
      <p className="font-medium text-gray-900 dark:text-white">{submission.content.title}</p>
    )}
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-6">
        {submission.content?.fullLyrics || submission.content?.text || 'No content'}
      </p>
    </div>
    {submission.author && (
      <p className="text-xs text-gray-500">
        by {submission.author.displayName || submission.author.username}
      </p>
    )}
  </div>
);

const MessagePreview = ({ message }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      {message.user && (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {message.user.displayName || message.user.username}
        </span>
      )}
      {message.createdAt && (
        <span className="text-xs text-gray-400">
          {new Date(message.createdAt).toLocaleString()}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {message.message || message.content}
    </p>
  </div>
);

const SessionPreview = ({ session }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="font-medium text-gray-900 dark:text-white">{session.title}</p>
      <span className={cn(
        'px-2 py-1 text-xs font-medium rounded-full capitalize',
        session.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
        session.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
        'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
      )}>
        {session.status}
      </span>
    </div>
    {session.description && (
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{session.description}</p>
    )}
    <div className="flex items-center gap-4 text-xs text-gray-500">
      {session.genre && <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">{session.genre}</span>}
      {session.host && (
        <span>Host: {session.host.displayName || session.host.username}</span>
      )}
    </div>
  </div>
);

const GenericPreview = ({ data }) => (
  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-48 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    {JSON.stringify(data, null, 2)}
  </pre>
);

export default ContentPreview;

