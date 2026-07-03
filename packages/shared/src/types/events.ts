import type { RoomSettings } from './room';

// ---- Client → Server Events ----

export interface ClientEvents {
  // Room management
  CREATE_ROOM: { gameType: string; username: string; settings?: Partial<RoomSettings> };
  JOIN_ROOM: { roomCode: string; username: string };
  LEAVE_ROOM: Record<string, never>;
  BECOME_SPECTATOR: Record<string, never>;

  // Game flow
  START_GAME: Record<string, never>;

  // 29-specific (delegated to game engine)
  PLACE_BID: { bid: number };
  PASS_BID: Record<string, never>;
  CALL_BID: Record<string, never>;
  SELECT_TRUMP: { suit: string };
  SELECT_SEVENTH_CARD_TRUMP: Record<string, never>;
  SELECT_JOKER: Record<string, never>;
  DECLARE_DOUBLE: Record<string, never>;
  DECLARE_REDOUBLE: Record<string, never>;
  DECLARE_FULLSET: Record<string, never>;
  PLAY_CARD: { cardId: string };
  REQUEST_TRUMP_REVEAL: Record<string, never>;

  // Connectivity
  PING: Record<string, never>;
}

// ---- Server → Client Events ----

export interface ServerEvents {
  // Room
  ROOM_CREATED: { roomId: string; roomCode: string };
  ROOM_UPDATED: { room: import('./room').RoomState };
  PLAYER_JOINED: { player: import('./room').RoomPlayer };
  PLAYER_LEFT: { playerId: string };
  SPECTATOR_JOINED: { spectator: import('./room').Spectator };
  SPECTATOR_LEFT: { spectatorId: string };

  // Game lifecycle
  GAME_STARTED: { matchId: string };
  FIRST_DEAL_COMPLETED: { hand: import('./card').Card[] };
  SECOND_DEAL_COMPLETED: { hand: import('./card').Card[] };

  // Bidding
  BID_UPDATED: { playerId: string; bid: number | null; currentHigh: number | null; declarer: string | null };
  BIDDING_DUEL_UPDATE: {
    playerId: string;
    action: 'bid' | 'raise' | 'call' | 'pass';
    currentBid: number | null;
    highestBidder: string | null;
    currentChallenger: string | null;
    activeBidders: string[];
  };
  BIDDING_FINISHED: { declarerId: string; winningBid: number };

  // Trump
  TRUMP_SELECTED: { type: 'suit' | 'seventh-card' | 'joker'; suit?: string };
  TRUMP_REVEALED: { suit: string; playerId: string };
  MARRIAGE_DECLARED: { playerId: string; suit: string; effectiveBid: number };

  // Play
  CARD_PLAYED: { playerId: string; cardId: string };
  TRICK_COMPLETED: { winnerId: string; cards: { playerId: string; cardId: string }[]; trickNumber: number };

  // Scoring
  SCORE_UPDATED: {
    team1Points: number;
    team2Points: number;
    matchPoints: number;
    team1Sets: number;
    team2Sets: number;
    bidResult: 'success' | 'fail';
  };
  GAME_FINISHED: { winner: 'team1' | 'team2'; reason: string };

  // Connection
  PLAYER_DISCONNECTED: { playerId: string; timeout: number };
  PLAYER_RECONNECTED: { playerId: string };
  ERROR: { code: string; message: string };

  // Generic
  PONG: Record<string, never>;
}

// RoomSettings is imported from './room' — no duplicate re-export needed
