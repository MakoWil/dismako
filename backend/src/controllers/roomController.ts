import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';

// Memória local fallback para guardar salas criadas se o Postgres não estiver disponível
const activeRoomsInMemory = new Map<string, { id: string; code: string; name: string; createdBy: string; createdAt: Date }>();

export async function createRoomController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name } = req.body;
  const username = req.user?.username || 'coxinha';

  const roomId = uuidv4();
  // Gera código amigável de 6 caracteres (ex: a1b2c3)
  const roomCode = roomId.substring(0, 8);
  const roomName = name || `Sala de ${username}`;

  const roomData = {
    id: roomId,
    code: roomCode,
    name: roomName,
    createdBy: username,
    createdAt: new Date()
  };

  activeRoomsInMemory.set(roomId, roomData);
  activeRoomsInMemory.set(roomCode, roomData);

  try {
    await prisma.room.create({
      data: {
        id: roomId,
        code: roomCode,
        name: roomName,
        createdBy: username
      }
    });
  } catch (e) {
    // Usando fallback em memória
  }

  res.status(201).json({
    message: 'Sala criada com sucesso',
    room: roomData
  });
}

export async function getRoomController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { roomIdOrCode } = req.params;

  if (!roomIdOrCode) {
    res.status(400).json({ error: 'ID ou código da sala é obrigatório' });
    return;
  }

  // Tenta em memória primeiro
  const inMemoryRoom = activeRoomsInMemory.get(roomIdOrCode);
  if (inMemoryRoom) {
    res.json({ room: inMemoryRoom });
    return;
  }

  try {
    const room = await prisma.room.findFirst({
      where: {
        OR: [
          { id: roomIdOrCode },
          { code: roomIdOrCode }
        ]
      }
    });

    if (room) {
      res.json({ room });
      return;
    }
  } catch (e) {
    // Se erro no DB
  }

  res.status(404).json({ error: 'Sala não encontrada' });
}
