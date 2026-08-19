import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export async function loginController(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    return;
  }

  // Validação conforme requisito 1 do guia.MD: Login 'coxinha' | Senha 'coxinha123'
  const isDefaultAccount = (username === 'coxinha' && password === 'coxinha123');

  let userId = 'user-coxinha-id';
  let validUser = isDefaultAccount;

  // Se não for a conta padrão, tentar verificar no DB (se banco estiver conectado)
  if (!isDefaultAccount) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { username } });
      if (dbUser && dbUser.password === password) {
        userId = dbUser.id;
        validUser = true;
      }
    } catch (e) {
      // Caso DB não esteja conectado ainda, só permite a conta padrão
      validUser = false;
    }
  }

  if (!validUser) {
    res.status(401).json({ error: 'Credenciais inválidas. Utilize coxinha / coxinha123' });
    return;
  }

  // Tentar garantir registro no DB se banco disponível
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      const created = await prisma.user.create({
        data: { username, password }
      });
      userId = created.id;
    } else {
      userId = existing.id;
    }
  } catch (e) {
    // Ignorar erro se DB offline em modo dev/fallback
  }

  const token = jwt.sign(
    { id: userId, username },
    ENV.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login realizado com sucesso',
    token,
    user: {
      id: userId,
      username
    }
  });
}
