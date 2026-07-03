// Game types available in the hub
export const GAME_TYPES = ['twenty-nine', 'poker'] as const;
export type GameType = (typeof GAME_TYPES)[number];

// Generic player role in any game room
export type PlayerRole = 'player' | 'spectator';

// Room status
export type RoomStatus = 'waiting' | 'playing' | 'finished';

// A player in a room
export interface RoomPlayer {
  id: string;
  userId: string;
  username: string;
  seat: number | null; // null = unseated
  team: 0 | 1; // 0 = Team A, 1 = Team B
  isConnected: boolean;
  joinedAt: string;
}

// A spectator in a room
export interface Spectator {
  id: string;
  userId: string;
  username: string;
  joinedAt: string;
}

// Room state (game-agnostic)
export interface RoomState {
  id: string;
  code: string;
  gameType: GameType;
  status: RoomStatus;
  hostId: string;
  players: RoomPlayer[];
  spectators: Spectator[];
  settings: RoomSettings;
}

// Room-level settings (host-configurable)
export interface RoomSettings {
  matchLength: number; // first to N sets
  bidTimer: number; // seconds, 0 = unlimited
  playTimer: number; // seconds, 0 = unlimited
  allowSpectators: boolean;
  minBid: number; // default 16
  setThreshold: number; // default ±6
  seed?: number; // optional deterministic seed for reproducible shuffles
}
