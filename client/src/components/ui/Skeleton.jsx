import React from 'react';
import { cn } from '../../utils/helpers';

/**
 * Skeleton loading component with various presets
 */

// Base Skeleton
const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className
      )}
      {...props}
    />
  );
};

// Text Line Skeleton
const SkeletonText = ({ lines = 1, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

// Avatar Skeleton
const SkeletonAvatar = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton className={cn('rounded-full', sizes[size], className)} />
  );
};

// Card Skeleton
const SkeletonCard = ({ className }) => {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm', className)}>
      <div className="flex items-start gap-4">
        <SkeletonAvatar />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
};

// Session Card Skeleton
const SkeletonSessionCard = ({ className }) => {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm', className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonText lines={2} />
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Song Card Skeleton
const SkeletonSongCard = ({ className }) => {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm', className)}>
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
};

// User Card Skeleton
const SkeletonUserCard = ({ className }) => {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat Message Skeleton
const SkeletonChatMessage = ({ isOwn = false, className }) => {
  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse', className)}>
      <SkeletonAvatar size="sm" />
      <div className={cn('max-w-[70%] space-y-1', isOwn && 'items-end')}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-12 w-48 rounded-xl" />
      </div>
    </div>
  );
};

// Table Row Skeleton
const SkeletonTableRow = ({ columns = 5, className }) => {
  return (
    <div className={cn('flex items-center gap-4 py-4 px-6 border-b border-gray-100 dark:border-gray-800', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'flex-1'
          )}
        />
      ))}
    </div>
  );
};

// Stat Card Skeleton
const SkeletonStatCard = ({ className }) => {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
};

// Lyrics Skeleton
const SkeletonLyrics = ({ className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-5', i % 4 === 3 ? 'w-1/2' : 'w-full')}
          />
        ))}
      </div>
    </div>
  );
};

// Page Header Skeleton
const SkeletonPageHeader = ({ className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
};

// List Skeleton
const SkeletonList = ({ count = 5, Card = SkeletonCard, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
};

// Grid Skeleton
const SkeletonGrid = ({ count = 6, columns = 3, Card = SkeletonSongCard, className }) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns] || gridCols[3], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
};

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonSessionCard,
  SkeletonSongCard,
  SkeletonUserCard,
  SkeletonChatMessage,
  SkeletonTableRow,
  SkeletonStatCard,
  SkeletonLyrics,
  SkeletonPageHeader,
  SkeletonList,
  SkeletonGrid,
};

export default Skeleton;

