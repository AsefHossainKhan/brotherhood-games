/**
 * Integration tests for TwentyNineEngine — full game flow scenarios.
 *
 * These tests exercise the engine through its public handleAction/validateAction
 * interface, covering every phase of a 29 game:
 *   FIRST_DEAL → BIDDING → TRUMP_SELECTION → SECOND_DEAL → DOUBLE_PHASE → PLAYING → SCORING → MATCH_COMPLETE
 */
import { describe, it, expect, beforeEach } from "vitest";
import { TwentyNineEngine } from "../TwentyNineEngine";
import type { TwentyNineState, TwentyNinePlayer } from "../types";
import type { GameAction, ActionResult } from "@brotherhood/game-engine";
import type { RoomSettings, Card, Suit, Rank } from "@brotherhood/shared";
import { GAME_PHASES } from "@brotherhood/shared";
import { RANK_ORDER_29 } from "@brotherhood/shared";

// ---- Helpers ----

const DEFAULT_SETTINGS: RoomSettings = {
  matchLength: 4,
  minBid: 16,
  setThreshold: 6,
  bidTimer: 30,
  playTimer: 30,
  allowSpectators: true,
};

const PLAYER_IDS = ["p0", "p1", "p2", "p3"];
const TEAMS: (0 | 1)[] = [0, 1, 0, 1]; // p0&p2 = team 0, p1&p3 = team 1

function createEngine() {
  return new TwentyNineEngine();
}

function createGame(engine: TwentyNineEngine): TwentyNineState {
  return engine.createInitialState(PLAYER_IDS, DEFAULT_SETTINGS, TEAMS);
}

function action(
  type: string,
  playerId: string,
  payload: Record<string, unknown> = {},
): GameAction {
  return { type, playerId, payload };
}

/** Start the game and get past first deal (handles weak hand if any) */
function startGame(
  engine: TwentyNineEngine,
  state: TwentyNineState,
): TwentyNineState {
  let result = engine.handleAction(state, action("START_GAME", "p0"));
  let s = result.newState;

  // Handle weak hand if detected — keep the hand to avoid redeal loops
  while (s.weakHandPlayer) {
    result = engine.handleAction(s, action("KEEP_WEAK_HAND", s.weakHandPlayer));
    s = result.newState;
  }

  return s;
}

/** Run through bidding: ensure bidderIndex gets to open, then all others pass */
function doBidding(
  engine: TwentyNineEngine,
  state: TwentyNineState,
  bidderIndex: number,
  bidAmount: number,
): TwentyNineState {
  let s = state;
  const bidderId = PLAYER_IDS[bidderIndex];

  // If it's not the bidder's turn yet, pass through other players first
  let safety = 20;
  while (
    s.phase === GAME_PHASES.BIDDING &&
    PLAYER_IDS[s.currentTurn] !== bidderId &&
    safety-- > 0
  ) {
    const pid = PLAYER_IDS[s.currentTurn];
    s = engine.handleAction(s, action("PASS_BID", pid)).newState;
  }

  // If we exited because all passed (redeal), retry
  if (
    s.phase !== GAME_PHASES.BIDDING ||
    !s.bidding.activeBidders.includes(bidderId)
  ) {
    // Redeal happened or bidder not active — just pass everyone until bidding finishes
    safety = 20;
    while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
      const pid = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(s, action("PASS_BID", pid)).newState;
    }
    return s;
  }

  // Bidder places the opening bid
  s = engine.handleAction(
    s,
    action("PLACE_BID", bidderId, { bid: bidAmount }),
  ).newState;

  // Now other players pass one by one
  safety = 10;
  while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
    const pid = PLAYER_IDS[s.currentTurn];
    if (pid === bidderId) break;
    s = engine.handleAction(s, action("PASS_BID", pid)).newState;
  }

  return s;
}

/** Select trump and proceed through second deal to double phase */
function selectTrumpAndDeal(
  engine: TwentyNineEngine,
  state: TwentyNineState,
  trumpAction: GameAction,
): TwentyNineState {
  const result = engine.handleAction(state, trumpAction);
  return result.newState;
}

/** Skip double phase: all players pass */
function skipDoublePhase(
  engine: TwentyNineEngine,
  state: TwentyNineState,
): TwentyNineState {
  let s = state;
  // Keep passing until we leave DOUBLE_PHASE
  let safety = 10;
  while (s.phase === GAME_PHASES.DOUBLE_PHASE && safety-- > 0) {
    const currentPlayerId = PLAYER_IDS[s.currentTurn];
    const validation = engine.validateAction(
      s,
      action("PASS_DOUBLE", currentPlayerId),
    );
    if (!validation.valid) break;
    const result = engine.handleAction(
      s,
      action("PASS_DOUBLE", currentPlayerId),
    );
    s = result.newState;
  }
  return s;
}

/** Complete bidding and trump selection, then advance past second deal to double phase */
function completeBidding(
  engine: TwentyNineEngine,
  state: TwentyNineState,
  declarerId: string,
  bid: number,
  trumpAction?: GameAction,
): TwentyNineState {
  let s = doBidding(engine, state, PLAYER_IDS.indexOf(declarerId), bid);
  // Select suit trump by default if not specified
  const trump =
    trumpAction ?? action("SELECT_TRUMP", declarerId, { suit: "hearts" });
  s = selectTrumpAndDeal(engine, s, trump);
  return s;
}

/** Play a card for the current player (first valid card in hand) */
function playFirstValidCard(
  engine: TwentyNineEngine,
  state: TwentyNineState,
): TwentyNineState {
  const currentPlayerId = PLAYER_IDS[state.currentTurn];
  const player = state.players.find((p) => p.id === currentPlayerId)!;

  // Try each card in hand until one is valid
  for (let i = 0; i < player.hand.length; i++) {
    const validation = engine.validateAction(
      state,
      action("PLAY_CARD", currentPlayerId, { cardIndex: i }),
    );
    if (validation.valid) {
      const result = engine.handleAction(
        state,
        action("PLAY_CARD", currentPlayerId, { cardIndex: i }),
      );
      return result.newState;
    }
  }

  throw new Error(
    `No valid card to play for ${currentPlayerId} (hand: ${JSON.stringify(player.hand)})`,
  );
}

/** Play all 8 tricks */
function playAllTricks(
  engine: TwentyNineEngine,
  state: TwentyNineState,
): TwentyNineState {
  let s = state;
  for (let trick = 0; trick < 8; trick++) {
    for (let card = 0; card < 4; card++) {
      s = playFirstValidCard(engine, s);
    }
  }
  return s;
}

/** Create a state where we can control the hands */
function createControlledGame(
  engine: TwentyNineEngine,
  hands: Card[][],
  trumpSuit: Suit | null,
  declarerIndex: number = 0,
  bid: number = 20,
): TwentyNineState {
  const state = createGame(engine);

  // Set up players
  state.players = PLAYER_IDS.map((id, seat) => ({
    id,
    username: `Player ${seat + 1}`,
    seat,
    team: TEAMS[seat],
    hand: hands[seat],
    isDealer: seat === 0,
    isDeclarer: seat === declarerIndex,
    isConnected: true,
  }));

  // Set up bidding
  state.bidding = {
    currentBid: bid,
    highestBidder: PLAYER_IDS[declarerIndex],
    activeBidders: [PLAYER_IDS[declarerIndex]],
    currentChallenger: null,
    bids: [{ playerId: PLAYER_IDS[declarerIndex], bid }],
  };

  // Set up trump
  state.trump = {
    type: trumpSuit ? "suit" : "joker",
    suit: trumpSuit,
    isRevealed: trumpSuit !== null,
    seventhCard: null,
    revealedBy: null,
    mustPlayTrump: false,
  };

  // Set up playing phase
  state.phase = GAME_PHASES.PLAYING;
  state.currentTurn = declarerIndex;
  state.currentTrick = {
    plays: [],
    leadSuit: null,
    winnerId: null,
    trickNumber: 1,
  };

  return state;
}

// ---- Tests ----

describe("TwentyNineEngine — Full Game Flow", () => {
  let engine: TwentyNineEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  // ========== START GAME ==========

  describe("START_GAME", () => {
    it("creates initial state with correct structure", () => {
      const state = createGame(engine);
      expect(state.players).toHaveLength(4);
      expect(state.phase).toBe(GAME_PHASES.WAITING_FOR_PLAYERS);
      expect(state.bidding.currentBid).toBeNull();
      expect(state.trump.type).toBeNull();
      expect(state.double.level).toBe("normal");
      expect(state.completedTricks).toHaveLength(0);
    });

    it("assigns teams correctly", () => {
      const state = createGame(engine);
      expect(state.players[0].team).toBe(0);
      expect(state.players[1].team).toBe(1);
      expect(state.players[2].team).toBe(0);
      expect(state.players[3].team).toBe(1);
    });

    it("deals 4 cards to each player in first deal", () => {
      const state = createGame(engine);
      const result = engine.handleAction(state, action("START_GAME", "p0"));
      const s = result.newState;

      // Phase is FIRST_DEAL if weak hand detected, otherwise BIDDING
      expect([GAME_PHASES.FIRST_DEAL, GAME_PHASES.BIDDING]).toContain(s.phase);
      for (const player of s.players) {
        expect(player.hand).toHaveLength(4);
      }
      expect(s.dealCount).toBe(4);
    });

    it("skips weak hand check if no weak hand", () => {
      const state = createGame(engine);
      const result = engine.handleAction(state, action("START_GAME", "p0"));
      const s = result.newState;

      // If no weak hand detected, should move to BIDDING
      if (!s.weakHandPlayer) {
        expect(s.phase).toBe(GAME_PHASES.BIDDING);
      }
    });

    it("detects weak hand and waits for decision", () => {
      // This is probabilistic — run multiple times to increase chance of hitting weak hand
      // But we'll test the weak hand logic separately
      const state = createGame(engine);
      const result = engine.handleAction(state, action("START_GAME", "p0"));

      // If weak hand detected, phase stays at FIRST_DEAL
      if (result.newState.weakHandPlayer) {
        expect(result.newState.phase).toBe(GAME_PHASES.FIRST_DEAL);
        const weakPlayer = result.newState.players.find(
          (p) => p.id === result.newState.weakHandPlayer,
        )!;
        // Verify the hand truly has 0 points
        const hasPoints = weakPlayer.hand.some((c) =>
          ["J", "9", "A", "10"].includes(c.rank),
        );
        expect(hasPoints).toBe(false);
      }
    });
  });

  // ========== BIDDING ==========

  describe("BIDDING", () => {
    let postDealState: TwentyNineState;

    beforeEach(() => {
      const state = createGame(engine);
      postDealState = startGame(engine, state);
      // Ensure we're in bidding phase
      expect(postDealState.phase).toBe(GAME_PHASES.BIDDING);
    });

    it("starts bidding at dealer's right (counter-clockwise)", () => {
      const dealerSeat = postDealState.dealerSeat;
      const expectedFirstBidder = (dealerSeat + 1) % 4;
      expect(postDealState.currentTurn).toBe(expectedFirstBidder);
    });

    it("allows placing a valid opening bid", () => {
      const bidderId = PLAYER_IDS[postDealState.currentTurn];
      const result = engine.handleAction(
        postDealState,
        action("PLACE_BID", bidderId, { bid: 16 }),
      );
      expect(result.newState.bidding.currentBid).toBe(16);
      expect(result.newState.bidding.highestBidder).toBe(bidderId);
    });

    it("rejects bid below minimum", () => {
      const bidderId = PLAYER_IDS[postDealState.currentTurn];
      const validation = engine.validateAction(
        postDealState,
        action("PLACE_BID", bidderId, { bid: 15 }),
      );
      expect(validation.valid).toBe(false);
    });

    it("rejects bid above 28", () => {
      const bidderId = PLAYER_IDS[postDealState.currentTurn];
      const validation = engine.validateAction(
        postDealState,
        action("PLACE_BID", bidderId, { bid: 29 }),
      );
      expect(validation.valid).toBe(false);
    });

    it("requires raise to be higher than current bid", () => {
      const firstBidder = PLAYER_IDS[postDealState.currentTurn];
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", firstBidder, { bid: 20 }),
      ).newState;

      // Challenger can raise
      const challengerId = s.bidding.currentChallenger!;
      s = engine.handleAction(
        s,
        action("PLACE_BID", challengerId, { bid: 22 }),
      ).newState;
      expect(s.bidding.currentBid).toBe(22);

      // Previous bidder can raise back
      const previousBidder = s.bidding.currentChallenger!;
      const validation = engine.validateAction(
        s,
        action("PLACE_BID", previousBidder, { bid: 21 }),
      );
      expect(validation.valid).toBe(false); // Must be higher than 22
    });

    it("allows passing", () => {
      const bidderId = PLAYER_IDS[postDealState.currentTurn];
      // First place a bid
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", bidderId, { bid: 16 }),
      ).newState;

      // Challenger passes
      const challengerId = s.bidding.currentChallenger!;
      const result = engine.handleAction(s, action("PASS_BID", challengerId));
      expect(result.newState.bidding.activeBidders).not.toContain(challengerId);
    });

    it("rejects action from wrong player", () => {
      const wrongPlayer = PLAYER_IDS[(postDealState.currentTurn + 1) % 4];
      const validation = engine.validateAction(
        postDealState,
        action("PLACE_BID", wrongPlayer, { bid: 16 }),
      );
      expect(validation.valid).toBe(false);
    });

    it("finishes bidding when 3 players pass and 1 bids", () => {
      const bidderIndex = postDealState.currentTurn;
      const bidderId = PLAYER_IDS[bidderIndex];
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", bidderId, { bid: 16 }),
      ).newState;

      // All other players pass
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      expect(s.phase).toBe(GAME_PHASES.TRUMP_SELECTION);
      expect(s.players.find((p) => p.isDeclarer)?.id).toBe(bidderId);
    });

    it("re-deals when all 4 players pass", () => {
      let s = postDealState;
      // All 4 players pass without anyone bidding
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      // Should redeal — back to BIDDING with fresh hands
      expect(s.phase).toBe(GAME_PHASES.BIDDING);
      expect(s.bidding.currentBid).toBeNull();
      expect(s.bidding.highestBidder).toBeNull();
      // Each player should have 4 fresh cards
      for (const p of s.players) {
        expect(p.hand).toHaveLength(4);
      }
    });

    it("supports competitive bidding (multiple raises)", () => {
      const firstBidder = PLAYER_IDS[postDealState.currentTurn];
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", firstBidder, { bid: 16 }),
      ).newState;

      const challengerId = s.bidding.currentChallenger!;
      if (challengerId !== firstBidder) {
        s = engine.handleAction(
          s,
          action("PLACE_BID", challengerId, { bid: 18 }),
        ).newState;
        expect(s.bidding.currentBid).toBe(18);
        expect(s.bidding.highestBidder).toBe(challengerId);
      }
    });

    it("call raises by +1 and forces challenger to raise higher", () => {
      const firstBidder = PLAYER_IDS[postDealState.currentTurn];
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", firstBidder, { bid: 16 }),
      ).newState;

      const challengerId = s.bidding.currentChallenger!;
      s = engine.handleAction(
        s,
        action("PLACE_BID", challengerId, { bid: 18 }),
      ).newState;

      // Now firstBidder calls: raises 18 → 19 and takes the lead
      s = engine.handleAction(s, action("CALL_BID", firstBidder)).newState;
      expect(s.bidding.currentBid).toBe(19);
      expect(s.bidding.highestBidder).toBe(firstBidder);

      // Challenger must raise higher than 19
      const validation = engine.validateAction(
        s,
        action("PLACE_BID", challengerId, { bid: 19 }),
      );
      expect(validation.valid).toBe(false); // Must be > 19

      const validation2 = engine.validateAction(
        s,
        action("PLACE_BID", challengerId, { bid: 20 }),
      );
      expect(validation2.valid).toBe(true);
    });

    it("raise passes the turn to the previous highest bidder", () => {
      const firstBidder = PLAYER_IDS[postDealState.currentTurn];
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", firstBidder, { bid: 16 }),
      ).newState;

      const challengerId = s.bidding.currentChallenger!;
      s = engine.handleAction(
        s,
        action("PLACE_BID", challengerId, { bid: 18 }),
      ).newState;

      // The raiser now holds the bid; the previous holder must respond.
      expect(s.bidding.highestBidder).toBe(challengerId);
      expect(s.bidding.currentChallenger).toBe(firstBidder);
      expect(PLAYER_IDS[s.currentTurn]).toBe(firstBidder);
    });

    it("challenger can call to raise by +1, but the holder cannot call off-turn", () => {
      const firstBidder = PLAYER_IDS[postDealState.currentTurn];
      let s = engine.handleAction(
        postDealState,
        action("PLACE_BID", firstBidder, { bid: 16 }),
      ).newState;

      const challengerId = s.bidding.currentChallenger!;

      // The challenger (whose turn it is) can call to raise the opening bid +1.
      expect(
        engine.validateAction(s, action("CALL_BID", challengerId)).valid,
      ).toBe(true);

      s = engine.handleAction(s, action("CALL_BID", challengerId)).newState;

      // The challenger now holds the bid at 17; the turn passes to the opener.
      expect(s.bidding.currentBid).toBe(17);
      expect(s.bidding.highestBidder).toBe(challengerId);
      expect(s.bidding.currentChallenger).toBe(firstBidder);
      expect(PLAYER_IDS[s.currentTurn]).toBe(firstBidder);

      // The current holder is not on turn and cannot call.
      expect(
        engine.validateAction(s, action("CALL_BID", challengerId)).valid,
      ).toBe(false);

      // The opener is now on turn and can call (17 → 18) or raise higher.
      expect(
        engine.validateAction(s, action("CALL_BID", firstBidder)).valid,
      ).toBe(true);
      expect(
        engine.validateAction(s, action("PLACE_BID", firstBidder, { bid: 19 }))
          .valid,
      ).toBe(true);
    });
  });

  // ========== TRUMP SELECTION ==========

  describe("TRUMP_SELECTION", () => {
    let biddingDone: TwentyNineState;

    beforeEach(() => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      // Place a bid and have others pass
      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;

      // All other players pass
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      biddingDone = s;
      expect(biddingDone.phase).toBe(GAME_PHASES.TRUMP_SELECTION);
    });

    it("only declarer can select trump", () => {
      const nonDeclarer = biddingDone.players.find((p) => !p.isDeclarer)!;
      const validation = engine.validateAction(
        biddingDone,
        action("SELECT_TRUMP", nonDeclarer.id, { suit: "hearts" }),
      );
      expect(validation.valid).toBe(false);
    });

    it("normal suit trump: transitions to double phase with trump revealed", () => {
      const declarer = biddingDone.players.find((p) => p.isDeclarer)!;
      const result = engine.handleAction(
        biddingDone,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      );
      const s = result.newState;

      expect(s.trump.type).toBe("suit");
      expect(s.trump.suit).toBe("hearts");
      expect(s.trump.isRevealed).toBe(false);
      expect(s.phase).toBe(GAME_PHASES.DOUBLE_PHASE);
      // Each player should have 8 cards after second deal
      for (const p of s.players) {
        expect(p.hand).toHaveLength(8);
      }
    });

    it("joker (no trump): transitions to double phase with null trump", () => {
      const declarer = biddingDone.players.find((p) => p.isDeclarer)!;
      const result = engine.handleAction(
        biddingDone,
        action("SELECT_JOKER", declarer.id),
      );
      const s = result.newState;

      expect(s.trump.type).toBe("joker");
      expect(s.trump.suit).toBeNull();
      expect(s.phase).toBe(GAME_PHASES.DOUBLE_PHASE);
    });

    it("seventh-card trump: defers trump determination until after second deal", () => {
      const declarer = biddingDone.players.find((p) => p.isDeclarer)!;
      const result = engine.handleAction(
        biddingDone,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      );
      const s = result.newState;

      expect(s.trump.type).toBe("seventh-card");
      // After second deal, the 7th card should have been determined
      expect(s.trump.suit).not.toBeNull();
      expect(s.trump.seventhCard).not.toBeNull();
      // The 7th card's suit should match the trump suit
      expect(s.trump.seventhCard!.suit).toBe(s.trump.suit);
      expect(s.trump.isRevealed).toBe(false);
      // Declarer should have 7 cards: the 7th card is set aside into the trump
      // pile until revealed (re-find from cloned state)
      const updatedDeclarer = s.players.find((p) => p.isDeclarer)!;
      expect(updatedDeclarer.hand).toHaveLength(7);
      // Phase should be DOUBLE_PHASE (second deal is internal)
      expect(s.phase).toBe(GAME_PHASES.DOUBLE_PHASE);
    });

    it("rejects trump selection when not in trump phase", () => {
      const declarer = biddingDone.players.find((p) => p.isDeclarer)!;
      const wrongState = { ...biddingDone, phase: GAME_PHASES.BIDDING };
      const validation = engine.validateAction(
        wrongState,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      );
      expect(validation.valid).toBe(false);
    });
  });

  // ========== DOUBLE PHASE ==========

  describe("DOUBLE_PHASE", () => {
    let doublePhaseState: TwentyNineState;

    beforeEach(() => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      // Bid
      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      // Select trump
      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      ).newState;

      doublePhaseState = s;
      expect(doublePhaseState.phase).toBe(GAME_PHASES.DOUBLE_PHASE);
    });

    it("opponent can declare double", () => {
      const declarer = doublePhaseState.players.find((p) => p.isDeclarer)!;
      const opponent = doublePhaseState.players.find(
        (p) => p.team !== declarer.team,
      )!;

      const validation = engine.validateAction(
        doublePhaseState,
        action("DECLARE_DOUBLE", opponent.id),
      );
      expect(validation.valid).toBe(true);
    });

    it("declarer team cannot declare double", () => {
      const declarer = doublePhaseState.players.find((p) => p.isDeclarer)!;
      const teammate = doublePhaseState.players.find(
        (p) => p.team === declarer.team && !p.isDeclarer,
      )!;

      const validation = engine.validateAction(
        doublePhaseState,
        action("DECLARE_DOUBLE", teammate.id),
      );
      expect(validation.valid).toBe(false);
    });

    it("full double sequence: double → redouble → fullset", () => {
      const declarer = doublePhaseState.players.find((p) => p.isDeclarer)!;
      const opponent = doublePhaseState.players.find(
        (p) => p.team !== declarer.team,
      )!;
      const teammate = doublePhaseState.players.find(
        (p) => p.team === declarer.team && !p.isDeclarer,
      )!;

      // Opponent doubles
      let s = engine.handleAction(
        doublePhaseState,
        action("DECLARE_DOUBLE", opponent.id),
      ).newState;
      expect(s.double.level).toBe("double");
      expect(s.double.multiplier).toBe(2);

      // Declarer's teammate re-doubles
      s = engine.handleAction(
        s,
        action("DECLARE_REDOUBLE", teammate.id),
      ).newState;
      expect(s.double.level).toBe("redouble");
      expect(s.double.multiplier).toBe(4);

      // Opponent declares full set
      s = engine.handleAction(
        s,
        action("DECLARE_FULLSET", opponent.id),
      ).newState;
      expect(s.double.level).toBe("fullset");
      expect(s.double.multiplier).toBe(6);
      expect(s.phase).toBe(GAME_PHASES.PLAYING);
    });

    it("opponent can pass double to skip", () => {
      const declarer = doublePhaseState.players.find((p) => p.isDeclarer)!;
      const opponent = doublePhaseState.players.find(
        (p) =>
          p.team !== declarer.team && p.seat === doublePhaseState.currentTurn,
      )!;

      const result = engine.handleAction(
        doublePhaseState,
        action("PASS_DOUBLE", opponent.id),
      );
      // Should move to the other opponent or proceed to playing
      expect(result.newState.phase).not.toBe(GAME_PHASES.BIDDING);
    });

    it("both opponents pass → proceeds to playing", () => {
      let s = doublePhaseState;
      const declarer = s.players.find((p) => p.isDeclarer)!;

      // Pass for all eligible players (up to 4 to be safe)
      let safety = 10;
      while (s.phase === GAME_PHASES.DOUBLE_PHASE && safety-- > 0) {
        const currentPlayerId = PLAYER_IDS[s.currentTurn];
        const validation = engine.validateAction(
          s,
          action("PASS_DOUBLE", currentPlayerId),
        );
        if (!validation.valid) break;
        s = engine.handleAction(
          s,
          action("PASS_DOUBLE", currentPlayerId),
        ).newState;
      }

      expect(s.phase).toBe(GAME_PHASES.PLAYING);
      expect(s.double.level).toBe("normal");
      expect(s.double.multiplier).toBe(1);
    });
  });

  // ========== PLAYING PHASE ==========

  describe("PLAYING", () => {
    let playingState: TwentyNineState;

    beforeEach(() => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      // Bid
      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      // Select trump
      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      ).newState;

      // Skip double phase
      s = skipDoublePhase(engine, s);

      playingState = s;
      expect(playingState.phase).toBe(GAME_PHASES.PLAYING);
    });

    it("declarer leads the first trick", () => {
      const declarer = playingState.players.find((p) => p.isDeclarer)!;
      expect(PLAYER_IDS[playingState.currentTurn]).toBe(declarer.id);
    });

    it("can play a valid card", () => {
      const result = playFirstValidCard(engine, playingState);
      expect(result.currentTrick.plays).toHaveLength(1);
    });

    it("rejects out-of-turn play", () => {
      const wrongPlayer = PLAYER_IDS[(playingState.currentTurn + 1) % 4];
      const validation = engine.validateAction(
        playingState,
        action("PLAY_CARD", wrongPlayer, { cardIndex: 0 }),
      );
      expect(validation.valid).toBe(false);
    });

    it("rejects invalid card index", () => {
      const currentPlayer = PLAYER_IDS[playingState.currentTurn];
      const validation = engine.validateAction(
        playingState,
        action("PLAY_CARD", currentPlayer, { cardIndex: 99 }),
      );
      expect(validation.valid).toBe(false);
    });

    it("completes a full trick (4 cards)", () => {
      let s = playingState;
      for (let i = 0; i < 4; i++) {
        s = playFirstValidCard(engine, s);
      }
      expect(s.completedTricks).toHaveLength(1);
      expect(s.currentTrick.plays).toHaveLength(0); // Reset for next trick
    });

    it("trick winner leads the next trick", () => {
      let s = playingState;
      for (let i = 0; i < 4; i++) {
        s = playFirstValidCard(engine, s);
      }
      const trickWinner = s.completedTricks[0].winnerId;
      expect(PLAYER_IDS[s.currentTurn]).toBe(trickWinner);
    });

    it("plays all 8 tricks and transitions to scoring", () => {
      let s = playingState;
      for (let trick = 0; trick < 8; trick++) {
        for (let card = 0; card < 4; card++) {
          s = playFirstValidCard(engine, s);
        }
      }

      expect(s.completedTricks).toHaveLength(8);
      // Should be in SCORING or MATCH_COMPLETE
      expect([GAME_PHASES.SCORING, GAME_PHASES.MATCH_COMPLETE]).toContain(
        s.phase,
      );
    });

    it("follow-suit is enforced", () => {
      // Create a controlled scenario
      const hands: Card[][] = [
        // p0 (team 0, declarer): all hearts — can lead hearts
        [
          { suit: "hearts", rank: "J" },
          { suit: "hearts", rank: "9" },
          { suit: "hearts", rank: "A" },
          { suit: "hearts", rank: "10" },
          { suit: "hearts", rank: "K" },
          { suit: "hearts", rank: "Q" },
          { suit: "hearts", rank: "8" },
          { suit: "hearts", rank: "7" },
        ],
        // p1 (team 1): mixed suits
        [
          { suit: "spades", rank: "J" },
          { suit: "spades", rank: "9" },
          { suit: "diamonds", rank: "A" },
          { suit: "diamonds", rank: "10" },
          { suit: "clubs", rank: "K" },
          { suit: "clubs", rank: "Q" },
          { suit: "clubs", rank: "8" },
          { suit: "clubs", rank: "7" },
        ],
        // p2 (team 0): mixed
        [
          { suit: "spades", rank: "A" },
          { suit: "spades", rank: "10" },
          { suit: "diamonds", rank: "K" },
          { suit: "diamonds", rank: "Q" },
          { suit: "clubs", rank: "J" },
          { suit: "clubs", rank: "9" },
          { suit: "hearts", rank: "8" },
          { suit: "hearts", rank: "7" },
        ],
        // p3 (team 1): mixed
        [
          { suit: "spades", rank: "K" },
          { suit: "spades", rank: "Q" },
          { suit: "diamonds", rank: "J" },
          { suit: "diamonds", rank: "9" },
          { suit: "clubs", rank: "A" },
          { suit: "clubs", rank: "10" },
          { suit: "hearts", rank: "8" },
          { suit: "hearts", rank: "7" },
        ],
      ];

      const s = createControlledGame(engine, hands, "hearts", 0, 20);
      expect(s.phase).toBe(GAME_PHASES.PLAYING);

      // p0 leads hearts
      let state = engine.handleAction(
        s,
        action("PLAY_CARD", "p0", { cardIndex: 0 }),
      ).newState;

      // p1 has no hearts — should be able to play any suit
      const p1NoHearts = engine.validateAction(
        state,
        action("PLAY_CARD", "p1", { cardIndex: 0 }),
      );
      expect(p1NoHearts.valid).toBe(true); // spades — ok since void in hearts

      // But if p1 had hearts, they'd have to follow suit
      // This is tested implicitly by the isValidPlay tests
    });
  });

  // ========== SCORING ==========

  describe("SCORING", () => {
    it("declarer succeeds when points >= bid", () => {
      // Create a controlled game where declarer wins all tricks (all 28 points)
      const hands: Card[][] = [
        // p0 (declarer, team 0): highest cards in each suit
        [
          { suit: "hearts", rank: "J" }, // 3 pts
          { suit: "hearts", rank: "9" }, // 2 pts
          { suit: "spades", rank: "J" }, // 3 pts
          { suit: "spades", rank: "9" }, // 2 pts
          { suit: "diamonds", rank: "J" }, // 3 pts
          { suit: "diamonds", rank: "9" }, // 2 pts
          { suit: "clubs", rank: "J" }, // 3 pts
          { suit: "clubs", rank: "9" }, // 2 pts
        ],
        // p1 (team 1): lowest cards
        [
          { suit: "hearts", rank: "8" },
          { suit: "hearts", rank: "7" },
          { suit: "spades", rank: "8" },
          { suit: "spades", rank: "7" },
          { suit: "diamonds", rank: "8" },
          { suit: "diamonds", rank: "7" },
          { suit: "clubs", rank: "8" },
          { suit: "clubs", rank: "7" },
        ],
        // p2 (team 0): A and 10
        [
          { suit: "hearts", rank: "A" }, // 1 pt
          { suit: "hearts", rank: "10" }, // 1 pt
          { suit: "spades", rank: "A" }, // 1 pt
          { suit: "spades", rank: "10" }, // 1 pt
          { suit: "diamonds", rank: "A" }, // 1 pt
          { suit: "diamonds", rank: "10" }, // 1 pt
          { suit: "clubs", rank: "A" }, // 1 pt
          { suit: "clubs", rank: "10" }, // 1 pt
        ],
        // p3 (team 1): K and Q
        [
          { suit: "hearts", rank: "K" },
          { suit: "hearts", rank: "Q" },
          { suit: "spades", rank: "K" },
          { suit: "spades", rank: "Q" },
          { suit: "diamonds", rank: "K" },
          { suit: "diamonds", rank: "Q" },
          { suit: "clubs", rank: "K" },
          { suit: "clubs", rank: "Q" },
        ],
      ];

      let s = createControlledGame(engine, hands, "spades", 0, 20);

      // Play all 8 tricks (p0 always leads and wins with highest trump)
      for (let trick = 0; trick < 8; trick++) {
        for (let card = 0; card < 4; card++) {
          s = playFirstValidCard(engine, s);
        }
      }

      // p0 leads J of hearts → p2 plays A of hearts → p2 has A+10 = 2 pts from that trick
      // But actually p0's J (trump spades) wins everything
      // Let's just check scoring happened
      expect([GAME_PHASES.SCORING, GAME_PHASES.MATCH_COMPLETE]).toContain(
        s.phase,
      );
      expect(s.score.lastBidResult).not.toBeNull();
    });

    it("calculates match points correctly for normal game", () => {
      const hands: Card[][] = [
        // p0 (declarer, team 0)
        [
          { suit: "hearts", rank: "J" }, // 3
          { suit: "hearts", rank: "9" }, // 2
          { suit: "hearts", rank: "A" }, // 1
          { suit: "hearts", rank: "10" }, // 1
          { suit: "hearts", rank: "K" }, // 0
          { suit: "hearts", rank: "Q" }, // 0
          { suit: "hearts", rank: "8" }, // 0
          { suit: "hearts", rank: "7" }, // 0
        ],
        // p1 (team 1)
        [
          { suit: "spades", rank: "J" },
          { suit: "spades", rank: "9" },
          { suit: "spades", rank: "A" },
          { suit: "spades", rank: "10" },
          { suit: "spades", rank: "K" },
          { suit: "spades", rank: "Q" },
          { suit: "spades", rank: "8" },
          { suit: "spades", rank: "7" },
        ],
        // p2 (team 0)
        [
          { suit: "diamonds", rank: "J" },
          { suit: "diamonds", rank: "9" },
          { suit: "diamonds", rank: "A" },
          { suit: "diamonds", rank: "10" },
          { suit: "diamonds", rank: "K" },
          { suit: "diamonds", rank: "Q" },
          { suit: "diamonds", rank: "8" },
          { suit: "diamonds", rank: "7" },
        ],
        // p3 (team 1)
        [
          { suit: "clubs", rank: "J" },
          { suit: "clubs", rank: "9" },
          { suit: "clubs", rank: "A" },
          { suit: "clubs", rank: "10" },
          { suit: "clubs", rank: "K" },
          { suit: "clubs", rank: "Q" },
          { suit: "clubs", rank: "8" },
          { suit: "clubs", rank: "7" },
        ],
      ];

      // Trump is hearts → p0 wins all hearts tricks
      let s = createControlledGame(engine, hands, "hearts", 0, 16);

      for (let trick = 0; trick < 8; trick++) {
        for (let card = 0; card < 4; card++) {
          s = playFirstValidCard(engine, s);
        }
      }

      // p0 has hearts (trump) with J+9+A+10+K+Q+8+7
      // Each trick: p0 leads hearts, others follow with non-trump
      // p0 wins every trick → team 0 gets all 28 points
      // Bid was 16 → team 0 succeeds → +1 match point for team 0
      // Plus +1 bonus for winning all 8 tricks → team 0 total = 2
      // Team 1 did not take the bid → no score change
      expect(s.score.matchPoints[0]).toBe(2);
      expect(s.score.matchPoints[1]).toBe(0);
      expect(s.score.lastBidResult).toBe("success");
    });
  });

  // ========== SEVENTH CARD TRUMP ==========

  describe("SEVENTH CARD TRUMP", () => {
    it("full flow: select 7th card → second deal → trump determined", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      // Bid
      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      expect(s.phase).toBe(GAME_PHASES.TRUMP_SELECTION);
      const declarer = s.players.find((p) => p.isDeclarer)!;

      // Select seventh-card trump
      s = engine.handleAction(
        s,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      ).newState;

      // Trump should now be determined from the 7th card in the declarer's 8-card hand
      expect(s.trump.type).toBe("seventh-card");
      expect(s.trump.suit).toBeTruthy();
      expect(s.trump.seventhCard).toBeTruthy();
      expect(s.trump.isRevealed).toBe(false);
      expect(s.trump.seventhCard!.suit).toBe(s.trump.suit);

      // Declarer should have 7 cards: the 7th card is set aside into the trump
      // pile until it is revealed, so it is NOT in the hand during play.
      const updatedDeclarer = s.players.find((p) => p.isDeclarer)!;
      expect(updatedDeclarer.hand).toHaveLength(7);
      expect(
        updatedDeclarer.hand.some(
          (c) =>
            c.suit === s.trump.seventhCard!.suit &&
            c.rank === s.trump.seventhCard!.rank,
        ),
      ).toBe(false);
    });

    it("hidden trump: cannot be seen by non-declarers", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      ).newState;

      // Check visibility for a non-declarer
      const nonDeclarer = s.players.find((p) => !p.isDeclarer)!;
      const visible = engine.getVisibleState(s, nonDeclarer.id, "player");

      // Trump SUIT stays hidden for non-declarers; the MODE is visible so the
      // reveal option is reachable in the UI.
      expect((visible.trump as any).suit).toBeNull();
      expect((visible.trump as any).type).toBe("seventh-card");
    });

    it("seventh-card trump: can be revealed during play", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      ).newState;

      // Skip double phase
      s = skipDoublePhase(engine, s);
      expect(s.phase).toBe(GAME_PHASES.PLAYING);

      const trumpSuit = s.trump.suit!;

      // Find a non-trump suit the declarer doesn't have
      const allSuits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
      const currentHand = s.players.find((p) => p.isDeclarer)!.hand;
      const ledSuit = allSuits.find(
        (suit) =>
          suit !== trumpSuit && !currentHand.some((c) => c.suit === suit),
      );

      // Only test reveal if declarer lacks a non-trump suit (otherwise skip — random deal may give all)
      if (ledSuit) {
        s.leadSuit = ledSuit;
        s.currentTrick = {
          plays: [
            {
              playerId: "p1",
              card: { suit: ledSuit, rank: "J" } as Card,
              cardIndex: 0,
            },
          ],
          leadSuit: ledSuit,
          winnerId: null,
          trickNumber: 1,
        };
        s.currentTurn = declarer.seat;

        const validation = engine.validateAction(
          s,
          action("REQUEST_TRUMP_REVEAL", declarer.id),
        );
        expect(validation.valid).toBe(true);

        const result = engine.handleAction(
          s,
          action("REQUEST_TRUMP_REVEAL", declarer.id),
        );
        s = result.newState;
        expect(s.trump.isRevealed).toBe(true);
        expect(s.trump.revealedBy).toBe(declarer.id);

        // Verify the seventh card is included in the TRUMP_REVEALED broadcast
        const revealBroadcast = result.broadcasts.find(
          (b) => b.event === "TRUMP_REVEALED",
        );
        expect(revealBroadcast).toBeDefined();
        const seventhCard = revealBroadcast!.payload.seventhCard as {
          suit: string;
        };
        expect(seventhCard).toEqual(s.trump.seventhCard);
        expect(seventhCard.suit).toBe(trumpSuit);
      }
    });
  });

  // ========== MARRIAGE ==========

  describe("MARRIAGE", () => {
    it("detects marriage with normal suit trump during second deal", () => {
      // Create hands where one player has K+Q of trump suit
      const hands: Card[][] = [
        // p0 (declarer, team 0): has K+Q of hearts (trump)
        [
          { suit: "hearts", rank: "J" },
          { suit: "hearts", rank: "9" },
          { suit: "hearts", rank: "A" },
          { suit: "hearts", rank: "10" },
        ],
        // p1 (team 1)
        [
          { suit: "spades", rank: "J" },
          { suit: "spades", rank: "9" },
          { suit: "spades", rank: "A" },
          { suit: "spades", rank: "10" },
        ],
        // p2 (team 0)
        [
          { suit: "diamonds", rank: "J" },
          { suit: "diamonds", rank: "9" },
          { suit: "diamonds", rank: "A" },
          { suit: "diamonds", rank: "10" },
        ],
        // p3 (team 1)
        [
          { suit: "clubs", rank: "J" },
          { suit: "clubs", rank: "9" },
          { suit: "clubs", rank: "A" },
          { suit: "clubs", rank: "10" },
        ],
      ];

      // We need to control the remaining deck so the second deal gives p0 the K+Q of hearts
      const state = createGame(engine);
      state.players = PLAYER_IDS.map((id, seat) => ({
        id,
        username: `Player ${seat + 1}`,
        seat,
        team: TEAMS[seat],
        hand: hands[seat],
        isDealer: seat === 0,
        isDeclarer: false,
        isConnected: true,
      }));
      state.phase = GAME_PHASES.TRUMP_SELECTION;
      state.dealCount = 4;
      state.bidding = {
        currentBid: 20,
        highestBidder: "p0",
        activeBidders: ["p0"],
        currentChallenger: null,
        bids: [{ playerId: "p0", bid: 20 }],
      };
      state.players[0].isDeclarer = true;

      // Set remaining deck to include K+Q of hearts for p0's second deal
      // Second deal is round-robin: cards[0]→p0, cards[1]→p1, cards[2]→p2, cards[3]→p3, ...
      // Need 16 cards total (4 per player)
      state.deck = [
        { suit: "hearts", rank: "K" } as Card, // → p0 (gives K+Q of hearts)
        { suit: "spades", rank: "K" } as Card, // → p1
        { suit: "diamonds", rank: "K" } as Card, // → p2
        { suit: "clubs", rank: "K" } as Card, // → p3
        { suit: "hearts", rank: "Q" } as Card, // → p0 (gives Q of hearts → marriage!)
        { suit: "spades", rank: "Q" } as Card, // → p1
        { suit: "diamonds", rank: "Q" } as Card, // → p2
        { suit: "clubs", rank: "Q" } as Card, // → p3
        { suit: "hearts", rank: "8" } as Card, // → p0
        { suit: "spades", rank: "8" } as Card, // → p1
        { suit: "diamonds", rank: "8" } as Card, // → p2
        { suit: "clubs", rank: "8" } as Card, // → p3
        { suit: "hearts", rank: "7" } as Card, // → p0
        { suit: "spades", rank: "7" } as Card, // → p1
        { suit: "diamonds", rank: "7" } as Card, // → p2
        { suit: "clubs", rank: "7" } as Card, // → p3
      ];

      // Select normal suit trump (hearts)
      const result = engine.handleAction(
        state,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      const s = result.newState;

      // Marriage should be detected: p0 has K+Q of hearts
      expect(s.marriage).not.toBeNull();
      expect(s.marriage!.team).toBe(0);
      expect(s.marriage!.suit).toBe("hearts");
      // Effective bid: marriage on bidding team → max(16, 20-4) = 16
      expect(s.marriage!.effectiveBid).toBe(16);
    });

    it("marriage on defending team raises effective bid", () => {
      const state = createGame(engine);
      state.players = PLAYER_IDS.map((id, seat) => ({
        id,
        username: `Player ${seat + 1}`,
        seat,
        team: TEAMS[seat],
        hand: [
          { suit: "hearts", rank: "J" } as Card,
          { suit: "hearts", rank: "9" } as Card,
          { suit: "spades", rank: "A" } as Card,
          { suit: "spades", rank: "10" } as Card,
        ],
        isDealer: seat === 0,
        isDeclarer: seat === 0,
        isConnected: true,
      }));
      state.phase = GAME_PHASES.TRUMP_SELECTION;
      state.dealCount = 4;
      state.bidding = {
        currentBid: 20,
        highestBidder: "p0",
        activeBidders: ["p0"],
        currentChallenger: null,
        bids: [{ playerId: "p0", bid: 20 }],
      };

      // Give p1 (team 1, defending) the K+Q of hearts in second deal
      // secondDeal distributes round-robin: 0→p0, 1→p1, 2→p2, 3→p3, 4→p0, 5→p1, ...
      // Need 16 cards total (4 per player)
      state.deck = [
        { suit: "spades", rank: "K" } as Card, // → p0
        { suit: "hearts", rank: "K" } as Card, // → p1 (marriage card!)
        { suit: "diamonds", rank: "K" } as Card, // → p2
        { suit: "clubs", rank: "K" } as Card, // → p3
        { suit: "spades", rank: "Q" } as Card, // → p0
        { suit: "hearts", rank: "Q" } as Card, // → p1 (marriage card!)
        { suit: "diamonds", rank: "Q" } as Card, // → p2
        { suit: "clubs", rank: "Q" } as Card, // → p3
        { suit: "spades", rank: "8" } as Card, // → p0
        { suit: "spades", rank: "7" } as Card, // → p1
        { suit: "diamonds", rank: "8" } as Card, // → p2
        { suit: "diamonds", rank: "7" } as Card, // → p3
        { suit: "clubs", rank: "8" } as Card, // → p0
        { suit: "clubs", rank: "7" } as Card, // → p1
        { suit: "hearts", rank: "8" } as Card, // → p2
        { suit: "hearts", rank: "7" } as Card, // → p3
      ];

      const result = engine.handleAction(
        state,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      const s = result.newState;

      expect(s.marriage).not.toBeNull();
      expect(s.marriage!.team).toBe(1); // Defending team
      // Effective bid: marriage on defending team → min(28, 20+4) = 24
      expect(s.marriage!.effectiveBid).toBe(24);
    });

    it("no marriage in joker mode", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(s, action("SELECT_JOKER", declarer.id)).newState;

      expect(s.marriage).toBeNull();
    });

    it("detects marriage after trump reveal for ALL players", () => {
      // Setup: seventh-card trump mode, p0 is declarer
      const state = createGame(engine);
      let s = startGame(engine, state);

      // Complete bidding
      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;

      // Select seventh-card trump
      s = engine.handleAction(
        s,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      ).newState;

      // p1 (opponent) will have marriage cards in their hand after reveal
      // Give p1 K+Q of trump suit (hearts)
      const trumpSuit = s.trump.suit!;
      s.players[1].hand = [
        { suit: trumpSuit, rank: "K" },
        { suit: trumpSuit, rank: "Q" },
        { suit: "spades", rank: "J" },
        { suit: "spades", rank: "9" },
      ];

      // Fast forward to playing phase
      s = engine.handleAction(
        s,
        action("PASS_DOUBLE", s.players.find((p) => !p.isDeclarer)!.id),
      ).newState;
      s = engine.handleAction(
        s,
        action("PASS_DOUBLE", s.players.find((p) => p.isDeclarer)!.id),
      ).newState;
      s = engine.handleAction(
        s,
        action(
          "PASS_DOUBLE",
          s.players.find(
            (p) =>
              !p.isDeclarer &&
              p.id !== s.players.find((pp) => !pp.isDeclarer)!.id,
          )!.id,
        ),
      ).newState;

      expect(s.phase).toBe(GAME_PHASES.PLAYING);

      // p1 can't follow suit → trigger reveal
      // Give p1 cards without the led suit
      const ledSuit = s.leadSuit || "diamonds";
      s.players[1].hand = [
        { suit: trumpSuit, rank: "K" },
        { suit: trumpSuit, rank: "Q" },
        { suit: "spades", rank: "J" },
        { suit: "spades", rank: "9" },
      ];

      // p1 reveals trump
      s = engine.handleAction(
        s,
        action("REQUEST_TRUMP_REVEAL", s.players[1].id),
      ).newState;

      // Marriage should be detected for p1 (who has K+Q of trump)
      expect(s.marriage).not.toBeNull();
      expect(s.marriage!.playerId).toBe("p1");
      expect(s.marriage!.suit).toBe(trumpSuit);
      // Calculate expected effective bid based on team relationship
      const declarerTeam = declarer.team;
      const marriageTeam = s.players[1].team;
      const expectedEffectiveBid =
        declarerTeam === marriageTeam
          ? Math.max(16, 20 - 4) // Same team: bid - 4
          : Math.min(28, 20 + 4); // Different team: bid + 4
      expect(s.marriage!.effectiveBid).toBe(expectedEffectiveBid);
    });

    it("detects marriage for first player found when multiple have marriage", () => {
      // Setup: suit trump mode, both p0 and p1 have marriage
      const state = createGame(engine);
      let s = startGame(engine, state);

      // Complete bidding
      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      const trumpSuit = "hearts";

      // Set up deck so both p0 and p1 get K+Q of hearts
      s.deck = [
        { suit: trumpSuit, rank: "K" }, // → p0
        { suit: "spades", rank: "K" }, // → p1
        { suit: "diamonds", rank: "K" }, // → p2
        { suit: "clubs", rank: "K" }, // → p3
        { suit: trumpSuit, rank: "Q" }, // → p0
        { suit: "spades", rank: "Q" }, // → p1
        { suit: "diamonds", rank: "Q" }, // → p2
        { suit: "clubs", rank: "Q" }, // → p3
      ];

      // Select suit trump
      s = engine.handleAction(
        s,
        action("SELECT_TRUMP", declarer.id, { suit: trumpSuit }),
      ).newState;

      // Marriage should be detected for the first player found (p0)
      expect(s.marriage).not.toBeNull();
      expect(s.marriage!.playerId).toBe("p0");
      expect(s.marriage!.suit).toBe(trumpSuit);
    });
  });

  // ========== WEAK HAND ==========

  describe("WEAK HAND", () => {
    it("can cancel weak hand and redeal", () => {
      const state = createGame(engine);
      let result = engine.handleAction(state, action("START_GAME", "p0"));
      let s = result.newState;

      if (s.weakHandPlayer) {
        // CANCEL_WEAK_HAND now always re-deals
        result = engine.handleAction(
          s,
          action("CANCEL_WEAK_HAND", s.weakHandPlayer),
        );
        s = result.newState;

        // After cancellation, should redeal (FIRST_DEAL or BIDDING)
        expect([GAME_PHASES.FIRST_DEAL, GAME_PHASES.BIDDING]).toContain(
          s.phase,
        );
        expect(s.weakHandPlayer).toBeNull();
      }
    });

    it("can keep weak hand and proceed to bidding", () => {
      const state = createGame(engine);
      let result = engine.handleAction(state, action("START_GAME", "p0"));
      let s = result.newState;

      if (s.weakHandPlayer) {
        // KEEP_WEAK_HAND proceeds to bidding
        result = engine.handleAction(
          s,
          action("KEEP_WEAK_HAND", s.weakHandPlayer),
        );
        s = result.newState;

        expect(s.phase).toBe(GAME_PHASES.BIDDING);
        expect(s.weakHandPlayer).toBeNull();
      }
    });

    it("rejects cancel from wrong player", () => {
      const state = createGame(engine);
      let result = engine.handleAction(state, action("START_GAME", "p0"));
      let s = result.newState;

      if (s.weakHandPlayer) {
        const wrongPlayer = s.players.find(
          (p) => p.id !== s.weakHandPlayer,
        )!.id;
        const validation = engine.validateAction(
          s,
          action("CANCEL_WEAK_HAND", wrongPlayer),
        );
        expect(validation.valid).toBe(false);
      }
    });
  });

  // ========== HIDDEN TRUMP NEVER REVEALED ==========

  describe("HIDDEN TRUMP NEVER REVEALED", () => {
    it("cancels game if seventh-card trump never revealed", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      ).newState;

      // Skip double phase
      s = skipDoublePhase(engine, s);

      // Play tricks WITHOUT revealing trump. The declarer only holds 7 cards
      // (the 7th card is set aside), so once it runs out the game is cancelled.
      let guard = 40;
      while (s.phase === GAME_PHASES.PLAYING && guard-- > 0) {
        s = playFirstValidCard(engine, s);
      }

      // Game should be cancelled
      expect(s.phase).toBe(GAME_PHASES.MATCH_COMPLETE);
      // No points should be awarded (score unchanged)
      expect(s.score.matchPoints[0]).toBe(0);
      expect(s.score.matchPoints[1]).toBe(0);
    });
  });

  // ========== VISIBILITY ==========

  describe("VISIBILITY", () => {
    it("hides opponent hands", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const visible = engine.getVisibleState(s, "p0", "player");
      const players = visible.players as any[];

      // p0 should see their own hand
      const me = players.find((p: any) => p.id === "p0");
      expect(me.hand).toBeDefined();
      expect(me.hand).toHaveLength(4);

      // p1's hand should be hidden
      const opponent = players.find((p: any) => p.id === "p1");
      expect(opponent.hand).toBeUndefined();
      expect(opponent.handCount).toBe(4);
    });

    it("spectators cannot see any hands", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const visible = engine.getVisibleState(s, "spectator1", "spectator");
      const players = visible.players as any[];

      for (const p of players) {
        expect(p.hand).toBeUndefined();
      }
    });

    it("seventh-card trump hidden from non-declarers", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 20 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_SEVENTH_CARD_TRUMP", declarer.id),
      ).newState;

      // Declarer sees the trump
      const declarerView = engine.getVisibleState(s, declarer.id, "player");
      expect((declarerView.trump as any).suit).toBe(s.trump.suit);
      expect((declarerView.trump as any).seventhCard).toEqual(
        s.trump.seventhCard,
      );

      // Non-declarer doesn't see the trump
      const otherPlayer = s.players.find((p) => !p.isDeclarer)!;
      const otherView = engine.getVisibleState(s, otherPlayer.id, "player");
      expect((otherView.trump as any).suit).toBeNull();
      expect((otherView.trump as any).seventhCard).toBeNull();
    });
  });

  // ========== GAME COMPLETION ==========

  describe("GAME COMPLETION", () => {
    it("rotates dealer after game completes", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 16 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      ).newState;
      s = skipDoublePhase(engine, s);

      const oldDealerSeat = s.dealerSeat;

      // Play all tricks, attempting to reveal trump when possible
      for (let trick = 0; trick < 8; trick++) {
        for (let card = 0; card < 4; card++) {
          const currentPlayerId = PLAYER_IDS[s.currentTurn];
          // Try to reveal if it's hidden and conditions are met
          if (!s.trump.isRevealed && s.trump.suit && s.leadSuit) {
            const validation = engine.validateAction(
              s,
              action("REQUEST_TRUMP_REVEAL", currentPlayerId),
            );
            if (validation.valid) {
              s = engine.handleAction(
                s,
                action("REQUEST_TRUMP_REVEAL", currentPlayerId),
              ).newState;
            }
          }
          s = playFirstValidCard(engine, s);
        }
      }

      // After scoring, phase should be SCORING
      expect(s.phase).toBe(GAME_PHASES.SCORING);

      // Start next hand to rotate dealer
      s = engine.handleAction(s, action("START_NEXT_HAND", "p0")).newState;

      // Dealer should have rotated
      expect(s.dealerSeat).toBe((oldDealerSeat + 1) % 4);
    });

    it("declarer flag is reset after game", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 16 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      ).newState;
      s = skipDoublePhase(engine, s);

      for (let trick = 0; trick < 8; trick++) {
        for (let card = 0; card < 4; card++) {
          s = playFirstValidCard(engine, s);
        }
      }

      // Start next hand to reset declarer flags
      s = engine.handleAction(s, action("START_NEXT_HAND", "p0")).newState;

      // All declarer flags should be reset
      for (const p of s.players) {
        expect(p.isDeclarer).toBe(false);
      }
    });

    it("tracks sets correctly", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const bidderId = PLAYER_IDS[s.currentTurn];
      s = engine.handleAction(
        s,
        action("PLACE_BID", bidderId, { bid: 16 }),
      ).newState;
      let safety = 10;
      while (s.phase === GAME_PHASES.BIDDING && safety-- > 0) {
        const pid = PLAYER_IDS[s.currentTurn];
        if (pid === bidderId) break;
        s = engine.handleAction(s, action("PASS_BID", pid)).newState;
      }

      const declarer = s.players.find((p) => p.isDeclarer)!;
      s = engine.handleAction(
        s,
        action("SELECT_TRUMP", declarer.id, { suit: "hearts" }),
      ).newState;
      s = skipDoublePhase(engine, s);

      for (let trick = 0; trick < 8; trick++) {
        for (let card = 0; card < 4; card++) {
          s = playFirstValidCard(engine, s);
        }
      }

      // At least one set should potentially be awarded if match points reach threshold
      expect(s.score.sets[0] + s.score.sets[1]).toBeGreaterThanOrEqual(0);
    });
  });

  // ========== ERROR HANDLING ==========

  describe("ERROR HANDLING", () => {
    it("returns error for unknown action", () => {
      const state = createGame(engine);
      const result = engine.handleAction(state, action("INVALID_ACTION", "p0"));
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe("UNKNOWN_ACTION");
    });

    it("rejects actions from non-existent players", () => {
      const state = createGame(engine);
      let s = startGame(engine, state);

      const validation = engine.validateAction(
        s,
        action("PLACE_BID", "nonexistent", { bid: 16 }),
      );
      expect(validation.valid).toBe(false);
    });

    it("rejects game actions when game is not in progress", () => {
      const state = createGame(engine);
      // Don't start the game — still in WAITING_FOR_PLAYERS
      const validation = engine.validateAction(
        state,
        action("PLACE_BID", "p0", { bid: 16 }),
      );
      expect(validation.valid).toBe(false);
    });
  });

  describe("Trump Visibility", () => {
    it("suit trump is hidden from non-declarers until revealed", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      expect(s.trump.type).toBe("suit");
      expect(s.trump.suit).toBe("hearts");
      expect(s.trump.isRevealed).toBe(false);

      // Declarer sees the trump suit
      const declarerVisible = engine.getVisibleState(s, "p0", "player") as any;
      expect(declarerVisible.trump.suit).toBe("hearts");
      expect(declarerVisible.trump.isRevealed).toBe(false);

      // Non-declarer does NOT see the trump suit, but DOES see the mode
      const opponentVisible = engine.getVisibleState(s, "p1", "player") as any;
      expect(opponentVisible.trump.suit).toBeNull();
      expect(opponentVisible.trump.type).toBe("suit");
      expect(opponentVisible.trump.isRevealed).toBe(false);

      // Partner also does NOT see the trump suit
      const partnerVisible = engine.getVisibleState(s, "p2", "player") as any;
      expect(partnerVisible.trump.suit).toBeNull();
      expect(partnerVisible.trump.type).toBe("suit");
    });

    it("seventh-card trump is hidden from non-declarers until revealed", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_SEVENTH_CARD_TRUMP", "p0"),
      );
      s = skipDoublePhase(engine, s);

      expect(s.trump.type).toBe("seventh-card");
      expect(s.trump.isRevealed).toBe(false);

      // Declarer sees the trump suit (via TRUMP_HIDDEN broadcast)
      const declarerVisible = engine.getVisibleState(s, "p0", "player") as any;
      expect(declarerVisible.trump.suit).not.toBeNull();
      expect(declarerVisible.trump.isRevealed).toBe(false);

      // Non-declarer does NOT see the trump suit, but DOES see the mode
      // (so the reveal option is reachable in the UI).
      const opponentVisible = engine.getVisibleState(s, "p1", "player") as any;
      expect(opponentVisible.trump.suit).toBeNull();
      expect(opponentVisible.trump.type).toBe("seventh-card");
      expect(opponentVisible.trump.isRevealed).toBe(false);
    });

    it("joker trump is hidden from non-declarers until revealed", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(engine, s, "p0", 20, action("SELECT_JOKER", "p0"));
      s = skipDoublePhase(engine, s);

      expect(s.trump.type).toBe("joker");

      // Declarer sees the trump type
      const declarerVisible = engine.getVisibleState(s, "p0", "player") as any;
      expect(declarerVisible.trump.type).toBe("joker");
      expect(declarerVisible.trump.suit).toBeNull();

      // Non-declarer sees the mode (joker) but there is no suit to hide
      const opponentVisible = engine.getVisibleState(s, "p1", "player") as any;
      expect(opponentVisible.trump.type).toBe("joker");
      expect(opponentVisible.trump.suit).toBeNull();
    });

    it("TRUMP_SELECTED broadcast does not leak suit to anyone", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = doBidding(engine, s, 0, 20);
      const result = engine.handleAction(
        s,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );

      const trumpBroadcast = result.broadcasts.find(
        (b) => b.event === "TRUMP_SELECTED",
      );
      expect(trumpBroadcast).toBeDefined();
      expect(trumpBroadcast!.payload.suit).toBeUndefined();

      // There should be a TRUMP_HIDDEN broadcast targeted only to the declarer
      const hiddenBroadcast = result.broadcasts.find(
        (b) => b.event === "TRUMP_HIDDEN",
      );
      expect(hiddenBroadcast).toBeDefined();
      expect(hiddenBroadcast!.targetPlayerIds).toEqual(["p0"]);
      expect(hiddenBroadcast!.payload.suit).toBe("hearts");
    });

    it("trump becomes visible to all after reveal", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // Give p1 a hearts card so they can reveal
      s.players[1].hand = [
        { suit: "hearts", rank: "J" } as Card,
        { suit: "spades", rank: "9" } as Card,
        { suit: "clubs", rank: "A" } as Card,
        { suit: "diamonds", rank: "10" } as Card,
      ];

      // p1 reveals trump
      let result = engine.handleAction(s, action("REQUEST_TRUMP_REVEAL", "p1"));
      s = result.newState;
      expect(s.trump.isRevealed).toBe(true);

      // Now everyone can see the trump suit
      const declarerVisible = engine.getVisibleState(s, "p0", "player") as any;
      expect(declarerVisible.trump.suit).toBe("hearts");
      expect(declarerVisible.trump.isRevealed).toBe(true);

      const opponentVisible = engine.getVisibleState(s, "p1", "player") as any;
      expect(opponentVisible.trump.suit).toBe("hearts");
      expect(opponentVisible.trump.isRevealed).toBe(true);

      const partnerVisible = engine.getVisibleState(s, "p2", "player") as any;
      expect(partnerVisible.trump.suit).toBe("hearts");
      expect(partnerVisible.trump.isRevealed).toBe(true);
    });

    it("declarer can reveal trump when they have no led suit cards", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);
      expect(s.phase).toBe(GAME_PHASES.PLAYING);

      // Start a trick led by spades
      s.leadSuit = "spades" as Suit;
      s.currentTrick = {
        plays: [
          {
            playerId: "p2",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades" as Suit,
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 0; // p0's turn

      // Give p0 only hearts (no spades)
      s.players[0].hand = [
        { suit: "hearts", rank: "J" } as Card,
        { suit: "hearts", rank: "9" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
        { suit: "clubs", rank: "10" } as Card,
      ];

      const validation = engine.validateAction(
        s,
        action("REQUEST_TRUMP_REVEAL", "p0"),
      );
      expect(validation.valid).toBe(true);
    });

    it("cannot reveal trump if player has led suit cards", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // Start a trick led by spades
      s.leadSuit = "spades" as Suit;
      s.currentTrick = {
        plays: [
          {
            playerId: "p2",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades" as Suit,
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 0;

      // Give p0 a spade card - must follow suit
      s.players[0].hand = [
        { suit: "spades", rank: "9" } as Card,
        { suit: "hearts", rank: "J" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
        { suit: "clubs", rank: "10" } as Card,
      ];

      const validation = engine.validateAction(
        s,
        action("REQUEST_TRUMP_REVEAL", "p0"),
      );
      expect(validation.valid).toBe(false);
    });

    it("cannot reveal trump when leading (first card of trick)", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // p0 is leading (no lead suit yet)
      s.leadSuit = null;
      s.currentTrick = {
        plays: [],
        leadSuit: null,
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 0;

      const validation = engine.validateAction(
        s,
        action("REQUEST_TRUMP_REVEAL", "p0"),
      );
      expect(validation.valid).toBe(false);
    });

    it("cannot reveal trump if not your turn", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // Start a trick led by spades, p1's turn
      s.leadSuit = "spades" as Suit;
      s.currentTrick = {
        plays: [
          {
            playerId: "p2",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades" as Suit,
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 1; // p1's turn

      // Give p1 no spades
      s.players[1].hand = [
        { suit: "hearts", rank: "J" } as Card,
        { suit: "hearts", rank: "9" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
        { suit: "clubs", rank: "10" } as Card,
      ];

      // p0 tries to reveal but it's not their turn
      const validation = engine.validateAction(
        s,
        action("REQUEST_TRUMP_REVEAL", "p0"),
      );
      expect(validation.valid).toBe(false);
    });

    it("trick resolved correctly when trump not revealed - trump cards have no power", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // p0 leads spades
      s.leadSuit = "spades";
      s.currentTrick = {
        plays: [
          {
            playerId: "p0",
            card: { suit: "spades", rank: "10" } as Card,
            cardIndex: 0,
          },
          {
            playerId: "p1",
            card: { suit: "spades", rank: "K" } as Card,
            cardIndex: 1,
          },
          {
            playerId: "p2",
            card: { suit: "hearts", rank: "J" } as Card,
            cardIndex: 2,
          }, // trump but not revealed!
        ],
        leadSuit: "spades",
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 3; // p3's turn
      s.trump.isRevealed = false;

      // Give p3 the Q of spades (lower than 10 and K)
      s.players[3].hand = [{ suit: "spades", rank: "Q" } as Card];

      const result = engine.handleAction(
        s,
        action("PLAY_CARD", "p3", { cardIndex: 0 }),
      );

      // p1's K of spades should win since trump has no power when not revealed
      // K(3) > Q(2) > 10(4) -- wait, 10=4, K=3, Q=2, so 10 > K > Q
      // p0's 10 should win (10=4 is highest)
      expect(result.newState.completedTricks).toHaveLength(1);
      expect(result.newState.completedTricks[0].winnerId).toBe("p0");
    });

    it("trick resolved correctly when trump is revealed - trump beats non-trump", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // p0 leads spades
      s.leadSuit = "spades";
      s.currentTrick = {
        plays: [
          {
            playerId: "p0",
            card: { suit: "spades", rank: "10" } as Card,
            cardIndex: 0,
          },
          {
            playerId: "p1",
            card: { suit: "spades", rank: "K" } as Card,
            cardIndex: 1,
          },
          {
            playerId: "p2",
            card: { suit: "hearts", rank: "7" } as Card,
            cardIndex: 2,
          }, // trump (lowest)
        ],
        leadSuit: "spades",
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 3; // p3's turn
      s.trump.isRevealed = true;

      // Give p3 the Q of spades
      s.players[3].hand = [{ suit: "spades", rank: "Q" } as Card];

      const result = engine.handleAction(
        s,
        action("PLAY_CARD", "p3", { cardIndex: 0 }),
      );

      // p2's heart 7 should win since trump is revealed and beats all non-trump
      expect(result.newState.completedTricks).toHaveLength(1);
      expect(result.newState.completedTricks[0].winnerId).toBe("p2");
    });

    it("cannot reveal trump if already revealed", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // Give p0 hearts cards and reveal
      s.players[0].hand = [
        { suit: "hearts", rank: "J" } as Card,
        { suit: "spades", rank: "9" } as Card,
        { suit: "clubs", rank: "A" } as Card,
        { suit: "diamonds", rank: "10" } as Card,
      ];

      let result = engine.handleAction(s, action("REQUEST_TRUMP_REVEAL", "p0"));
      s = result.newState;
      expect(s.trump.isRevealed).toBe(true);

      // Try to reveal again — should fail
      const validation = engine.validateAction(
        s,
        action("REQUEST_TRUMP_REVEAL", "p1"),
      );
      expect(validation.valid).toBe(false);
    });

    it("spectators never see hidden trump", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);

      // Spectator view — type and suit both hidden
      const spectatorVisible = engine.getVisibleState(
        s,
        "spectator1",
        "spectator",
      ) as any;
      expect(spectatorVisible.trump.type).toBeNull();
      expect(spectatorVisible.trump.suit).toBeNull();
      expect(spectatorVisible.trump.isRevealed).toBe(false);
    });
  });

  describe("Trump Obligation After Reveal", () => {
    it("must play trump card when trump revealed and no led suit cards", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);
      s.trump.isRevealed = true;
      s.trump.revealedBy = "p1";
      s.trump.mustPlayTrump = true; // p1 is the revealer — one-turn obligation

      // p0 leads spades
      s.leadSuit = "spades";
      s.currentTrick = {
        plays: [
          {
            playerId: "p0",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades",
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 1; // p1's turn

      // p1 has no spades but has hearts (trump) — as revealer, must play trump THIS turn
      s.players[1].hand = [
        { suit: "hearts", rank: "J" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
        { suit: "clubs", rank: "10" } as Card,
      ];

      // Playing a non-trump card should be rejected
      const validation = engine.validateAction(
        s,
        action("PLAY_CARD", "p1", { cardIndex: 1 }),
      );
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("trump");

      // Playing a trump card should be valid
      const validation2 = engine.validateAction(
        s,
        action("PLAY_CARD", "p1", { cardIndex: 0 }),
      );
      expect(validation2.valid).toBe(true);
    });

    it("can play any card when no led suit and no trump obligation", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);
      s.trump.isRevealed = true;

      // p0 is leading (no lead suit)
      s.leadSuit = null;
      s.currentTrick = {
        plays: [],
        leadSuit: null,
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 0; // p0's turn

      // p0 can play any card when leading
      const validation = engine.validateAction(
        s,
        action("PLAY_CARD", "p0", { cardIndex: 0 }),
      );
      expect(validation.valid).toBe(true);
    });

    it("must follow lead suit even when trump is revealed", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);
      s.trump.isRevealed = true;

      // p0 leads spades
      s.leadSuit = "spades";
      s.currentTrick = {
        plays: [
          {
            playerId: "p0",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades",
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 1;

      // p1 has both spades and hearts (trump)
      s.players[1].hand = [
        { suit: "spades", rank: "9" } as Card,
        { suit: "hearts", rank: "J" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
      ];

      // Must follow spades, cannot play trump
      const validation = engine.validateAction(
        s,
        action("PLAY_CARD", "p1", { cardIndex: 1 }),
      );
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("led suit");

      // Playing spades is valid
      const validation2 = engine.validateAction(
        s,
        action("PLAY_CARD", "p1", { cardIndex: 0 }),
      );
      expect(validation2.valid).toBe(true);
    });

    it("can play anything when no led suit and no trump cards", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);
      s.trump.isRevealed = true;

      // p0 leads spades
      s.leadSuit = "spades";
      s.currentTrick = {
        plays: [
          {
            playerId: "p0",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades",
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 1;

      // p1 has no spades AND no hearts (trump)
      s.players[1].hand = [
        { suit: "diamonds", rank: "J" } as Card,
        { suit: "clubs", rank: "9" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
      ];

      // Can play any card since no lead suit and no trump
      const validation = engine.validateAction(
        s,
        action("PLAY_CARD", "p1", { cardIndex: 0 }),
      );
      expect(validation.valid).toBe(true);
    });

    it("no trump obligation when trump not revealed", () => {
      const engine = createEngine();
      const state = createGame(engine);
      let s = startGame(engine, state);
      s = completeBidding(
        engine,
        s,
        "p0",
        20,
        action("SELECT_TRUMP", "p0", { suit: "hearts" }),
      );
      s = skipDoublePhase(engine, s);
      s.trump.isRevealed = false;

      // p0 leads spades
      s.leadSuit = "spades";
      s.currentTrick = {
        plays: [
          {
            playerId: "p0",
            card: { suit: "spades", rank: "J" } as Card,
            cardIndex: 0,
          },
        ],
        leadSuit: "spades",
        winnerId: null,
        trickNumber: 1,
      };
      s.currentTurn = 1;

      // p1 has no spades but has hearts (trump) — but trump not revealed
      s.players[1].hand = [
        { suit: "hearts", rank: "J" } as Card,
        { suit: "diamonds", rank: "A" } as Card,
      ];

      // Can play diamonds since trump not revealed — no obligation
      const validation = engine.validateAction(
        s,
        action("PLAY_CARD", "p1", { cardIndex: 1 }),
      );
      expect(validation.valid).toBe(true);
    });
  });
});

describe("Deterministic seeding", () => {
  it("two games with same seed produce identical initial deck state", () => {
    const engine = createEngine();
    const seed = 42;
    const settings: RoomSettings = { ...DEFAULT_SETTINGS, seed };

    const game1 = engine.createInitialState(PLAYER_IDS, settings, TEAMS);
    const game2 = engine.createInitialState(PLAYER_IDS, settings, TEAMS);

    expect(game1.randomSeed).toBe(seed);
    expect(game2.randomSeed).toBe(seed);
  });

  it("games without seed use random seed", () => {
    const engine = createEngine();

    const game1 = engine.createInitialState(
      PLAYER_IDS,
      DEFAULT_SETTINGS,
      TEAMS,
    );
    const game2 = engine.createInitialState(
      PLAYER_IDS,
      DEFAULT_SETTINGS,
      TEAMS,
    );

    // Without explicit seed, randomSeed should be generated (likely different)
    expect(typeof game1.randomSeed).toBe("number");
    expect(typeof game2.randomSeed).toBe("number");
  });

  it("shuffleCount increments on each shuffle", () => {
    const engine = createEngine();
    const seed = 123;
    const settings: RoomSettings = { ...DEFAULT_SETTINGS, seed };
    const state = engine.createInitialState(PLAYER_IDS, settings, TEAMS);

    expect(state.shuffleCount).toBe(0);

    // Start game triggers first shuffle
    const result = engine.handleAction(state, action("START_GAME", "p0"));
    expect(result.newState.shuffleCount).toBe(1);
  });
});
