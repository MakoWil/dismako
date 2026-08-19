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
  const [displayNickname, setDisplayNickname] = useState(currentUser.username);

  // Refs para evitar problemas com closures desatualizados em listeners de evento
  const activeScreenShareRef = useRef(activeScreenShare);
  activeScreenShareRef.current = activeScreenShare;

  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const screenShareStreamRef = useRef(screenShareStream);
  screenShareStreamRef.current = screenShareStream;

  const localAudioStreamRef = useRef(localAudioStream);
  localAudioStreamRef.current = localAudioStream;

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

  // Quando o stream de áudio local carrega, vincular às conexões peer existentes
  useEffect(() => {
    if (localAudioStream) {
      peerConnections.current.forEach(pc => {
        localAudioStream.getTracks().forEach(track => {
          const senders = pc.getSenders();
          const hasTrack = senders.some(sender => sender.track === track);
          if (!hasTrack) {
            pc.addTrack(track, localAudioStream);
          }
        });
      });
    }
  }, [localAudioStream]);

  // Criar RTCPeerConnection para um usuário remoto
  const createPeerConnection = useCallback(
    (targetSocketId: string, isInitiator: boolean) => {
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.current.set(targetSocketId, pc);

      const audioStream = localAudioStreamRef.current;
      if (audioStream) {
        audioStream.getTracks().forEach(track => {
          pc.addTrack(track, audioStream);
        });
      }

      if (screenShareStreamRef.current) {
        screenShareStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, screenShareStreamRef.current!);
        });
      }

      pc.onicecandidate = event => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            toSocketId: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = event => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          remoteStreams.current.set(targetSocketId, remoteStream);

          setParticipants(prev =>
            prev.map(p => (p.socketId === targetSocketId ? { ...p, stream: remoteStream } : p))
          );

          if (event.track.kind === 'video') {
            const p = participantsRef.current.find(part => part.socketId === targetSocketId);
            setActiveScreenShare({
              socketId: targetSocketId,
              username: p ? p.username : 'Transmissão Remota',
              stream: remoteStream,
            });
          }
        }
      };

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
    [socket]
  );

  useEffect(() => {
    if (!socket || !roomId || !currentUser) return;

    socket.connect();
    socket.emit('join-room', { roomId, user: { ...currentUser, username: displayNickname } });

    const handleRoomUsers = (users: Participant[]) => {
      setParticipants(users);
      users.forEach(user => {
        createPeerConnection(user.socketId, true);
      });
    };

    const handleUserJoined = (user: Participant) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== user.socketId), user]);
      createPeerConnection(user.socketId, false);
    };

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

    const handleAnswer = async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

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

    const handleUserAudioChanged = ({ socketId, isMuted: muted }: { socketId: string; isMuted: boolean }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isMuted: muted } : p)));
    };

    const handleUserSpeakingChanged = ({ socketId, isSpeaking: speaking }: { socketId: string; isSpeaking: boolean }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isSpeaking: speaking } : p)));
    };

    const handleUserNicknameChanged = ({ socketId, newUsername }: { socketId: string; newUsername: string }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, username: newUsername } : p)));
    };

    const handleUserStartedScreenShare = ({ socketId }: { socketId: string }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isScreenSharing: true } : p)));
    };

    const handleUserStoppedScreenShare = ({ socketId }: { socketId: string }) => {
      setParticipants(prev => prev.map(p => (p.socketId === socketId ? { ...p, isScreenSharing: false } : p)));
      if (activeScreenShareRef.current?.socketId === socketId) {
        setActiveScreenShare(null);
      }
    };

    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      if (peerConnections.current.has(socketId)) {
        peerConnections.current.get(socketId)?.close();
        peerConnections.current.delete(socketId);
      }
      remoteStreams.current.delete(socketId);
      if (activeScreenShareRef.current?.socketId === socketId) {
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
    socket.on('user-nickname-changed', handleUserNicknameChanged);
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
      socket.off('user-nickname-changed', handleUserNicknameChanged);
      socket.off('user-started-screen-share', handleUserStartedScreenShare);
      socket.off('user-stopped-screen-share', handleUserStoppedScreenShare);
      socket.off('user-left', handleUserLeft);

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      socket.disconnect();
    };
  }, [socket, roomId, currentUser, createPeerConnection, displayNickname]);

  // Alterar Apelido
  const changeNickname = (newNickname: string) => {
    if (newNickname.trim()) {
      const trimmed = newNickname.trim();
      setDisplayNickname(trimmed);
      socket?.emit('change-nickname', { newNickname: trimmed });
    }
  };

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

  // Atualizar estado de fala
  const setSpeakingState = useCallback(
    (speaking: boolean) => {
      setIsSpeaking(speaking);
      socket?.emit('speaking-state', { isSpeaking: speaking });
    },
    [socket]
  );

  // Stop Screen Share interno
  const stopScreenShare = useCallback(() => {
    if (screenShareStreamRef.current) {
      const videoTrack = screenShareStreamRef.current.getVideoTracks()[0];
      peerConnections.current.forEach((pc, targetSocketId) => {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'video') {
            pc.removeTrack(sender);
          }
        });
        // Renegociação SDP para remover vídeo
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket?.emit('offer', {
              toSocketId: targetSocketId,
              offer: pc.localDescription,
            });
          })
          .catch(err => console.error('Erro ao renegociar fechamento de tela:', err));
      });

      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
      screenShareStreamRef.current = null;
    }
    setActiveScreenShare(null);
    socket?.emit('stop-screen-share');
  }, [socket]);

  // Iniciar Compartilhamento de Tela
  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenShareStream(displayStream);
      screenShareStreamRef.current = displayStream;

      setActiveScreenShare({
        socketId: socket?.id || 'local',
        username: `${displayNickname} (Sua Transmissão)`,
        stream: displayStream,
      });

      const videoTrack = displayStream.getVideoTracks()[0];
      
      // Adicionar vídeo aos peers e renegociar SDP
      peerConnections.current.forEach((pc, targetSocketId) => {
        pc.addTrack(videoTrack, displayStream);
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket?.emit('offer', {
              toSocketId: targetSocketId,
              offer: pc.localDescription,
            });
          })
          .catch(err => console.error('Erro ao renegociar transmissão de tela:', err));
      });

      socket?.emit('start-screen-share');

      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Compartilhamento de tela cancelado ou negado:', err);
    }
  };

  return {
    localAudioStream,
    screenShareStream,
    participants,
    activeScreenShare,
    isMuted,
    isSpeaking,
    displayNickname,
    changeNickname,
    toggleMute,
    setSpeakingState,
    startScreenShare,
    stopScreenShare,
  };
}
