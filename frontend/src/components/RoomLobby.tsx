import React, { useState } from 'react';
import { createRoomApi, getRoomApi } from '../services/api';
import { Room, User } from '../types';

interface RoomLobbyProps {
  user: User;
  token: string;
  onJoinRoom: (room: Room) => void;
  onLogout: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({ user, token, onJoinRoom, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState(`Sala do ${user.username}`);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
            className={`lobby-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Criar Sala
          </button>
          <button
            className={`lobby-tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Entrar em Sala
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {activeTab === 'create' ? (
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
        ) : (
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
