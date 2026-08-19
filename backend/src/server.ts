import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { ENV } from './config/env.js';
import { setupSocketService } from './services/socketService.js';

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocketService(io);

const PORT = parseInt(ENV.PORT, 10) || 4000;

server.listen(PORT, () => {
  console.log(`🚀 [Dismako Backend] Servidor rodando na porta ${PORT}`);
  console.log(`📡 [Socket.io] Serviço de sinalização WebRTC ativo`);
});
