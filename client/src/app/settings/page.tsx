"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import TURNServerSetup from '@/components/TURNServerSetup';
import TURNStatusIndicator from '@/components/TURNStatusIndicator';

const SettingsPage = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'turn' | 'general'>('turn');

    const handleConfigurationChange = (isUsingTURN: boolean) => {
        console.log('TURN configuration changed:', isUsingTURN);
        // You can add additional logic here if needed
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                            <p className="text-gray-600">Configure your video conferencing preferences</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <TURNStatusIndicator />
                            <button
                                onClick={() => router.push('/')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex">
                            <button
                                onClick={() => setActiveTab('turn')}
                                className={`py-4 px-6 text-sm font-medium border-b-2 ${activeTab === 'turn'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                TURN Server
                            </button>
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`py-4 px-6 text-sm font-medium border-b-2 ${activeTab === 'general'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                General
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'turn' && (
                            <TURNServerSetup onConfigurationChange={handleConfigurationChange} />
                        )}

                        {activeTab === 'general' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">General Settings</h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Audio & Video Defaults</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" defaultChecked />
                                                <span className="text-sm">Enable microphone by default</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" />
                                                <span className="text-sm">Enable camera by default</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Connection Settings</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" defaultChecked />
                                                <span className="text-sm">Automatically reconnect on connection loss</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" defaultChecked />
                                                <span className="text-sm">Show connection quality indicators</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Privacy Settings</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input type="checkbox" className="mr-2" />
                                                <span className="text-sm">Force all traffic through TURN servers (relay mode)</span>
                                            </label>
                                            <p className="text-xs text-gray-500 ml-6">
                                                Enables maximum privacy but requires a TURN server
                                            </p>
                                        </div>
                                    </div>

                                    <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        Save General Settings
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Help Section */}
                <div className="mt-8 bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Need Help Setting Up a TURN Server?</h3>
                    <p className="text-blue-700 mb-4">
                        TURN servers help ensure reliable video conferencing connections, especially when participants
                        are behind firewalls or on restricted networks.
                    </p>
                    <div className="space-y-2 text-sm text-blue-600">
                        <p>• <strong>Easy setup:</strong> Use our Docker configuration for quick deployment</p>
                        <p>• <strong>Cloud providers:</strong> Deploy on AWS, Google Cloud, or Digital Ocean</p>
                        <p>• <strong>Testing tools:</strong> Built-in connectivity testing to verify your setup</p>
                    </div>
                    <a
                        href="/TURN_SERVER_SETUP.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        View Setup Guide
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
