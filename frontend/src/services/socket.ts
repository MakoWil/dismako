import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io('/', {
      autoConnect: false,
    });
  }
  return socketInstance;
}
