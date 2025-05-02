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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  peer: any; // simple-peer instance
  stream?: MediaStream;
}