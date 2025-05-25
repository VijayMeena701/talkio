'use client';

import React from 'react';

// Client Component - Needs form handling and state
interface CreateRoomFormProps {
    userName: string;
    isTransitioning: boolean;
    onUserNameChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function CreateRoomForm({
    userName,
    isTransitioning,
    onUserNameChange,
    onSubmit
}: CreateRoomFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className={`transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                }`}>
                <label htmlFor="create-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your Name
                </label>
                <input
                    id="create-name"
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => onUserNameChange(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter your name"
                />
            </div>

            <button
                type="submit"
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                    }`}
            >
                Create New Room
            </button>
        </form>
    );
}
