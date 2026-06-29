import { MIN_BID, MAX_BID, DEFAULT_SET_THRESHOLD } from '@brotherhood/shared';

/** Default config for a 29 game. Can be overridden by room settings. */
export const TWENTY_NINE_DEFAULTS = {
  minBid: MIN_BID, // 16
  maxBid: MAX_BID, // 28
  setThreshold: DEFAULT_SET_THRESHOLD, // ±6
  matchLength: 4, // first to 4 sets
  playersPerTeam: 2,
  totalTeams: 2,
  cardsPerPlayer: 8,
  firstDealCount: 4,
  secondDealCount: 4,
  totalTricks: 8,
} as const;
