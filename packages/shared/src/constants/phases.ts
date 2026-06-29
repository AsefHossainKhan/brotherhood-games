// Game state machine phases for 29
export const GAME_PHASES = {
  WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
  FIRST_DEAL: 'FIRST_DEAL',
  BIDDING: 'BIDDING',
  TRUMP_SELECTION: 'TRUMP_SELECTION',
  SECOND_DEAL: 'SECOND_DEAL',
  DOUBLE_PHASE: 'DOUBLE_PHASE',
  PLAYING: 'PLAYING',
  TRUMP_REVEAL: 'TRUMP_REVEAL',
  MARRIAGE_RESOLUTION: 'MARRIAGE_RESOLUTION',
  SCORING: 'SCORING',
  MATCH_COMPLETE: 'MATCH_COMPLETE',
} as const;

export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES];

// Trump selection types
export const TRUMP_TYPES = {
  SUIT: 'suit',
  SEVENTH_CARD: 'seventh-card',
  JOKER: 'joker',
} as const;

export type TrumpType = (typeof TRUMP_TYPES)[keyof typeof TRUMP_TYPES];
