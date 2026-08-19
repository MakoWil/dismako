import React, { useMemo } from 'react';
import { Room, User } from '../types';
import { getSocket } from '../services/socket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAudioAnalyser } from '../hooks/useAudioAnalyser';
import { ParticipantList } from './ParticipantList';
import { VideoGrid } from './VideoGrid';
import { Controls } from './Controls';
import { AudioPlayer } from './AudioPlayer';

interface VoiceRoomProps {
  user: User;
  room: Room;
  onLeaveRoom: () => void;
}

export const VoiceRoom: React.FC<VoiceRoomProps> = ({ user, room, onLeaveRoom }) => {
  const socket = useMemo(() => getSocket(), []);

  const {
    localAudioStream,
    participants,
    activeScreenShare,
    isMuted,
    isSpeaking,
    toggleMute,
    setSpeakingState,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(socket, room.id, user);

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

      {/* Sidebar com Dados da Sala e Participantes */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span>🔊 {room.name}</span>
          <span className="room-code-badge" onClick={copyRoomCode} title="Clique para copiar código">
            #{room.code} 📋
          </span>
        </div>

        <ParticipantList
          currentUser={user}
          participants={participants}
          localIsMuted={isMuted}
          localIsSpeaking={isSpeaking}
        />
      </div>

      {/* Palco Principal (Grid de Vídeo / Transmissão & Controles) */}
      <div className="main-stage">
        <VideoGrid
          currentUser={user}
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
