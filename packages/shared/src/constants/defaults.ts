// Default room settings
export const DEFAULT_ROOM_SETTINGS = {
  matchLength: 4, // first to 4 sets
  bidTimer: 30, // 30 seconds
  playTimer: 30, // 30 seconds
  allowSpectators: true,
  minBid: 16,
  setThreshold: 6,
} as const;

// Socket event names (for type-safe usage)
export const SOCKET_EVENTS = {
  // Namespace
  ROOM_NAMESPACE: '/room',
} as const;

// Room code settings
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
