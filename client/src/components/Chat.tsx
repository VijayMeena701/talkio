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
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Chat</h2>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-center">No messages yet</p>
            <p className="text-sm text-center mt-1">Start the conversation!</p>
          </div>
        ) : (messages.map((message, index) => {
          const isOwn = message.senderId === userId;
          return (
            <div
              key={message.id || index}
              className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
            >
              <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {/* Sender name for incoming messages */}
                {!isOwn && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 px-2">
                    {message.senderName}
                  </span>
                )}

                {/* Message bubble */}
                <div
                  className={`px-4 py-2 shadow-sm ${isOwn
                    ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm ml-auto'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-2xl rounded-bl-sm mr-auto'
                    }`}
                >
                  <p className="text-sm leading-relaxed break-words">{message.content}</p>

                  {/* Timestamp */}
                  <div className={`flex items-center mt-1 space-x-1 ${isOwn
                    ? 'justify-end text-blue-100'
                    : 'justify-end text-gray-500 dark:text-gray-400'
                    }`}>
                    <span className="text-xs">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            <FaPaperPlane className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;