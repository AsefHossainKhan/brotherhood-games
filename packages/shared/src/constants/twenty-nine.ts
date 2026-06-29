import type { Rank } from '../types/card';

// ---- 29 Card Game Constants ----

// Ranking: J > 9 > A > 10 > K > Q > 8 > 7
export const RANK_ORDER_29: Record<string, number> = {
  'J': 7,
  '9': 6,
  'A': 5,
  '10': 4,
  'K': 3,
  'Q': 2,
  '8': 1,
  '7': 0,
};

// Points per card
export const RANK_POINTS_29: Record<string, number> = {
  'J': 3,
  '9': 2,
  'A': 1,
  '10': 1,
  'K': 0,
  'Q': 0,
  '8': 0,
  '7': 0,
};

// Total deck points
export const TOTAL_DECK_POINTS = 28;

// Players per game
export const PLAYERS_PER_GAME = 4;

// Teams
export const TEAMS = 2;

// Cards per player (after both deals)
export const CARDS_PER_PLAYER = 8;

// Cards in first deal
export const FIRST_DEAL_COUNT = 4;

// Cards in second deal
export const SECOND_DEAL_COUNT = 4;

// Total tricks
export const TOTAL_TRICKS = 8;

// Bidding
export const MIN_BID = 16;
export const MAX_BID = 28;

// Multipliers
export const MULTIPLIER_NORMAL = 1;
export const MULTIPLIER_DOUBLE = 2;
export const MULTIPLIER_REDOUBLE = 4;
export const MULTIPLIER_FULLSET = 6;

// Set threshold
export const DEFAULT_SET_THRESHOLD = 6;

// Reconnection timeout (ms)
export const RECONNECT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
