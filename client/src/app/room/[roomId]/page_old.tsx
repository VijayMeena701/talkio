"use client"

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import useWebRTC from '@/app/hooks/useWebRTC';
import { FaUserCircle } from 'react-icons/fa';
import VideoPlayer from '@/components/VideoPlayer';
import ControlBar from '@/components/ControlBar';

const VIDEO_STATES = {
  NONE: 0,
  CAMERA: 1,
  SCREENSHARE: 2,
};

const MeetingRoom = () => {
  const roomId = useParams().roomId as string;
  const userName = useSearchParams().get('userName') as string;
  const [videoStream, setVideoStream] = React.useState<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);
  const [videoState, setVideoState] = React.useState(VIDEO_STATES.NONE);

  // Get the WebRTC hook
  const { remoteStreams, connected, socketId } = useWebRTC({ 
    meetingId: roomId, 
    userName, 
    localStream: videoStream 
  });

  // Add this effect to initialize with audio-only when component mounts
  React.useEffect(() => {
    const initAudio = async () => {
      try {
        // Start with audio only
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        setVideoStream(audioStream);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    initAudio();

    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modify the toggle video function to replace tracks instead of the whole stream
  const handleToggleVideo = async () => {
    if (videoState === VIDEO_STATES.NONE) {
      try {
        // Get video only
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        const videoTrack = videoOnlyStream.getVideoTracks()[0];
        
        // If we already have a stream with audio, add the video track to it
        if (videoStream) {
          videoStream.addTrack(videoTrack);
          
          // Create a new stream reference to trigger React updates
          const updatedStream = videoStream.clone();
          setVideoStream(updatedStream);
        } else {
          // If no stream exists yet, use the video-only stream
          setVideoStream(videoOnlyStream);
        }
        
        setVideoState(VIDEO_STATES.CAMERA);
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    } else {
      // Instead of nulling the stream, just remove the video track
      if (videoStream) {
        const videoTracks = videoStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop(); // Stop the track
          videoStream.removeTrack(track); // Remove it from stream
        });
        
        // Create a new stream reference with just audio to trigger React updates
        const audioOnlyStream = videoStream.clone();
        setVideoStream(audioOnlyStream);
      }
      
      setVideoState(VIDEO_STATES.NONE);
    }
  };

  // Toggle audio
  const handleToggleAudio = () => {
    if (videoStream) {
      const audioTrack = videoStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Debug info */}
      <div className="bg-black text-white p-2 text-sm">
        <p>Socket: {connected ? socketId : 'Connecting...'}</p>
        <p>Remote peers: {Object.keys(remoteStreams).length}</p>
      </div>

      {/* Video grid */}
      <div className="flex-grow p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Local video */}
        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
          {videoStream ? (
            <VideoPlayer
                isLocal={true}
                isMuted={true}
                stream={videoStream}
                userName={userName}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FaUserCircle className="text-6xl text-gray-500" />
            </div>
          )}
        </div>

        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div key={peerId} className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
            {/* <VideoPlayer
                isLocal={false}
                isMuted={false}
                stream={stream}
                userName={peerId}
            /> */}
            <video
              className="w-full h-full object-cover"
              ref={(el) => {
                if (el && stream) el.srcObject = stream;
              }}
              autoPlay
              playsInline
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              {peerId}
            </div>
          </div>
        ))}
      </div>

      <ControlBar
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onLeaveCall={() => window.location.href = '/'}
        onToggleChat={() => {}}
      />

      {/* Controls */}
      {/* <div className="bg-black p-4 flex justify-center">
        <button 
          onClick={handleToggleAudio}
          className="mx-2 p-3 rounded-full bg-gray-700 text-white"
        >
          {isAudioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button 
          onClick={handleToggleVideo}
          className="mx-2 p-3 rounded-full bg-gray-700 text-white"
        >
          {videoState === VIDEO_STATES.CAMERA ? 'Stop Video' : 'Start Video'}
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          className="mx-2 p-3 rounded-full bg-red-600 text-white"
        >
          Leave
        </button>
      </div> */}
    </div>
  );
};

export default MeetingRoom;