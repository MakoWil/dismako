import React from 'react';

interface ControlsProps {
  isMuted: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
  onLeaveRoom: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isMuted,
  isScreenSharing,
  onToggleMute,
  onToggleScreenShare,
  onLeaveRoom,
}) => {
  return (
    <div className="controls-bar">
      {/* Botão Mutar/Desmutar Microfone */}
      <button
        className={`btn btn-icon ${isMuted ? 'active' : ''}`}
        onClick={onToggleMute}
        title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
      >
        {isMuted ? '🎤❌' : '🎙️'}
      </button>

      {/* Botão Transmissão de Tela */}
      <button
        className={`btn btn-icon ${isScreenSharing ? 'active' : ''}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Parar Transmissão' : 'Compartilhar Tela'}
      >
        🖥️
      </button>

      {/* Botão Desconectar da Sala */}
      <button
        className="btn btn-icon btn-danger"
        onClick={onLeaveRoom}
        title="Sair do Canal de Voz"
      >
        📞❌
      </button>
    </div>
  );
};
