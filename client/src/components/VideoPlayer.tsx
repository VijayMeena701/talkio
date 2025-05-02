'use client';

import React from 'react';

interface VideoPlayerProps {
  stream: MediaStream;
  isLocal: boolean;
  isMuted: boolean;
  userName: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, isLocal, isMuted, userName }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  return (
    <div className="relative w-full h-full bg-black rounded-lg">
      <video 
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg"
        autoPlay 
        playsInline
        muted={isMuted || isLocal} // Always mute local video to prevent feedback
      />
      <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-70 px-2 py-1 rounded text-white">
        {userName} {isLocal && '(You)'}
      </div>
    </div>
  );
};

export default VideoPlayer;