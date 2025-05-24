import { ICEServer, TURNServerConfig, WebRTCSettings } from '@/types';

class TURNConfigService {
    private static instance: TURNConfigService;
    private settings: WebRTCSettings = {};

    private constructor() {
        this.loadEnvironmentConfig();
    }

    public static getInstance(): TURNConfigService {
        if (!TURNConfigService.instance) {
            TURNConfigService.instance = new TURNConfigService();
        }
        return TURNConfigService.instance;
    }

    private loadEnvironmentConfig(): void {
        // Load TURN server configuration from environment variables
        const turnUrls = process.env.NEXT_PUBLIC_TURN_URLS;
        const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
        const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
        const stunUrls = process.env.NEXT_PUBLIC_STUN_URLS;
        const iceTransportPolicy = process.env.NEXT_PUBLIC_ICE_TRANSPORT_POLICY as RTCIceTransportPolicy;

        this.settings = {
            useCustomTURN: !!turnUrls && !!turnUsername && !!turnCredential,
            turnServers: [],
            stunServers: [],
            iceTransportPolicy: iceTransportPolicy || 'all'
        };

        // Parse TURN servers
        if (turnUrls && turnUsername && turnCredential) {
            const urlsArray = turnUrls.split(',').map(url => url.trim());
            this.settings.turnServers = [{
                urls: urlsArray,
                username: turnUsername,
                credential: turnCredential
            }];
        }

        // Parse STUN servers
        if (stunUrls) {
            this.settings.stunServers = stunUrls.split(',').map(url => url.trim());
        } else {
            // Default STUN servers
            this.settings.stunServers = [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302'
            ];
        }
    }

    public updateSettings(newSettings: Partial<WebRTCSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    public getICEServers(): ICEServer[] {
        const iceServers: ICEServer[] = [];

        // Add STUN servers
        if (this.settings.stunServers && this.settings.stunServers.length > 0) {
            this.settings.stunServers.forEach(url => {
                iceServers.push({ urls: url });
            });
        }

        // Add TURN servers if configured
        if (this.settings.useCustomTURN && this.settings.turnServers && this.settings.turnServers.length > 0) {
            this.settings.turnServers.forEach(turnServer => {
                iceServers.push({
                    urls: turnServer.urls,
                    username: turnServer.username,
                    credential: turnServer.credential
                });
            });
        }

        return iceServers;
    }

    public getWebRTCConfig(): RTCConfiguration {
        return {
            iceServers: this.getICEServers(),
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceTransportPolicy: this.settings.iceTransportPolicy || 'all'
        };
    }

    public addTURNServer(turnConfig: TURNServerConfig): void {
        if (!this.settings.turnServers) {
            this.settings.turnServers = [];
        }
        this.settings.turnServers.push(turnConfig);
        this.settings.useCustomTURN = true;
    }

    public removeTURNServer(urls: string | string[]): void {
        if (!this.settings.turnServers) return;

        const urlsToRemove = Array.isArray(urls) ? urls : [urls];
        this.settings.turnServers = this.settings.turnServers.filter(server => {
            const serverUrls = Array.isArray(server.urls) ? server.urls : [server.urls];
            return !urlsToRemove.some(url => serverUrls.includes(url));
        });

        if (this.settings.turnServers.length === 0) {
            this.settings.useCustomTURN = false;
        }
    }

    public getSettings(): WebRTCSettings {
        return { ...this.settings };
    }

    public isUsingCustomTURN(): boolean {
        return this.settings.useCustomTURN || false;
    }

    public testTURNConnectivity(): Promise<boolean> {
        return new Promise((resolve) => {
            const iceServers = this.getICEServers();
            const turnServers = iceServers.filter(server => {
                const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                return urls.some(url => url.startsWith('turn:') || url.startsWith('turns:'));
            });

            if (turnServers.length === 0) {
                console.warn('No TURN servers configured for connectivity test');
                resolve(false);
                return;
            }

            try {
                const pc = new RTCPeerConnection({ iceServers: turnServers });
                let hasConnected = false;

                pc.oniceconnectionstatechange = () => {
                    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                        hasConnected = true;
                        pc.close();
                        resolve(true);
                    } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                        if (!hasConnected) {
                            pc.close();
                            resolve(false);
                        }
                    }
                };

                // Create a data channel to trigger ICE gathering
                pc.createDataChannel('test');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!hasConnected) {
                        pc.close();
                        resolve(false);
                    }
                }, 10000);
            } catch (error) {
                console.error('Error testing TURN connectivity:', error);
                resolve(false);
            }
        });
    }

    public async validateTURNCredentials(turnConfig: TURNServerConfig): Promise<boolean> {
        try {
            const testServers = [turnConfig];
            const pc = new RTCPeerConnection({ iceServers: testServers });

            return new Promise((resolve) => {
                let resolved = false;

                pc.oniceconnectionstatechange = () => {
                    if (!resolved) {
                        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                            resolved = true;
                            pc.close();
                            resolve(true);
                        } else if (pc.iceConnectionState === 'failed') {
                            resolved = true;
                            pc.close();
                            resolve(false);
                        }
                    }
                };

                // Create offer to start ICE gathering
                pc.createDataChannel('test');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        pc.close();
                        resolve(false);
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('Error validating TURN credentials:', error);
            return false;
        }
    }
}

export default TURNConfigService;
