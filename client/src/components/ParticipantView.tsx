'use client';

import React, { memo } from 'react';
import VideoPlayer from './VideoPlayer';
import { FaUserCircle, FaMicrophoneSlash, FaWifi, FaExclamationTriangle } from 'react-icons/fa';

interface ParticipantViewProps {
  stream: MediaStream | null;
  userName: string;
  isLocal?: boolean;
  connectionQuality?: 'good' | 'poor' | 'unknown';
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isScreenShare?: boolean;
}

const ParticipantView = memo(({
  stream,
  userName,
  isLocal = false,
  connectionQuality = 'unknown',
  isVideoEnabled = true,
  isAudioEnabled = true,
  isScreenShare = false
}: ParticipantViewProps) => {
  const hasVideo = stream && stream.getVideoTracks().length > 0 && isVideoEnabled;

  // Connection quality indicator colors
  const qualityColors = {
    good: 'text-green-500',
    poor: 'text-red-500',
    unknown: 'text-gray-500'
  };

  return (
    <div className="relative w-full h-full group min-h-0 flex items-center justify-center p-1">
      <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden max-h-full max-w-full">
        {hasVideo ? (
          <VideoPlayer
            stream={stream}
            isMuted={isLocal}
            isLocal={isLocal}
            userName={userName}
            isScreenShare={isScreenShare}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gray-800 rounded-lg p-4">
            <FaUserCircle className="text-6xl text-gray-400 mb-2" />
            <p className="text-white font-medium text-center">
              {userName} {isLocal && '(You)'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {isVideoEnabled ? 'No video signal' : 'Camera off'}
            </p>
          </div>
        )}

        {/* Overlay with participant info and status indicators */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top overlay - connection quality and screen share indicator */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <div className="flex items-center gap-2">
              {/* Connection quality indicator */}
              <div className={`p-1 rounded bg-black bg-opacity-50 ${qualityColors[connectionQuality]}`}>
                <FaWifi className="text-xs" />
              </div>

              {/* Screen share indicator */}
              {isScreenShare && (
                <div className="px-2 py-1 bg-blue-600 bg-opacity-80 rounded text-xs text-white">
                  Screen
                </div>
              )}
            </div>

            {/* Audio status indicator */}
            {!isAudioEnabled && (
              <div className="p-1 rounded bg-red-600 bg-opacity-80">
                <FaMicrophoneSlash className="text-white text-xs" />
              </div>
            )}
          </div>

          {/* Bottom overlay - participant name */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black bg-opacity-50 px-3 py-1 rounded text-white text-sm font-medium">
              {userName} {isLocal && '(You)'}
            </div>
          </div>

          {/* Connection issue overlay */}
          {connectionQuality === 'poor' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-red-600 bg-opacity-90 px-3 py-2 rounded text-white text-sm flex items-center gap-2">
                <FaExclamationTriangle className="text-xs" />
                Poor connection
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ParticipantView.displayName = 'ParticipantView';

export default ParticipantView;