import React, { useState, useEffect } from 'react';
import { TURNServerConfig } from '@/types';
import TURNConfigService from '@/services/turn-config.service';

interface TURNServerSetupProps {
    onConfigurationChange?: (isUsingTURN: boolean) => void;
}

const TURNServerSetup: React.FC<TURNServerSetupProps> = ({ onConfigurationChange }) => {
    const [turnConfig, setTurnConfig] = useState<TURNServerConfig>({
        urls: '',
        username: '',
        credential: ''
    });
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);
    const [isUsingCustomTURN, setIsUsingCustomTURN] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [iceTransportPolicy, setIceTransportPolicy] = useState<RTCIceTransportPolicy>('all');

    const turnConfigService = TURNConfigService.getInstance();

    useEffect(() => {
        // Load current configuration
        const settings = turnConfigService.getSettings();
        setIsUsingCustomTURN(settings.useCustomTURN || false);
        setIceTransportPolicy(settings.iceTransportPolicy || 'all');

        if (settings.turnServers && settings.turnServers.length > 0) {
            const firstServer = settings.turnServers[0];
            setTurnConfig({
                urls: Array.isArray(firstServer.urls) ? firstServer.urls.join(',') : firstServer.urls,
                username: firstServer.username,
                credential: firstServer.credential
            });
        }
    }, []);

    const handleValidateCredentials = async () => {
        if (!turnConfig.urls || !turnConfig.username || !turnConfig.credential) {
            setValidationResult('error');
            return;
        }

        setIsValidating(true);
        setValidationResult(null);

        try {
            const urls = (turnConfig.urls as string).split(',').map(url => url.trim());
            const isValid = await turnConfigService.validateTURNCredentials({
                urls,
                username: turnConfig.username,
                credential: turnConfig.credential
            });

            setValidationResult(isValid ? 'success' : 'error');
        } catch (error) {
            console.error('Error validating TURN credentials:', error);
            setValidationResult('error');
        } finally {
            setIsValidating(false);
        }
    };

    const handleSaveConfiguration = () => {
        if (isUsingCustomTURN) {
            if (!turnConfig.urls || !turnConfig.username || !turnConfig.credential) {
                alert('Please fill in all TURN server fields');
                return;
            }

            const urls = (turnConfig.urls as string).split(',').map(url => url.trim());
            turnConfigService.addTURNServer({
                urls,
                username: turnConfig.username,
                credential: turnConfig.credential
            });
        } else {
            // Remove TURN servers if disabled
            turnConfigService.updateSettings({ useCustomTURN: false, turnServers: [] });
        }

        // Update ICE transport policy
        turnConfigService.updateSettings({ iceTransportPolicy });

        if (onConfigurationChange) {
            onConfigurationChange(isUsingCustomTURN);
        }

        alert('TURN server configuration saved successfully!');
    };

    const handleTestConnectivity = async () => {
        setIsValidating(true);
        try {
            const isConnected = await turnConfigService.testTURNConnectivity();
            alert(isConnected ? 'TURN server connectivity test passed!' : 'TURN server connectivity test failed. Please check your configuration.');
        } catch (error) {
            console.error('Error testing TURN connectivity:', error);
            alert('Error testing TURN connectivity. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">TURN Server Configuration</h2>
            <p className="text-gray-600 mb-6">
                Configure your own TURN server for reliable cross-network video conferencing.
                TURN servers help establish connections when participants are behind firewalls or NATs.
            </p>

            <div className="space-y-4">
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="useCustomTURN"
                        checked={isUsingCustomTURN}
                        onChange={(e) => setIsUsingCustomTURN(e.target.checked)}
                        className="mr-2"
                    />
                    <label htmlFor="useCustomTURN" className="text-sm font-medium">
                        Use Custom TURN Server
                    </label>
                </div>

                {isUsingCustomTURN && (
                    <div className="space-y-4 border-l-4 border-blue-500 pl-4 ml-4">
                        <div>
                            <label htmlFor="turnUrls" className="block text-sm font-medium text-gray-700">
                                TURN Server URLs
                            </label>
                            <input
                                type="text"
                                id="turnUrls"
                                value={turnConfig.urls}
                                onChange={(e) => setTurnConfig({ ...turnConfig, urls: e.target.value })}
                                placeholder="turn:your-server.com:3478,turns:your-server.com:5349"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Comma-separated list of TURN server URLs
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="turnUsername" className="block text-sm font-medium text-gray-700">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="turnUsername"
                                    value={turnConfig.username}
                                    onChange={(e) => setTurnConfig({ ...turnConfig, username: e.target.value })}
                                    placeholder="your-username"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="turnCredential" className="block text-sm font-medium text-gray-700">
                                    Password/Credential
                                </label>
                                <input
                                    type="password"
                                    id="turnCredential"
                                    value={turnConfig.credential}
                                    onChange={(e) => setTurnConfig({ ...turnConfig, credential: e.target.value })}
                                    placeholder="your-password"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={handleValidateCredentials}
                                disabled={isValidating}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isValidating ? 'Validating...' : 'Validate Credentials'}
                            </button>

                            {validationResult && (
                                <div className={`px-3 py-2 rounded-md text-sm ${validationResult === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {validationResult === 'success' ? 'Valid credentials!' : 'Invalid credentials!'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                    </button>
                </div>

                {showAdvanced && (
                    <div className="space-y-4 border-l-4 border-gray-300 pl-4 ml-4">
                        <div>
                            <label htmlFor="iceTransportPolicy" className="block text-sm font-medium text-gray-700">
                                ICE Transport Policy
                            </label>
                            <select
                                id="iceTransportPolicy"
                                value={iceTransportPolicy}
                                onChange={(e) => setIceTransportPolicy(e.target.value as RTCIceTransportPolicy)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All (STUN + TURN)</option>
                                <option value="relay">Relay Only (TURN only)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                "Relay Only" forces all traffic through TURN servers for maximum privacy
                            </p>
                        </div>

                        {turnConfigService.isUsingCustomTURN() && (
                            <button
                                onClick={handleTestConnectivity}
                                disabled={isValidating}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                {isValidating ? 'Testing...' : 'Test TURN Connectivity'}
                            </button>
                        )}
                    </div>
                )}

                <div className="flex space-x-4 pt-4">
                    <button
                        onClick={handleSaveConfiguration}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                        Save Configuration
                    </button>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Status:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Using Custom TURN: {turnConfigService.isUsingCustomTURN() ? 'Yes' : 'No'}</li>
                        <li>• ICE Transport Policy: {iceTransportPolicy}</li>
                        <li>• ICE Servers: {turnConfigService.getICEServers().length} configured</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TURNServerSetup;
