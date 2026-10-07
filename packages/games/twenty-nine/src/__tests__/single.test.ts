/**
 * Single declaration — SPEC: spec-d7d1f5
 *
 * Once all 8 cards are in hand, during the double phase, the declarer may
 * play alone: the partner folds, no trump, marriage or doubling applies, the
 * Single caller leads, and the hand scores +3 match points for all 8 tricks
 * and -3 otherwise.
 */
import { describe, it, expect } from "vitest";
import { TwentyNineEngine } from "../TwentyNineEngine";
import type { TwentyNineState } from "../types";
import type { GameAction } from "@brotherhood/game-engine";
import type { RoomSettings, Card, Suit, Rank } from "@brotherhood/shared";
import { GAME_PHASES } from "@brotherhood/shared";

// ---- Helpers ----

const SETTINGS: RoomSettings = {
  matchLength: 4,
  minBid: 16,
  setThreshold: 6,
  bidTimer: 30,
  playTimer: 30,
  allowSpectators: true,
  seed: 29,
};

const PLAYER_IDS = ["p0", "p1", "p2", "p3"];
const TEAMS: (0 | 1)[] = [0, 1, 0, 1]; // p0&p2 = team 0, p1&p3 = team 1

function action(
  type: string,
  playerId: string,
  payload: Record<string, unknown> = {},
): GameAction {
  return { type, playerId, payload };
}

function cards(suit: Suit, ranks: Rank[]): Card[] {
  return ranks.map((rank) => ({ suit, rank }));
}

/** Deal, keep any weak hand, let p0 open at 16 and everyone else pass. */
function toTrumpSelection(engine: TwentyNineEngine): TwentyNineState {
  let s = engine.createInitialState(PLAYER_IDS, SETTINGS, TEAMS);
  s.dealerSeat = 3; // bidding opens at the dealer's right: p0
  s = engine.handleAction(s, action("START_GAME", "p0")).newState;
  while (s.weakHandPlayer) {
    s = engine.handleAction(
      s,
      action("KEEP_WEAK_HAND", s.weakHandPlayer),
    ).newState;
  }

  let safety = 20;
  while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
    const pid = PLAYER_IDS[s.currentTurn];
    const move =
      pid === "p0" && s.bidding.highestBidder === null
        ? action("PLACE_BID", pid, { bid: 16 })
        : action("PASS_BID", pid);
    s = engine.handleAction(s, move).newState;
  }

  expect(s.phase).toBe(GAME_PHASES.TRUMP_SELECTION);
  return s;
}

/** As above, then p0 picks a trump and the second deal brings the double phase. */
function toDoublePhase(
  engine: TwentyNineEngine,
  trump: GameAction = action("SELECT_TRUMP", "p0", { suit: "hearts" }),
): TwentyNineState {
  const s = engine.handleAction(toTrumpSelection(engine), trump).newState;
  expect(s.phase).toBe(GAME_PHASES.DOUBLE_PHASE);
  return s;
}

/**
 * A Single in play with chosen hands: p0 declares and leads, p2 has folded,
 * p1 and p3 defend.
 */
function controlledSingle(
  engine: TwentyNineEngine,
  hands: [Card[], Card[], Card[]],
): TwentyNineState {
  const s = engine.createInitialState(PLAYER_IDS, SETTINGS, TEAMS);
  const [p0, p1, p3] = hands;
  s.players[0].hand = p0;
  s.players[1].hand = p1;
  s.players[2].hand = [];
  s.players[3].hand = p3;
  s.players[0].isDeclarer = true;
  s.bidding = {
    currentBid: 16,
    highestBidder: "p0",
    activeBidders: ["p0"],
    currentChallenger: null,
    bids: [{ playerId: "p0", bid: 16 }],
  };
  s.single = { declarerId: "p0", partnerId: "p2" };
  s.phase = GAME_PHASES.PLAYING;
  s.currentTurn = 0;
  s.currentTrick = { plays: [], leadSuit: null, winnerId: null, trickNumber: 1 };
  return s;
}

/** Play the first valid card of whoever's turn it is. */
function playFirstValid(
  engine: TwentyNineEngine,
  s: TwentyNineState,
): TwentyNineState {
  const pid = PLAYER_IDS[s.currentTurn];
  const hand = s.players[s.currentTurn].hand;
  for (let i = 0; i < hand.length; i++) {
    const a = action("PLAY_CARD", pid, { cardIndex: i });
    if (engine.validateAction(s, a).valid) {
      return engine.handleAction(s, a).newState;
    }
  }
  throw new Error(`No valid card for ${pid}`);
}

function playOut(engine: TwentyNineEngine, s: TwentyNineState): TwentyNineState {
  let safety = 40;
  while (s.phase === GAME_PHASES.PLAYING && safety-- > 0) {
    s = playFirstValid(engine, s);
  }
  return s;
}

// Declarer holds the top four hearts and spades; p1 the low ones; p3 diamonds.
const STRONG: [Card[], Card[], Card[]] = [
  [...cards("hearts", ["J", "9", "A", "10"]), ...cards("spades", ["J", "9", "A", "10"])],
  [...cards("hearts", ["K", "Q", "8", "7"]), ...cards("spades", ["K", "Q", "8", "7"])],
  cards("diamonds", ["J", "9", "A", "10", "K", "Q", "8", "7"]),
];

// ---- Tests ----

describe("Single declaration (SPEC: spec-d7d1f5)", () => {
  describe("declaring", () => {
    it("lets the declarer declare Single in the double phase, with 8 cards", () => {
      const engine = new TwentyNineEngine();
      const s = toDoublePhase(engine);
      expect(s.players[0].hand).toHaveLength(8);
      expect(
        engine.validateAction(s, action("DECLARE_SINGLE", "p0")).valid,
      ).toBe(true);
    });

    it("lets the declarer call it out of turn while opponents decide on a double", () => {
      const engine = new TwentyNineEngine();
      const s = toDoublePhase(engine);
      expect(s.currentTurn).not.toBe(0); // an opponent is deciding
      const r = engine.handleAction(s, action("DECLARE_SINGLE", "p0"));
      expect(r.errors).toBeUndefined();
      expect(r.newState.phase).toBe(GAME_PHASES.PLAYING);
    });

    it("refuses Single at trump selection, before the second deal", () => {
      const engine = new TwentyNineEngine();
      const v = engine.validateAction(
        toTrumpSelection(engine),
        action("DECLARE_SINGLE", "p0"),
      );
      expect(v).toEqual({
        valid: false,
        error: "Single is declared in the double phase",
      });
    });

    it("refuses Single from anyone but the declarer", () => {
      const engine = new TwentyNineEngine();
      const s = toDoublePhase(engine);
      for (const pid of ["p1", "p2", "p3"]) {
        const v = engine.validateAction(s, action("DECLARE_SINGLE", pid));
        expect(v).toEqual({
          valid: false,
          error: "Only the declarer can declare Single",
        });
      }
    });

    it("refuses Single once play has started", () => {
      const engine = new TwentyNineEngine();
      const s = controlledSingle(engine, STRONG);
      expect(
        engine.validateAction(s, action("DECLARE_SINGLE", "p0")).valid,
      ).toBe(false);
    });

    it("drops a double already called", () => {
      const engine = new TwentyNineEngine();
      let s = toDoublePhase(engine);
      const opponent = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(s, action("DECLARE_DOUBLE", opponent)).newState;
      expect(s.double.multiplier).toBe(2);

      s = engine.handleAction(s, action("DECLARE_SINGLE", "p0")).newState;
      expect(s.double).toEqual({ level: "normal", calledBy: null, multiplier: 1 });
      expect(s.phase).toBe(GAME_PHASES.PLAYING);
    });

    it("returns a set-aside seventh card so the declarer plays all 8", () => {
      const engine = new TwentyNineEngine();
      const s = toDoublePhase(
        engine,
        action("SELECT_SEVENTH_CARD_TRUMP", "p0"),
      );
      expect(s.players[0].hand).toHaveLength(7);
      const seventh = s.trump.seventhCard!;

      const after = engine.handleAction(s, action("DECLARE_SINGLE", "p0"))
        .newState;
      expect(after.players[0].hand).toHaveLength(8);
      expect(after.players[0].hand).toContainEqual(seventh);
      expect(after.trump.seventhCard).toBeNull();
    });

    it("cancels a marriage declared with the trump", () => {
      const engine = new TwentyNineEngine();
      const s = toDoublePhase(engine);
      s.marriage = { team: 0, suit: "hearts", effectiveBid: 12, playerId: "p0" };
      const after = engine.handleAction(s, action("DECLARE_SINGLE", "p0"))
        .newState;
      expect(after.marriage).toBeNull();
    });
  });

  // Criterion 1: the partner holds no playable cards and the caller leads.
  describe("when play starts", () => {
    it("folds the partner's hand and lets the Single caller lead", () => {
      const engine = new TwentyNineEngine();
      const result = engine.handleAction(
        toDoublePhase(engine),
        action("DECLARE_SINGLE", "p0"),
      );
      const s = result.newState;

      expect(s.phase).toBe(GAME_PHASES.PLAYING);
      expect(s.single).toEqual({ declarerId: "p0", partnerId: "p2" });
      expect(s.players[2].hand).toEqual([]);
      expect(s.players[0].hand).toHaveLength(8);
      expect(s.players[1].hand).toHaveLength(8);
      expect(s.players[3].hand).toHaveLength(8);
      expect(s.currentTurn).toBe(0);
      expect(s.currentTrick.trickNumber).toBe(1);

      const started = result.broadcasts.find((b) => b.event === "PLAYING_STARTED");
      expect(started?.payload).toEqual({ firstPlayer: "p0" });
      expect(result.broadcasts.some((b) => b.event === "SINGLE_DECLARED")).toBe(
        true,
      );
    });

    it("plays with no trump, no marriage and no further doubling", () => {
      const engine = new TwentyNineEngine();
      const s = engine.handleAction(
        toDoublePhase(engine),
        action("DECLARE_SINGLE", "p0"),
      ).newState;

      expect(s.trump.type).toBeNull();
      expect(s.trump.suit).toBeNull();
      expect(s.marriage).toBeNull();
      expect(s.double).toEqual({ level: "normal", calledBy: null, multiplier: 1 });
      expect(
        engine.validateAction(s, action("DECLARE_DOUBLE", "p1")).valid,
      ).toBe(false);
    });

    it("refuses a trump reveal during a Single", () => {
      const engine = new TwentyNineEngine();
      let s = controlledSingle(engine, STRONG);
      s = playFirstValid(engine, s); // p0 leads J hearts
      s = playFirstValid(engine, s); // p1 follows
      // p3 holds no hearts — in a trump game they could ask for a reveal
      const v = engine.validateAction(s, action("REQUEST_TRUMP_REVEAL", "p3"));
      expect(v).toEqual({ valid: false, error: "No trump to reveal" });
    });

    it("refuses any play from the folded partner", () => {
      const engine = new TwentyNineEngine();
      const s = controlledSingle(engine, STRONG);
      expect(
        engine.validateAction(s, action("PLAY_CARD", "p2", { cardIndex: 0 }))
          .valid,
      ).toBe(false);
    });

    it("skips the folded partner and resolves a trick on 3 cards", () => {
      const engine = new TwentyNineEngine();
      let s = controlledSingle(engine, STRONG);
      s = playFirstValid(engine, s); // p0
      expect(s.currentTurn).toBe(1);
      s = playFirstValid(engine, s); // p1
      expect(s.currentTurn).toBe(3); // p2 is skipped
      s = playFirstValid(engine, s); // p3 — trick complete

      expect(s.completedTricks).toHaveLength(1);
      expect(s.completedTricks[0].plays.map((p) => p.playerId)).toEqual([
        "p0",
        "p1",
        "p3",
      ]);
      expect(s.completedTricks[0].winnerId).toBe("p0");
      expect(s.currentTurn).toBe(0);
    });

    it("shows the partner's hand as folded in the visible state", () => {
      const engine = new TwentyNineEngine();
      const s = controlledSingle(engine, STRONG);
      const view = engine.getVisibleState(s, "p2", "player") as {
        single: unknown;
        players: { id: string; handCount: number }[];
      };
      expect(view.single).toEqual({ declarerId: "p0", partnerId: "p2" });
      expect(view.players.find((p) => p.id === "p2")!.handCount).toBe(0);
    });
  });

  // Criterion 2: all 8 tricks → +3 match points.
  describe("when the declarer wins all 8 tricks", () => {
    it("gives the declarer team 3 match points", () => {
      const engine = new TwentyNineEngine();
      const ended = playOut(engine, controlledSingle(engine, STRONG));

      expect(ended.completedTricks).toHaveLength(8);
      expect(ended.completedTricks.every((t) => t.winnerId === "p0")).toBe(true);
      expect(ended.phase).toBe(GAME_PHASES.SCORING);
      expect(ended.score.matchPoints).toEqual([3, 0]);
      expect(ended.score.lastBidResult).toBe("success");
    });

    it("clears the Single when the next hand starts", () => {
      const engine = new TwentyNineEngine();
      const ended = playOut(engine, controlledSingle(engine, STRONG));
      const next = engine.handleAction(ended, action("START_NEXT_HAND", "p0"))
        .newState;
      expect(next.single).toBeNull();
      expect(next.players.every((p) => p.hand.length === 4)).toBe(true);
    });

    it("adds no double multiplier or trick bonus", () => {
      const engine = new TwentyNineEngine();
      const start = controlledSingle(engine, STRONG);
      start.score.matchPoints = [2, 1];
      let s = start;
      let scored: Record<string, unknown> | undefined;
      let safety = 40;
      while (s.phase === GAME_PHASES.PLAYING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        const hand = s.players[s.currentTurn].hand;
        for (let i = 0; i < hand.length; i++) {
          const a = action("PLAY_CARD", pid, { cardIndex: i });
          if (engine.validateAction(s, a).valid) {
            const r = engine.handleAction(s, a);
            s = r.newState;
            scored =
              (r.broadcasts.find((b) => b.event === "SCORE_UPDATED")
                ?.payload as Record<string, unknown>) ?? scored;
            break;
          }
        }
      }
      expect(s.score.matchPoints).toEqual([5, 1]);
      expect(scored?.single).toBe(true);
      expect(scored?.bonusPoints).toEqual([0, 0]);
      expect(scored?.bidResult).toBe("success");
    });
  });

  // Criterion 3: losing any trick → -3 match points.
  describe("when the declarer loses a trick", () => {
    it("takes 3 match points from the declarer team and ends the hand", () => {
      const engine = new TwentyNineEngine();
      // p0 leads the 7 of hearts; p1 beats it with the J.
      const hands: [Card[], Card[], Card[]] = [
        [...cards("hearts", ["7", "9", "A", "10"]), ...cards("spades", ["J", "9", "A", "10"])],
        [...cards("hearts", ["J", "K", "Q", "8"]), ...cards("spades", ["K", "Q", "8", "7"])],
        cards("diamonds", ["J", "9", "A", "10", "K", "Q", "8", "7"]),
      ];
      const s = playOut(engine, controlledSingle(engine, hands));

      expect(s.completedTricks).toHaveLength(1);
      expect(s.completedTricks[0].winnerId).toBe("p1");
      expect(s.phase).toBe(GAME_PHASES.SCORING);
      expect(s.score.matchPoints).toEqual([-3, 0]);
      expect(s.score.lastBidResult).toBe("fail");
    });

    it("scores -3 when the last trick is the one lost", () => {
      const engine = new TwentyNineEngine();
      // p0 wins seven hearts/spades tricks, then must lead the 7 of clubs into p3's J.
      const hands: [Card[], Card[], Card[]] = [
        [...cards("hearts", ["J", "9", "A", "10"]), ...cards("spades", ["J", "9", "A"]), { suit: "clubs", rank: "7" }],
        [...cards("hearts", ["K", "Q", "8", "7"]), ...cards("spades", ["K", "Q", "8", "7"])],
        [...cards("diamonds", ["J", "9", "A", "10", "K", "Q", "8"]), { suit: "clubs", rank: "J" }],
      ];
      // p0 plays index 0 each time, so the club comes last.
      const s = playOut(engine, controlledSingle(engine, hands));

      expect(s.completedTricks).toHaveLength(8);
      expect(s.completedTricks[7].winnerId).toBe("p3");
      expect(s.score.matchPoints).toEqual([-3, 0]);
    });
  });
});
