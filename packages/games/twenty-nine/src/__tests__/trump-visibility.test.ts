/**
 * SPEC: spec-5f372d — trump reveal: what each viewer learns at trump selection
 * and at a reveal, and who may reveal, under all three trump modes.
 *
 * - Suit trump and Joker look identical to everyone but the declarer
 *   ("hidden"); seventh-card is announced, its card and suit kept back.
 * - Any player may reveal on their turn in play, when not leading and void in
 *   the led suit.
 * - A reveal announces the suit (the seventh card shown as proof, then back in
 *   the declarer's hand) or no trump for a Joker; under a suit the revealer
 *   must then play trump if they hold one.
 */
import { describe, it, expect } from 'vitest';
import { TwentyNineEngine } from '../TwentyNineEngine';
import type { TwentyNineState } from '../types';
import type { ActionResult, GameAction } from '@brotherhood/game-engine';
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
const DECLARER = 'p0';
const NON_DECLARERS = ['p1', 'p2', 'p3'];
const SPECTATOR = 'spectator1';

type Mode = 'suit' | 'seventh-card' | 'joker';
const MODES: Mode[] = ['suit', 'seventh-card', 'joker'];

function act(type: string, playerId: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload };
}

const card = (suit: Suit, rank: string): Card => ({ suit, rank }) as Card;

/** Deal and bid until p0 is declarer and must choose the trump. */
function toTrumpSelection(engine: TwentyNineEngine): TwentyNineState {
  let s = engine.createInitialState(P, DEFAULT_SETTINGS, TEAMS);
  s = engine.handleAction(s, act('START_GAME', 'p0')).newState;
  while (s.weakHandPlayer) {
    s = engine.handleAction(s, act('KEEP_WEAK_HAND', s.weakHandPlayer)).newState;
  }
  let safety = 20;
  while (s.phase === GAME_PHASES.BIDDING && P[s.currentTurn] !== DECLARER && safety-- > 0) {
    s = engine.handleAction(s, act('PASS_BID', P[s.currentTurn])).newState;
  }
  s = engine.handleAction(s, act('PLACE_BID', DECLARER, { bid: 20 })).newState;
  safety = 10;
  while (s.phase === GAME_PHASES.BIDDING && P[s.currentTurn] !== DECLARER && safety-- > 0) {
    s = engine.handleAction(s, act('PASS_BID', P[s.currentTurn])).newState;
  }
  expect(s.phase).toBe(GAME_PHASES.TRUMP_SELECTION);
  return s;
}

function selectMode(engine: TwentyNineEngine, s: TwentyNineState, mode: Mode): ActionResult<TwentyNineState> {
  const a =
    mode === 'suit'
      ? act('SELECT_TRUMP', DECLARER, { suit: 'hearts' })
      : mode === 'seventh-card'
        ? act('SELECT_SEVENTH_CARD_TRUMP', DECLARER)
        : act('SELECT_JOKER', DECLARER);
  expect(engine.validateAction(s, a).valid).toBe(true);
  return engine.handleAction(s, a);
}

function skipDouble(engine: TwentyNineEngine, state: TwentyNineState): TwentyNineState {
  let s = state;
  let safety = 10;
  while (s.phase === GAME_PHASES.DOUBLE_PHASE && safety-- > 0) {
    const pid = P[s.currentTurn];
    if (!engine.validateAction(s, act('PASS_DOUBLE', pid)).valid) break;
    s = engine.handleAction(s, act('PASS_DOUBLE', pid)).newState;
  }
  return s;
}

function toPlaying(engine: TwentyNineEngine, mode: Mode): TwentyNineState {
  const s = skipDouble(engine, selectMode(engine, toTrumpSelection(engine), mode).newState);
  expect(s.phase).toBe(GAME_PHASES.PLAYING);
  return s;
}

/** A suit that is not the trump (any suit under a Joker). */
function offSuit(s: TwentyNineState): Suit {
  return (['spades', 'diamonds', 'clubs', 'hearts'] as Suit[]).find((x) => x !== s.trump.suit)!;
}

/**
 * Put `leaderId`'s card of `leadSuit` on the table and make it `actorId`'s
 * turn, as the next seat to play.
 */
function setTrick(s: TwentyNineState, leaderId: string, leadSuit: Suit, actorId: string): void {
  s.leadSuit = leadSuit;
  s.currentTrick = {
    plays: [{ playerId: leaderId, card: card(leadSuit, '7'), cardIndex: 0 }],
    leadSuit,
    winnerId: null,
    trickNumber: 1,
  };
  s.currentTurn = P.indexOf(actorId);
}

function viewOf(engine: TwentyNineEngine, s: TwentyNineState, viewerId: string): any {
  return engine.getVisibleState(s, viewerId, viewerId === SPECTATOR ? 'spectator' : 'player');
}

function reveal(engine: TwentyNineEngine, s: TwentyNineState, revealerId: string): ActionResult<TwentyNineState> {
  const a = act('REQUEST_TRUMP_REVEAL', revealerId);
  expect(engine.validateAction(s, a)).toEqual({ valid: true });
  return engine.handleAction(s, a);
}

describe('SPEC-8 trump reveal', () => {
  describe('AC1: suit trump and Joker are indistinguishable to all but the declarer', () => {
    it('TRUMP_SELECTED is identical for a suit trump and a Joker, and names no mode or suit', () => {
      const engine = new TwentyNineEngine();
      const suitResult = selectMode(engine, toTrumpSelection(engine), 'suit');
      const jokerResult = selectMode(engine, toTrumpSelection(engine), 'joker');

      const roomEvent = (r: ActionResult<TwentyNineState>) =>
        r.broadcasts.find((b) => b.event === 'TRUMP_SELECTED')!;
      expect(roomEvent(suitResult).targetPlayerIds).toBeUndefined();
      expect(roomEvent(suitResult).payload).toEqual({ type: 'hidden' });
      expect(roomEvent(jokerResult).payload).toEqual(roomEvent(suitResult).payload);

      // The real choice goes to the declarer alone
      for (const r of [suitResult, jokerResult]) {
        const priv = r.broadcasts.find((b) => b.event === 'TRUMP_HIDDEN')!;
        expect(priv.targetPlayerIds).toEqual([DECLARER]);
      }
    });

    it('no room-wide broadcast at selection carries the trump suit or a marriage', () => {
      const engine = new TwentyNineEngine();
      for (const mode of ['suit', 'joker'] as Mode[]) {
        const s = toTrumpSelection(engine);
        // Give the declarer's side K+Q of hearts in the second deal
        s.deck = [
          card('hearts', 'K'), card('spades', 'K'), card('diamonds', 'K'), card('clubs', 'K'),
          card('hearts', 'Q'), card('spades', 'Q'), card('diamonds', 'Q'), card('clubs', 'Q'),
          ...s.deck.filter((c) => !['K', 'Q'].includes(c.rank)),
        ];
        const r = selectMode(engine, s, mode);
        const roomWide = r.broadcasts.filter((b) => !b.targetPlayerIds);
        expect(roomWide.map((b) => b.event)).not.toContain('MARRIAGE_DECLARED');
        for (const b of roomWide) {
          expect(b.payload).not.toHaveProperty('suit');
        }
        expect(r.newState.marriage).toBeNull();
      }
    });

    it("every non-declarer's and spectator's trump view is the same under suit and Joker", () => {
      const engine = new TwentyNineEngine();
      const suitGame = toPlaying(engine, 'suit');
      const jokerGame = toPlaying(engine, 'joker');

      for (const viewer of [...NON_DECLARERS, SPECTATOR]) {
        const a = viewOf(engine, suitGame, viewer).trump;
        const b = viewOf(engine, jokerGame, viewer).trump;
        expect(a).toEqual({
          type: 'hidden',
          suit: null,
          isRevealed: false,
          seventhCard: null,
          mustPlayTrump: false,
        });
        expect(b).toEqual(a);
        expect(viewOf(engine, suitGame, viewer).marriage).toBeNull();
      }
    });

    it('the declarer sees the real mode and suit', () => {
      const engine = new TwentyNineEngine();
      expect(viewOf(engine, toPlaying(engine, 'suit'), DECLARER).trump).toMatchObject({
        type: 'suit',
        suit: 'hearts',
      });
      expect(viewOf(engine, toPlaying(engine, 'joker'), DECLARER).trump).toMatchObject({
        type: 'joker',
        suit: null,
      });
    });
  });

  describe('AC2: seventh-card is announced, its card and suit kept back', () => {
    it('TRUMP_SELECTED tells the room seventh-card was chosen and nothing more', () => {
      const engine = new TwentyNineEngine();
      const r = selectMode(engine, toTrumpSelection(engine), 'seventh-card');
      const roomEvent = r.broadcasts.find((b) => b.event === 'TRUMP_SELECTED')!;
      expect(roomEvent.targetPlayerIds).toBeUndefined();
      expect(roomEvent.payload).toEqual({ type: 'seventh-card' });

      // The card and its suit go to the declarer alone
      const priv = r.broadcasts.find((b) => b.event === 'TRUMP_HIDDEN')!;
      expect(priv.targetPlayerIds).toEqual([DECLARER]);
      expect(priv.payload.seventhCard).toEqual(r.newState.trump.seventhCard);
      for (const b of r.broadcasts.filter((x) => !x.targetPlayerIds)) {
        expect(b.payload).not.toHaveProperty('suit');
        expect(b.payload).not.toHaveProperty('seventhCard');
      }
    });

    it('non-declarers and spectators see seventh-card, but neither the card nor its suit', () => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, 'seventh-card');
      for (const viewer of [...NON_DECLARERS, SPECTATOR]) {
        expect(viewOf(engine, s, viewer).trump).toEqual({
          type: 'seventh-card',
          suit: null,
          isRevealed: false,
          seventhCard: null,
          mustPlayTrump: false,
        });
      }
      expect(viewOf(engine, s, DECLARER).trump.seventhCard).toEqual(s.trump.seventhCard);
    });
  });

  describe('AC3–AC5: who may not reveal', () => {
    it.each(MODES)('%s: a player holding the led suit is refused', (mode) => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, mode);
      const lead = offSuit(s);
      s.players[1].hand = [card(lead, 'A'), card(s.trump.suit ?? 'hearts', 'J')];
      setTrick(s, 'p0', lead, 'p1');
      expect(engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', 'p1'))).toEqual({
        valid: false,
        error: 'Must follow suit - cannot reveal',
      });
    });

    it.each(MODES)('%s: the player leading the trick is refused', (mode) => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, mode);
      s.leadSuit = null;
      s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
      const leader = P[s.currentTurn];
      expect(engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', leader))).toEqual({
        valid: false,
        error: 'Cannot reveal when leading the trick',
      });
    });

    it.each(MODES)('%s: a void player whose turn it is not is refused', (mode) => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, mode);
      const lead = offSuit(s);
      s.players[3].hand = [card(s.trump.suit ?? 'hearts', '7')].filter((c) => c.suit !== lead);
      setTrick(s, 'p0', lead, 'p1');
      const v = engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', 'p3'));
      expect(v.valid).toBe(false);
      expect(v.error).toBe('Not your turn');
    });

    it.each(MODES)('%s: a reveal outside the playing phase is refused', (mode) => {
      const engine = new TwentyNineEngine();
      const s = selectMode(engine, toTrumpSelection(engine), mode).newState;
      expect(s.phase).toBe(GAME_PHASES.DOUBLE_PHASE);
      const v = engine.validateAction(s, act('REQUEST_TRUMP_REVEAL', P[s.currentTurn]));
      expect(v.valid).toBe(false);
    });
  });

  describe('AC6: any void player not leading may reveal, under every mode', () => {
    const revealers = [
      ['the declarer', 'p0'],
      ["the declarer's partner", 'p2'],
      ['an opponent', 'p1'],
    ];
    for (const mode of MODES) {
      it.each(revealers)(`${mode}: %s may reveal`, (_who, revealerId) => {
        const engine = new TwentyNineEngine();
        const s = toPlaying(engine, mode);
        const lead = offSuit(s);
        const revealer = s.players.find((p) => p.id === revealerId)!;
        revealer.hand = revealer.hand.filter((c) => c.suit !== lead);
        if (revealer.hand.length === 0) revealer.hand = [card(s.trump.suit ?? 'hearts', '8')].filter((c) => c.suit !== lead);
        setTrick(s, P[(revealer.seat + 3) % 4], lead, revealerId);

        const r = reveal(engine, s, revealerId);
        expect(r.errors).toBeUndefined();
        expect(r.newState.trump.isRevealed).toBe(true);
        expect(r.newState.trump.revealedBy).toBe(revealerId);
      });
    }
  });

  describe('AC7: suit trump reveal', () => {
    it('tells everyone the suit, makes it active, and the revealer must play trump if they hold one', () => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, 'suit');
      s.players[1].hand = [card('clubs', 'A'), card('hearts', '8')];
      setTrick(s, 'p0', 'spades', 'p1');

      const r = reveal(engine, s, 'p1');
      const ev = r.broadcasts.find((b) => b.event === 'TRUMP_REVEALED')!;
      expect(ev.targetPlayerIds).toBeUndefined();
      expect(ev.payload).toMatchObject({ type: 'suit', noTrump: false, suit: 'hearts', playerId: 'p1' });

      for (const viewer of [...P, SPECTATOR]) {
        expect(viewOf(engine, r.newState, viewer).trump).toMatchObject({
          type: 'suit',
          suit: 'hearts',
          isRevealed: true,
        });
      }

      const after = r.newState;
      expect(engine.validateAction(after, act('PLAY_CARD', 'p1', { cardIndex: 0 })).valid).toBe(false);
      expect(engine.validateAction(after, act('PLAY_CARD', 'p1', { cardIndex: 1 })).valid).toBe(true);
    });

    it('a revealer with no trump card may play any card', () => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, 'suit');
      s.players[1].hand = [card('clubs', 'A'), card('diamonds', '8')];
      setTrick(s, 'p0', 'spades', 'p1');
      const after = reveal(engine, s, 'p1').newState;
      expect(engine.validateAction(after, act('PLAY_CARD', 'p1', { cardIndex: 0 })).valid).toBe(true);
      expect(engine.validateAction(after, act('PLAY_CARD', 'p1', { cardIndex: 1 })).valid).toBe(true);
    });
  });

  describe('AC8: seventh-card reveal', () => {
    it('shows everyone the card and its suit, returns it to the declarer, and the revealer must play trump', () => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, 'seventh-card');
      const seventh = s.trump.seventhCard!;
      const trumpSuit = s.trump.suit!;
      expect(s.players[0].hand).toHaveLength(7);
      expect(s.players[0].hand).not.toContainEqual(seventh);

      const lead = offSuit(s);
      const otherOff = (['spades', 'diamonds', 'clubs', 'hearts'] as Suit[]).find(
        (x) => x !== trumpSuit && x !== lead,
      )!;
      s.players[1].hand = [card(otherOff, 'A'), card(trumpSuit, seventh.rank === '7' ? '8' : '7')];
      setTrick(s, 'p0', lead, 'p1');

      const r = reveal(engine, s, 'p1');
      const ev = r.broadcasts.find((b) => b.event === 'TRUMP_REVEALED')!;
      expect(ev.targetPlayerIds).toBeUndefined();
      expect(ev.payload).toMatchObject({
        type: 'seventh-card',
        noTrump: false,
        suit: trumpSuit,
        seventhCard: seventh,
      });

      for (const viewer of [...P, SPECTATOR]) {
        expect(viewOf(engine, r.newState, viewer).trump).toMatchObject({
          type: 'seventh-card',
          suit: trumpSuit,
          seventhCard: seventh,
          isRevealed: true,
        });
      }
      expect(r.newState.players[0].hand).toContainEqual(seventh);

      const after = r.newState;
      expect(engine.validateAction(after, act('PLAY_CARD', 'p1', { cardIndex: 0 })).valid).toBe(false);
      expect(engine.validateAction(after, act('PLAY_CARD', 'p1', { cardIndex: 1 })).valid).toBe(true);
    });
  });

  describe('AC9: Joker reveal', () => {
    it('tells everyone there is no trump, and the revealer may play any card', () => {
      const engine = new TwentyNineEngine();
      const s = toPlaying(engine, 'joker');
      s.players[1].hand = [card('clubs', 'A'), card('hearts', '8'), card('diamonds', 'J')];
      setTrick(s, 'p0', 'spades', 'p1');

      const r = reveal(engine, s, 'p1');
      const ev = r.broadcasts.find((b) => b.event === 'TRUMP_REVEALED')!;
      expect(ev.targetPlayerIds).toBeUndefined();
      expect(ev.payload).toMatchObject({ type: 'joker', noTrump: true, suit: null, playerId: 'p1' });

      for (const viewer of [...P, SPECTATOR]) {
        expect(viewOf(engine, r.newState, viewer).trump).toMatchObject({
          type: 'joker',
          suit: null,
          isRevealed: true,
          mustPlayTrump: false,
        });
      }
      for (const i of [0, 1, 2]) {
        expect(engine.validateAction(r.newState, act('PLAY_CARD', 'p1', { cardIndex: i })).valid).toBe(true);
      }
    });
  });
});
