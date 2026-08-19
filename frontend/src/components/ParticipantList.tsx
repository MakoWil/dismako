import React, { useState } from 'react';
import { Participant, User, Room } from '../types';

interface ParticipantListProps {
  currentUser: User;
  displayNickname: string;
  onChangeNickname: (newNickname: string) => void;
  participants: Participant[];
  localIsMuted: boolean;
  localIsSpeaking: boolean;
  availableRooms: Room[];
  currentRoomId: string;
  onSelectRoom: (room: Room) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  currentUser,
  displayNickname,
  onChangeNickname,
  participants,
  localIsMuted,
  localIsSpeaking,
  availableRooms,
  currentRoomId,
  onSelectRoom,
}) => {
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [newNick, setNewNick] = useState(displayNickname);

  // Lista unificada incluindo o próprio usuário logado com apelido atualizado
  const allUsers = [
    {
      socketId: 'local-user',
      userId: currentUser.id,
      username: `${displayNickname} (Você)`,
      isMuted: localIsMuted,
      isSpeaking: localIsSpeaking,
      isScreenSharing: false,
    },
    ...participants,
  ];

  const handleSaveNick = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNick.trim()) {
      onChangeNickname(newNick.trim());
      setIsEditingNick(false);
    }
  };

  return (
    <div className="participant-list" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Seção 1: Participantes no Canal de Voz Ativo */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px', letterSpacing: '0.5px' }}>
          Participantes em Voz — {allUsers.length}
        </div>

        {allUsers.map(user => (
          <div key={user.socketId} className={`participant-item ${user.isSpeaking && !user.isMuted ? 'speaking' : ''}`}>
            <div className={`avatar-wrapper ${user.isSpeaking && !user.isMuted ? 'speaking' : ''}`}>
              {user.username.charAt(0).toUpperCase()}
              {user.isMuted && (
                <div className="user-status-icon" title="Mutado">
                  ...
                </div>
              )}
            </div>

            <div className="participant-name">
              {user.username}
            </div>
          </div>
        ))}

        {/* Seção 2: Lista de Salas Disponíveis no Sistema */}
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '20px', marginBottom: '8px', paddingLeft: '8px', letterSpacing: '0.5px' }}>
          Salas Disponíveis
        </div>

        {availableRooms.map(room => {
          const isCurrent = room.id === currentRoomId || room.code === currentRoomId;
          return (
            <div
              key={room.id}
              className={`participant-item ${isCurrent ? 'speaking' : ''}`}
              style={{
                cursor: isCurrent ? 'default' : 'pointer',
                backgroundColor: isCurrent ? 'var(--bg-modifier-selected)' : 'transparent',
                opacity: isCurrent ? 1 : 0.85,
              }}
              onClick={() => {
                if (!isCurrent) onSelectRoom(room);
              }}
            >
              <div style={{ fontSize: '16px' }}>🔊</div>
              <div className="participant-name" style={{ fontWeight: isCurrent ? '700' : '500' }}>
                {room.name}
              </div>
              {isCurrent && <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '700' }}>Conectado</span>}
            </div>
          );
        })}
      </div>

      {/* Rodapé da Sidebar: Perfil do Usuário & Edição de Apelido */}
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderTop: '1px solid rgba(0, 0, 0, 0.2)',
        }}
      >
        {isEditingNick ? (
          <form onSubmit={handleSaveNick} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="form-input"
              value={newNick}
              onChange={e => setNewNick(e.target.value)}
              placeholder="Seu novo apelido"
              autoFocus
              style={{ padding: '6px 8px', fontSize: '12px' }}
            />
            <button type="submit" className="btn btn-brand" style={{ padding: '6px 10px', fontSize: '11px' }}>
              Salvar
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div className="avatar-wrapper" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                {displayNickname.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayNickname}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setIsEditingNick(true)}
              title="Alterar Apelido"
              style={{ padding: '4px 8px', fontSize: '11px' }}
            >
              ✏️ Apelido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
