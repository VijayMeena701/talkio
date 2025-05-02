export interface User {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

export interface Room {
  id: string;
  name: string;
  participants: User[];
}

export interface PeerConnection {
  peerId: string;
  peer: any; // simple-peer instance
  stream?: MediaStream;
}