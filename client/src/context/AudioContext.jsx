import React, { createContext, useContext, useReducer, useEffect } from 'react';
import useAudio from '../hooks/useAudio';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
  const [state, setState] = useReducer(
    (state, newState) => ({
      ...state,
      ...newState,
    }),
    {
      currentTrack: null,
      queue: [],
      isLooping: false,
      isShuffled: false,
      isPlayerExpanded: false,
    }
  );

  const audio = useAudio();

  // Load a new track
  const loadTrack = (track) => {
    if (!track) return;
    
    setState({ currentTrack: track });
    audio.loadTrack(track);
  };

  // Play/Pause toggle
  const togglePlay = () => {
    audio.togglePlay();
  };

  // Skip to next track in queue
  const nextTrack = () => {
    if (state.queue.length === 0) return;
    
    const currentIndex = state.queue.findIndex(
      (track) => track.id === state.currentTrack?.id
    );
    
    const nextIndex = (currentIndex + 1) % state.queue.length;
    const nextTrack = state.queue[nextIndex];
    
    if (nextTrack) {
      loadTrack(nextTrack);
    }
  };

  // Skip to previous track in queue
  const prevTrack = () => {
    if (state.queue.length === 0) return;
    
    const currentIndex = state.queue.findIndex(
      (track) => track.id === state.currentTrack?.id
    );
    
    const prevIndex = (currentIndex - 1 + state.queue.length) % state.queue.length;
    const prevTrack = state.queue[prevIndex];
    
    if (prevTrack) {
      loadTrack(prevTrack);
    }
  };

  // Toggle loop
  const toggleLoop = () => {
    setState({ isLooping: !state.isLooping });
    audio.audioRef.current.loop = !state.isLooping;
  };

  // Toggle player expansion
  const togglePlayerExpanded = () => {
    setState({ isPlayerExpanded: !state.isPlayerExpanded });
  };

  // Add tracks to queue
  const addToQueue = (tracks) => {
    if (!Array.isArray(tracks)) {
      tracks = [tracks];
    }
    
    setState({ 
      queue: [...state.queue, ...tracks] 
    });
    
    // If no current track, play the first one
    if (!state.currentTrack && tracks.length > 0) {
      loadTrack(tracks[0]);
    }
  };

  // Clear queue
  const clearQueue = () => {
    setState({ queue: [] });
  };

  // Effect to handle track end
  useEffect(() => {
    const audioElement = audio.audioRef.current;
    
    const handleEnded = () => {
      if (state.isLooping) {
        audioElement.currentTime = 0;
        audioElement.play();
      } else {
        nextTrack();
      }
    };
    
    audioElement.addEventListener('ended', handleEnded);
    
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [state.isLooping, state.queue, state.currentTrack]);

  return (
    <AudioContext.Provider
      value={{
        // State
        currentTrack: state.currentTrack,
        queue: state.queue,
        isPlaying: audio.isPlaying,
        currentTime: audio.currentTime,
        duration: audio.duration,
        volume: audio.volume,
        isMuted: audio.isMuted,
        isLooping: state.isLooping,
        isPlayerExpanded: state.isPlayerExpanded,
        
        // Actions
        loadTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        toggleLoop,
        togglePlayerExpanded,
        addToQueue,
        clearQueue,
        handleSeek: audio.handleSeek,
        handleVolumeChange: audio.handleVolumeChange,
        toggleMute: audio.toggleMute,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioProvider');
  }
  return context;
};

export default AudioContext;
