"use client"
import { io } from "socket.io-client";
import { useRef, useEffect, useState } from "react";
import ControlBar from '@/components/ControlBar';
import VideoPlayer from '@/components/VideoPlayer';
import { FaClipboard, FaCheck, FaUserCircle } from 'react-icons/fa';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import webRTCService from '@/services/webrtc.service';
import type { User } from '@/types';

const configuration = {
    iceServers: [
        {
            urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
        },
    ],
    iceCandidatePoolSize: 10,
};
const socket = io("http://localhost:3001", { transports: ["websocket"] });

let pc: RTCPeerConnection | null = null;
// let localStream: MediaStream | null = null;
let startButton: React.RefObject<HTMLButtonElement> | null;
let hangupButton: React.RefObject<HTMLButtonElement> | null;
let muteAudButton: React.RefObject<HTMLButtonElement> | null;
let remoteVideo: React.RefObject<HTMLVideoElement> | null;
let localVideo: React.RefObject<HTMLVideoElement> | null;

socket.on("message", (e) => {
    switch (e.type) {
        case "offer":
            handleOffer(e);
            break;
        case "answer":
            handleAnswer(e);
            break;
        case "candidate":
            handleCandidate(e);
            break;
        case "ready":
            // A second tab joined. This tab will initiate a call unless in a call already.
            if (pc) {
                console.log("already in call, ignoring");
                return;
            }
            makeCall();
            break;
        case "bye":
            if (pc) {
                hangup();
            }
            break;
        default:
            console.log("unhandled", e);
            break;
    }
});

async function makeCall() {
    try {
        pc = new RTCPeerConnection(configuration);
        pc.onicecandidate = (e) => {
            const message: {
                type: string;
                candidate: string | null;
                sdpMid?: string | null;
                sdpMLineIndex?: number | null;
            } = {
                type: "candidate",
                candidate: null,
            };
            if (e.candidate) {
                message.candidate = e.candidate.candidate;
                message.sdpMid = e.candidate.sdpMid;
                message.sdpMLineIndex = e.candidate.sdpMLineIndex;
            }
            socket.emit("message", message);
        };
        pc.ontrack = (e) => (remoteVideo.current.srcObject = e.streams[0]);
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        const offer = await pc.createOffer();
        socket.emit("message", { type: "offer", sdp: offer.sdp });
        await pc.setLocalDescription(offer);
    } catch (e) {
        console.log(e);
    }
}

async function handleOffer(offer: RTCSessionDescriptionInit) {
    if (pc) {
        console.error("existing peerconnection");
        return;
    }
    try {
        pc = new RTCPeerConnection(configuration);
        pc.onicecandidate = (e) => {
            const message: {
                type: string;
                candidate: string | null;
                sdpMid?: string | null;
                sdpMLineIndex?: number | null;
            } = {
                type: "candidate",
                candidate: null,
            };
            if (e.candidate) {
                message.candidate = e.candidate.candidate;
                message.sdpMid = e.candidate.sdpMid;
                message.sdpMLineIndex = e.candidate.sdpMLineIndex;
            }
            socket.emit("message", message);
        };
        pc.ontrack = (e) => (remoteVideo.current.srcObject = e.streams[0]);
        localStream?.getTracks().forEach((track) => pc?.addTrack(track, localStream));
        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();
        socket.emit("message", { type: "answer", sdp: answer.sdp });
        await pc.setLocalDescription(answer);
    } catch (e) {
        console.log(e);
    }
}

async function handleAnswer(answer) {
    if (!pc) {
        console.error("no peerconnection");
        return;
    }
    try {
        await pc.setRemoteDescription(answer);
    } catch (e) {
        console.log(e);
    }
}

async function handleCandidate(candidate) {
    try {
        if (!pc) {
            console.error("no peerconnection");
            return;
        }
        if (!candidate) {
            await pc.addIceCandidate(null);
        } else {
            await pc.addIceCandidate(candidate);
        }
    } catch (e) {
        console.log(e);
    }
}

async function hangup() {
    if (pc) {
        pc.close();
        pc = null;
    }
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
    startButton.current.disabled = false;
    hangupButton.current.disabled = true;
    muteAudButton.current.disabled = true;
}

function App() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params?.roomId as string;
    const userName = searchParams?.get('userName') || 'Anonymous';

    startButton = useRef(null);
    hangupButton = useRef(null);
    muteAudButton = useRef(null);
    localVideo = useRef(null);
    remoteVideo = useRef(null);
    
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [audiostate, setAudio] = useState(false);
    const [hasMediaDevices, setHasMediaDevices] = useState<boolean | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [participants, setParticipants] = useState<User[]>([]);

    useEffect(() => {
        if (!roomId || !userName) {
            router.push('/');
            return;
        }
        let isMounted = true;
        // Connect to signaling server and join room
        (async () => {
            webRTCService.connect();
            // Listen for new peer streams
            webRTCService.onPeerConnected((peerId, stream) => {
                if (!isMounted) return;
                setRemoteStreams(prev => {
                    const newStreams = new Map(prev);
                    newStreams.set(peerId, stream);
                    return newStreams;
                });
            });
            webRTCService.onPeerDisconnected((peerId) => {
                if (!isMounted) return;
                setRemoteStreams(prev => {
                    const newStreams = new Map(prev);
                    newStreams.delete(peerId);
                    return newStreams;
                });
            });
            webRTCService.onUserJoined((user) => {
                if (!isMounted) return;
                setParticipants(prev => {
                    if (!prev.some(p => p.id === user.id)) {
                        return [...prev, user];
                    }
                    return prev;
                });
            });
            webRTCService.onUserLeft((userId) => {
                if (!isMounted) return;
                setParticipants(prev => prev.filter(p => p.id !== userId));
            });
            await webRTCService.joinRoom(roomId, userName);
            const stream = webRTCService.getLocalStream();
            setLocalStream(stream);
            // Add yourself to participants
            const myId = webRTCService.getUserId();
            setParticipants(prev => {
                if (!prev.some(p => p.id === myId)) {
                    return [...prev, { id: myId, name: userName }];
                }
                return prev;
            });
            // Request room info
            webRTCService.requestRoomInfo();
        })();
        return () => { isMounted = false; webRTCService.leaveRoom(); };
    }, [roomId, userName, router]);

    useEffect(() => {
        if (!roomId || !userName) {
            router.push('/');
            return;
        }

        const checkMediaDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasCamera = devices.some(device => device.kind === 'videoinput');
                const hasMicrophone = devices.some(device => device.kind === 'audioinput');
                setHasMediaDevices(hasCamera && hasMicrophone);
            } catch (error) {
                console.error('Error checking media devices:', error);
                setHasMediaDevices(false);
            }
        };

        checkMediaDevices();
    },[roomId, router, userName])

    useEffect(() => {
        if(!hasMediaDevices) {
            return;
        }
        const startStream = async () => {
            try {
                const strm = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: { echoCancellation: true },
                });
                setLocalStream(strm)
                if(localVideo) localVideo.current.srcObject = strm;
            } catch (err) {
                console.log(err);
            }
        }
        startStream();
    },[hasMediaDevices])

    function muteAudio() {
        if (audiostate && localVideo) {
            localVideo.current.muted = true;
            setAudio(false);
        } else {
            if(localVideo){
                localVideo.current.muted = false;
                setAudio(true);
            }
        }
    }

    const handleToggleVideo = () => {
        if (localStream) {
            const newEnabled = !isVideoEnabled;
            localStream.getVideoTracks().forEach(track => {
                track.enabled = newEnabled;
            });
            setIsVideoEnabled(newEnabled);
        }
    };

    const handleToggleChat = () => {
        setIsChatOpen(!isChatOpen);
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <>
            <header className="bg-white dark:bg-gray-800 shadow p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Video Conference</h1>
                    <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Room ID: {roomId}</p>
                        <button
                            onClick={handleCopyRoomId}
                            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            aria-label="Copy room ID"
                        >
                            {isCopied ? <FaCheck /> : <FaClipboard />}
                        </button>
                    </div>
                </div>
                {hasMediaDevices === false && (
                    <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 rounded-md text-sm">
                        No camera or microphone detected. You are in view-only mode.
                    </div>
                )}
            </header>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Video grid */}
                <div className={`flex-1 p-4 ${isChatOpen ? 'hidden md:block md:w-3/4' : 'w-full'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                        {/* Local video */}
                        <div className="aspect-video">
                        {localStream && localStream.getVideoTracks().length > 0 ? (
                            <VideoPlayer 
                                stream={localStream} 
                                isMuted={true} 
                                isLocal={true} 
                                userName={userName} 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-gray-800 rounded-lg p-4">
                                <FaUserCircle className="text-6xl text-gray-400 mb-2" />
                                <p className="text-white font-medium">{userName} (You)</p>
                                <p className="text-gray-400 text-sm mt-2">No video available</p>
                            </div>
                        )}
                        </div>
                        {/* Remote videos */}
                        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
                            const participant = participants.find(p => p.id === peerId);
                            const hasVideo = stream && stream.getVideoTracks().length > 0;
                            return (
                                <div key={peerId} className="aspect-video">
                                    {hasVideo ? (
                                        <VideoPlayer 
                                            stream={stream} 
                                            userName={participant?.name || 'Unknown'} 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full bg-gray-800 rounded-lg p-4">
                                            <FaUserCircle className="text-6xl text-gray-400 mb-2" />
                                            <p className="text-white font-medium">{participant?.name || 'Unknown'}</p>
                                            <p className="text-gray-400 text-sm mt-2">No video available</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Chat sidebar */}
                {/* {isChatOpen && (
                <div className="w-full md:w-1/4 p-4">
                    <Chat 
                    userId={webRTCService.getUserId()}
                    userName={userName}
                    onSendMessage={handleSendMessage}
                    messages={messages}
                    />
                </div>
                )} */}
            </div>

            {/* Control bar */}
            <div className="p-4 bg-white dark:bg-gray-800 shadow-up">
                <ControlBar
                    onToggleAudio={muteAudio}
                    onToggleVideo={handleToggleVideo}
                    onLeaveCall={hangup}
                    onToggleChat={handleToggleChat}
                />
            </div>
        </>
    );
}

export default App