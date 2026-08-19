# Multi-stage Dockerfile para Dismako (Backend + Frontend)

# Etapa 1: Build
FROM node:20-alpine AS builder

# Instalar dependências nativas para Prisma / OpenSSL no Alpine
RUN apk add --no-cache openssl libc6-compat

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

# Compilar Backend (gera cliente Prisma nativo)
RUN cd backend && npm run build

# Compilar Frontend
RUN cd frontend && npm run build

# Etapa 2: Produção
FROM node:20-alpine AS runner

# Instalar bibliotecas de suporte a OpenSSL e musl para o Prisma na VPS (ARM64 / x86_64)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copiar arquivos de execução do backend
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/node_modules ./node_modules

# Copiar build do frontend estático para a pasta pública
COPY --from=builder /app/frontend/dist ./public

EXPOSE 4000

CMD ["node", "dist/server.js"]
