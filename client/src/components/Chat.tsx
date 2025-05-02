'use client';

import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ChatProps {
  userId: string;
  userName: string;
  onSendMessage: (message: Message) => void;
  messages: Message[];
}

const Chat = ({ userId, userName, onSendMessage, messages }: ChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() === '') return;
    
    const message: Message = {
      id: uuidv4(),
      senderId: userId,
      senderName: userName,
      content: newMessage,
      timestamp: Date.now()
    };
    
    onSendMessage(message);
    setNewMessage('');
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-200 dark:bg-gray-700">
        <h2 className="text-lg font-medium text-gray-800 dark:text-white">Chat</h2>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No messages yet</p>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index}
              className={`mb-4 ${message.senderId === userId ? 'flex justify-end' : ''}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.senderId === userId 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white'
                }`}
              >
                {message.senderId !== userId && (
                  <p className="text-xs font-medium mb-1">
                    {message.senderName}
                  </p>
                )}
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-right mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-300 dark:border-gray-600">
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;