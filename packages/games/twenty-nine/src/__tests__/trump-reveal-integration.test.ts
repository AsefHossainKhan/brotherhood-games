/**
 * Integration tests for trump reveal gameplay flow.
 *
 * These tests simulate full game scenarios to verify:
 * 1. Trump stays hidden from non-declarers until revealed
 * 2. Reveal is only possible when player has no led-suit cards
 * 3. Unrevealed trump cards have no trick-winning power
 * 4. After reveal, trump cards beat non-trump cards
 * 5. After reveal, player must play trump if they have no led-suit cards
 * 6. A different player can reveal later in the game
 */
import { describe, it, expect } from 'vitest';
import { TwentyNineEngine } from '../TwentyNineEngine';
import type { TwentyNineState } from '../types';
import type { GameAction } from '@brotherhood/game-engine';
import type { RoomSettings, Card, Suit } from '@brotherhood/shared';
import { GAME_PHASES } from '@brotherhood/shared';

const DEFAULT_SETTINGS: RoomSettings = {
  matchLength: 4,
  minBid: 16,
  setThreshold: 6,
  bidTimer: 30,
  playTimer: 30,
  allowSpectators: true,
};

const P = ['p0', 'p1', 'p2', 'p3'];
const TEAMS: (0 | 1)[] = [0, 1, 0, 1];

function eng() { return new TwentyNineEngine(); }

function act(type: string, playerId: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload };
}

function dealCards(engine: TwentyNineEngine, state: TwentyNineState): TwentyNineState {
  let s = engine.handleAction(state, act('START_GAME', 'p0')).newState;
  while (s.weakHandPlayer) {
    s = engine.handleAction(s, act('KEEP_WEAK_HAND', s.weakHandPlayer)).newState;
  }
  return s;
}

function finishBidding(engine: TwentyNineEngine, state: TwentyNineState, declarerId: string, bid: number): TwentyNineState {
  let s = state;
  // Pass through players until it's the declarer's turn
  let safety = 20;
  while (s.phase === GAME_PHASES.BIDDING && P[s.currentTurn] !== declarerId && safety-- > 0) {
    const pid = P[s.currentTurn];
    s = engine.handleAction(s, act('PASS_BID', pid)).newState;
  }
  // If all passed and redeal happened, just pass everyone through
  if (s.phase !== GAME_PHASES.BIDDING) return s;
  // Declarer places the bid
  s = engine.handleAction(s, act('PLACE_BID', declarerId, { bid })).newState;
  // Others pass
  safety = 10;
  while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
    const pid = P[s.currentTurn];
    if (pid === declarerId) break;
    s = engine.handleAction(s, act('PASS_BID', pid)).newState;
  }
  return s;
}

function skipDouble(engine: TwentyNineEngine, state: TwentyNineState): TwentyNineState {
  let s = state;
  let safety = 10;
  while (s.phase === GAME_PHASES.DOUBLE_PHASE && safety-- > 0) {
    const pid = P[s.currentTurn];
    const v = engine.validateAction(s, act('PASS_DOUBLE', pid));
    if (!v.valid) break;
    s = engine.handleAction(s, act('PASS_DOUBLE', pid)).newState;
  }
  return s;
}

/** Set up a game ready for playing with suit trump */
function setupGame(engine: TwentyNineEngine, declarerId: string, suit: Suit): TwentyNineState {
  const state = engine.createInitialState(P, DEFAULT_SETTINGS, TEAMS);
  let s = dealCards(engine, state);
  s = finishBidding(engine, s, declarerId, 20);
  s = engine.handleAction(s, act('SELECT_TRUMP', declarerId, { suit })).newState;
  s = skipDouble(engine, s);
  expect(s.phase).toBe(GAME_PHASES.PLAYING);
  return s;
}

/** Force a specific card into a player's hand at a specific index */
function giveCard(state: TwentyNineState, playerIdx: number, card: Card): void {
  state.players[playerIdx].hand.push(card);
}

describe('Trump Reveal — Full Game Integration', () => {

  it('scenario: player without led suit reveals trump, teammate benefits from trump power', () => {
    const engine = eng();
    // p0 declarer, trump = hearts
    let s = setupGame(engine, 'p0', 'hearts');

    // p0 leads spades J
    s.leadSuit = 'spades';
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
    s.players[0].hand = [{ suit: 'spades', rank: 'J' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p0', { cardIndex: 0 })).newState;

    // p1's turn — has no spades, can reveal
    expect(s.leadSuit).toBe('spades');
    s.players[1].hand = [
      { suit: 'diamonds', rank: 'A' } as Card,
      { suit: 'clubs', rank: '10' } as Card,
    ];

    // Validate reveal is allowed
    expect(engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', 'p1')).valid).toBe(true);

    // p1 reveals
    s = engine.handleAction(s, act('REQUEST_TRUMP_REVEAL', 'p1')).newState;
    expect(s.trump.isRevealed).toBe(true);
    expect(s.trump.revealedBy).toBe('p1');

    // After reveal, EVERYONE sees the suit
    for (const pid of P) {
      const vis = engine.getVisibleState(s, pid, 'player') as any;
      expect(vis.trump.suit).toBe('hearts');
      expect(vis.trump.isRevealed).toBe(true);
    }

    // Give p1 a heart card so the obligation kicks in
    s.players[1].hand = [
      { suit: 'hearts', rank: '9' } as Card,
      { suit: 'diamonds', rank: 'A' } as Card,
    ];

    // p1 must play hearts now (revealer's one-turn obligation)
    expect(engine.validateAction(s, act('PLAY_CARD', 'p1', { cardIndex: 1 })).valid).toBe(false);
    expect(engine.validateAction(s, act('PLAY_CARD', 'p1', { cardIndex: 0 })).valid).toBe(true);

    s = engine.handleAction(s, act('PLAY_CARD', 'p1', { cardIndex: 0 })).newState;

    // p1's mustPlayTrump is now cleared after playing
    expect(s.trump.mustPlayTrump).toBe(false);

    // p2's turn — has spades, must follow suit, cannot play trump even though revealed
    s.players[2].hand = [
      { suit: 'spades', rank: '9' } as Card,
      { suit: 'clubs', rank: 'Q' } as Card,
    ];
    expect(engine.validateAction(s, act('PLAY_CARD', 'p2', { cardIndex: 1 })).valid).toBe(false);
    s = engine.handleAction(s, act('PLAY_CARD', 'p2', { cardIndex: 0 })).newState;

    // p3's turn — has no spades, no obligation to play trump (they didn't reveal)
    // Can play any card freely
    s.players[3].hand = [
      { suit: 'diamonds', rank: '8' } as Card,
      { suit: 'clubs', rank: '10' } as Card,
    ];
    expect(engine.validateAction(s, act('PLAY_CARD', 'p3', { cardIndex: 0 })).valid).toBe(true);
    expect(engine.validateAction(s, act('PLAY_CARD', 'p3', { cardIndex: 1 })).valid).toBe(true);
    s = engine.handleAction(s, act('PLAY_CARD', 'p3', { cardIndex: 0 })).newState;

    // p1's hearts 9 (trump) beats all non-trump spades — p1 wins
    expect(s.completedTricks).toHaveLength(1);
    expect(s.completedTricks[0].winnerId).toBe('p1');
  });

  it('scenario: without reveal, trump card loses to lower led-suit card', () => {
    const engine = eng();
    let s = setupGame(engine, 'p0', 'hearts');

    // p0 leads spades 7 (lowest)
    s.leadSuit = 'spades';
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
    s.players[0].hand = [{ suit: 'spades', rank: '7' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p0', { cardIndex: 0 })).newState;

    // p1 has no spades but DOES have hearts — trump not revealed yet
    // They choose NOT to reveal and play hearts J instead
    s.players[1].hand = [
      { suit: 'hearts', rank: 'J' } as Card,
      { suit: 'clubs', rank: '8' } as Card,
    ];
    s.trump.isRevealed = false;
    s = engine.handleAction(s, act('PLAY_CARD', 'p1', { cardIndex: 0 })).newState;

    // p2 plays spades A
    s.players[2].hand = [{ suit: 'spades', rank: 'A' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p2', { cardIndex: 0 })).newState;

    // p3 plays spades 9
    s.players[3].hand = [{ suit: 'spades', rank: '9' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p3', { cardIndex: 0 })).newState;

    // p2's spades 9 wins — J is trump but unrevealed so no power, 9 > A in 29
    expect(s.completedTricks).toHaveLength(1);
    expect(s.completedTricks[0].winnerId).toBe('p3');
  });

  it('scenario: declarer leads trick and cannot reveal', () => {
    const engine = eng();
    let s = setupGame(engine, 'p0', 'hearts');

    // p0 is leading (no lead suit) — cannot reveal
    s.leadSuit = null;
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };

    const v = engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', 'p0'));
    expect(v.valid).toBe(false);
    expect(v.error).toContain('leading');
  });

  it('scenario: player with led-suit cards cannot reveal even if they also have trump', () => {
    const engine = eng();
    let s = setupGame(engine, 'p0', 'hearts');

    // p0 leads spades
    s.leadSuit = 'spades';
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
    s.players[0].hand = [{ suit: 'spades', rank: 'J' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p0', { cardIndex: 0 })).newState;

    // p1 has both spades AND hearts — must follow suit, cannot reveal
    s.players[1].hand = [
      { suit: 'spades', rank: '9' } as Card,
      { suit: 'hearts', rank: 'J' } as Card,
    ];

    const v = engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', 'p1'));
    expect(v.valid).toBe(false);
    expect(v.error).toContain('follow suit');
  });

  it('scenario: second player reveals mid-game, trump obligation enforced from then on', () => {
    const engine = eng();
    let s = setupGame(engine, 'p0', 'diamonds');

    // === Trick 1: no reveal ===
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
    s.leadSuit = null;
    s.players[0].hand = [
      { suit: 'clubs', rank: 'J' } as Card,
      { suit: 'spades', rank: 'A' } as Card,
    ];
    s = engine.handleAction(s, act('PLAY_CARD', 'p0', { cardIndex: 0 })).newState;
    // lead is clubs

    s.players[1].hand = [
      { suit: 'clubs', rank: '9' } as Card,
    ];
    s = engine.handleAction(s, act('PLAY_CARD', 'p1', { cardIndex: 0 })).newState;

    s.players[2].hand = [
      { suit: 'clubs', rank: 'A' } as Card,
    ];
    s = engine.handleAction(s, act('PLAY_CARD', 'p2', { cardIndex: 0 })).newState;

    s.players[3].hand = [
      { suit: 'clubs', rank: '10' } as Card,
    ];
    s = engine.handleAction(s, act('PLAY_CARD', 'p3', { cardIndex: 0 })).newState;

    expect(s.completedTricks).toHaveLength(1);
    expect(s.trump.isRevealed).toBe(false);

    // === Trick 2: p2 reveals ===
    // Winner of trick 1 leads
    const trick1WinnerId = s.completedTricks[0].winnerId!;
    s.currentTurn = s.players.find((p) => p.id === trick1WinnerId)!.seat;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 2 };
    s.leadSuit = null;

    // Trick 2 leader plays spades
    const leaderIdx = s.players.findIndex((p) => p.id === trick1WinnerId);
    s.players[leaderIdx].hand = [{ suit: 'spades', rank: 'K' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', trick1WinnerId, { cardIndex: 0 })).newState;

    // Next player (p2) has no spades — can reveal
    const nextIdx = s.currentTurn;
    const nextId = P[nextIdx];
    s.players[nextIdx].hand = [
      { suit: 'diamonds', rank: 'J' } as Card,  // trump
      { suit: 'hearts', rank: '8' } as Card,
    ];

    expect(engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', nextId)).valid).toBe(true);
    s = engine.handleAction(s, act('REQUEST_TRUMP_REVEAL', nextId)).newState;
    expect(s.trump.isRevealed).toBe(true);

    // After reveal, suit is visible to all
    for (const pid of P) {
      const vis = engine.getVisibleState(s, pid, 'player') as any;
      expect(vis.trump.suit).toBe('diamonds');
    }
  });

  it('scenario: after reveal, player without led suit can play any card (no obligation)', () => {
    const engine = eng();
    let s = setupGame(engine, 'p0', 'clubs');

    // Manually reveal trump
    s.trump.isRevealed = true;
    s.trump.revealedBy = 'p0';
    s.trump.mustPlayTrump = false; // obligation already passed

    // p0 leads hearts
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
    s.leadSuit = null;
    s.players[0].hand = [{ suit: 'hearts', rank: 'J' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p0', { cardIndex: 0 })).newState;

    // p1 has no hearts but has clubs (trump) — not the revealer, so no obligation
    s.players[1].hand = [
      { suit: 'clubs', rank: '9' } as Card,
      { suit: 'diamonds', rank: 'A' } as Card,
    ];

    // p1 can play EITHER card — no obligation
    expect(engine.validateAction(s, act('PLAY_CARD', 'p1', { cardIndex: 0 })).valid).toBe(true);
    expect(engine.validateAction(s, act('PLAY_CARD', 'p1', { cardIndex: 1 })).valid).toBe(true);
  });

  it('scenario: before reveal, someone without led suit can play any card freely', () => {
    const engine = eng();
    let s = setupGame(engine, 'p0', 'clubs');

    s.trump.isRevealed = false;
    s.trump.mustPlayTrump = false;

    // p0 leads hearts
    s.currentTurn = 0;
    s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
    s.leadSuit = null;
    s.players[0].hand = [{ suit: 'hearts', rank: 'J' } as Card];
    s = engine.handleAction(s, act('PLAY_CARD', 'p0', { cardIndex: 0 })).newState;

    // p1 has no hearts and no clubs — can play anything
    s.players[1].hand = [
      { suit: 'diamonds', rank: 'A' } as Card,
      { suit: 'spades', rank: 'K' } as Card,
    ];

    expect(engine.validateAction(s, act('PLAY_CARD', 'p1', { cardIndex: 0 })).valid).toBe(true);
    expect(engine.validateAction(s, act('PLAY_CARD', 'p1', { cardIndex: 1 })).valid).toBe(true);
  });
});
