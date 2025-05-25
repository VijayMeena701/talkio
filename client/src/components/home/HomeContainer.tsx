'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import TabNavigation from './TabNavigation';
import JoinRoomForm from './JoinRoomForm';
import CreateRoomForm from './CreateRoomForm';
import HomeStatusBar from './HomeStatusBar';
import HomeHeader from './HomeHeader';

// Client Component - Contains all the interactive logic
export default function HomeContainer() {
    const [userName, setUserName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const router = useRouter();
    const formRef = useRef<HTMLDivElement>(null);

    // Update height when tab changes
    useEffect(() => {
        if (formRef.current) {
            setContentHeight(formRef.current.scrollHeight);
        }
    }, [isCreatingRoom]);

    const handleTabSwitch = (createRoom: boolean) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setIsCreatingRoom(createRoom);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 50);
        }, 150);
    };

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
        <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-md transition-all duration-300 ease-in-out">
            <HomeHeader />

            {/* Status and Settings */}
            <HomeStatusBar />

            <TabNavigation
                isCreatingRoom={isCreatingRoom}
                onTabSwitch={handleTabSwitch}
            />

            {/* Animated form container */}
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ height: contentHeight > 0 ? `${contentHeight}px` : 'auto' }}
            >
                <div ref={formRef}>
                    {isCreatingRoom ? (
                        <CreateRoomForm
                            userName={userName}
                            isTransitioning={isTransitioning}
                            onUserNameChange={setUserName}
                            onSubmit={handleCreateRoom}
                        />
                    ) : (
                        <JoinRoomForm
                            userName={userName}
                            roomId={roomId}
                            isTransitioning={isTransitioning}
                            onUserNameChange={setUserName}
                            onRoomIdChange={setRoomId}
                            onSubmit={handleJoinRoom}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
