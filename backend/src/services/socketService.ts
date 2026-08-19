import { Server as SocketIOServer, Socket } from 'socket.io';

interface UserParticipant {
  socketId: string;
  userId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}

// Mapeamento de salas e participantes ativos
// roomId -> Map<socketId, UserParticipant>
const roomParticipants = new Map<string, Map<string, UserParticipant>>();

export function setupSocketService(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`);

    let currentRoomId: string | null = null;
    let currentUser: UserParticipant | null = null;

    // Entrar na sala
    socket.on('join-room', ({ roomId, user }: { roomId: string; user: { id: string; username: string } }) => {
      currentRoomId = roomId;
      socket.join(roomId);

      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
      }

      const participantsInRoom = roomParticipants.get(roomId)!;

      currentUser = {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        isMuted: false,
        isSpeaking: false,
        isScreenSharing: false,
      };

      participantsInRoom.set(socket.id, currentUser);

      // Envia lista de todos os usuários já presentes na sala para quem acabou de entrar
      const existingUsers = Array.from(participantsInRoom.values()).filter(p => p.socketId !== socket.id);
      socket.emit('room-users', existingUsers);

      // Notifica os outros usuários que alguém entrou
      socket.to(roomId).emit('user-joined', currentUser);

      console.log(`[Socket] Usuário ${user.username} (${socket.id}) entrou na sala ${roomId}`);
    });

    // WebRTC Signaling: Envio de Oferta (SDP Offer)
    socket.on('offer', ({ toSocketId, offer }: { toSocketId: string; offer: RTCSessionDescriptionInit }) => {
      io.to(toSocketId).emit('offer', {
        fromSocketId: socket.id,
        fromUser: currentUser,
        offer,
      });
    });

    // WebRTC Signaling: Envio de Resposta (SDP Answer)
    socket.on('answer', ({ toSocketId, answer }: { toSocketId: string; answer: RTCSessionDescriptionInit }) => {
      io.to(toSocketId).emit('answer', {
        fromSocketId: socket.id,
        answer,
      });
    });

    // WebRTC Signaling: Envio de ICE Candidate
    socket.on('ice-candidate', ({ toSocketId, candidate }: { toSocketId: string; candidate: RTCIceCandidateInit }) => {
      io.to(toSocketId).emit('ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      });
    });

    // Alternar Mute / Desmute do Microfone
    socket.on('toggle-audio', ({ isMuted }: { isMuted: boolean }) => {
      if (currentRoomId && currentUser) {
        currentUser.isMuted = isMuted;
        io.to(currentRoomId).emit('user-audio-changed', {
          socketId: socket.id,
          isMuted,
        });
      }
    });

    // Estado do Indicador Visual de Fala
    socket.on('speaking-state', ({ isSpeaking }: { isSpeaking: boolean }) => {
      if (currentRoomId && currentUser) {
        currentUser.isSpeaking = isSpeaking;
        io.to(currentRoomId).emit('user-speaking-changed', {
          socketId: socket.id,
          isSpeaking,
        });
      }
    });

    // Compartilhamento de Tela: Iniciar
    socket.on('start-screen-share', () => {
      if (currentRoomId && currentUser) {
        currentUser.isScreenSharing = true;
        socket.to(currentRoomId).emit('user-started-screen-share', {
          socketId: socket.id,
          user: currentUser,
        });
      }
    });

    // Compartilhamento de Tela: Parar
    socket.on('stop-screen-share', () => {
      if (currentRoomId && currentUser) {
        currentUser.isScreenSharing = false;
        socket.to(currentRoomId).emit('user-stopped-screen-share', {
          socketId: socket.id,
        });
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`[Socket] Desconectado: ${socket.id}`);
      if (currentRoomId && roomParticipants.has(currentRoomId)) {
        const roomMap = roomParticipants.get(currentRoomId)!;
        roomMap.delete(socket.id);
        if (roomMap.size === 0) {
          roomParticipants.delete(currentRoomId);
        }
        socket.to(currentRoomId).emit('user-left', { socketId: socket.id });
      }
    });
  });
}
