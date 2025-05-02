const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io');
const { createServer } = require('http');

const app = express();
app.use(cors());
const server = createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    const userName = socket.handshake.query.userName || "Anonymous";
    const meetingId = socket.handshake.query.meetingId || "default";

    // Handle SDP exchange
    socket.on("SDPProcess", (data) => {
        if (!data.receiverId) {
            console.error("Missing receiverId in SDPProcess");
            return;
        }
        socket.to(data.receiverId).emit("SDPProcess", {
            message: data.message,
            senderId: socket.id
        });
    });

    // Join meeting room
    socket.on("joinRoom", () => {
        console.log(`${userName} (${socket.id}) joined room: ${meetingId}`);
        socket.join(meetingId);

        // Get all users in the room
        const clients = Array.from(io.sockets.adapter.rooms.get(meetingId) || [])
            .filter(id => id !== socket.id) // exclude self
            .map(id => {
                const clientSocket = io.sockets.sockets.get(id);
                return {
                    socketId: id,
                    userName: clientSocket.handshake.query.userName || "Anonymous"
                };
            });

        // Send existing users to the new participant
        socket.emit("existingParticipants", clients);

        // Notify others about the new participant
        socket.to(meetingId).emit("newParticipant", {
            socketId: socket.id,
            userName
        });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`${userName} (${socket.id}) disconnected from room: ${meetingId}`);
        socket.to(meetingId).emit("userDisconnected", { socketId: socket.id });
    });
});

server.listen(3001, () => {
    console.log("Signalling server is running on port 3001");
});