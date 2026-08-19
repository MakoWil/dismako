import React, { useState, useEffect } from 'react';
import './styles/discord-theme.css';
import { User, Room } from './types';
import { Login } from './components/Login';
import { RoomLobby } from './components/RoomLobby';
import { VoiceRoom } from './components/VoiceRoom';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  // Carregar sessão salva no localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('dismako_token');
    const savedUser = localStorage.getItem('dismako_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('dismako_token');
        localStorage.removeItem('dismako_user');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
    localStorage.setItem('dismako_token', authToken);
    localStorage.setItem('dismako_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setActiveRoom(null);
    localStorage.removeItem('dismako_token');
    localStorage.removeItem('dismako_user');
  };

  const handleJoinRoom = (room: Room) => {
    setActiveRoom(room);
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
  };

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (activeRoom) {
    return (
      <div className="app-container">
        <VoiceRoom user={user} room={activeRoom} onLeaveRoom={handleLeaveRoom} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <RoomLobby user={user} token={token} onJoinRoom={handleJoinRoom} onLogout={handleLogout} />
    </div>
  );
};

export default App;
