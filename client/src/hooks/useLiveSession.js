import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Hook for managing live session state
 */
const useLiveSession = (sessionId, options = {}) => {
  const {
    autoConnect = true,
    isHost = false,
  } = options;

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [hypeLevel, setHypeLevel] = useState(0);
  const [currentVotingRound, setCurrentVotingRound] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [reactions, setReactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/live-sessions/${sessionId}`);
      setSession(response.data.data.session);
      setHypeLevel(response.data.data.session.engagement?.hypeLevel || 0);
      setViewerCount(response.data.data.session.engagement?.currentViewers || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await api.get(`/live-sessions/${sessionId}/chat`);
      setMessages(response.data.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [sessionId]);

  // Fetch current voting round
  const fetchVotingRound = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await api.get(`/live-sessions/${sessionId}/voting-round/current`);
      setCurrentVotingRound(response.data.data.round);
    } catch (err) {
      console.error('Failed to fetch voting round:', err);
    }
  }, [sessionId]);

  // Socket connection
  useEffect(() => {
    if (!sessionId || !autoConnect) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('live:join', { sessionId });
      fetchSession();
      fetchMessages();
      fetchVotingRound();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Live state
    socket.on('live:state', (data) => {
      setHypeLevel(data.hypeLevel || 0);
      setViewerCount(data.viewerCount || 0);
      if (data.activeVotingRound) {
        setCurrentVotingRound(data.activeVotingRound);
      }
    });

    // Viewer count
    socket.on('viewer:count', ({ count }) => {
      setViewerCount(count);
    });

    // Session status
    socket.on('session:status', (data) => {
      setSession(prev => prev ? { ...prev, status: data.status } : null);
    });

    // Chat messages
    socket.on('chat:message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('chat:delete', ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isDeleted: true, message: '[Message deleted]' } : m
      ));
    });

    socket.on('chat:highlight', (message) => {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, type: 'highlighted' } : m
      ));
    });

    // Reactions
    socket.on('reaction:burst', (reaction) => {
      setReactions(prev => [...prev, reaction]);
      // Clear reaction after animation
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r !== reaction));
      }, 2000);
    });

    // Hype updates
    socket.on('hype:update', (data) => {
      setHypeLevel(data.hypeLevel);
    });

    // Voting
    socket.on('voting:start', (data) => {
      setCurrentVotingRound(data.round);
    });

    socket.on('voting:update', (data) => {
      setCurrentVotingRound(prev => {
        if (!prev || prev.roundNumber !== data.roundNumber) return prev;
        return {
          ...prev,
          options: prev.options.map(opt => ({
            ...opt,
            votes: data.options.find(o => o.id === opt.id)?.votes || opt.votes,
          })),
        };
      });
    });

    socket.on('voting:end', (data) => {
      setCurrentVotingRound(data.round);
    });

    // Activity changes
    socket.on('activity:change', (activity) => {
      setSession(prev => prev ? { ...prev, currentActivity: activity } : null);
    });

    return () => {
      socket.emit('live:leave', { sessionId });
      socket.disconnect();
    };
  }, [sessionId, autoConnect, fetchSession, fetchMessages, fetchVotingRound]);

  // Send chat message
  const sendMessage = useCallback(async (message) => {
    if (!sessionId) return;

    try {
      await api.post(`/live-sessions/${sessionId}/chat`, { message });
    } catch (err) {
      if (err.response?.status === 429) {
        return { error: 'rate_limited', waitSeconds: err.response.data.waitSeconds };
      }
      throw err;
    }
  }, [sessionId]);

  // Send reaction
  const sendReaction = useCallback(async (type) => {
    if (!sessionId) return;

    try {
      await api.post(`/live-sessions/${sessionId}/react`, { type });
    } catch (err) {
      // Ignore rate limit errors for reactions
    }
  }, [sessionId]);

  // Cast vote
  const castVote = useCallback(async (optionId) => {
    if (!sessionId || !currentVotingRound) return;

    try {
      await api.put(`/live-sessions/${sessionId}/voting-round/${currentVotingRound.roundNumber}/vote`, {
        optionId,
      });
      setUserVotes(prev => ({
        ...prev,
        [currentVotingRound.roundNumber]: optionId,
      }));
    } catch (err) {
      throw err;
    }
  }, [sessionId, currentVotingRound]);

  // Host actions
  const goLive = useCallback(async () => {
    if (!sessionId || !isHost) return;
    const response = await api.post(`/live-sessions/${sessionId}/go-live`);
    setSession(response.data.data.session);
  }, [sessionId, isHost]);

  const endStream = useCallback(async () => {
    if (!sessionId || !isHost) return;
    const response = await api.post(`/live-sessions/${sessionId}/end`);
    setSession(response.data.data.session);
  }, [sessionId, isHost]);

  const pauseStream = useCallback(async () => {
    if (!sessionId || !isHost) return;
    const response = await api.post(`/live-sessions/${sessionId}/pause`);
    setSession(response.data.data.session);
  }, [sessionId, isHost]);

  const changeActivity = useCallback(async (type, data = null) => {
    if (!sessionId || !isHost) return;
    const response = await api.post(`/live-sessions/${sessionId}/activity`, { type, data });
    setSession(prev => prev ? { ...prev, currentActivity: response.data.data.activity } : null);
  }, [sessionId, isHost]);

  const startVotingRound = useCallback(async (roundData) => {
    if (!sessionId || !isHost) return;
    const response = await api.post(`/live-sessions/${sessionId}/voting-round`, roundData);
    setCurrentVotingRound(response.data.data.round);
  }, [sessionId, isHost]);

  return {
    session,
    messages,
    viewerCount,
    hypeLevel,
    currentVotingRound,
    userVotes,
    reactions,
    isConnected,
    isLoading,
    error,
    // Actions
    sendMessage,
    sendReaction,
    castVote,
    refresh: fetchSession,
    // Host actions
    goLive,
    endStream,
    pauseStream,
    changeActivity,
    startVotingRound,
  };
};

export default useLiveSession;

