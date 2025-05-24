'use client';

import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhone, FaComments, FaDesktop } from 'react-icons/fa';

interface ControlBarProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
  onToggleChat: () => void;
  isChatOpen?: boolean;
  onScreenShare?: () => void;
  isScreenSharing?: boolean;
  disabled?: boolean;
}

const ControlBar = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
  onToggleChat,
  isChatOpen = false,
  onScreenShare,
  isScreenSharing = false,
  disabled = false
}: ControlBarProps) => {
  return (
    <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-center gap-6">
      {/* Audio toggle */}
      <button
        onClick={onToggleAudio}
        disabled={disabled}
        className={`rounded-full p-3 transition-colors ${disabled
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : isAudioEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ?
          <FaMicrophone className="text-white text-xl" /> :
          <FaMicrophoneSlash className="text-white text-xl" />
        }
      </button>

      {/* Video toggle */}
      <button
        onClick={onToggleVideo}
        disabled={disabled}
        className={`rounded-full p-3 transition-colors ${disabled
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : isVideoEnabled
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ?
          <FaVideo className="text-white text-xl" /> :
          <FaVideoSlash className="text-white text-xl" />
        }
      </button>

      {/* Screen share toggle (if available) */}
      {onScreenShare && (
        <button
          onClick={onScreenShare}
          disabled={disabled}
          className={`rounded-full p-3 transition-colors ${disabled
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
        >
          <FaDesktop className="text-white text-xl" />
        </button>
      )}

      {/* Leave call */}
      <button
        onClick={onLeaveCall}
        disabled={disabled}
        className={`rounded-full p-3 transition-colors ${disabled
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : 'bg-red-600 hover:bg-red-700'
          }`}
        aria-label="Leave call"
      >
        <FaPhone className="text-white text-xl rotate-135" />
      </button>

      {/* Chat toggle */}
      <button
        onClick={onToggleChat}
        disabled={disabled}
        className={`rounded-full p-3 transition-colors ${disabled
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : isChatOpen
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        aria-label="Toggle chat"
      >
        <FaComments className="text-white text-xl" />
      </button>
    </div>
  );
};

export default ControlBar;