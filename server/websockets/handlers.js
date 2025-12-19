const Session = require('../models/Session');
const LiveSession = require('../models/LiveSession');
const User = require('../models/User');

const setupWebSocketHandlers = (io) => {
  // Track users in sessions
  const sessionUsers = new Map(); // sessionId -> Set of socket ids
  const socketToSession = new Map(); // socket.id -> sessionId
  const socketToUser = new Map(); // socket.id -> userId
  
  // Track viewers in live sessions
  const liveViewers = new Map(); // liveSessionId -> Set of socket ids
  const socketToLiveSession = new Map(); // socket.id -> liveSessionId

  io.on('connection', (socket) => {
    console.log('WebSocket connected:', socket.id);

    // Join a session room (supports both formats)
    const handleJoinSession = async (sessionId, userId) => {
      try {
        // Leave previous session if any
        const previousSession = socketToSession.get(socket.id);
        if (previousSession) {
          socket.leave(previousSession);
          const users = sessionUsers.get(previousSession);
          if (users) {
            users.delete(socket.id);
            if (users.size === 0) {
              sessionUsers.delete(previousSession);
            }
          }
        }

        // Join new session
        socket.join(sessionId);
        socketToSession.set(socket.id, sessionId);
        
        if (userId) {
          socketToUser.set(socket.id, userId);
        }

        // Track users in session
        if (!sessionUsers.has(sessionId)) {
          sessionUsers.set(sessionId, new Set());
        }
        sessionUsers.get(sessionId).add(socket.id);

        // Get user info if available
        let userInfo = null;
        if (userId) {
          const user = await User.findById(userId).select('username displayName avatar reputation.level').lean();
          userInfo = user;
        }

        // Notify others in session
        socket.to(sessionId).emit('session:userJoined', {
          socketId: socket.id,
          user: userInfo,
          onlineCount: sessionUsers.get(sessionId).size,
        });

        // Send current online count to joining user
        socket.emit('session:joined', {
          sessionId,
          onlineCount: sessionUsers.get(sessionId).size,
        });

        console.log(`Socket ${socket.id} joined session ${sessionId}`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    };

    // Support both event formats
    socket.on('session:join', async ({ sessionId, userId }) => {
      await handleJoinSession(sessionId, userId);
    });

    socket.on('joinSession', async (sessionId) => {
      const userId = socketToUser.get(socket.id);
      await handleJoinSession(sessionId, userId);
    });

    // Leave session room
    const handleLeaveSession = (sessionId) => {
      socket.leave(sessionId);
      
      const users = sessionUsers.get(sessionId);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          sessionUsers.delete(sessionId);
        } else {
          // Notify others
          io.to(sessionId).emit('session:userLeft', {
            socketId: socket.id,
            onlineCount: users.size,
          });
        }
      }

      socketToSession.delete(socket.id);
      socketToUser.delete(socket.id);

      console.log(`Socket ${socket.id} left session ${sessionId}`);
    };

    socket.on('session:leave', ({ sessionId }) => {
      handleLeaveSession(sessionId);
    });

    socket.on('leaveSession', (sessionId) => {
      handleLeaveSession(sessionId);
    });

    // Chat message in session
    socket.on('session:chat', async ({ sessionId, message }) => {
      const userId = socketToUser.get(socket.id);
      
      let userInfo = { username: 'Anonymous' };
      if (userId) {
        const user = await User.findById(userId).select('username displayName avatar reputation.level').lean();
        if (user) {
          userInfo = {
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            level: user.reputation?.level,
          };
        }
      }

      io.to(sessionId).emit('session:chatMessage', {
        id: Date.now().toString(),
        user: userInfo,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on('session:typing', ({ sessionId, isTyping }) => {
      const userId = socketToUser.get(socket.id);
      socket.to(sessionId).emit('session:userTyping', {
        socketId: socket.id,
        userId,
        isTyping,
      });
    });

    // Request current session state
    socket.on('session:getState', async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId)
          .populate('host', 'username displayName avatar')
          .lean();

        if (session) {
          socket.emit('session:state', {
            session: {
              id: session._id,
              status: session.status,
              stage: session.stage,
              stats: session.stats,
              settings: {
                lyricsDeadline: session.settings?.lyricsDeadline,
                votingDeadline: session.settings?.votingDeadline,
                votingSystem: session.settings?.votingSystem,
              },
            },
            onlineCount: sessionUsers.get(sessionId)?.size || 0,
          });
        }
      } catch (error) {
        console.error('Error getting session state:', error);
      }
    });

    // Ping for keeping connection alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ==========================================
    // Feedback/Word Cloud Events
    // ==========================================

    // Join feedback room (for word cloud updates)
    socket.on('feedback:join', ({ sessionId }) => {
      socket.join(`feedback:${sessionId}`);
      console.log(`Socket ${socket.id} joined feedback room for session ${sessionId}`);
    });

    // Leave feedback room
    socket.on('feedback:leave', ({ sessionId }) => {
      socket.leave(`feedback:${sessionId}`);
      console.log(`Socket ${socket.id} left feedback room for session ${sessionId}`);
    });

    // ==========================================
    // Live Streaming Events
    // ==========================================

    // Join live session as viewer
    socket.on('live:join', async ({ sessionId, userId }) => {
      try {
        // Leave previous live session if any
        const previousLiveSession = socketToLiveSession.get(socket.id);
        if (previousLiveSession) {
          socket.leave(`live:${previousLiveSession}`);
          const viewers = liveViewers.get(previousLiveSession);
          if (viewers) {
            viewers.delete(socket.id);
            await updateLiveViewerCount(previousLiveSession, viewers.size);
          }
        }

        // Join new live session
        socket.join(`live:${sessionId}`);
        socketToLiveSession.set(socket.id, sessionId);
        
        if (userId) {
          socketToUser.set(socket.id, userId);
        }

        // Track viewers
        if (!liveViewers.has(sessionId)) {
          liveViewers.set(sessionId, new Set());
        }
        liveViewers.get(sessionId).add(socket.id);

        const viewerCount = liveViewers.get(sessionId).size;

        // Update viewer count in database
        await updateLiveViewerCount(sessionId, viewerCount);

        // Notify about new viewer
        io.to(`live:${sessionId}`).emit('viewer:count', { count: viewerCount });

        // Send current state to joining viewer
        const liveSession = await LiveSession.findById(sessionId)
          .select('status currentActivity engagement votingRounds')
          .lean();

        if (liveSession) {
          socket.emit('live:state', {
            status: liveSession.status,
            activity: liveSession.currentActivity,
            hypeLevel: liveSession.engagement?.hypeLevel || 0,
            viewerCount,
            activeVotingRound: liveSession.votingRounds?.find(r => r.status === 'active'),
          });
        }

        console.log(`Socket ${socket.id} joined live session ${sessionId}, viewers: ${viewerCount}`);
      } catch (error) {
        console.error('Error joining live session:', error);
        socket.emit('error', { message: 'Failed to join live session' });
      }
    });

    // Leave live session
    socket.on('live:leave', async ({ sessionId }) => {
      socket.leave(`live:${sessionId}`);
      
      const viewers = liveViewers.get(sessionId);
      if (viewers) {
        viewers.delete(socket.id);
        const viewerCount = viewers.size;
        
        if (viewerCount === 0) {
          liveViewers.delete(sessionId);
        }
        
        await updateLiveViewerCount(sessionId, viewerCount);
        io.to(`live:${sessionId}`).emit('viewer:count', { count: viewerCount });
      }

      socketToLiveSession.delete(socket.id);
      console.log(`Socket ${socket.id} left live session ${sessionId}`);
    });

    // Host broadcasts to live session
    socket.on('live:broadcast', async ({ sessionId, event, data }) => {
      const userId = socketToUser.get(socket.id);
      if (!userId) return;

      try {
        const liveSession = await LiveSession.findById(sessionId);
        if (liveSession && liveSession.isHostOrCoHost(userId)) {
          io.to(`live:${sessionId}`).emit(event, data);
        }
      } catch (error) {
        console.error('Error broadcasting to live session:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      // Handle regular session disconnect
      const sessionId = socketToSession.get(socket.id);
      if (sessionId) {
        const users = sessionUsers.get(sessionId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            sessionUsers.delete(sessionId);
          } else {
            io.to(sessionId).emit('session:userLeft', {
              socketId: socket.id,
              onlineCount: users.size,
            });
          }
        }
      }

      // Handle live session disconnect
      const liveSessionId = socketToLiveSession.get(socket.id);
      if (liveSessionId) {
        const viewers = liveViewers.get(liveSessionId);
        if (viewers) {
          viewers.delete(socket.id);
          const viewerCount = viewers.size;
          
          if (viewerCount === 0) {
            liveViewers.delete(liveSessionId);
          }
          
          await updateLiveViewerCount(liveSessionId, viewerCount);
          io.to(`live:${liveSessionId}`).emit('viewer:count', { count: viewerCount });
        }
      }

      socketToSession.delete(socket.id);
      socketToLiveSession.delete(socket.id);
      socketToUser.delete(socket.id);

      console.log('WebSocket disconnected:', socket.id, 'reason:', reason);
    });
  });

  // Helper to update viewer count in database
  const updateLiveViewerCount = async (sessionId, count) => {
    try {
      const session = await LiveSession.findById(sessionId);
      if (session) {
        await session.updateViewers(count);
      }
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  };

  // Helper function to broadcast to session (used by controllers)
  const broadcastToSession = (sessionId, event, data) => {
    io.to(sessionId).emit(event, data);
  };

  // Helper function to broadcast to live session
  const broadcastToLiveSession = (sessionId, event, data) => {
    io.to(`live:${sessionId}`).emit(event, data);
  };

  // Helper to get current viewer count
  const getLiveViewerCount = (sessionId) => {
    return liveViewers.get(sessionId)?.size || 0;
  };

  return { broadcastToSession, broadcastToLiveSession, getLiveViewerCount };
};

module.exports = setupWebSocketHandlers;
