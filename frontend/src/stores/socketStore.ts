'use client';

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  /** This client's public player id, as the server reports it in SESSION_READY. */
  guestId: string;
  username: string;
  allowBots: boolean;
  connect: (guestToken: string, username: string) => void;
  disconnect: () => void;
  updateUsername: (username: string) => void;
  setAllowBots: (allowBots: boolean) => void;
}

/**
 * Generate or retrieve the secret guestToken from localStorage. It goes only
 * in the socket handshake; the server derives the public id from it.
 */
function getOrCreateGuestToken(): string {
  if (typeof window === 'undefined') return '';
  let guestToken = localStorage.getItem('brotherhood_guest_token');
  if (!guestToken) {
    guestToken = crypto.randomUUID();
    localStorage.setItem('brotherhood_guest_token', guestToken);
  }
  // The old guest id was public, so it is never reused as a secret
  localStorage.removeItem('brotherhood_guest_id');
  return guestToken;
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

  connect: (guestToken: string, username: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    const socket = io(socketUrl, {
      auth: { guestToken, username },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('SESSION_READY', (data: { playerId: string }) => {
      set({ guestId: data.playerId });
    });

    socket.on('SERVER_CONFIG', (data: { allowBots?: boolean }) => {
      set({ allowBots: !!data?.allowBots });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    set({ socket, username });
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
  const guestToken = getOrCreateGuestToken();
  const username = getOrCreateUsername();
  useSocketStore.getState().connect(guestToken, username);
}
