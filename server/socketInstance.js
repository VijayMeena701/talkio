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

const connections = [];

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('userconnect', (data) => {
        console.log(`User connected: ${data.displayName}, Meeting ID: ${data.meetingId}`);

        const otherUsers = connections.filter((user) => user.meetingId === data.meetingId && user.connectionId !== socket.id);

        connections.push({
            connectionId: socket.id,
            userName: data.displayName,
            meetingId: data.meetingId,
        });

        otherUsers.forEach((user) => {
            socket.to(user.connectionId).emit('inform_others_about_me', {
                otherUserId: socket.id,
                connectionId: socket.id
            });
        });

        socket.emit("inform_me_about_other_users", otherUsers)


    });

    socket.on("SDPProcess", (data) => {
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id
        })
    })


});