import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/game-engine',
  'packages/games/twenty-nine',
  'backend',
  'frontend',
]);
