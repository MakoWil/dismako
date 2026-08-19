import { useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Participant, User } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(socket: Socket | null, roomId: string, currentUser: User) {
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeScreenShare, setActiveScreenShare] = useState<{ socketId: string; username: string; stream: MediaStream } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Mapeamento de RTCPeerConnections por socketId
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());

  // Obter áudio do microfone local
  useEffect(() => {
    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalAudioStream(stream);
      } catch (err) {
        console.warn('Microfone não acessível ou permissão negada. Entrando em modo silencioso.', err);
      }
    }
    initAudio();

    return () => {
      localAudioStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Criar RTCPeerConnection para um usuário remoto
  const createPeerConnection = useCallback(
    (targetSocketId: string, isInitiator: boolean) => {
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.current.set(targetSocketId, pc);

      // Adicionar tracks de áudio local ao peer connection
      if (localAudioStream) {
        localAudioStream.getTracks().forEach(track => {
          pc.addTrack(track, localAudioStream);
        });
      }

      // Se houver compartilhamento de tela ativo, adicionar track de vídeo
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => {
          pc.addTrack(track, screenShareStream);
        });
      }

      // Enviar ICE Candidates para o parceiro
      pc.onicecandidate = event => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            toSocketId: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Receber stream remoto
      pc.ontrack = event => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          remoteStreams.current.set(targetSocketId, remoteStream);

          setParticipants(prev =>
            prev.map(p => (p.socketId === targetSocketId ? { ...p, stream: remoteStream } : p))
          );

          // Verificar se é uma transmissão de tela (possui track de vídeo)
          if (event.track.kind === 'video') {
            const p = participants.find(part => part.socketId === targetSocketId);
            setActiveScreenShare({
              socketId: targetSocketId,
              username: p ? p.username : 'Transmissão',
              stream: remoteStream,
            });
          }
        }
      };

      // Se for o iniciador da conexão, cria e envia a Oferta SDP
      if (isInitiator && socket) {
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('offer', {
              toSocketId: targetSocketId,
              offer: pc.localDescription,
            });
          })
          .catch(err => console.error('Erro ao criar offer WebRTC:', err));
      }

      return pc;
    },
    [localAudioStream, screenShareStream, socket, participants]
  );

  // Efeito principal de tratamento de eventos via Socket.io
  useEffect(() => {
    if (!socket || !roomId || !currentUser) return;

    socket.connect();
    socket.emit('join-room', { roomId, user: currentUser });

    // Usuários existentes na sala ao entrar
    const handleRoomUsers = (users: Participant[]) => {
      setParticipants(users);
      users.forEach(user => {
        createPeerConnection(user.socketId, true);
      });
    };

    // Novo usuário entrou
    const handleUserJoined = (user: Participant) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== user.socketId), user]);
      createPeerConnection(user.socketId, false);
    };

    // Receber Oferta WebRTC (Offer)
    const handleOffer = async ({ fromSocketId, fromUser, offer }: { fromSocketId: string; fromUser: Participant; offer: RTCSessionDescriptionInit }) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== fromSocketId), fromUser]);
      const pc = createPeerConnection(fromSocketId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        toSocketId: fromSocketId,
        answer,
      });
    };

    // Receber Resposta WebRTC (Answer)
    const handleAnswer = async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // Receber Candidate ICE
    const handleIceCandidate = async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Erro ao adicionar ICE candidate:', e);
        }
      }
    };

    // Estado de Mute alterado
    const handleUserAudioChanged = ({ socketId, isMuted: muted }: { socketId: string; isMuted: boolean }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isMuted: muted } : p)));
    };

    // Indicador de Fala alterado
    const handleUserSpeakingChanged = ({ socketId, isSpeaking: speaking }: { socketId: string; isSpeaking: boolean }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isSpeaking: speaking } : p)));
    };

    // Transmissão de tela iniciada
    const handleUserStartedScreenShare = ({ socketId, user }: { socketId: string; user: Participant }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isScreenSharing: true } : p)));
    };

    // Transmissão de tela encerrada
    const handleUserStoppedScreenShare = ({ socketId }: { socketId: string }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isScreenSharing: false } : p)));
      if (activeScreenShare?.socketId === socketId) {
        setActiveScreenShare(null);
      }
    };

    // Usuário saiu da sala
    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      if (peerConnections.current.has(socketId)) {
        peerConnections.current.get(socketId)?.close();
        peerConnections.current.delete(socketId);
      }
      remoteStreams.current.delete(socketId);
      if (activeScreenShare?.socketId === socketId) {
        setActiveScreenShare(null);
      }
    };

    socket.on('room-users', handleRoomUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-audio-changed', handleUserAudioChanged);
    socket.on('user-speaking-changed', handleUserSpeakingChanged);
    socket.on('user-started-screen-share', handleUserStartedScreenShare);
    socket.on('user-stopped-screen-share', handleUserStoppedScreenShare);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('room-users', handleRoomUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-audio-changed', handleUserAudioChanged);
      socket.off('user-speaking-changed', handleUserSpeakingChanged);
      socket.off('user-started-screen-share', handleUserStartedScreenShare);
      socket.off('user-stopped-screen-share', handleUserStoppedScreenShare);
      socket.off('user-left', handleUserLeft);

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      socket.disconnect();
    };
  }, [socket, roomId, currentUser, createPeerConnection, activeScreenShare]);

  // Alternar Mute
  const toggleMute = () => {
    if (localAudioStream) {
      const audioTrack = localAudioStream.getAudioTracks()[0];
      if (audioTrack) {
        const newMutedState = !isMuted;
        audioTrack.enabled = !newMutedState;
        setIsMuted(newMutedState);
        socket?.emit('toggle-audio', { isMuted: newMutedState });
      }
    }
  };

  // Atualizar estado de fala (desencadeado por useAudioAnalyser)
  const setSpeakingState = (speaking: boolean) => {
    if (speaking !== isSpeaking) {
      setIsSpeaking(speaking);
      socket?.emit('speaking-state', { isSpeaking: speaking });
    }
  };

  // Iniciar Compartilhamento de Tela
  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenShareStream(displayStream);
      setActiveScreenShare({
        socketId: socket?.id || 'local',
        username: `${currentUser.username} (Sua Transmissão)`,
        stream: displayStream,
      });

      // Adicionar track de vídeo da tela às conexões dos peers ativos
      const videoTrack = displayStream.getVideoTracks()[0];
      peerConnections.current.forEach(pc => {
        pc.addTrack(videoTrack, displayStream);
      });

      socket?.emit('start-screen-share');

      // Quando o usuário parar a transmissão nativamente pelo navegador
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Compartilhamento de tela cancelado ou negado:', err);
    }
  };

  // Parar Compartilhamento de Tela
  const stopScreenShare = () => {
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
      if (activeScreenShare?.socketId === (socket?.id || 'local')) {
        setActiveScreenShare(null);
      }
      socket?.emit('stop-screen-share');
    }
  };

  return {
    localAudioStream,
    screenShareStream,
    participants,
    activeScreenShare,
    isMuted,
    isSpeaking,
    toggleMute,
    setSpeakingState,
    startScreenShare,
    stopScreenShare,
  };
}
