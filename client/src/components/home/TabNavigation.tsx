'use client';

import React from 'react';

// Client Component - Needs state and event handlers
interface TabNavigationProps {
    isCreatingRoom: boolean;
    onTabSwitch: (createRoom: boolean) => void;
}

export default function TabNavigation({ isCreatingRoom, onTabSwitch }: TabNavigationProps) {
    return (
        <div className="flex justify-center">
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                <button
                    className={`px-4 py-2 font-medium transition-all duration-200 ${!isCreatingRoom
                        ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    onClick={() => onTabSwitch(false)}
                >
                    Join Room
                </button>
                <button
                    className={`px-4 py-2 font-medium transition-all duration-200 ${isCreatingRoom
                        ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    onClick={() => onTabSwitch(true)}
                >
                    Create Room
                </button>
            </div>
        </div>
    );
}
