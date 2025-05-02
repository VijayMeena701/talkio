'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import ControlBar from '@/components/ControlBar';
import Chat from '@/components/Chat';
import webRTCService from '@/services/webrtc.service';
import { Message, User } from '@/types';
import { FaClipboard, FaCheck, FaUserCircle } from 'react-icons/fa';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.roomId as string;
  const userName = searchParams?.get('userName') || 'Anonymous';
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [participants, setParticipants] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasMediaDevices, setHasMediaDevices] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!roomId || !userName) {
      router.push('/');
      return;
    }

    const connectToRoom = async () => {
      try {
        // Connect to signaling server
        webRTCService.connect(); // Use env variable or default
        
        // Set up event listeners for peers
        webRTCService.onPeerConnected((peerId, stream) => {
          console.log(`Peer connected: ${peerId} with stream`, stream, stream.getTracks());
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(peerId, stream);
            return newStreams;
          });
        });
        
        webRTCService.onPeerDisconnected((peerId) => {
          console.log(`Peer disconnected: ${peerId}`);
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(peerId);
            return newStreams;
          });
        });
        
        // Set up listeners for users joining/leaving
        webRTCService.onUserJoined((user) => {
          console.log(`User joined room: ${user.name} (${user.id})`);
          setParticipants(prev => {
            // Only add the user if they're not already in the list
            if (!prev.some(p => p.id === user.id)) {
              return [...prev, user];
            }
            return prev;
          });
        });
        
        webRTCService.onUserLeft((userId) => {
          console.log(`User left room: ${userId}`);
          setParticipants(prev => prev.filter(p => p.id !== userId));
        });
        
        // Set up chat message listener
        webRTCService.onMessageReceived((message) => {
          console.log('Received message:', message);
          setMessages(prev => [...prev, message]);
        });
        
        // Join the room
        console.log(`Joining room: ${roomId} as ${userName}`);
        await webRTCService.joinRoom(roomId, userName);
        const stream = webRTCService.getLocalStream();
        setLocalStream(stream);
        
        // Check if we have media tracks
        const hasVideoOrAudio = stream && 
          (stream.getVideoTracks().length > 0 || stream.getAudioTracks().length > 0);
        setHasMediaDevices(hasVideoOrAudio);
        
        // Add yourself to participants list
        const myId = webRTCService.getUserId();
        console.log(`Added self to participants list: ${userName} (${myId})`);
        setParticipants(prev => {
          if (!prev.some(p => p.id === myId)) {
            return [...prev, { id: myId, name: userName }];
          }
          return prev;
        });
        
        // Request room information to get all participants
        webRTCService.requestRoomInfo();
      } catch (error) {
        console.error('Error joining room:', error);
        alert('Failed to join the room. Please check your camera/microphone permissions and try again.');
        setHasMediaDevices(false);
        
        // Add yourself to participants list even without media
        const myId = webRTCService.getUserId();
        setParticipants(prev => {
          if (!prev.some(p => p.id === myId)) {
            return [...prev, { id: myId, name: userName }];
          }
          return prev;
        });
      }
    };

    connectToRoom();

    // Cleanup on component unmount
    return () => {
      console.log('Leaving room, cleaning up resources');
      webRTCService.leaveRoom();
    };
  }, [roomId, userName, router]);

  const handleToggleAudio = (enabled: boolean) => {
    webRTCService.toggleAudio(enabled);
  };

  const handleToggleVideo = (enabled: boolean) => {
    webRTCService.toggleVideo(enabled);
  };

  const handleLeaveCall = () => {
    webRTCService.leaveRoom();
    router.push('/');
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleSendMessage = (message: Message) => {
    // Send message through WebRTC service
    webRTCService.sendMessage(message);
    
    // Add to local messages (our own message will also come back via the server)
    setMessages(prev => [...prev, message]);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
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
              console.log('Rendering remote stream for', peerId, 'hasVideo:', hasVideo, stream);
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
        {isChatOpen && (
          <div className="w-full md:w-1/4 p-4">
            <Chat 
              userId={webRTCService.getUserId()}
              userName={userName}
              onSendMessage={handleSendMessage}
              messages={messages}
            />
          </div>
        )}
      </div>
      
      {/* Control bar */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow-up">
        <ControlBar 
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onLeaveCall={handleLeaveCall}
          onToggleChat={handleToggleChat}
        />
      </div>
    </div>
  );
}