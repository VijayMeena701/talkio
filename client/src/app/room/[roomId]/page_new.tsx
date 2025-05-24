"use client"

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import useWebRTC from '@/app/hooks/useWebRTC';
import ControlBar from '@/components/ControlBar';
import ParticipantView from '@/components/ParticipantView';
import Chat from '@/components/Chat';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';

const VIDEO_STATES = {
    NONE: 0,
    CAMERA: 1,
    SCREENSHARE: 2,
};

const MeetingRoom = () => {
    const roomId = useParams().roomId as string;
    const userName = useSearchParams().get('userName') as string;
    const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = React.useState(false);
    const [videoState, setVideoState] = React.useState(VIDEO_STATES.NONE);
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [isInitializing, setIsInitializing] = React.useState(true);

    // Use the enhanced WebRTC hook
    const {
        remoteStreams,
        connected,
        socketId,
        isConnecting,
        error,
        connectionQuality,
        sendMessage,
        messages,
        toggleAudio: webrtcToggleAudio,
        toggleVideo: webrtcToggleVideo,
        leaveRoom,
        participantCount
    } = useWebRTC({
        meetingId: roomId,
        userName,
        localStream
    });

    // Initialize audio stream
    React.useEffect(() => {
        const initAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                setLocalStream(stream);
                setIsInitializing(false);
            } catch (error) {
                console.error("Error accessing microphone:", error);
                setIsInitializing(false);
            }
        };

        initAudio();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Handle video toggle
    const handleToggleVideo = async () => {
        if (videoState === VIDEO_STATES.NONE) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (localStream) {
                    videoStream.getVideoTracks().forEach(track => localStream.addTrack(track));
                    setLocalStream(new MediaStream(localStream.getTracks()));
                } else {
                    setLocalStream(videoStream);
                }
                setVideoState(VIDEO_STATES.CAMERA);
                setIsVideoEnabled(true);
                webrtcToggleVideo(true);
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        } else {
            if (localStream) {
                localStream.getVideoTracks().forEach(track => {
                    track.stop();
                    localStream.removeTrack(track);
                });
                setLocalStream(new MediaStream(localStream.getTracks()));
            }
            setVideoState(VIDEO_STATES.NONE);
            setIsVideoEnabled(false);
            webrtcToggleVideo(false);
        }
    };

    // Handle audio toggle
    const handleToggleAudio = () => {
        const newState = !isAudioEnabled;
        setIsAudioEnabled(newState);
        webrtcToggleAudio(newState);
    };

    // Handle leave call
    const handleLeaveCall = () => {
        leaveRoom();
        window.location.href = '/';
    };

    // Handle chat toggle
    const handleToggleChat = () => {
        setIsChatOpen(!isChatOpen);
    };

    // Show loading state during initialization
    if (isInitializing || isConnecting) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <LoadingSpinner
                    size="large"
                    message={isInitializing ? "Initializing media..." : "Connecting to room..."}
                />
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold mb-4">Connection Error</h1>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex flex-col h-screen bg-gray-900">
                {/* Header */}
                <header className="p-4 bg-gray-800 text-white text-center">
                    <h1 className="text-xl">Meeting Room: {roomId}</h1>
                    <div className="flex justify-center items-center gap-4 text-sm mt-2">
                        {socketId && <span>My Socket ID: {socketId}</span>}
                        <span className={`px-2 py-1 rounded ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
                            {connected ? 'Connected' : 'Disconnected'}
                        </span>
                        <span>Participants: {participantCount}</span>
                    </div>
                </header>

                {/* Main content */}
                <div className="flex-1 flex">
                    {/* Video area */}
                    <main className={`${isChatOpen ? 'flex-1' : 'w-full'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 overflow-y-auto`}>
                        {/* Local participant */}
                        <ParticipantView
                            stream={localStream}
                            userName={userName || "You"}
                            isLocal={true}
                            connectionQuality="good"
                        />

                        {/* Remote participants */}
                        {Object.entries(remoteStreams).map(([peerId, streamData]) => (
                            <ParticipantView
                                key={peerId}
                                stream={streamData.stream}
                                userName={streamData.userName || `User ${peerId.substring(0, 6)}`}
                                connectionQuality={connectionQuality[peerId] || 'unknown'}
                                isVideoEnabled={streamData.isVideoEnabled}
                                isAudioEnabled={streamData.isAudioEnabled}
                            />
                        ))}
                    </main>

                    {/* Chat sidebar */}
                    {isChatOpen && (
                        <aside className="w-80 bg-gray-800 border-l border-gray-700">
                            <Chat
                                userId={socketId || 'unknown'}
                                userName={userName || 'Anonymous'}
                                onSendMessage={sendMessage}
                                messages={messages}
                            />
                        </aside>
                    )}
                </div>

                {/* Control bar */}
                <ControlBar
                    isAudioEnabled={isAudioEnabled}
                    isVideoEnabled={isVideoEnabled}
                    onToggleAudio={handleToggleAudio}
                    onToggleVideo={handleToggleVideo}
                    onLeaveCall={handleLeaveCall}
                    onToggleChat={handleToggleChat}
                    isChatOpen={isChatOpen}
                />
            </div>
        </ErrorBoundary>
    );
};

export default MeetingRoom;
