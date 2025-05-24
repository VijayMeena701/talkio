import React, { useState, useEffect } from 'react';
import TURNConfigService from '@/services/turn-config.service';

interface TURNStatusIndicatorProps {
    className?: string;
}

const TURNStatusIndicator: React.FC<TURNStatusIndicatorProps> = ({ className = '' }) => {
    const [isUsingTURN, setIsUsingTURN] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const turnConfigService = TURNConfigService.getInstance();

    useEffect(() => {
        checkTURNStatus();
    }, []);

    const checkTURNStatus = async () => {
        const usingTURN = turnConfigService.isUsingCustomTURN();
        setIsUsingTURN(usingTURN);

        if (usingTURN) {
            setIsLoading(true);
            try {
                const connected = await turnConfigService.testTURNConnectivity();
                setIsConnected(connected);
            } catch (error) {
                console.error('Error checking TURN connectivity:', error);
                setIsConnected(false);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const getStatusColor = () => {
        if (!isUsingTURN) return 'bg-gray-400';
        if (isLoading) return 'bg-yellow-400';
        if (isConnected === null) return 'bg-gray-400';
        return isConnected ? 'bg-green-400' : 'bg-red-400';
    };

    const getStatusText = () => {
        if (!isUsingTURN) return 'STUN Only';
        if (isLoading) return 'Testing TURN...';
        if (isConnected === null) return 'TURN Unknown';
        return isConnected ? 'TURN Connected' : 'TURN Failed';
    };

    const getTooltipText = () => {
        if (!isUsingTURN) {
            return 'Using STUN servers only. May have connectivity issues behind firewalls.';
        }
        if (isLoading) {
            return 'Testing TURN server connectivity...';
        }
        if (isConnected === null) {
            return 'TURN server status unknown';
        }
        return isConnected
            ? 'TURN server is connected and working properly'
            : 'TURN server connection failed. Check configuration.';
    };

    return (
        <div className={`flex items-center space-x-2 ${className}`} title={getTooltipText()}>
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium text-gray-700">
                {getStatusText()}
            </span>
            {isUsingTURN && (
                <button
                    onClick={checkTURNStatus}
                    disabled={isLoading}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                    ↻
                </button>
            )}
        </div>
    );
};

export default TURNStatusIndicator;
