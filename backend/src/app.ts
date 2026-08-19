import express from 'express';
import cors from 'cors';
import { loginController } from './controllers/authController.js';
import { createRoomController, getRoomController, listRoomsController } from './controllers/roomController.js';
import { authMiddleware } from './middleware/authMiddleware.js';

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.post('/api/auth/login', loginController);

// Room Routes (Protegidas por JWT)
app.post('/api/rooms', authMiddleware, createRoomController);
app.get('/api/rooms', authMiddleware, listRoomsController);
app.get('/api/rooms/:roomIdOrCode', authMiddleware, getRoomController);

// Servir arquivos estáticos do frontend em produção se disponível
import path from 'path';
import fs from 'fs';

const publicPath = path.join(process.cwd(), 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

export default app;

