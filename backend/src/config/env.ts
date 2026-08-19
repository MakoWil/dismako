import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '4000',
  JWT_SECRET: process.env.JWT_SECRET || 'dismako_super_secret_jwt_key_2026',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dismako:dismako123@localhost:5432/dismako_db',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
