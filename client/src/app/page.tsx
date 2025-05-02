'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const router = useRouter();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    
    router.push(`/room/${roomId}?userName=${encodeURIComponent(userName)}`);
  };
  
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    const newRoomId = uuidv4().substring(0, 8);
    router.push(`/room/${newRoomId}?userName=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Video Conferencing
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Connect with anyone, anywhere.
          </p>
        </div>
        
        <div className="flex justify-center">
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
            <button
              className={`px-4 py-2 font-medium ${
                !isCreatingRoom
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setIsCreatingRoom(false)}
            >
              Join Room
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                isCreatingRoom
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setIsCreatingRoom(true)}
            >
              Create Room
            </button>
          </div>
        </div>
        
        {isCreatingRoom ? (
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div>
              <label htmlFor="create-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Name
              </label>
              <input
                id="create-name"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
              />
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create New Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinRoom} className="space-y-6">
            <div>
              <label htmlFor="join-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Name
              </label>
              <input
                id="join-name"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label htmlFor="room-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Room ID
              </label>
              <input
                id="room-id"
                type="text"
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter room ID"
              />
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Join Room
            </button>
          </form>
        )}
      </div>
      
      <footer className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Video Conferencing App. All rights reserved.</p>
      </footer>
    </div>
  );
}
