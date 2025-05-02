import React from "react";
import io, { type Socket } from "socket.io-client";

const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

type UseWebRTCProps = {
    meetingId: string;
    userName: string;
    localStream: MediaStream | null;
};

export default function useWebRTC({ meetingId, userName, localStream }: UseWebRTCProps) {
    const [peers, setPeers] = React.useState<Record<string, RTCPeerConnection>>({});
    const [remoteStreams, setRemoteStreams] = React.useState<Record<string, MediaStream>>({});
    const [connected, setConnected] = React.useState(false);
    const socketRef = React.useRef<Socket | null>(null);
    const peersRef = React.useRef<Record<string, RTCPeerConnection>>({});

    // Connect to socket server 
    React.useEffect(() => {
        // Connect to signaling server
        if (!socketRef.current) {
            socketRef.current = io("https://ws.talkio.vijaymeena.dev", {
                query: { userName, meetingId }
            });

            socketRef.current.on("connect", () => {
                console.log("Connected to signaling server", socketRef.current?.id);
                setConnected(true);
            });

            socketRef.current.on("disconnect", () => {
                console.log("Disconnected from signaling server");
                setConnected(false);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [meetingId, userName]);

    // Handle signaling and peer connections
    React.useEffect(() => {
        if (!socketRef.current || !connected || !localStream) return;

        const socket = socketRef.current;

        // Join the room
        console.log(`Joining room ${meetingId} as ${userName}`);
        socket.emit("joinRoom", {});

        // When we receive the list of existing users
        socket.on("existingParticipants", (users: { socketId: string, userName: string }[]) => {
            console.log("Existing users:", users);

            // Create a peer connection for each existing user
            users.forEach(user => {
                if (user.socketId === socket.id) return; // Skip self

                // Ensure socket.id is defined before using it
                if (!socket.id) {
                    console.error("Socket ID is undefined, cannot create peer.");
                    return;
                }
                // Create peer and store in refs
                const peer = createPeer(user.socketId, socket.id, localStream);
                peersRef.current[user.socketId] = peer;
                setPeers(prev => ({ ...prev, [user.socketId]: peer }));
            });
        });

        // When a new user joins
        socket.on("newParticipant", ({ socketId, userName }) => {
            console.log("New user joined:", socketId, userName);
            // Don't create a peer here, wait for their offer
        });

        // Handle SDP exchange
        socket.on("SDPProcess", async ({ message, senderId }) => {
            try {
                const data = JSON.parse(message);
                console.log("Received SDP:", Object.keys(data)[0], "from", senderId);

                // If we receive an offer, create a peer and answer
                if (data.offer) {
                    if (!socket.id) {
                        console.error("Socket ID is undefined, cannot create peer.");
                        return;
                    }
                    const peer = createPeer(senderId, socket.id, localStream, false);
                    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);

                    socket.emit("SDPProcess", {
                        message: JSON.stringify({ answer: peer.localDescription }),
                        receiverId: senderId
                    });

                    peersRef.current[senderId] = peer;
                    setPeers(prev => ({ ...prev, [senderId]: peer }));
                }
                // If we receive an answer to our offer
                else if (data.answer) {
                    const peer = peersRef.current[senderId];
                    if (peer) {
                        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
                    }
                }
                // If we receive an ICE candidate
                else if (data.icecandidate) {
                    const peer = peersRef.current[senderId];
                    if (peer) {
                        try {
                            await peer.addIceCandidate(new RTCIceCandidate(data.icecandidate));
                        } catch (err) {
                            console.error("Error adding ICE candidate:", err);
                        }
                    }
                }
            } catch (err) {
                console.error("Error processing SDP:", err);
            }
        });

        // When a user disconnects
        socket.on("userDisconnected", ({ socketId }) => {
            console.log("User disconnected:", socketId);
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }

            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[socketId];
                return newPeers;
            });

            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[socketId];
                return newStreams;
            });
        });

        // Cleanup
        return () => {
            socket.off("existingParticipants");
            socket.off("newParticipant");
            socket.off("SDPProcess");
            socket.off("userDisconnected");

            // Close all peer connections
            Object.values(peersRef.current).forEach(peer => peer.close());
            peersRef.current = {};
        };
    }, [meetingId, userName, localStream, connected]);

    // Effect to update tracks when localStream changes
    React.useEffect(() => {
        if (!localStream || Object.keys(peersRef.current).length === 0) return;

        // For each peer connection
        Object.entries(peersRef.current).forEach(([peerId, peer]) => {
            // Get all senders for this peer
            const senders = peer.getSenders();

            // For each track in our local stream
            localStream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track?.kind === track.kind);

                if (sender) {
                    // Replace the track
                    console.log(`Replacing ${track.kind} track for peer ${peerId}`);
                    sender.replaceTrack(track).catch(err =>
                        console.error(`Error replacing track: ${err}`)
                    );
                } else {
                    // Add the track if no sender exists for this kind
                    console.log(`Adding ${track.kind} track to peer ${peerId}`);
                    peer.addTrack(track, localStream);
                }
            });

            // Optional: Remove tracks that are no longer in our stream
            // This handles when video is turned off
            senders.forEach(sender => {
                if (sender.track && !localStream.getTracks().some(t => t.kind === sender.track!.kind)) {
                    peer.removeTrack(sender);
                }
            });
        });
    }, [localStream]);

    // Helper to create a peer connection
    const createPeer = (targetId: string, creatorId: string, stream: MediaStream, initiator = true) => {
        console.log(`Creating peer: target=${targetId}, creator=${creatorId}, initiator=${initiator}`);

        const peer = new RTCPeerConnection(iceServers);

        // Add our tracks to the peer
        stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
        });

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate to", targetId);
                socketRef.current?.emit("SDPProcess", {
                    message: JSON.stringify({ icecandidate: event.candidate }),
                    receiverId: targetId
                });
            }
        };

        // Handle receiving tracks
        peer.ontrack = (event) => {
            console.log("Received track from", targetId, event.track.kind);
            setRemoteStreams(prev => {
                // Create a new stream or use existing one
                const existingStream = prev[targetId] || new MediaStream();

                // Check if this track is already in the stream
                const trackExists = Array.from(existingStream.getTracks()).some(
                    t => t.id === event.track.id
                );

                // If not, add it
                if (!trackExists) {
                    existingStream.addTrack(event.track);
                }

                return { ...prev, [targetId]: existingStream };
            });
        };

        // Debugging helpers
        peer.onconnectionstatechange = () =>
            console.log(`Peer ${targetId} connection state: ${peer.connectionState}`);
        peer.oniceconnectionstatechange = () =>
            console.log(`Peer ${targetId} ICE state: ${peer.iceConnectionState}`);

        // If we're the initiator, create and send an offer
        if (initiator) {
            peer.onnegotiationneeded = async () => {
                try {
                    console.log("Creating offer for", targetId);
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);

                    socketRef.current?.emit("SDPProcess", {
                        message: JSON.stringify({ offer: peer.localDescription }),
                        receiverId: targetId
                    });
                } catch (err) {
                    console.error("Error creating offer:", err);
                }
            };
        }

        return peer;
    };

    return {
        peers,
        remoteStreams,
        connected,
        socketId: socketRef.current?.id
    };
}