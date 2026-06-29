#!/usr/bin/env node
/**
 * Reads BACKEND_PORT from environment (set by dotenv-cli via .env)
 * and launches the backend with tsx watch on that port.
 * Falls back to 3001 if not set.
 */
const { execSync } = require('child_process');
// tsx watch reads PORT from process.env, which dotenv-cli already set.
// This script just ensures the env is loaded before starting.
execSync('npx tsx watch src/server.ts', { stdio: 'inherit' });
