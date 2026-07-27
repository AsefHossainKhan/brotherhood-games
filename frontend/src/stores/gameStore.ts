'use client';

import { create } from 'zustand';

interface Card {
  suit: string;
  rank: string;
}

interface PlayerState {
  id: string;
  username: string;
  seat: number;
  team: number;
  isDealer: boolean;
  isDeclarer: boolean;
  isConnected: boolean;
  handCount: number;
  hand?: Card[];
}

interface TrickPlay {
  playerId: string;
  cardId: string;
}

interface TrickState {
  plays: TrickPlay[];
  leadSuit: string | null;
  winnerId: string | null;
  trickNumber: number;
}

interface ScoreState {
  teamPoints: [number, number];
  matchPoints: [number, number];
  sets: [number, number];
  lastBidResult: 'success' | 'fail' | null;
}

interface BidState {
  currentBid: number | null;
  highestBidder: string | null;
  activeBidders: string[];
  currentChallenger: string | null;
  bids: { playerId: string; bid: number | null }[];
}

interface TrumpState {
  type: string | null;
  suit: string | null;
  isRevealed: boolean;
  seventhCard: Card | null;
  mustPlayTrump: boolean;
}

interface DoubleState {
  level: string;
  calledBy: string | null;
  multiplier: number;
}

interface DisconnectState {
  playerId: string;
  username: string;
  expiresAt: number;
  remainingSeconds: number;
}

interface HeldTrick {
  cards: TrickPlay[];
  winnerId: string | null;
  trickNumber: number;
}

interface BiddingResult {
  declarerId: string;
  winningBid: number | null;
}

interface GameState {
  phase: string;
  players: PlayerState[];
  bidding: BidState;
  trump: TrumpState;
  double: DoubleState;
  currentTrick: TrickState;
  completedTricks: any[];
  currentTurn: number;
  leadSuit: string | null;
  marriage: any;
  score: ScoreState;
  weakHandPlayer: string | null;
  settings: any;
  lastError: { code: string; message: string; timestamp: number } | null;
  disconnectedPlayer: DisconnectState | null;
  // Transient UI aids so the user can see the last completed trick / bid result
  // before play advances (server applies a matching review delay).
  heldTrick: HeldTrick | null;
  biddingResult: BiddingResult | null;

  setGameState: (state: any) => void;
  setDisconnectedPlayer: (player: DisconnectState | null) => void;
  updateDisconnectedCountdown: () => void;
  setHeldTrick: (trick: HeldTrick | null) => void;
  clearHeldTrick: (trickNumber: number) => void;
  setBiddingResult: (result: BiddingResult | null) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: '',
  players: [],
  bidding: {
    currentBid: null,
    highestBidder: null,
    activeBidders: [],
    currentChallenger: null,
    bids: [],
  },
  trump: {
    type: null,
    suit: null,
    isRevealed: false,
    seventhCard: null,
    mustPlayTrump: false,
  },
  double: {
    level: 'normal',
    calledBy: null,
    multiplier: 1,
  },
  currentTrick: {
    plays: [],
    leadSuit: null,
    winnerId: null,
    trickNumber: 0,
  },
  completedTricks: [],
  currentTurn: -1,
  leadSuit: null,
  marriage: null,
  score: {
    teamPoints: [0, 0],
    matchPoints: [0, 0],
    sets: [0, 0],
    lastBidResult: null,
  },
  weakHandPlayer: null,
  settings: null,
  lastError: null,
  disconnectedPlayer: null,
  heldTrick: null,
  biddingResult: null,

  setGameState: (state: any) => {
    set({
      phase: state.phase,
      players: state.players ?? [],
      bidding: state.bidding,
      trump: state.trump,
      double: state.double,
      currentTrick: state.currentTrick,
      completedTricks: state.completedTricks ?? [],
      currentTurn: state.currentTurn,
      leadSuit: state.leadSuit,
      marriage: state.marriage,
      score: state.score,
      weakHandPlayer: state.weakHandPlayer,
      settings: state.settings,
    });
  },

  setDisconnectedPlayer: (player) => set({ disconnectedPlayer: player }),

  setHeldTrick: (trick) => set({ heldTrick: trick }),

  // Only clear if it is still the same trick we are holding (avoids a stale
  // timer wiping a newer held trick).
  clearHeldTrick: (trickNumber) =>
    set((state) =>
      state.heldTrick && state.heldTrick.trickNumber === trickNumber
        ? { heldTrick: null }
        : state,
    ),

  setBiddingResult: (result) => set({ biddingResult: result }),

  updateDisconnectedCountdown: () => set((state) => {
    if (!state.disconnectedPlayer) return state;
    const remaining = Math.max(0, Math.ceil((state.disconnectedPlayer.expiresAt - Date.now()) / 1000));
    if (remaining <= 0) return { disconnectedPlayer: null };
    return { disconnectedPlayer: { ...state.disconnectedPlayer, remainingSeconds: remaining } };
  }),

  clearGame: () => {
    set({
      phase: '',
      players: [],
      bidding: {
        currentBid: null,
        highestBidder: null,
        activeBidders: [],
        currentChallenger: null,
        bids: [],
      },
      trump: { type: null, suit: null, isRevealed: false, seventhCard: null, mustPlayTrump: false },
      double: { level: 'normal', calledBy: null, multiplier: 1 },
      currentTrick: { plays: [], leadSuit: null, winnerId: null, trickNumber: 0 },
      completedTricks: [],
      currentTurn: -1,
      leadSuit: null,
      marriage: null,
      score: { teamPoints: [0, 0], matchPoints: [0, 0], sets: [0, 0], lastBidResult: null },
      weakHandPlayer: null,
      settings: null,
      disconnectedPlayer: null,
      heldTrick: null,
      biddingResult: null,
    });
  },
}));
