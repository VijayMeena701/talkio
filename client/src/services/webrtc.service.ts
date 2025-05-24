import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import { PeerConnection, User, Message } from '@/types';
import TURNConfigService from './turn-config.service';

class WebRTCService {
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private pendingConnections: string[] = []; // Track peers we need to connect to once we have media
  private peers: Map<string, PeerConnection> = new Map();
  private userId: string = '';
  private userName: string = '';
  private roomId: string = '';
  private isConnected: boolean = false;
  private isAudioEnabled: boolean = false;
  private isVideoEnabled: boolean = false;
  private turnConfigService: TURNConfigService;

  // ICE servers config for NAT traversal - now using TURN config service
  private iceServers: RTCConfiguration;
  private onPeerConnectedCallback: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onPeerDisconnectedCallback: ((peerId: string) => void) | null = null;
  private onUserJoinedCallback: ((user: User) => void) | null = null;
  private onUserLeftCallback: ((userId: string) => void) | null = null;
  private onMessageReceivedCallback: ((message: Message) => void) | null = null; private onMediaStateChangedCallback: ((audioEnabled: boolean, videoEnabled: boolean) => void) | null = null;
  constructor() {
    this.userId = uuidv4();
    this.turnConfigService = TURNConfigService.getInstance();
    this.iceServers = this.turnConfigService.getWebRTCConfig();
  }

  private updateMediaState(): void {
    if (!this.localStream) {
      this.isAudioEnabled = false;
      this.isVideoEnabled = false;
    } else {
      const audioTracks = this.localStream.getAudioTracks();
      const videoTracks = this.localStream.getVideoTracks();

      this.isAudioEnabled = audioTracks.length > 0 && audioTracks.some(track => track.enabled);
      this.isVideoEnabled = videoTracks.length > 0 && videoTracks.some(track => track.enabled);
    }

    console.log(`Media state updated: Audio=${this.isAudioEnabled}, Video=${this.isVideoEnabled}`);

    if (this.onMediaStateChangedCallback) {
      this.onMediaStateChangedCallback(this.isAudioEnabled, this.isVideoEnabled);
    }
  }

  public connect(serverUrl?: string): void {
    try {
      // Use environment variable if available, otherwise fallback to argument or default
      const url =
        typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL
          ? process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL
          : serverUrl || 'https://ws.talkio.vijaymeena.dev';
      console.log(`Connecting to signaling server at ${url}`);
      this.socket = io(url);

      this.socket.on('connect', () => {
        console.log('Connected to signaling server', this.socket?.id);
        this.isConnected = true;

        // If we're already in a room when reconnecting, re-join it
        if (this.roomId) {
          this.socket?.emit('get-room-info', { roomId: this.roomId });
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        alert(`Could not connect to the signaling server. Please check if the server is running at ${url}`);
      });

      this.socket.on('user-joined', ({ userId, userName }: { userId: string, userName: string }) => {
        console.log(`User joined: ${userName} (${userId})`);

        if (this.onUserJoinedCallback) {
          this.onUserJoinedCallback({ id: userId, name: userName });
        }

        // Immediately initiate a connection when a new user joins
        this.initiateConnection(userId);
      });

      this.socket.on('user-left', (userId: string) => {
        console.log(`User left: ${userId}`);
        this.removePeer(userId);

        if (this.onUserLeftCallback) {
          this.onUserLeftCallback(userId);
        }
      });

      this.socket.on('signal', ({ from, signal }: { from: string, signal: Peer.SignalData }) => {
        console.log(`Signal received from ${from}, type:`, signal.type);
        const peerConnection = this.peers.get(from);

        if (peerConnection) {
          console.log(`Existing peer found for ${from}, signaling`);
          peerConnection.peer.signal(signal);
        } else {
          // If we receive an "offer" signal but don't have a peer connection yet,
          // we need to create one as non-initiator
          if (signal.type === 'offer') {
            console.log(`Creating non-initiator peer for ${from} due to offer`);
            this.createPeer(from, false);

            // Signal after a short delay to ensure the peer is fully created
            setTimeout(() => {
              const newPeerConnection = this.peers.get(from);
              if (newPeerConnection) {
                newPeerConnection.peer.signal(signal);
              }
            }, 100);
          } else if (signal.type === 'answer') {
            console.log(`Received answer for ${from} but no peer exists`);
          } else {
            console.log(`Received ICE candidate for ${from} but no peer exists`);
          }
        }
      });

      // Add chat message handling
      this.socket.on('chat-message', (message: Message) => {
        console.log('Received chat message:', message);
        if (this.onMessageReceivedCallback) {
          this.onMessageReceivedCallback(message);
        }
      });

      // Add room info request handling
      this.socket.on('room-info', ({ participants }: { participants: User[] }) => {
        console.log('Received room info with participants:', participants);
        participants.forEach(user => {
          if (user.id !== this.userId && this.onUserJoinedCallback) {
            this.onUserJoinedCallback(user);

            // Only initiate connections if we have media stream, otherwise queue them
            if (this.localStream) {
              this.initiateConnection(user.id);
            } else {
              this.pendingConnections.push(user.id);
              console.log(`Added ${user.id} to pending connections`);
            }
          }
        });
      });      // Request room info on connection
      this.socket.on('connect', () => {
        if (this.roomId) {
          this.socket?.emit('get-room-info', { roomId: this.roomId });
        }
      });      // Handle stream updates from other peers
      this.socket.on('stream-update', ({ userId }: { userId: string }) => {
        console.log(`Peer ${userId} is updating their stream`);

        // If we have a connection to this peer, close it and wait for them to reinitiate
        // This prevents both peers from trying to be initiators simultaneously
        const peerConnection = this.peers.get(userId);
        if (peerConnection) {
          console.log(`Closing connection to ${userId} and waiting for reinitiation after their stream update`);
          try {
            peerConnection.peer.destroy();
            this.peers.delete(userId);
          } catch (error) {
            console.error(`Error closing connection to ${userId}:`, error);
          }
        }
      });
    } catch (error) {
      console.error('Error connecting to signaling server:', error);
      alert('Failed to connect to signaling server. Please try again.');
    }
  }

  public async joinRoom(roomId: string, userName: string): Promise<void> {
    this.roomId = roomId;
    this.userName = userName;

    if (!this.socket || !this.isConnected) {
      console.warn('Not connected to signaling server, connecting now...');
      this.connect();

      // Wait for connection
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    try {
      // Create an empty MediaStream as default - we'll try to get real media,
      // but we can still join the room without it
      this.localStream = new MediaStream();      // Try to get both video and audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('Got access to both video and audio');
        this.localStream = stream;
      } catch (error) {
        console.warn('Could not get both video and audio, trying video only:', error);

        // Try to get video only
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          console.log('Got access to video only');
          this.localStream = stream;
        } catch (videoError) {
          console.warn('Could not get video, trying audio only:', videoError);

          // Try to get audio only
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true
            });
            console.log('Got access to audio only');
            this.localStream = stream;
          } catch (audioError) {
            console.warn('Could not get audio either. Using empty stream as fallback:', audioError);
          }
        }
      }

      // Update media state after getting stream
      this.updateMediaState();

      // Process any pending connections now that we have a media stream
      if (this.pendingConnections.length > 0) {
        console.log(`Processing ${this.pendingConnections.length} pending connections`);
        this.pendingConnections.forEach(peerId => {
          this.initiateConnection(peerId);
        });
        this.pendingConnections = [];
      }

      // Join the room even without media
      console.log(`Joining room ${roomId} as ${userName} (${this.userId})`);
      this.socket?.emit('join-room', {
        roomId,
        userId: this.userId,
        userName
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Still join the room even without media
      this.socket?.emit('join-room', {
        roomId,
        userId: this.userId,
        userName
      });
    }
  }

  // This method is called to initiate a connection to a new peer
  public initiateConnection(peerId: string): void {
    console.log(`Initiating connection to peer ${peerId}`);

    // If we don't have media yet, queue this connection for later
    if (!this.localStream) {
      console.log(`No local stream yet, adding ${peerId} to pending connections`);
      this.pendingConnections.push(peerId);
      return;
    }

    // If we have a local stream but no socket connection, log an error
    if (!this.socket || !this.isConnected) {
      console.error(`Cannot create peer: socket is not connected`);
      return;
    }

    this.createPeer(peerId, true);
  }

  private createPeer(peerId: string, initiator: boolean): void {
    // Check if we already have a connection to this peer
    if (this.peers.has(peerId)) {
      console.log(`Already have a peer connection to ${peerId}, skipping`);
      return;
    }

    if (!this.localStream) {
      console.error('Cannot create peer: localStream is null');
      return;
    }

    if (!this.socket || !this.isConnected) {
      console.error('Cannot create peer: socket is not connected');
      return;
    }

    console.log(`Creating peer connection with ${peerId}, initiator: ${initiator}`);

    try {
      const peer = new Peer({
        initiator,
        stream: this.localStream,
        trickle: true,
        config: this.iceServers
      });

      peer.on('signal', (signal) => {
        console.log(`Sending signal to ${peerId}, type:`, signal.type);
        this.socket?.emit('signal', {
          to: peerId,
          from: this.userId,
          signal
        });
      });

      peer.on('stream', (stream) => {
        console.log(`Stream received from ${peerId}`);

        if (this.onPeerConnectedCallback) {
          this.onPeerConnectedCallback(peerId, stream);
        }
      });

      peer.on('connect', () => {
        console.log(`Connected to peer ${peerId}`);
      });

      peer.on('close', () => {
        console.log(`Peer connection with ${peerId} closed`);
        this.removePeer(peerId);
      });

      peer.on('error', (err) => {
        console.error(`Peer error with ${peerId}:`, err);
        this.removePeer(peerId);
      });

      this.peers.set(peerId, { peerId, peer });
    } catch (error) {
      console.error(`Error creating peer connection with ${peerId}:`, error);
    }
  }

  private removePeer(peerId: string): void {
    const peerConnection = this.peers.get(peerId);

    if (peerConnection) {
      peerConnection.peer.destroy();
      this.peers.delete(peerId);

      if (this.onPeerDisconnectedCallback) {
        this.onPeerDisconnectedCallback(peerId);
      }
    }
  }

  public leaveRoom(): void {
    if (!this.socket) return;

    this.socket.emit('leave-room', {
      roomId: this.roomId,
      userId: this.userId
    });

    // Close all peer connections
    this.peers.forEach((peerConnection) => {
      peerConnection.peer.destroy();
    });

    this.peers.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.roomId = '';
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getUserId(): string {
    return this.userId;
  }

  public onPeerConnected(callback: (peerId: string, stream: MediaStream) => void): void {
    this.onPeerConnectedCallback = callback;
  }

  public onPeerDisconnected(callback: (peerId: string) => void): void {
    this.onPeerDisconnectedCallback = callback;
  }

  public onUserJoined(callback: (user: User) => void): void {
    this.onUserJoinedCallback = callback;
  }
  public onUserLeft(callback: (userId: string) => void): void {
    this.onUserLeftCallback = callback;
  }

  public onMediaStateChanged(callback: (audioEnabled: boolean, videoEnabled: boolean) => void): void {
    this.onMediaStateChangedCallback = callback;
  }

  public getAudioEnabled(): boolean {
    return this.isAudioEnabled;
  }

  public getVideoEnabled(): boolean {
    return this.isVideoEnabled;
  } public async toggleAudio(enabled: boolean): Promise<void> {
    if (!this.localStream) return;

    try {
      if (enabled) {
        // Always create a new stream when enabling audio for consistency
        console.log('Creating new stream with audio enabled...');

        // Get current video tracks to preserve them
        const currentVideoTracks = this.localStream.getVideoTracks();

        // Get new audio stream
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (audioTrack) {
          // Create new stream with both video and audio
          const newStream = new MediaStream([...currentVideoTracks, audioTrack]);

          // Update all peer connections with the new stream
          await this.updatePeerStreams(newStream);

          console.log('Audio enabled and peers updated');
        }
      } else {
        // Create a new stream without audio when disabling
        console.log('Creating new stream with audio disabled...');

        // Get current video tracks to preserve them
        const currentVideoTracks = this.localStream.getVideoTracks();

        // Stop current audio tracks
        const audioTracks = this.localStream.getAudioTracks();
        audioTracks.forEach(track => track.stop());

        // Create new stream with only video
        const newStream = new MediaStream(currentVideoTracks);

        // Update all peer connections with the new stream
        await this.updatePeerStreams(newStream);

        console.log('Audio disabled and peers updated');
      }

      // Update media state after toggle
      this.updateMediaState();
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  } public async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.localStream) return;

    try {
      if (enabled) {
        // Always create a new stream when enabling video for consistency
        console.log('Creating new stream with video enabled...');

        // Get current audio tracks to preserve them
        const currentAudioTracks = this.localStream.getAudioTracks();

        // Get new video stream
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (videoTrack) {
          // Create new stream with both audio and video
          const newStream = new MediaStream([...currentAudioTracks, videoTrack]);

          // Update all peer connections with the new stream
          await this.updatePeerStreams(newStream);

          console.log('Video enabled and peers updated');
        }
      } else {
        // Create a new stream without video when disabling
        console.log('Creating new stream with video disabled...');

        // Get current audio tracks to preserve them
        const currentAudioTracks = this.localStream.getAudioTracks();

        // Stop current video tracks
        const videoTracks = this.localStream.getVideoTracks();
        videoTracks.forEach(track => track.stop());

        // Create new stream with only audio
        const newStream = new MediaStream(currentAudioTracks);

        // Update all peer connections with the new stream
        await this.updatePeerStreams(newStream);

        console.log('Video disabled and peers updated');
      }

      // Update media state after toggle
      this.updateMediaState();
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  } private async updatePeerStreams(newStream: MediaStream): Promise<void> {
    console.log('Updating peer connections with new stream...');

    // Update our local stream reference first
    this.localStream = newStream;

    // Get the list of current peers before we start destroying them
    const peerEntries = Array.from(this.peers.entries());

    if (peerEntries.length === 0) {
      console.log('No peers to update');
      return;
    }

    // Send stream update notification BEFORE destroying connections
    // This gives other peers a chance to prepare and avoid conflicts
    if (this.socket) {
      this.socket.emit('stream-update', {
        userId: this.userId,
        roomId: this.roomId
      });
    }

    // Wait a moment for the signal to be processed by other peers
    await new Promise(resolve => setTimeout(resolve, 200));

    // Close existing connections gracefully
    this.peers.forEach((peerConnection) => {
      try {
        peerConnection.peer.destroy();
      } catch (error) {
        console.error('Error destroying peer:', error);
      }
    });

    this.peers.clear();

    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Recreate connections with new stream
    // Always be initiator when updating our own stream, since we sent the update signal
    for (const [peerId] of peerEntries) {
      try {
        console.log(`Recreating connection to peer ${peerId} as initiator`);
        this.createPeer(peerId, true);

        // Small delay between recreations to avoid overwhelming the signaling
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Error recreating peer ${peerId}:`, error);
      }
    }

    console.log('Peer stream update completed');
  }
  private async recreatePeerConnections(): Promise<void> {
    if (!this.localStream) return;
    await this.updatePeerStreams(this.localStream);
  }

  // Add method to send chat messages
  public sendMessage(message: Message): void {
    if (!this.socket || !this.roomId) {
      console.error('Cannot send message: not connected to a room');
      return;
    }

    console.log('Sending message to room:', message);
    this.socket.emit('chat-message', {
      roomId: this.roomId,
      message
    });
  }

  // Add callback for receiving messages
  public onMessageReceived(callback: (message: Message) => void): void {
    this.onMessageReceivedCallback = callback;
  }
  // Add method to request room participants
  public requestRoomInfo(): void {
    if (!this.socket || !this.roomId) {
      console.error('Cannot request room info: not connected to a room');
      return;
    }

    console.log('Requesting room info for room:', this.roomId);
    this.socket.emit('get-room-info', { roomId: this.roomId });
  }

  // TURN Server Configuration Methods
  public updateTURNConfiguration(): void {
    this.iceServers = this.turnConfigService.getWebRTCConfig();
    console.log('Updated ICE servers configuration:', this.iceServers);
  }

  public addTURNServer(urls: string | string[], username: string, credential: string): void {
    this.turnConfigService.addTURNServer({ urls, username, credential });
    this.updateTURNConfiguration();
  }

  public removeTURNServer(urls: string | string[]): void {
    this.turnConfigService.removeTURNServer(urls);
    this.updateTURNConfiguration();
  }

  public getTURNConfiguration() {
    return this.turnConfigService.getSettings();
  }

  public isUsingCustomTURN(): boolean {
    return this.turnConfigService.isUsingCustomTURN();
  }

  public async testTURNConnectivity(): Promise<boolean> {
    return this.turnConfigService.testTURNConnectivity();
  }

  public async validateTURNCredentials(urls: string | string[], username: string, credential: string): Promise<boolean> {
    return this.turnConfigService.validateTURNCredentials({ urls, username, credential });
  }

  public getICEServers() {
    return this.turnConfigService.getICEServers();
  }
}

// Export as singleton
const webRTCService = new WebRTCService();
export default webRTCService;