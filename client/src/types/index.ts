import SimplePeer from 'simple-peer';

// User and Room related types
export interface User {
  id: string;
  name: string;
  socketId?: string;
  joinedAt?: string;
}

export interface Room {
  id: string;
  name?: string;
  participants: User[];
  createdAt?: string;
  lastActivity?: string;
}

// Message types
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  roomId?: string;
  type?: 'text' | 'system' | 'error';
}

// WebRTC related types
export interface PeerConnection {
  peerId: string;
  peer: SimplePeer.Instance; // simple-peer instance
  stream?: MediaStream;
  connectionState?: RTCPeerConnectionState;
  iceConnectionState?: RTCIceConnectionState;
}

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface TURNServerConfig {
  urls: string | string[];
  username: string;
  credential: string;
}

export interface WebRTCConfig {
  iceServers: ICEServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface WebRTCSettings {
  useCustomTURN?: boolean;
  turnServers?: TURNServerConfig[];
  stunServers?: string[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

// Connection and Stream types
export interface MediaStreamConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

export interface StreamTrack {
  track: MediaStreamTrack;
  kind: 'audio' | 'video';
  enabled: boolean;
  id: string;
}

// Hook and Service types
export interface UseWebRTCReturn {
  peers: Record<string, RTCPeerConnection>;
  remoteStreams: Record<string, RemoteStreamData>;
  connected: boolean;
  socketId?: string;
  isConnecting: boolean;
  error?: string;
  connectionQuality: Record<string, 'good' | 'poor' | 'unknown'>;
  // Messaging functionality
  sendMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  messages: Message[];
  // Media controls
  toggleAudio: (enabled: boolean) => Promise<void>;
  toggleVideo: (enabled: boolean) => Promise<void>;
  // Media state
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  // Room controls
  leaveRoom: () => void;
  // Connection info
  participantCount: number;
}

export interface RemoteStreamData {
  stream: MediaStream;
  userName?: string;
  userId?: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export interface WebRTCServiceInterface {
  connect(serverUrl?: string): void;
  disconnect(): void;
  joinRoom(roomId: string, userName: string): Promise<void>;
  leaveRoom(): void;
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  toggleAudio(enabled: boolean): Promise<void>;
  toggleVideo(enabled: boolean): Promise<void>;
  sendMessage(message: Omit<Message, 'id' | 'timestamp'>): void;
  getLocalStream(): MediaStream | null;
  getUserId(): string;
  isConnected(): boolean;
}

// Event callback types
export type PeerConnectedCallback = (peerId: string, stream: MediaStream) => void;
export type PeerDisconnectedCallback = (peerId: string) => void;
export type UserJoinedCallback = (user: User) => void;
export type UserLeftCallback = (userId: string) => void;
export type MessageReceivedCallback = (message: Message) => void;
export type ConnectionStateChangedCallback = (state: RTCPeerConnectionState) => void;
export type ErrorCallback = (error: Error) => void;

// Socket event types
export interface SocketEvents {
  'join-room': (data: { roomId: string; userId: string; userName: string }) => void;
  'leave-room': (data: { roomId: string; userId: string }) => void;
  'user-joined': (data: { userId: string; userName: string }) => void;
  'user-left': (data: { userId: string }) => void;
  'signal': (data: { from: string; signal: SimplePeer.SignalData }) => void;
  'chat-message': (message: Message) => void;
  'room-info': (data: { roomId: string; participants: User[] }) => void;
  'error': (error: { message: string; code?: string }) => void;
}

// Configuration types
export interface AppConfig {
  signaling: {
    serverUrl: string;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
  webrtc: WebRTCConfig;
  media: {
    defaultConstraints: MediaStreamConstraints;
    fallbackConstraints: MediaStreamConstraints[];
  };
  ui: {
    maxParticipantsVisible: number;
    enableVirtualBackground: boolean;
    enableNoiseSupression: boolean;
  };
}

// Error types
export class WebRTCError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WebRTCError';
  }
}

export enum WebRTCErrorCodes {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  MEDIA_ACCESS_DENIED = 'MEDIA_ACCESS_DENIED',
  SIGNALING_ERROR = 'SIGNALING_ERROR',
  PEER_CONNECTION_FAILED = 'PEER_CONNECTION_FAILED',
  INVALID_ROOM = 'INVALID_ROOM',
  NETWORK_ERROR = 'NETWORK_ERROR'
}