# Multi-stage Dockerfile para Dismako (Backend + Frontend)

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de configuração de pacotes
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Instalar dependências
RUN cd backend && npm ci
RUN cd frontend && npm ci

# Copiar código fonte
COPY backend ./backend
COPY frontend ./frontend

# Compilar Backend
RUN cd backend && npm run build

# Compilar Frontend
RUN cd frontend && npm run build

# Etapa 2: Produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copiar arquivos de execução do backend
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/node_modules ./node_modules

# Copiar build do frontend estático para a pasta pública servida pelo backend (ou servida de forma estática)
COPY --from=builder /app/frontend/dist ./public

EXPOSE 4000

CMD ["node", "dist/server.js"]
