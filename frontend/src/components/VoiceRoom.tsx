import React, { useMemo, useState, useEffect } from 'react';
import { Room, User } from '../types';
import { getSocket } from '../services/socket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAudioAnalyser } from '../hooks/useAudioAnalyser';
import { ParticipantList } from './ParticipantList';
import { VideoGrid } from './VideoGrid';
import { Controls } from './Controls';
import { AudioPlayer } from './AudioPlayer';
import { listRoomsApi } from '../services/api';

interface VoiceRoomProps {
  user: User;
  token: string;
  room: Room;
  onLeaveRoom: () => void;
  onSwitchRoom: (room: Room) => void;
}

export const VoiceRoom: React.FC<VoiceRoomProps> = ({ user, token, room, onLeaveRoom, onSwitchRoom }) => {
  const socket = useMemo(() => getSocket(), []);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const {
    localAudioStream,
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
  } = useWebRTC(socket, room.id, user);

  // Carregar lista de salas disponíveis
  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await listRoomsApi(token);
        setAvailableRooms(data.rooms);
      } catch (err) {
        console.warn('Erro ao listar salas:', err);
      }
    }
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Hook de análise de áudio para indicador de fala
  useAudioAnalyser(localAudioStream, setSpeakingState, isMuted);

  const isLocalScreenSharing = activeScreenShare?.socketId === (socket.id || 'local');

  const handleToggleScreenShare = () => {
    if (isLocalScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    alert(`Código da sala copiado: ${room.code}`);
  };

  return (
    <div className="room-layout">
      {/* Executores de Áudio Remotos nos Alto-falantes */}
      {participants.map(p => (
        <AudioPlayer key={p.socketId} participant={p} />
      ))}

      {/* Sidebar com Dados da Sala e Lista de Canais/Participantes */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span>🔊 {room.name}</span>
          <span className="room-code-badge" onClick={copyRoomCode} title="Clique para copiar código">
            #{room.code} 📋
          </span>
        </div>

        <ParticipantList
          currentUser={user}
          displayNickname={displayNickname}
          onChangeNickname={changeNickname}
          participants={participants}
          localIsMuted={isMuted}
          localIsSpeaking={isSpeaking}
          availableRooms={availableRooms}
          currentRoomId={room.id}
          onSelectRoom={onSwitchRoom}
        />
      </div>

      {/* Palco Principal (Grid de Vídeo / Transmissão & Controles) */}
      <div className="main-stage">
        <VideoGrid
          currentUser={{ ...user, username: displayNickname }}
          participants={participants}
          activeScreenShare={activeScreenShare}
          localIsSpeaking={isSpeaking}
        />

        <Controls
          isMuted={isMuted}
          isScreenSharing={isLocalScreenSharing}
          onToggleMute={toggleMute}
          onToggleScreenShare={handleToggleScreenShare}
          onLeaveRoom={onLeaveRoom}
        />
      </div>
    </div>
  );
};
