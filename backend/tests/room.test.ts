import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Gerenciamento de Salas API (/api/rooms)', () => {
  let authToken = '';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'coxinha', password: 'coxinha123' });

    authToken = loginRes.body.token;
  });

  it('deve recusar criar sala sem token JWT', async () => {
    const response = await request(app)
      .post('/api/rooms')
      .send({ name: 'Sala Teste' });

    expect(response.status).toBe(401);
  });

  it('deve criar uma nova sala com sucesso quando autenticado', async () => {
    const response = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Sala Principal' });

    expect(response.status).toBe(201);
    expect(response.body.room).toHaveProperty('id');
    expect(response.body.room).toHaveProperty('code');
    expect(response.body.room.name).toBe('Sala Principal');
  });

  it('deve buscar dados da sala criada por ID ou Código', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Sala de Teste Busca' });

    const roomId = createRes.body.room.id;
    const roomCode = createRes.body.room.code;

    const getResById = await request(app)
      .get(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResById.status).toBe(200);
    expect(getResById.body.room.id).toBe(roomId);

    const getResByCode = await request(app)
      .get(`/api/rooms/${roomCode}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResByCode.status).toBe(200);
    expect(getResByCode.body.room.code).toBe(roomCode);
  });
});
