import React, { useRef, useEffect } from 'react';
import { Participant, User } from '../types';

interface VideoGridProps {
  currentUser: User;
  participants: Participant[];
  activeScreenShare: { socketId: string; username: string; stream: MediaStream } | null;
  localIsSpeaking: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  currentUser,
  participants,
  activeScreenShare,
  localIsSpeaking,
}) => {
  const featuredVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Vincular stream de tela no elemento <video>
  useEffect(() => {
    if (featuredVideoRef.current && activeScreenShare?.stream) {
      featuredVideoRef.current.srcObject = activeScreenShare.stream;
      featuredVideoRef.current.play().catch(err => console.warn('Erro ao dar play no vídeo:', err));
    }
  }, [activeScreenShare]);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="stage-content">
      {/* Transmissão de Tela em Destaque */}
      {activeScreenShare ? (
        <div className="screen-share-featured" ref={containerRef}>
          <div className="screen-share-overlay">
            <span className="badge-live">AO VIVO</span>
            <span>{activeScreenShare.username}</span>
          </div>

          <video
            ref={featuredVideoRef}
            autoPlay
            playsInline
            muted={activeScreenShare.socketId === 'local'}
          />

          <button className="fullscreen-btn" onClick={handleFullscreen}>
            ⛶ Tela Cheia
          </button>
        </div>
      ) : null}

      {/* Grid de Cards de Voz dos Participantes */}
      <div className="video-grid">
        {/* Card do próprio Usuário */}
        <div className={`voice-card ${localIsSpeaking ? 'speaking' : ''}`}>
          <div className={`avatar-wrapper ${localIsSpeaking ? 'speaking' : ''}`} style={{ width: '64px', height: '64px', fontSize: '24px' }}>
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ marginTop: '12px', fontWeight: '600', fontSize: '14px' }}>
            {currentUser.username} (Você)
          </div>
        </div>

        {/* Cards dos outros Usuários */}
        {participants.map(p => (
          <div key={p.socketId} className={`voice-card ${p.isSpeaking && !p.isMuted ? 'speaking' : ''}`}>
            <div className={`avatar-wrapper ${p.isSpeaking && !p.isMuted ? 'speaking' : ''}`} style={{ width: '64px', height: '64px', fontSize: '24px' }}>
              {p.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ marginTop: '12px', fontWeight: '600', fontSize: '14px' }}>
              {p.username}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
