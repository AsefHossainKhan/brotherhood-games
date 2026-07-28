import path from 'path';

// Load .env from project root (only in local dev — Docker/prod uses env vars directly)
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch {
  // dotenv not available or .env not found — rely on process.env (Docker, CI, etc.)
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const allowBots = ['1', 'true', 'yes', 'on'].includes(
  (process.env.ALLOW_BOTS ?? '').trim().toLowerCase(),
);

export const config = {
  port: parseInt(process.env.BACKEND_PORT ?? process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? 'mysql://root:password@localhost:3306/brotherhood_games',
  nodeEnv,
  /** Whether players can add AI bots to a room. */
  allowBots,
} as const;
