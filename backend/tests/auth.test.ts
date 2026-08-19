import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Autenticação API (/api/auth/login)', () => {
  it('deve realizar login com as credenciais fixas (coxinha / coxinha123)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'coxinha', password: 'coxinha123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', 'coxinha');
  });

  it('deve rejeitar login com senha incorreta', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'coxinha', password: 'senhaincorreta' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('deve retornar erro 400 se campos não forem enviados', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(response.status).toBe(400);
  });
});
