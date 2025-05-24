"use client"

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import useWebRTC from '@/app/hooks/useWebRTC';
import ControlBar from '@/components/ControlBar';
import ParticipantView from '@/components/ParticipantView';
import Chat from '@/components/Chat';
import ErrorBoundary from '../../../components/ErrorBoundary';
import LoadingSpinner from '../../../components/LoadingSpinner';

const MeetingRoom = () => {
  const roomId = useParams().roomId as string;
  const userName = useSearchParams().get('userName') as string;
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [isChatOpen, setIsChatOpen] = React.useState(false);  // Use the enhanced WebRTC hook
  const {
    remoteStreams,
    connected,
    socketId,
    isConnecting,
    error,
    sendMessage,
    messages,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    leaveRoom,
    participantCount
  } = useWebRTC({
    meetingId: roomId,
    userName,
    localStream
  });
  React.useEffect(() => {
    if (!roomId || !userName) return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    };

    initAudio();

    return () => {
      // Cleanup will be handled by the hook
    };
  }, [roomId, userName]);
  const handleToggleVideo = async () => {
    await toggleVideo(!isVideoEnabled);
  };

  const handleToggleAudio = async () => {
    await toggleAudio(!isAudioEnabled);
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleLeaveCall = () => {
    leaveRoom();
    window.location.href = '/';
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <LoadingSpinner />
        <p className="text-white ml-4">Connecting to room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white">
          <h2 className="text-xl mb-4">Connection Error</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-900">
        <header className="p-4 bg-gray-800 text-white text-center">
          <h1 className="text-xl">Meeting Room: {roomId}</h1>
          {socketId && <p className="text-sm">Socket ID: {socketId}</p>}
          {!connected && <p className="text-sm text-yellow-500">Connecting...</p>}
          {connected && <p className="text-sm text-green-500">Connected • {participantCount} participants</p>}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Main video area */}
          <main className={`flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto ${isChatOpen ? 'md:w-3/4' : ''}`}>            {/* Local video */}
            <ParticipantView
              stream={localStream}
              userName={userName || "You"}
              isLocal={true}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
            />{/* Remote videos */}
            {Object.entries(remoteStreams).map(([peerId, streamData]) => (
              <ParticipantView
                key={peerId}
                stream={streamData.stream}
                userName={streamData.userName || `User ${peerId.substring(0, 6)}`}
                isLocal={false}
                isVideoEnabled={streamData.isVideoEnabled}
                isAudioEnabled={streamData.isAudioEnabled}
              />
            ))}
          </main>          {/* Chat sidebar */}
          {isChatOpen && (
            <aside className="w-full md:w-1/4 bg-gray-800 border-l border-gray-700">
              <Chat
                userId={socketId || 'unknown'}
                userName={userName || 'Unknown'}
                messages={messages}
                onSendMessage={(message) => sendMessage({
                  senderId: message.senderId,
                  senderName: message.senderName,
                  content: message.content,
                  roomId: roomId
                })}
              />
            </aside>
          )}
        </div>

        <footer className="p-4 bg-gray-800">
          <ControlBar
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onLeaveCall={handleLeaveCall}
            onToggleChat={handleToggleChat}
            isChatOpen={isChatOpen}
          />
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default MeetingRoom;