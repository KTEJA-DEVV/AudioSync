import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';
import { initSocket, connectSocket, disconnectSocket, getSocket } from '../services/socket';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = initSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Auto-connect when authenticated
    if (isAuthenticated) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  const connect = useCallback(() => {
    connectSocket();
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
  }, []);

  const emit = useCallback((event, data) => {
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit(event, data);
    }
  }, []);

  const on = useCallback((event, callback) => {
    const sock = getSocket();
    if (sock) {
      sock.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    const sock = getSocket();
    if (sock) {
      sock.off(event, callback);
    }
  }, []);

  const value = {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SocketContext;
