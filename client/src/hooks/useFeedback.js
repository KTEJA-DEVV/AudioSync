import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const UPDATE_BATCH_INTERVAL = 100; // Batch updates every 100ms (max 10fps)

/**
 * Hook for managing word cloud feedback state
 * @param {string} sessionId - Session ID to connect to
 * @param {Object} options - Configuration options
 * @returns {Object} Feedback state and controls
 */
const useFeedback = (sessionId, options = {}) => {
  const {
    autoConnect = true,
    maxWords = 100,
  } = options;

  const [words, setWords] = useState([]);
  const [stats, setStats] = useState({
    totalInputs: 0,
    uniqueWords: 0,
    sentiment: { score: 0, label: 'neutral' },
    status: 'closed',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  const socketRef = useRef(null);
  const pendingUpdatesRef = useRef(new Map());
  const updateTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  // Batch updates to prevent jank
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    setWords(prevWords => {
      const wordMap = new Map(prevWords.map(w => [w.word, w]));
      
      pendingUpdatesRef.current.forEach((update, word) => {
        if (update.deleted) {
          wordMap.delete(word);
        } else if (wordMap.has(word)) {
          const existing = wordMap.get(word);
          wordMap.set(word, { ...existing, count: update.count });
        } else {
          wordMap.set(word, update);
        }
      });

      // Sort by count and limit
      const sorted = Array.from(wordMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, maxWords);

      return sorted;
    });

    pendingUpdatesRef.current.clear();
  }, [maxWords]);

  // Start batch update timer
  useEffect(() => {
    updateTimerRef.current = setInterval(processPendingUpdates, UPDATE_BATCH_INTERVAL);
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [processPendingUpdates]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [cooldown > 0]);

  // Fetch initial data
  const fetchWords = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/sessions/${sessionId}/feedback/words`);
      const { words: fetchedWords, stats: fetchedStats } = response.data.data;
      
      setWords(fetchedWords || []);
      setStats(prev => ({ ...prev, ...fetchedStats }));
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.message || 'Failed to fetch feedback data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await api.get(`/sessions/${sessionId}/feedback/stats`);
      const fetchedStats = response.data.data;
      setStats(prev => ({ ...prev, ...fetchedStats }));
    } catch (err) {
      // Ignore stats errors
    }
  }, [sessionId]);

  // Socket connection
  useEffect(() => {
    if (!sessionId || !autoConnect) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('session:join', { sessionId });
      socket.emit('feedback:join', { sessionId });
      fetchWords();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
    });

    // Feedback events
    socket.on('feedback:started', (data) => {
      setStats(prev => ({ ...prev, status: 'open' }));
    });

    socket.on('feedback:stopped', (data) => {
      setStats(prev => ({
        ...prev,
        status: 'closed',
        totalInputs: data.stats?.totalInputs || prev.totalInputs,
        uniqueWords: data.stats?.uniqueWords || prev.uniqueWords,
      }));
    });

    socket.on('feedback:newWord', (data) => {
      pendingUpdatesRef.current.set(data.word, {
        word: data.word,
        count: data.count,
        category: data.category,
        isNew: true,
      });
      setStats(prev => ({ ...prev, uniqueWords: prev.uniqueWords + 1 }));
    });

    socket.on('feedback:wordUpdate', (data) => {
      pendingUpdatesRef.current.set(data.word, {
        word: data.word,
        count: data.newCount,
        isNew: false,
      });
    });

    socket.on('feedback:bulkUpdate', (data) => {
      data.words?.forEach(wordData => {
        pendingUpdatesRef.current.set(wordData.word, wordData);
      });
    });

    socket.on('feedback:wordDeleted', (data) => {
      pendingUpdatesRef.current.set(data.word, { word: data.word, deleted: true });
    });

    return () => {
      socket.emit('feedback:leave', { sessionId });
      socket.emit('session:leave', { sessionId });
      socket.disconnect();
    };
  }, [sessionId, autoConnect, fetchWords]);

  // Submit words
  const submitWords = useCallback(async (text, inputMethod = 'text') => {
    if (!sessionId || cooldown > 0) return { success: false };

    try {
      const response = await api.post(`/sessions/${sessionId}/feedback/words`, {
        text,
        inputMethod,
      });

      const { words: submittedWords } = response.data.data;

      // Add to recent submissions
      setRecentSubmissions(prev => [
        ...submittedWords.map(w => w.word),
        ...prev,
      ].slice(0, 5));

      // Optimistic update
      submittedWords.forEach(wordData => {
        pendingUpdatesRef.current.set(wordData.word, wordData);
      });

      setStats(prev => ({ ...prev, totalInputs: prev.totalInputs + 1 }));

      return { success: true, words: submittedWords };
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data.waitSeconds || 2);
        return { success: false, error: 'rate_limited', waitSeconds: err.response.data.waitSeconds };
      }
      setError(err.message || 'Failed to submit feedback');
      return { success: false, error: err.message };
    }
  }, [sessionId, cooldown]);

  // Submit voice input
  const submitVoice = useCallback(async (transcript) => {
    return submitWords(transcript, 'voice');
  }, [submitWords]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchWords();
    fetchStats();
  }, [fetchWords, fetchStats]);

  // Get word color based on category/sentiment
  const getWordColor = useCallback((word) => {
    const wordData = words.find(w => w.word === word);
    if (!wordData) return 'text-gray-300';

    switch (wordData.category) {
      case 'positive':
        return 'text-emerald-400';
      case 'negative':
        return 'text-red-400';
      case 'technical':
        return 'text-indigo-400';
      case 'mood':
        return 'text-purple-400';
      case 'genre':
        return 'text-amber-400';
      default:
        return 'text-gray-300';
    }
  }, [words]);

  return {
    words,
    stats,
    isConnected,
    isLoading,
    error,
    cooldown,
    recentSubmissions,
    submitWords,
    submitVoice,
    refresh,
    getWordColor,
  };
};

export default useFeedback;

