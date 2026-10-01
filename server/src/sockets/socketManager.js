const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const ChatMessage = require('../models/ChatMessage');
const assistantService = require('../services/assistantService');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

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
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Socket authentication error: Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);
    console.log(`[Socket.IO]: User ${socket.user.email} (${socket.user.id}) connected & joined ${userRoom}`);

    socket.on('chat:message', async (data) => {
      try {
        const text = data?.text?.trim();
        if (!text) return;

        // 1. Save user message
        const userMsg = await ChatMessage.create({
          user: socket.user.id,
          role: 'user',
          text,
        });

        // 2. Emit typing indicator to user's room
        io.to(userRoom).emit('chat:typing', { typing: true });

        // 3. Process assistant response
        const assistantResult = await assistantService.processUserMessage(socket.user.id, text);

        // 4. Save assistant message
        const assistantMsg = await ChatMessage.create({
          user: socket.user.id,
          role: 'assistant',
          text: assistantResult.text,
          payload: assistantResult.payload || null,
        });

        // 5. Emit assistant reply & stop typing
        io.to(userRoom).emit('chat:typing', { typing: false });
        io.to(userRoom).emit('chat:reply', assistantMsg.toJSON());
      } catch (err) {
        console.error('[Socket Chat Error Stack]:', err.stack || err.message);
        io.to(userRoom).emit('chat:typing', { typing: false });
        io.to(userRoom).emit('chat:reply', {
          role: 'assistant',
          text: '⚠️ Sorry, an error occurred while processing your request. Please try again!',
          payload: { suggestions: ['Help'] },
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO]: User ${socket.user.id} disconnected`);
    });
  });

  return io;
};

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
