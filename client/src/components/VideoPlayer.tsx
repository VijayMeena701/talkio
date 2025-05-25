'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaExpand, FaCompress, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';

interface VideoPlayerProps {
  stream: MediaStream;
  isLocal: boolean;
  isMuted?: boolean;
  userName: string;
  isScreenShare?: boolean;
  showControls?: boolean;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  isLocal,
  isMuted = false,
  userName,
  isScreenShare = false,
  showControls = true,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(isMuted || isLocal);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Set up video stream
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) return;

    const handleLoadedMetadata = () => {
      setIsVideoLoaded(true);
      setVideoError(null);
    };

    const handleError = () => {
      setVideoError('Failed to load video stream');
      setIsVideoLoaded(false);
    };

    videoElement.srcObject = stream;
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleError);
    };
  }, [stream]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    try {
      if (!document.fullscreenElement) {
        await videoElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Toggle video mute (for remote streams only)
  const toggleVideoMute = () => {
    if (!isLocal) {
      setIsVideoMuted(!isVideoMuted);
    }
  };
  return (
    <div className={`relative w-full h-full bg-black rounded-lg overflow-hidden group ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-cover'}`}
        autoPlay
        playsInline
        muted={isVideoMuted}
        style={{ transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none' }} // Mirror local camera
      />

      {/* Loading state */}
      {!isVideoLoaded && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-white text-center">
            <p className="text-sm text-red-400">{videoError}</p>
          </div>
        </div>
      )}

      {/* Video controls overlay (shown on hover) */}
      {showControls && isVideoLoaded && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute top-2 right-2 flex gap-2">
            {/* Volume toggle (for remote streams) */}
            {!isLocal && (
              <button
                onClick={toggleVideoMute}
                className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
              >
                {isVideoMuted ? <FaVolumeMute className="text-sm" /> : <FaVolumeUp className="text-sm" />}
              </button>
            )}

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <FaCompress className="text-sm" /> : <FaExpand className="text-sm" />}
            </button>
          </div>
        </div>
      )}      {/* Screen share indicator */}
      {isScreenShare && (
        <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-90 px-2 py-1 rounded text-white text-xs font-medium">
          Screen Share
        </div>
      )}

      {/* User name label */}
      {userName && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs font-medium">
          {userName}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;