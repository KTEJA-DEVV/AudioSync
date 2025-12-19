const { Server } = require('socket.io');
const config = require('./index');

let io = null;

const initializeSocketIO = (server, corsOptions) => {
  io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error.message);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Emit to a specific room
const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

// Emit to a session room (alias for emitToRoom)
const emitToSession = (sessionId, event, data) => {
  if (io) {
    io.to(sessionId.toString()).emit(event, data);
  }
};

// Broadcast to all connected clients
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Emit to all connected clients
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Emit to a specific user (by user ID)
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emit to users with a specific role
const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
};

// Get count of clients in a room
const getRoomSize = async (room) => {
  if (!io) return 0;
  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
};

module.exports = {
  initializeSocketIO,
  getIO,
  emitToRoom,
  emitToSession,
  emitToAll,
  emitToUser,
  emitToRole,
  broadcast,
  getRoomSize,
};
