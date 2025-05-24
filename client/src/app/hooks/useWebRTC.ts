import React, { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { UseWebRTCReturn, WebRTCConfig, Message, RemoteStreamData } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import TURNConfigService from "@/services/turn-config.service";

// Interface for RTCStats with the properties we need
interface RTCInboundRtpStats extends RTCStats {
    type: 'inbound-rtp';
    mediaType: 'video' | 'audio';
    packetsLost?: number;
    packetsReceived?: number;
}

// Get TURN configuration service instance
const turnConfigService = TURNConfigService.getInstance();

// Get ICE servers configuration from TURN service
const DEFAULT_ICE_SERVERS = turnConfigService.getICEServers();

const DEFAULT_CONFIG: WebRTCConfig = {
    iceServers: DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
};

interface UseWebRTCProps {
    meetingId: string;
    userName: string;
    localStream: MediaStream | null;
    config?: Partial<WebRTCConfig>;
    serverUrl?: string;
}

interface PeerInfo {
    connection: RTCPeerConnection;
    isInitiator: boolean;
    iceCandidatesQueue: RTCIceCandidate[];
    stream?: MediaStream;
    connectionQuality: 'good' | 'poor' | 'unknown';
    userName?: string;
    userId?: string;
    isVideoEnabled?: boolean;
    isAudioEnabled?: boolean;
}

export default function useWebRTC({
    meetingId,
    userName,
    localStream,
    config,
    serverUrl
}: UseWebRTCProps): UseWebRTCReturn {
    // State management
    const [peers, setPeers] = useState<Record<string, RTCPeerConnection>>({});
    const [remoteStreams, setRemoteStreams] = useState<Record<string, RemoteStreamData>>({});
    const [connected, setConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string>();
    const [connectionQuality, setConnectionQuality] = useState<Record<string, 'good' | 'poor' | 'unknown'>>({});
    const [messages, setMessages] = useState<Message[]>([]);
    const [participantCount, setParticipantCount] = useState(0);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);

    // Refs for stable references
    const socketRef = useRef<Socket | null>(null);
    const peersRef = useRef<Record<string, PeerInfo>>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = useRef(1000);
    const qualityMonitorIntervals = useRef<Record<string, NodeJS.Timeout>>({});    // Update local stream ref
    useEffect(() => {
        localStreamRef.current = localStream;

        // Update media state based on the local stream
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            const videoTracks = localStream.getVideoTracks();

            const audioEnabled = audioTracks.length > 0 && audioTracks.some(track => track.enabled);
            const videoEnabled = videoTracks.length > 0 && videoTracks.some(track => track.enabled);

            setIsAudioEnabled(audioEnabled);
            setIsVideoEnabled(videoEnabled);

            console.log(`Media state updated: Audio=${audioEnabled}, Video=${videoEnabled}`);
        } else {
            setIsAudioEnabled(false);
            setIsVideoEnabled(false);
        }
    }, [localStream]);

    // Merge configuration
    const webrtcConfig = React.useMemo(() => ({
        ...DEFAULT_CONFIG,
        ...config
    }), [config]);

    // Connection quality monitoring
    const monitorConnectionQuality = useCallback((peerId: string, connection: RTCPeerConnection) => {
        if (qualityMonitorIntervals.current[peerId]) {
            clearInterval(qualityMonitorIntervals.current[peerId]);
        }

        const interval = setInterval(async () => {
            try {
                const stats = await connection.getStats();
                let quality: 'good' | 'poor' | 'unknown' = 'unknown';
                stats.forEach((report: RTCStats) => {
                    if (report.type === 'inbound-rtp' && 'mediaType' in report && report.mediaType === 'video') {
                        const inboundReport = report as RTCInboundRtpStats;
                        const packetsLost = inboundReport.packetsLost || 0;
                        const packetsReceived = inboundReport.packetsReceived || 0;
                        const lossRate = packetsReceived > 0 ? packetsLost / packetsReceived : 0;

                        quality = lossRate > 0.05 ? 'poor' : 'good';
                    }
                });

                setConnectionQuality(prev => ({ ...prev, [peerId]: quality }));
            } catch (err) {
                console.warn(`Failed to get stats for peer ${peerId}:`, err);
            }
        }, 5000);

        qualityMonitorIntervals.current[peerId] = interval;

        return () => {
            clearInterval(interval);
            delete qualityMonitorIntervals.current[peerId];
        };
    }, []);

    // Create peer connection with enhanced configuration
    const createPeerConnection = useCallback((peerId: string, isInitiator: boolean, peerUserName?: string): RTCPeerConnection => {
        console.log(`Creating peer connection for ${peerId}, initiator: ${isInitiator}`);

        const connection = new RTCPeerConnection(webrtcConfig);

        // Add local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                if (localStreamRef.current) {
                    connection.addTrack(track, localStreamRef.current);
                }
            });
        }

        // Handle ICE candidates
        connection.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                console.log(`Sending ICE candidate to ${peerId}`);
                socketRef.current.emit("SDPProcess", {
                    message: JSON.stringify({ icecandidate: event.candidate }),
                    receiverId: peerId
                });
            }
        };

        // Handle remote stream
        connection.ontrack = (event) => {
            console.log(`Received track from ${peerId}:`, event.track.kind);

            setRemoteStreams(prev => {
                const existingData = prev[peerId];
                const existingStream = existingData?.stream || new MediaStream();

                // Check if track already exists
                const trackExists = Array.from(existingStream.getTracks()).some(
                    track => track.id === event.track.id
                );

                if (!trackExists) {
                    existingStream.addTrack(event.track);
                }

                return {
                    ...prev,
                    [peerId]: {
                        stream: existingStream,
                        userName: peerUserName || existingData?.userName,
                        userId: peerId,
                        isVideoEnabled: event.track.kind === 'video' ? event.track.enabled : existingData?.isVideoEnabled,
                        isAudioEnabled: event.track.kind === 'audio' ? event.track.enabled : existingData?.isAudioEnabled
                    }
                };
            });
        };

        // Enhanced connection state monitoring
        connection.onconnectionstatechange = () => {
            const state = connection.connectionState;
            console.log(`Peer ${peerId} connection state: ${state}`);

            if (state === 'failed' || state === 'disconnected') {
                setTimeout(() => {
                    if (connection.connectionState === 'failed') {
                        console.log(`Attempting to restart ICE for peer ${peerId}`);
                        connection.restartIce();
                    }
                }, 1000);
            }

            if (state === 'connected') {
                // Start quality monitoring
                monitorConnectionQuality(peerId, connection);
            }
        };

        connection.oniceconnectionstatechange = () => {
            console.log(`Peer ${peerId} ICE state: ${connection.iceConnectionState}`);
        };

        // Handle negotiation needed
        if (isInitiator) {
            connection.onnegotiationneeded = async () => {
                try {
                    console.log(`Creating offer for ${peerId}`);
                    const offer = await connection.createOffer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true
                    });
                    await connection.setLocalDescription(offer);

                    if (socketRef.current) {
                        socketRef.current.emit("SDPProcess", {
                            message: JSON.stringify({ offer: connection.localDescription }),
                            receiverId: peerId
                        });
                    }
                } catch (err) {
                    console.error(`Error creating offer for ${peerId}:`, err);
                    setError(`Failed to create offer for peer ${peerId}`);
                }
            };
        }

        return connection;
    }, [webrtcConfig, monitorConnectionQuality]);

    // Socket connection management with reconnection logic
    const connectSocket = useCallback(() => {
        if (socketRef.current?.connected) return socketRef.current;

        setIsConnecting(true);
        setError(undefined);

        const socketUrl = "https://ws.talkio.vijaymeena.dev";
        console.log(`Connecting to signaling server: ${socketUrl}`);

        socketRef.current = io(socketUrl, {
            query: { userName, meetingId },
            upgrade: true,
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: reconnectDelay.current,
            timeout: 10000,
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on("connect", () => {
            console.log("Connected to signaling server", socket.id);
            setConnected(true);
            setIsConnecting(false);
            setError(undefined);
            reconnectAttempts.current = 0;
            reconnectDelay.current = 1000;
        });

        socket.on("disconnect", (reason) => {
            console.log("Disconnected from signaling server:", reason);
            setConnected(false);

            if (reason === "io server disconnect") {
                // Server initiated disconnect, don't reconnect automatically
                setError("Disconnected by server");
            }
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            setIsConnecting(false);
            reconnectAttempts.current++;

            if (reconnectAttempts.current >= maxReconnectAttempts) {
                setError("Failed to connect to signaling server after multiple attempts");
            } else {
                reconnectDelay.current = Math.min(reconnectDelay.current * 2, 10000);
                setError(`Connection failed, retrying... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            }
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
            setError(err.message || "Socket error occurred");
        }); return socket;
    }, [meetingId, userName, serverUrl]);

    // Chat functionality
    const sendMessage = useCallback((messageData: Omit<Message, 'id' | 'timestamp'>) => {
        if (!socketRef.current || !connected) {
            console.warn("Cannot send message: not connected");
            return;
        }

        const message: Message = {
            id: uuidv4(),
            timestamp: Date.now(),
            ...messageData
        };

        // Send message to server - server expects { text: string }
        socketRef.current.emit("chat-message", { text: message.content });

        // Don't add our own message to local state - it will come back from server
        console.log("Sent message:", message.content);
    }, [connected]);

    // Helper function to update media state
    const updateMediaState = useCallback(() => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            const videoTracks = localStreamRef.current.getVideoTracks();

            const audioEnabled = audioTracks.length > 0 && audioTracks.some(track => track.enabled);
            const videoEnabled = videoTracks.length > 0 && videoTracks.some(track => track.enabled);

            setIsAudioEnabled(audioEnabled);
            setIsVideoEnabled(videoEnabled);

            console.log(`Media state updated: Audio=${audioEnabled}, Video=${videoEnabled}`);
        } else {
            setIsAudioEnabled(false);
            setIsVideoEnabled(false);
        }
    }, []);

    // Media controls - using track management for stability
    const toggleAudio = useCallback(async (enabled: boolean): Promise<void> => {
        if (!localStreamRef.current) return;

        try {
            if (enabled) {
                // Check if we already have an audio track
                const existingAudioTracks = localStreamRef.current.getAudioTracks();
                if (existingAudioTracks.length > 0) {
                    // Just enable the existing track
                    existingAudioTracks.forEach(track => track.enabled = true);
                } else {
                    // Get new audio stream
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    });
                    const audioTrack = audioStream.getAudioTracks()[0];

                    if (audioTrack) {
                        // Add the audio track to the local stream
                        localStreamRef.current.addTrack(audioTrack);

                        // Add the track to all peer connections and trigger renegotiation
                        Object.values(peersRef.current).forEach(async (peerInfo) => {
                            try {
                                const senders = peerInfo.connection.getSenders();
                                const audioSender = senders.find(s => s.track?.kind === 'audio');

                                if (audioSender) {
                                    // Replace existing audio track
                                    await audioSender.replaceTrack(audioTrack);
                                } else {
                                    // Add new audio track
                                    peerInfo.connection.addTrack(audioTrack, localStreamRef.current!);

                                    // Trigger renegotiation for initiator connections
                                    if (peerInfo.isInitiator) {
                                        // Trigger renegotiation manually as backup
                                        setTimeout(() => {
                                            if (peerInfo.connection.signalingState === 'stable') {
                                                peerInfo.connection.dispatchEvent(new Event('negotiationneeded'));
                                            }
                                        }, 100);
                                    }
                                }
                            } catch (error) {
                                console.error('Error adding audio track to peer:', error);
                            }
                        });
                    }
                }
            } else {
                // Disable audio tracks but keep them in the stream
                const audioTracks = localStreamRef.current.getAudioTracks();
                audioTracks.forEach(track => track.enabled = false);
            }            // Notify peers about audio state change for UI updates
            if (socketRef.current) {
                socketRef.current.emit("media-state-change", {
                    type: 'audio',
                    enabled
                });
            }

            // Update local state
            updateMediaState();
        } catch (error) {
            console.error('Error toggling audio:', error);
        }
    }, [updateMediaState]);

    const toggleVideo = useCallback(async (enabled: boolean): Promise<void> => {
        if (!localStreamRef.current) return;

        try {
            if (enabled) {
                // Check if we already have a video track
                const existingVideoTracks = localStreamRef.current.getVideoTracks();
                if (existingVideoTracks.length > 0) {
                    // Just enable the existing track
                    existingVideoTracks.forEach(track => track.enabled = true);
                } else {
                    // Get new video stream
                    const videoStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                    const videoTrack = videoStream.getVideoTracks()[0];

                    if (videoTrack) {
                        // Add the video track to the local stream
                        localStreamRef.current.addTrack(videoTrack);

                        // Add the track to all peer connections and trigger renegotiation
                        Object.values(peersRef.current).forEach(async (peerInfo) => {
                            try {
                                const senders = peerInfo.connection.getSenders();
                                const videoSender = senders.find(s => s.track?.kind === 'video');

                                if (videoSender) {
                                    // Replace existing video track
                                    await videoSender.replaceTrack(videoTrack);
                                } else {
                                    // Add new video track
                                    peerInfo.connection.addTrack(videoTrack, localStreamRef.current!);

                                    // Trigger renegotiation for initiator connections
                                    if (peerInfo.isInitiator) {
                                        // negotiationneeded event will be fired automatically
                                    }
                                }
                            } catch (error) {
                                console.error('Error adding video track to peer:', error);
                            }
                        });
                    }
                }
            } else {
                // Disable video tracks but keep them in the stream
                const videoTracks = localStreamRef.current.getVideoTracks();
                videoTracks.forEach(track => track.enabled = false);
            }            // Notify peers about video state change for UI updates
            if (socketRef.current) {
                socketRef.current.emit("media-state-change", {
                    type: 'video',
                    enabled
                });
            }

            // Update local state
            updateMediaState();
        } catch (error) {
            console.error('Error toggling video:', error);
        }
    }, [updateMediaState]);

    // Room controls
    const leaveRoom = useCallback(() => {
        console.log("Leaving room");

        // Close all peer connections
        Object.values(peersRef.current).forEach(peerInfo => {
            peerInfo.connection.close();
        });
        peersRef.current = {};

        // Clear quality monitoring intervals
        Object.values(qualityMonitorIntervals.current).forEach(interval => {
            clearInterval(interval);
        });
        qualityMonitorIntervals.current = {};

        // Disconnect socket
        if (socketRef.current) {
            socketRef.current.emit("leave-room");
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        // Reset state
        setPeers({});
        setRemoteStreams({});
        setConnected(false);
        setMessages([]);
        setParticipantCount(0);
        setConnectionQuality({});
    }, []);

    // Initialize socket connection
    useEffect(() => {
        const socket = connectSocket();

        return () => {
            if (socket && socket.connected) {
                socket.disconnect();
            }
        };
    }, [connectSocket]);

    // Handle signaling and peer connections
    useEffect(() => {
        if (!socketRef.current || !connected) return;

        const socket = socketRef.current;

        // Join room
        console.log(`Joining room ${meetingId} as ${userName}`);
        socket.emit("joinRoom", {});

        // Handle existing participants
        const handleExistingParticipants = (users: Array<{ socketId: string; userName: string }>) => {
            console.log("Existing participants:", users);
            setParticipantCount(users.length + 1); // +1 for self

            users.forEach(user => {
                if (user.socketId === socket.id) return;

                const connection = createPeerConnection(user.socketId, true, user.userName);
                peersRef.current[user.socketId] = {
                    connection,
                    isInitiator: true,
                    iceCandidatesQueue: [],
                    connectionQuality: 'unknown',
                    userName: user.userName,
                    userId: user.socketId
                };

                setPeers(prev => ({ ...prev, [user.socketId]: connection }));
            });
        };

        // Handle new participant
        const handleNewParticipant = ({ socketId, userName: newUserName }: { socketId: string; userName: string }) => {
            console.log("New participant joined:", socketId, newUserName);
            setParticipantCount(prev => prev + 1);
            // Wait for offer from the new participant
        };

        // Enhanced SDP processing
        const handleSDPProcess = async ({ message, senderId }: { message: string; senderId: string }) => {
            try {
                const data = JSON.parse(message);
                console.log("Received SDP:", Object.keys(data)[0], "from", senderId);

                let peerInfo = peersRef.current[senderId];

                if (data.offer) {
                    // Create peer if doesn't exist
                    if (!peerInfo) {
                        const connection = createPeerConnection(senderId, false);
                        peerInfo = {
                            connection,
                            isInitiator: false,
                            iceCandidatesQueue: [],
                            connectionQuality: 'unknown',
                            userId: senderId
                        };
                        peersRef.current[senderId] = peerInfo;
                        setPeers(prev => ({ ...prev, [senderId]: connection }));
                    }

                    await peerInfo.connection.setRemoteDescription(new RTCSessionDescription(data.offer));

                    const answer = await peerInfo.connection.createAnswer();
                    await peerInfo.connection.setLocalDescription(answer);

                    socket.emit("SDPProcess", {
                        message: JSON.stringify({ answer: peerInfo.connection.localDescription }),
                        receiverId: senderId
                    });

                    // Process queued ICE candidates
                    peerInfo.iceCandidatesQueue.forEach(candidate => {
                        peerInfo.connection.addIceCandidate(candidate).catch(console.error);
                    });
                    peerInfo.iceCandidatesQueue = [];

                } else if (data.answer && peerInfo) {
                    await peerInfo.connection.setRemoteDescription(new RTCSessionDescription(data.answer));

                    // Process queued ICE candidates
                    peerInfo.iceCandidatesQueue.forEach(candidate => {
                        peerInfo.connection.addIceCandidate(candidate).catch(console.error);
                    });
                    peerInfo.iceCandidatesQueue = [];

                } else if (data.icecandidate) {
                    const candidate = new RTCIceCandidate(data.icecandidate);
                    if (peerInfo && peerInfo.connection.remoteDescription) {
                        await peerInfo.connection.addIceCandidate(candidate);
                    } else if (peerInfo) {
                        // Queue the candidate if remote description is not set yet
                        peerInfo.iceCandidatesQueue.push(candidate);
                    }
                }
            } catch (err) {
                console.error("Error processing SDP:", err);
                setError(`SDP processing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        };

        // Handle user disconnection
        const handleUserDisconnected = ({ socketId }: { socketId: string }) => {
            console.log("User disconnected:", socketId);
            setParticipantCount(prev => Math.max(1, prev - 1));

            const peerInfo = peersRef.current[socketId];
            if (peerInfo) {
                peerInfo.connection.close();
                delete peersRef.current[socketId];
            }

            // Clear quality monitoring
            if (qualityMonitorIntervals.current[socketId]) {
                clearInterval(qualityMonitorIntervals.current[socketId]);
                delete qualityMonitorIntervals.current[socketId];
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

            setConnectionQuality(prev => {
                const newQuality = { ...prev };
                delete newQuality[socketId];
                return newQuality;
            });
        };        // Handle chat messages
        const handleChatMessage = (messageData: {
            id?: string;
            senderId: string;
            senderName: string;
            text?: string;
            content?: string;
            timestamp?: string;
            roomId?: string;
        }) => {
            console.log("Received chat message:", messageData);

            // Convert server message format to our Message type
            const message: Message = {
                id: messageData.id || uuidv4(),
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                content: messageData.text || messageData.content || '',
                timestamp: messageData.timestamp ? new Date(messageData.timestamp).getTime() : Date.now(),
                roomId: messageData.roomId
            };

            setMessages(prev => [...prev, message]);
        };        // Handle media state changes
        const handleMediaStateChange = ({ senderId, type, enabled }: { senderId: string; type: 'audio' | 'video'; enabled: boolean }) => {
            setRemoteStreams(prev => {
                const existing = prev[senderId];
                if (!existing) return prev;

                return {
                    ...prev,
                    [senderId]: {
                        ...existing,
                        ...(type === 'audio' ? { isAudioEnabled: enabled } : { isVideoEnabled: enabled })
                    }
                };
            });
        };        // Register event listeners
        socket.on("existingParticipants", handleExistingParticipants);
        socket.on("newParticipant", handleNewParticipant);
        socket.on("SDPProcess", handleSDPProcess);
        socket.on("userDisconnected", handleUserDisconnected);
        socket.on("chat-message", handleChatMessage);
        socket.on("media-state-change", handleMediaStateChange);

        // Cleanup
        return () => {
            socket.off("existingParticipants", handleExistingParticipants);
            socket.off("newParticipant", handleNewParticipant);
            socket.off("SDPProcess", handleSDPProcess);
            socket.off("userDisconnected", handleUserDisconnected);
            socket.off("chat-message", handleChatMessage);
            socket.off("media-state-change", handleMediaStateChange);

            // Close all peer connections
            Object.values(peersRef.current).forEach(peerInfo => {
                peerInfo.connection.close();
            });
            peersRef.current = {};

            // Clear quality monitoring intervals
            Object.values(qualityMonitorIntervals.current).forEach(interval => {
                clearInterval(interval);
            });
            qualityMonitorIntervals.current = {};
        };
    }, [connected, meetingId, userName, createPeerConnection]);

    // Handle local stream changes
    useEffect(() => {
        if (!localStream) return;

        Object.values(peersRef.current).forEach(peerInfo => {
            const senders = peerInfo.connection.getSenders();

            localStream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track?.kind === track.kind);

                if (sender) {
                    sender.replaceTrack(track).catch(err =>
                        console.error(`Error replacing track: ${err}`)
                    );
                } else {
                    peerInfo.connection.addTrack(track, localStream);
                }
            });

            // Remove tracks that are no longer in the stream
            senders.forEach(sender => {
                if (sender.track && !localStream.getTracks().some(t => t.kind === sender.track!.kind)) {
                    peerInfo.connection.removeTrack(sender);
                }
            });
        });
    }, [localStream]); return {
        peers,
        remoteStreams,
        connected,
        socketId: socketRef.current?.id,
        isConnecting,
        error,
        connectionQuality,
        sendMessage,
        messages,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled,
        leaveRoom,
        participantCount
    };
}