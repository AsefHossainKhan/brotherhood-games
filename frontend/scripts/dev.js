#!/usr/bin/env node
/**
 * Reads FRONTEND_PORT from environment (set by dotenv-cli via .env)
 * and launches Next.js dev server on that port.
 * Falls back to 3000 if not set.
 */
const { execSync } = require('child_process');
const port = process.env.FRONTEND_PORT || '3000';
execSync(`npx next dev -p ${port}`, { stdio: 'inherit' });
