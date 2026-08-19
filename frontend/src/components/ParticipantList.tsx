import React from 'react';
import { Participant, User } from '../types';

interface ParticipantListProps {
  currentUser: User;
  participants: Participant[];
  localIsMuted: boolean;
  localIsSpeaking: boolean;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  currentUser,
  participants,
  localIsMuted,
  localIsSpeaking,
}) => {
  // Lista unificada incluindo o próprio usuário logado
  const allUsers = [
    {
      socketId: 'local-user',
      userId: currentUser.id,
      username: `${currentUser.username} (Você)`,
      isMuted: localIsMuted,
      isSpeaking: localIsSpeaking,
      isScreenSharing: false,
    },
    ...participants,
  ];

  return (
    <div className="participant-list">
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px' }}>
        Participantes em Voz — {allUsers.length}
      </div>

      {allUsers.map((user) => (
        <div key={user.socketId} className="participant-item">
          <div className={`avatar-wrapper ${user.isSpeaking && !user.isMuted ? 'speaking' : ''}`}>
            {user.username.charAt(0).toUpperCase()}
            {user.isMuted && (
              <div className="user-status-icon" title="Mutado">
                🔇
              </div>
            )}
          </div>

          <div className="participant-name">
            {user.username}
          </div>
        </div>
      ))}
    </div>
  );
};
