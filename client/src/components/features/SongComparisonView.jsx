import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/helpers';
import { AudioPlayer, WaveformVisualizer } from '../ui';
import {
  PlayIcon,
  PauseIcon,
  ArrowsRightLeftIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  HandThumbUpIcon,
} from '@heroicons/react/24/solid';

const SongComparisonView = ({
  songs = [],
  isVotingOpen = false,
  onVote,
  votedSongId,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'sideBySide', 'tabs'
  const [activeTab, setActiveTab] = useState(0);
  const [syncPlayback, setSyncPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSection, setCurrentSection] = useState(null);
  const audioRefs = useRef([]);

  // Sync playback across all songs
  const handlePlayPause = () => {
    if (syncPlayback) {
      if (isPlaying) {
        audioRefs.current.forEach(audio => audio?.pause());
      } else {
        audioRefs.current.forEach(audio => audio?.play().catch(() => {}));
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Sync seek across all songs
  const handleSeek = (time) => {
    if (syncPlayback) {
      audioRefs.current.forEach(audio => {
        if (audio) audio.currentTime = time;
      });
    }
    setCurrentTime(time);
  };

  // Section navigation
  const jumpToSection = (sectionName) => {
    const section = songs[0]?.sections?.find(s => s.name === sectionName);
    if (section) {
      handleSeek(section.startTime);
      setCurrentSection(sectionName);
    }
  };

  // Get unique sections from first song
  const sections = songs[0]?.sections || [];

  // A/B comparison
  const [abMode, setAbMode] = useState(false);
  const [songA, setSongA] = useState(0);
  const [songB, setSongB] = useState(1);

  const renderSongCard = (song, index, showVoteButton = true) => (
    <div
      key={song.id}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border',
        votedSongId === song.id
          ? 'border-indigo-500 ring-2 ring-indigo-500'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Cover art */}
      <div
        className="h-32 relative"
        style={{
          background: song.coverArt?.startsWith('linear-gradient')
            ? song.coverArt
            : `url(${song.coverArt}) center/cover`,
          backgroundColor: '#6366f1',
        }}
      >
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <span className="bg-black/60 text-white px-4 py-2 rounded-full font-bold">
            Version {song.versionLabel || song.version}
          </span>
        </div>
      </div>

      {/* Player */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 truncate">
          {song.title}
        </h3>

        {/* Mini waveform */}
        <div className="mb-3">
          <WaveformVisualizer
            waveformData={song.waveformData || []}
            progress={syncPlayback ? (currentTime / (song.duration || 1)) * 100 : 0}
            duration={song.duration || 0}
            onSeek={handleSeek}
            height={40}
            barWidth={2}
            barGap={1}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span>{song.generationParams?.tempo || '–'} BPM</span>
          <span>{song.generationParams?.key || 'Auto'}</span>
          <span>
            {Math.floor((song.duration || 0) / 60)}:{String(Math.floor((song.duration || 0) % 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Vote button */}
        {isVotingOpen && showVoteButton && (
          <button
            onClick={() => onVote?.(song.id)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all',
              votedSongId === song.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
            )}
          >
            <HandThumbUpIcon className="w-5 h-5" />
            {votedSongId === song.id ? 'Voted' : 'Vote for this version'}
            <span className="ml-2 bg-black/20 px-2 py-0.5 rounded-full text-sm">
              {song.votes || 0}
            </span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        {/* View mode toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid'
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600'
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            title="Grid view"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('sideBySide')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'sideBySide'
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600'
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            title="Side by side"
          >
            <ViewColumnsIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setAbMode(!abMode)}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-lg transition-colors',
              abMode
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600'
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            title="A/B Compare"
          >
            <ArrowsRightLeftIcon className="w-5 h-5" />
            <span className="text-sm font-medium">A/B</span>
          </button>
        </div>

        {/* Sync playback toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncPlayback}
              onChange={(e) => setSyncPlayback(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Sync playback
            </span>
          </label>

          {syncPlayback && (
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="w-5 h-5" />
                  Pause All
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Play All
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Section navigation */}
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.name}
              onClick={() => jumpToSection(section.name)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full transition-colors',
                currentSection === section.name
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
              )}
            >
              {section.name}
            </button>
          ))}
        </div>
      )}

      {/* A/B Comparison Mode */}
      {abMode && songs.length >= 2 && (
        <div className="space-y-4">
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version A
              </label>
              <select
                value={songA}
                onChange={(e) => setSongA(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                {songs.map((song, i) => (
                  <option key={song.id} value={i}>
                    Version {song.versionLabel || song.version}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version B
              </label>
              <select
                value={songB}
                onChange={(e) => setSongB(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                {songs.map((song, i) => (
                  <option key={song.id} value={i}>
                    Version {song.versionLabel || song.version}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* A/B Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {songs[songA] && (
              <div className="relative">
                <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                  A
                </div>
                {renderSongCard(songs[songA], songA)}
              </div>
            )}
            {songs[songB] && (
              <div className="relative">
                <div className="absolute -top-3 left-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                  B
                </div>
                {renderSongCard(songs[songB], songB)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regular grid/side-by-side view */}
      {!abMode && (
        <div
          className={cn(
            'grid gap-6',
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2'
          )}
        >
          {songs.map((song, index) => renderSongCard(song, index))}
        </div>
      )}

      {/* Tabbed view for mobile */}
      {viewMode === 'tabs' && (
        <div>
          {/* Tab headers */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
            {songs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => setActiveTab(index)}
                className={cn(
                  'px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors',
                  activeTab === index
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                Version {song.versionLabel || song.version}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          {songs[activeTab] && (
            <div className="max-w-lg mx-auto">
              {renderSongCard(songs[activeTab], activeTab)}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {songs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No songs to compare yet
          </p>
        </div>
      )}
    </div>
  );
};

SongComparisonView.propTypes = {
  songs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      version: PropTypes.number,
      versionLabel: PropTypes.string,
      audioUrl: PropTypes.string,
      coverArt: PropTypes.string,
      waveformData: PropTypes.arrayOf(PropTypes.number),
      duration: PropTypes.number,
      votes: PropTypes.number,
      sections: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          startTime: PropTypes.number,
          endTime: PropTypes.number,
        })
      ),
      generationParams: PropTypes.shape({
        tempo: PropTypes.number,
        key: PropTypes.string,
      }),
    })
  ),
  isVotingOpen: PropTypes.bool,
  onVote: PropTypes.func,
  votedSongId: PropTypes.string,
  className: PropTypes.string,
};

export default SongComparisonView;

