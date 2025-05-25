"use client"

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import useWebRTC from '@/app/hooks/useWebRTC';
import ControlBar from '@/components/ControlBar';
import ParticipantView from '@/components/ParticipantView';
import Chat from '@/components/Chat';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';

const MeetingRoom = () => {
  const roomId = useParams().roomId as string;
  const userName = useSearchParams().get('userName') as string;
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [isChatOpen, setIsChatOpen] = React.useState(false);  // Calculate optimal grid layout based on participant count
  // Calculate optimal grid layout based on participant count and screen size
  const getGridLayout = (participantCount: number) => {
    // Mobile-first approach
    const getMobileLayout = (count: number) => {
      if (count === 1) {
        return { cols: 1, rows: 1, gridClass: 'grid-cols-1' };
      } else if (count === 2) {
        return { cols: 1, rows: 2, gridClass: 'grid-cols-1' };
      } else if (count === 3) {
        return { cols: 1, rows: 3, gridClass: 'grid-cols-1' }; // 2 top, 1 bottom
      } else if (count === 4) {
        return { cols: 2, rows: 2, gridClass: 'grid-cols-2' };
      } else if (count <= 6) {
        return { cols: 2, rows: 3, gridClass: 'grid-cols-2' };
      } else if (count <= 8) {
        return { cols: 2, rows: 4, gridClass: 'grid-cols-2' };
      } else {
        // For more participants on mobile, stick to 2 columns
        const rows = Math.ceil(count / 2);
        return { cols: 2, rows: rows, gridClass: 'grid-cols-2' };
      }
    };

    // Desktop layout
    const getDesktopLayout = (count: number) => {
      if (count === 1) {
        return { cols: 1, rows: 1, gridClass: 'md:grid-cols-1' };
      } else if (count === 2) {
        return { cols: 2, rows: 1, gridClass: 'md:grid-cols-2' };
      } else if (count === 3) {
        return { cols: 2, rows: 2, gridClass: 'md:grid-cols-2' }; // 2 top, 1 bottom
      } else if (count <= 4) {
        return { cols: 2, rows: 2, gridClass: 'md:grid-cols-2' };
      } else if (count <= 6) {
        return { cols: 3, rows: 2, gridClass: 'md:grid-cols-3' };
      } else if (count <= 9) {
        return { cols: 3, rows: 3, gridClass: 'md:grid-cols-3' };
      } else if (count <= 12) {
        return { cols: 4, rows: 3, gridClass: 'md:grid-cols-4' };
      } else if (count <= 16) {
        return { cols: 4, rows: 4, gridClass: 'md:grid-cols-4' };
      } else if (count <= 20) {
        return { cols: 5, rows: 4, gridClass: 'md:grid-cols-5' };
      } else if (count <= 25) {
        return { cols: 5, rows: 5, gridClass: 'md:grid-cols-5' };
      } else {
        // For more participants, calculate optimal grid
        const cols = Math.ceil(Math.sqrt(count));
        const maxCols = Math.min(cols, 8);
        return {
          cols: maxCols,
          rows: Math.ceil(count / maxCols),
          gridClass: `md:grid-cols-${maxCols}`
        };
      }
    };

    const mobileLayout = getMobileLayout(participantCount);
    const desktopLayout = getDesktopLayout(participantCount);

    // Combine mobile and desktop classes
    return {
      cols: desktopLayout.cols,
      rows: desktopLayout.rows,
      gridClass: `${mobileLayout.gridClass} ${desktopLayout.gridClass}`
    };
  };// Use the enhanced WebRTC hook
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
    participantCount } = useWebRTC({
      meetingId: roomId,
      userName,
      localStream
    });

  // Calculate total participants (local + remote)
  const totalParticipants = 1 + Object.keys(remoteStreams).length;
  const gridLayout = getGridLayout(totalParticipants);

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
          <main className={`flex-1 p-2 ${isChatOpen ? 'md:w-3/4' : ''}`}>
            <div className={`grid ${gridLayout.gridClass} gap-2 h-full w-full auto-rows-fr`}>
              {/* Local video */}
              <ParticipantView
                stream={localStream}
                userName={userName || "You"}
                isLocal={true}
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
              />
              {/* Remote videos */}
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
            </div>
          </main>{/* Chat sidebar */}
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