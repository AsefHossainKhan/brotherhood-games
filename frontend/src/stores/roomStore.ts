'use client';

import { create } from 'zustand';

interface RoomPlayer {
  id: string;
  userId: string;
  username: string;
  seat: number | null;
  team: 0 | 1;
  isConnected: boolean;
  joinedAt: string;
}

interface Spectator {
  id: string;
  userId: string;
  username: string;
  joinedAt: string;
}

interface RoomSettings {
  matchLength: number;
  bidTimer: number;
  playTimer: number;
  allowSpectators: boolean;
  minBid: number;
  setThreshold: number;
}

interface RoomState {
  roomId: string | null;
  roomCode: string | null;
  gameType: string;
  status: 'waiting' | 'playing' | 'finished';
  hostId: string | null;
  players: RoomPlayer[];
  spectators: Spectator[];
  settings: RoomSettings | null;
  mySeat: number | null;
  isHost: boolean;

  setRoom: (room: any) => void;
  clearRoom: () => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  roomCode: null,
  gameType: 'twenty-nine',
  status: 'waiting',
  hostId: null,
  players: [],
  spectators: [],
  settings: null,
  mySeat: null,
  isHost: false,

  setRoom: (room: any) => {
    const guestId =
      typeof window !== 'undefined'
        ? localStorage.getItem('brotherhood_guest_id')
        : null;

    const myPlayer = room.players?.find((p: any) => p.userId === guestId);

    set({
      roomId: room.id,
      roomCode: room.code,
      gameType: room.gameType,
      status: room.status,
      hostId: room.hostId,
      players: room.players ?? [],
      spectators: room.spectators ?? [],
      settings: room.settings,
      mySeat: myPlayer?.seat ?? null,
      isHost: room.hostId === guestId,
    });
  },

  clearRoom: () => {
    set({
      roomId: null,
      roomCode: null,
      gameType: 'twenty-nine',
      status: 'waiting',
      hostId: null,
      players: [],
      spectators: [],
      settings: null,
      mySeat: null,
      isHost: false,
    });
  },

  updateSettings: (settings: Partial<RoomSettings>) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, ...settings } });
  },
}));
