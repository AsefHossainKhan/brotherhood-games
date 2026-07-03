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

  setGameState: (state: any) => void;
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
    });
  },
}));
