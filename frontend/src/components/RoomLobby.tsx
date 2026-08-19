import React, { useState, useEffect } from 'react';
import { createRoomApi, getRoomApi, listRoomsApi } from '../services/api';
import { Room, User } from '../types';

interface RoomLobbyProps {
  user: User;
  token: string;
  onJoinRoom: (room: Room) => void;
  onLogout: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({ user, token, onJoinRoom, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState(`Sala do ${user.username}`);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await listRoomsApi(token);
        setAvailableRooms(data.rooms);
      } catch (err) {
        console.warn('Erro ao carregar salas:', err);
      }
    }
    loadRooms();
  }, [token]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await createRoomApi(token, roomName);
      onJoinRoom(data.room);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao criar sala.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const data = await getRoomApi(token, inputCode.trim());
      onJoinRoom(data.room);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao entrar na sala.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="lobby-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Olá, {user.username}!</h2>
          <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Sair
          </button>
        </div>

        <div className="lobby-tabs">
          <button
            className={`lobby-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Salas Disponíveis ({availableRooms.length})
          </button>
          <button
            className={`lobby-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Criar Sala
          </button>
          <button
            className={`lobby-tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Código da Sala
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {availableRooms.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                Nenhuma sala encontrada. Crie uma nova sala para começar!
              </div>
            ) : (
              availableRooms.map(room => (
                <div
                  key={room.id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onClick={() => onJoinRoom(room)}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>🔊 {room.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Por {room.createdBy} • #{room.code}</div>
                  </div>
                  <button className="btn btn-brand" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Entrar
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label className="form-label">Nome da Sala</label>
              <input
                type="text"
                className="form-input"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="Ex: Sala de Voz Devs"
                required
              />
            </div>
            <button type="submit" className="btn btn-brand" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Criando...' : 'Criar Sala Nova'}
            </button>
          </form>
        )}

        {activeTab === 'join' && (
          <form onSubmit={handleJoinRoom}>
            <div className="form-group">
              <label className="form-label">ID ou Código da Sala</label>
              <input
                type="text"
                className="form-input"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                placeholder="Cole o Room ID ou Código aqui"
                required
              />
            </div>
            <button type="submit" className="btn btn-brand" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar na Sala'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
