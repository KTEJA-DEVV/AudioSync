import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const PlayContext = createContext(null);

export const usePlay = () => {
  const context = useContext(PlayContext);
  if (!context) {
    throw new Error('usePlay must be used within a PlayProvider');
  }
  return context;
};

export const PlayProvider = ({ children }) => {
  // Current song state
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Queue state
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  
  // Playback modes
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none', 'all', 'one'
  
  // Audio element ref
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      // Event listeners
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('error', handleError);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleError);
      }
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      playNext();
    }
  }, [repeat]);

  const handleError = useCallback((e) => {
    console.error('Audio playback error:', e);
    setIsPlaying(false);
  }, []);

  // Play a specific song
  const playSong = useCallback((song, songQueue = null, startIndex = 0) => {
    if (!song?.audioUrl) {
      console.error('No audio URL for song');
      return;
    }

    // Update queue if provided
    if (songQueue) {
      setQueue(songQueue);
      setQueueIndex(startIndex);
    }

    // Load and play
    setCurrentSong(song);
    audioRef.current.src = song.audioUrl;
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error('Play failed:', err);
        setIsPlaying(false);
      });
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current?.src) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [isPlaying]);

  // Pause
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Play next song
  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    setQueueIndex(nextIndex);
    playSong(queue[nextIndex]);
  }, [queue, queueIndex, shuffle, repeat, playSong]);

  // Play previous song
  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (audioRef.current?.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      if (repeat === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setQueueIndex(prevIndex);
    playSong(queue[prevIndex]);
  }, [queue, queueIndex, repeat, playSong]);

  // Seek to position
  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
    }
  }, [duration]);

  // Seek by percentage
  const seekPercent = useCallback((percent) => {
    const time = (percent / 100) * duration;
    seek(time);
  }, [duration, seek]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  // Cycle repeat mode
  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  // Add song to queue
  const addToQueue = useCallback((song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback((index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex(prev => prev - 1);
    }
  }, [queueIndex]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(0);
  }, []);

  // Move item in queue
  const moveInQueue = useCallback((fromIndex, toIndex) => {
    setQueue(prev => {
      const newQueue = [...prev];
      const [item] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, item);
      return newQueue;
    });

    // Update current index if needed
    if (fromIndex === queueIndex) {
      setQueueIndex(toIndex);
    } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
      setQueueIndex(prev => prev - 1);
    } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
      setQueueIndex(prev => prev + 1);
    }
  }, [queueIndex]);

  const value = {
    // State
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    shuffle,
    repeat,
    
    // Controls
    playSong,
    togglePlay,
    pause,
    playNext,
    playPrevious,
    seek,
    seekPercent,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    clearQueue,
    moveInQueue,
    
    // Computed
    progressPercent: duration > 0 ? (progress / duration) * 100 : 0,
    hasNext: queueIndex < queue.length - 1 || repeat === 'all',
    hasPrevious: queueIndex > 0 || repeat === 'all',
  };

  return (
    <PlayContext.Provider value={value}>
      {children}
    </PlayContext.Provider>
  );
};

PlayProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PlayContext;

