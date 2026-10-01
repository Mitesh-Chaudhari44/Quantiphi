const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO server with JWT authentication
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Socket authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_event_finder_2026');
      socket.user = decoded; // Contains id, email
      next();
    } catch (err) {
      return next(new Error('Socket authentication error: Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);
    console.log(`[Socket.IO]: User ${socket.user.email} (${socket.user.id}) connected & joined ${userRoom}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO]: User ${socket.user.id} disconnected`);
    });
  });

  return io;
};

/**
 * Helper to emit event to a specific user's room
 */
const emitToUserRoom = (userId, eventName, payload) => {
  if (!io) {
    console.warn('[Socket.IO]: Socket server not initialized yet');
    return;
  }
  const userRoom = `user:${userId.toString()}`;
  console.log(`[Socket.IO]: Emitting "${eventName}" to room ${userRoom}`, payload);
  io.to(userRoom).emit(eventName, payload);
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initSocket,
  emitToUserRoom,
  getIO,
};
