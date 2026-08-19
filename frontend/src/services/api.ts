import { User, Room } from '../types';

const API_BASE = '/api';

export async function loginApi(username: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao realizar login');
  }

  return data;
}

export async function createRoomApi(token: string, name?: string): Promise<{ room: Room }> {
  const response = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao criar sala');
  }

  return data;
}

export async function getRoomApi(token: string, roomIdOrCode: string): Promise<{ room: Room }> {
  const response = await fetch(`${API_BASE}/rooms/${roomIdOrCode}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Sala não encontrada');
  }

  return data;
}
