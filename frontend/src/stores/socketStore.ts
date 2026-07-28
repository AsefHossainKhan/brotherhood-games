'use client';

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  guestId: string;
  username: string;
  allowBots: boolean;
  connect: (guestId: string, username: string) => void;
  disconnect: () => void;
  updateUsername: (username: string) => void;
  setAllowBots: (allowBots: boolean) => void;
}

/** Generate or retrieve guestId from localStorage */
function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return '';
  let guestId = localStorage.getItem('brotherhood_guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('brotherhood_guest_id', guestId);
  }
  return guestId;
}

function getOrCreateUsername(): string {
  if (typeof window === 'undefined') return '';
  let username = localStorage.getItem('brotherhood_username');
  if (!username) {
    username = `Player_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem('brotherhood_username', username);
  }
  return username;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  guestId: '',
  username: '',
  allowBots: false,

  connect: (guestId: string, username: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    const socket = io(socketUrl, {
      auth: { guestId, username },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket, guestId, username });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false });
  },

  updateUsername: (username: string) => {
    const { socket } = get();
    if (socket) {
      socket.auth = { ...(socket.auth as any), username };
    }
    set({ username });
    if (typeof window !== 'undefined') {
      localStorage.setItem('brotherhood_username', username);
    }
  },

  setAllowBots: (allowBots: boolean) => set({ allowBots }),
}));

/** Initialize socket connection (call once on app mount) */
export function initSocket() {
  const guestId = getOrCreateGuestId();
  const username = getOrCreateUsername();
  useSocketStore.getState().connect(guestId, username);
}
