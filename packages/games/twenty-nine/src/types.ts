import type { Card, Suit, GamePhase, TrumpType } from '@brotherhood/shared';

// ---- Player State ----

export interface TwentyNinePlayer {
  id: string;
  username: string;
  seat: number;
  team: 0 | 1; // 0 or 1
  hand: Card[];
  isDealer: boolean;
  isDeclarer: boolean;
  isConnected: boolean;
}

// ---- Trick ----

export interface TrickPlay {
  playerId: string;
  card: Card;
  cardIndex: number; // index in hand when played
}

export interface Trick {
  plays: TrickPlay[];
  leadSuit: Suit | null;
  winnerId: string | null;
  trickNumber: number;
}

// ---- Bidding ----

export interface BidInfo {
  currentBid: number | null;
  highestBidder: string | null;
  activeBidders: string[];          // player IDs still in contention
  currentChallenger: string | null; // whose turn it is to respond
  bids: { playerId: string; bid: number | null }[];
}

// ---- Trump ----

export interface TrumpInfo {
  type: TrumpType | null;
  suit: Suit | null;
  isRevealed: boolean;
  seventhCard: Card | null; // the actual seventh card (only for seventh-card mode)
  revealedBy: string | null;
  mustPlayTrump: boolean; // true only for the turn immediately after reveal
}

// ---- Double Phase ----

export type DoubleLevel = 'normal' | 'double' | 'redouble' | 'fullset';

export interface DoubleInfo {
  level: DoubleLevel;
  calledBy: string | null;
  multiplier: number;
}

// ---- Marriage ----

export interface MarriageInfo {
  team: 0 | 1;
  suit: Suit;
  effectiveBid: number;
}

// ---- Score ----

export interface MatchScore {
  teamPoints: [number, number]; // [team0, team1]
  matchPoints: [number, number]; // cumulative match points
  sets: [number, number]; // sets won
  lastBidResult: 'success' | 'fail' | null;
}

// ---- Full Game State ----

export interface TwentyNineState {
  // Phase
  phase: GamePhase;

  // Players (indexed by seat 0-3)
  players: TwentyNinePlayer[];

  // Deck & dealing
  deck: Card[];
  dealCount: number; // 0, 4, or 8 cards dealt per player

  // Bidding
  bidding: BidInfo;
  dealerSeat: number;

  // Trump
  trump: TrumpInfo;

  // Double
  double: DoubleInfo;

  // Playing
  currentTrick: Trick;
  completedTricks: Trick[];
  currentTurn: number; // seat number
  leadSuit: Suit | null;

  // Marriage
  marriage: MarriageInfo | null;

  // Scoring
  score: MatchScore;

  // Weak hand
  weakHandPlayer: string | null; // player id who may cancel
  weakHandRequested: boolean;

  // Settings
  settings: {
    minBid: number;
    setThreshold: number;
    matchLength: number;
    seed?: number;
  };

  // Seeding
  randomSeed: number;
  shuffleCount: number;

  // Metadata
  matchId: string;
  startedAt: number;

  // Internal tracking for double phase passes
  _doublePasses?: string[];
}
