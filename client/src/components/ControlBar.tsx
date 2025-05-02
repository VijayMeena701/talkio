'use client';

import { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhone, FaComments } from 'react-icons/fa';

interface ControlBarProps {
  onToggleAudio: (enabled: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  onLeaveCall: () => void;
  onToggleChat: () => void;
}

const ControlBar = ({ onToggleAudio, onToggleVideo, onLeaveCall, onToggleChat }: ControlBarProps) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  
  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    onToggleAudio(newState);
  };
  
  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    onToggleVideo(newState);
  };
  
  return (
    <div className="bg-gray-900 p-4 rounded-lg flex items-center justify-center gap-6">
      <button
        onClick={handleToggleAudio}
        className={`rounded-full p-3 ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? <FaMicrophone className="text-white text-xl" /> : <FaMicrophoneSlash className="text-white text-xl" />}
      </button>
      
      <button
        onClick={handleToggleVideo}
        className={`rounded-full p-3 ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
        aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? <FaVideo className="text-white text-xl" /> : <FaVideoSlash className="text-white text-xl" />}
      </button>
      
      <button
        onClick={onLeaveCall}
        className="rounded-full p-3 bg-red-600 hover:bg-red-700"
        aria-label="Leave call"
      >
        <FaPhone className="text-white text-xl rotate-135" />
      </button>
      
      <button
        onClick={onToggleChat}
        className="rounded-full p-3 bg-gray-700 hover:bg-gray-600"
        aria-label="Toggle chat"
      >
        <FaComments className="text-white text-xl" />
      </button>
    </div>
  );
};

export default ControlBar;