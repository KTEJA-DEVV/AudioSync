import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = () => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const connectSocket = () => {
  if (!socket) {
    initSocket();
  }
  
  if (!socket.connected) {
    socket.connect();
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const getSocket = () => socket;

// Session-specific methods
export const joinSession = (sessionId) => {
  if (socket?.connected) {
    socket.emit('join-session', sessionId);
  }
};

export const leaveSession = (sessionId) => {
  if (socket?.connected) {
    socket.emit('leave-session', sessionId);
  }
};

export const sendChatMessage = (sessionId, message, user) => {
  if (socket?.connected) {
    socket.emit('chat-message', { sessionId, message, user });
  }
};

export const sendVote = (sessionId, contributionId, voteType, userId) => {
  if (socket?.connected) {
    socket.emit('vote', { sessionId, contributionId, voteType, userId });
  }
};

export const submitWord = (sessionId, word, userId) => {
  if (socket?.connected) {
    socket.emit('word-submit', { sessionId, word, userId });
  }
};

export default {
  initSocket,
  connectSocket,
  disconnectSocket,
  getSocket,
  joinSession,
  leaveSession,
  sendChatMessage,
  sendVote,
  submitWord,
};
