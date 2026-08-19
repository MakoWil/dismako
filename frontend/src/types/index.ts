export interface User {
  id: string;
  username: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  createdBy: string;
}

export interface Participant {
  socketId: string;
  userId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}
