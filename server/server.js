require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with improved configuration
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || ["https://your-client-domain.com"]
      : ["http://localhost:3000", "https://ws.talkio.vijaymeena.dev"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Store room and user information
const rooms = new Map(); // roomId -> { users: Map(socketId -> userInfo), createdAt: timestamp }
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userInfo

// Utility functions
function createUserInfo(socketId, userId, userName, roomId) {
  return {
    socketId,
    userId: userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userName: userName || 'Anonymous',
    roomId,
    joinedAt: new Date().toISOString()
  };
}

function createRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
    console.log(`Room created: ${roomId}`);
  }
  return rooms.get(roomId);
}

function removeUserFromRoom(socketId) {
  const userInfo = socketUserMap.get(socketId);
  if (!userInfo) return null;

  const { roomId, userId } = userInfo;
  const room = rooms.get(roomId);

  if (room) {
    room.users.delete(socketId);
    room.lastActivity = new Date().toISOString();

    // Clean up empty rooms
    if (room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`Room deleted: ${roomId} (empty)`);
    }
  }

  // Clean up mappings
  userSocketMap.delete(userId);
  socketUserMap.delete(socketId);

  return userInfo;
}

function getRoomParticipants(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];

  return Array.from(room.users.values()).map(user => ({
    id: user.userId,
    socketId: user.socketId,
    userName: user.userName,
    joinedAt: user.joinedAt
  }));
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Extract user info from query parameters
  const { userName, meetingId, userId } = socket.handshake.query;

  // Join room handler
  socket.on("joinRoom", (data = {}) => {
    try {
      const roomId = meetingId || data.roomId;
      const finalUserName = data.userName || userName || 'Anonymous';
      const finalUserId = data.userId || userId;

      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Create or get room
      const room = createRoom(roomId);

      // Create user info
      const userInfo = createUserInfo(socket.id, finalUserId, finalUserName, roomId);

      // Store mappings
      socketUserMap.set(socket.id, userInfo);
      userSocketMap.set(userInfo.userId, socket.id);
      room.users.set(socket.id, userInfo);
      room.lastActivity = new Date().toISOString();

      // Join socket room
      socket.join(roomId);

      console.log(`User ${finalUserName} (${userInfo.userId}) joined room ${roomId}`);

      // Get existing participants
      const existingParticipants = getRoomParticipants(roomId)
        .filter(p => p.socketId !== socket.id);

      // Send existing participants to new user
      socket.emit("existingParticipants", existingParticipants);

      // Notify existing users about new participant
      socket.to(roomId).emit("newParticipant", {
        socketId: socket.id,
        userId: userInfo.userId,
        userName: finalUserName,
        joinedAt: userInfo.joinedAt
      });

      // Send room info
      socket.emit('room-joined', {
        roomId,
        userId: userInfo.userId,
        participants: getRoomParticipants(roomId)
      });

    } catch (error) {
      console.error('Error in joinRoom:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle signaling for WebRTC
  socket.on("SDPProcess", ({ message, receiverId }) => {
    try {
      if (!receiverId || !message) {
        socket.emit('error', { message: 'Invalid SDP data' });
        return;
      }

      console.log(`Relaying SDP from ${socket.id} to ${receiverId}`);
      socket.to(receiverId).emit("SDPProcess", {
        message,
        senderId: socket.id
      });
    } catch (error) {
      console.error('Error in SDPProcess:', error);
      socket.emit('error', { message: 'Failed to process SDP' });
    }
  });

  // Handle chat messages
  socket.on("chat-message", (messageData) => {
    try {
      const userInfo = socketUserMap.get(socket.id);
      if (!userInfo) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: messageData.text || '',
        senderId: userInfo.userId,
        senderName: userInfo.userName,
        timestamp: new Date().toISOString(),
        roomId: userInfo.roomId
      };

      // Update room activity
      const room = rooms.get(userInfo.roomId);
      if (room) {
        room.lastActivity = new Date().toISOString();
      }

      // Broadcast to all users in the room
      io.to(userInfo.roomId).emit("chat-message", message);

      console.log(`Chat message from ${userInfo.userName} in room ${userInfo.roomId}`);
    } catch (error) {
      console.error('Error in chat-message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle room info requests
  socket.on("get-room-info", ({ roomId }) => {
    try {
      const participants = getRoomParticipants(roomId);
      socket.emit("room-info", { roomId, participants });
    } catch (error) {
      console.error('Error in get-room-info:', error);
      socket.emit('error', { message: 'Failed to get room info' });
    }
  });

  // Handle media state changes (audio/video toggle)
  socket.on("media-state-change", ({ type, enabled }) => {
    try {
      const userInfo = socketUserMap.get(socket.id);
      if (!userInfo) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Update room activity
      const room = rooms.get(userInfo.roomId);
      if (room) {
        room.lastActivity = new Date().toISOString();
      }

      console.log(`User ${userInfo.userName} toggled ${type}: ${enabled}`);

      // Broadcast media state change to other users in the room
      socket.to(userInfo.roomId).emit("media-state-change", {
        senderId: userInfo.userId,
        socketId: socket.id,
        type,
        enabled,
        userName: userInfo.userName
      });
    } catch (error) {
      console.error('Error in media-state-change:', error);
      socket.emit('error', { message: 'Failed to process media state change' });
    }
  });

  // Handle stream updates
  socket.on("stream-update", ({ userId, roomId }) => {
    try {
      const userInfo = socketUserMap.get(socket.id);
      if (!userInfo) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      console.log(`User ${userInfo.userName} is updating their stream`);

      // Broadcast stream update to other users in the room
      socket.to(userInfo.roomId).emit("stream-update", {
        userId: userInfo.userId,
        socketId: socket.id,
        userName: userInfo.userName
      });
    } catch (error) {
      console.error('Error in stream-update:', error);
      socket.emit('error', { message: 'Failed to process stream update' });
    }
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

    const userInfo = removeUserFromRoom(socket.id);
    if (userInfo) {
      // Notify other users in the room
      socket.to(userInfo.roomId).emit("userDisconnected", {
        socketId: socket.id,
        userId: userInfo.userId,
        userName: userInfo.userName,
        reason
      });

      console.log(`User ${userInfo.userName} left room ${userInfo.roomId}`);
    }
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Cleanup old rooms periodically (every 5 minutes)
setInterval(() => {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [roomId, room] of rooms.entries()) {
    const roomAge = now - new Date(room.lastActivity);
    if (roomAge > maxAge && room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`Cleaned up old room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Video Conferencing Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});