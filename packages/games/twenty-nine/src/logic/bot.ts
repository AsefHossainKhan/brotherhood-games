import type { GameAction } from '@brotherhood/game-engine';
import type { Card, Suit } from '@brotherhood/shared';
import { GAME_PHASES, SUITS } from '@brotherhood/shared';
import { RANK_ORDER_29, getCardPoints29 } from '@brotherhood/shared/cards/utils';
import { TWENTY_NINE_DEFAULTS } from '../config';
import { isValidPlay, resolveTrick, getTrickPoints } from './tricks';
import type { TwentyNineState, TwentyNinePlayer } from '../types';

/**
 * Bot (AI) decision logic for Bangladeshi 29.
 *
 * Given the full authoritative game state and the set of bot player ids,
 * returns the single next action a bot should take, or `null` when it is a
 * human's turn (or no action is pending). The runtime calls this repeatedly
 * so that a chain of consecutive bot turns resolves automatically.
 *
 * The strategy is a lightweight heuristic (not a full search): it evaluates
 * hand strength for bidding, picks its longest/strongest suit as trump, plays
 * to win tricks economically, supports its partner, and reveals a hidden trump
 * when it can capture a valuable trick.
 */
export function getTwentyNineBotAction(state: TwentyNineState, botIds: string[]): GameAction | null {
  const bots = new Set(botIds);

  // Weak-hand decision happens outside the normal turn cursor (currentTurn = -1).
  if (state.weakHandPlayer && bots.has(state.weakHandPlayer)) {
    // Keep the hand: cancelling triggers a re-deal, and a bot has no strong
    // reason to gamble on a better draw. This also avoids re-deal loops.
    return action(state.weakHandPlayer, 'KEEP_WEAK_HAND');
  }

  const seat = state.currentTurn;
  if (seat < 0 || seat > 3) return null;

  const actor = state.players[seat];
  if (!actor || !bots.has(actor.id)) return null;

  switch (state.phase) {
    case GAME_PHASES.BIDDING:
      return biddingAction(state, actor);
    case GAME_PHASES.TRUMP_SELECTION:
      return trumpAction(actor);
    case GAME_PHASES.DOUBLE_PHASE:
      // Conservative: never escalate the stakes.
      return action(actor.id, 'PASS_DOUBLE');
    case GAME_PHASES.PLAYING:
      return playingAction(state, actor);
    default:
      return null;
  }
}

// ---- Helpers ----

function action(playerId: string, type: string, payload: Record<string, unknown> = {}): GameAction {
  return { type, playerId, payload };
}

function rankVal(card: Card): number {
  return RANK_ORDER_29[card.rank] ?? 0;
}

function teamOf(state: TwentyNineState, playerId: string): 0 | 1 {
  return state.players.find((p) => p.id === playerId)?.team ?? 0;
}

/** Winner of the trick as it currently stands (before the actor plays). */
function currentWinnerId(state: TwentyNineState): string | null {
  const plays = state.currentTrick.plays;
  if (plays.length === 0) return null;
  const { winnerId } = resolveTrick(
    plays.map((p) => ({ playerId: p.playerId, card: p.card })),
    state.trump.suit,
    state.trump.isRevealed
  );
  return winnerId;
}

/** Would the actor win the trick if they played `card` right now? */
function wouldWin(state: TwentyNineState, actorId: string, card: Card): boolean {
  const plays = state.currentTrick.plays.map((p) => ({ playerId: p.playerId, card: p.card }));
  plays.push({ playerId: actorId, card });
  const { winnerId } = resolveTrick(plays, state.trump.suit, state.trump.isRevealed);
  return winnerId === actorId;
}

// ---- Bidding ----

/** Estimate the maximum bid a bot is comfortable making from its 4 known cards. */
function estimateBidCeiling(hand: Card[]): number {
  const points = hand.reduce((sum, c) => sum + getCardPoints29(c), 0);
  const jacks = hand.filter((c) => c.rank === 'J').length;
  const nines = hand.filter((c) => c.rank === '9').length;

  const counts: Partial<Record<Suit, number>> = {};
  for (const c of hand) counts[c.suit] = (counts[c.suit] ?? 0) + 1;
  const longest = Math.max(0, ...Object.values(counts).map((n) => n ?? 0));

  let ceiling = TWENTY_NINE_DEFAULTS.minBid; // 16
  ceiling += points; // Jacks/9s/Aces/10s carry the hand
  ceiling += jacks; // Jacks are the top trump card
  ceiling += nines >= 1 ? 1 : 0;
  ceiling += longest >= 3 ? 2 : longest >= 2 ? 1 : 0; // a long suit = good trump length
  ceiling += Math.floor(Math.random() * 2); // small variance so bots differ

  // Only 4 of 8 cards are known during bidding — stay conservative.
  return Math.min(ceiling, 20);
}

function biddingAction(state: TwentyNineState, actor: TwentyNinePlayer): GameAction {
  const ceiling = estimateBidCeiling(actor.hand);
  const minBid = state.settings.minBid;

  // Opening bid.
  if (!state.bidding.highestBidder) {
    return ceiling >= minBid
      ? action(actor.id, 'PLACE_BID', { bid: minBid })
      : action(actor.id, 'PASS_BID');
  }

  // Defensive: the current turn is always the challenger, never the leader,
  // but guard anyway so we never place an illegal raise against ourselves.
  if (state.bidding.highestBidder === actor.id) {
    return action(actor.id, 'PASS_BID');
  }

  const current = state.bidding.currentBid ?? minBid;
  const next = current + 1;
  if (ceiling > current && next <= TWENTY_NINE_DEFAULTS.maxBid) {
    return action(actor.id, 'PLACE_BID', { bid: next });
  }
  return action(actor.id, 'PASS_BID');
}

// ---- Trump selection ----

function trumpAction(actor: TwentyNinePlayer): GameAction {
  // Pick the suit with the best combination of length and card strength.
  let best: Suit = SUITS[0];
  let bestScore = -1;
  for (const suit of SUITS) {
    const cards = actor.hand.filter((c) => c.suit === suit);
    if (cards.length === 0) continue;
    const strength = cards.reduce((s, c) => s + rankVal(c) + getCardPoints29(c), 0);
    const score = cards.length * 3 + strength;
    if (score > bestScore) {
      bestScore = score;
      best = suit;
    }
  }
  return action(actor.id, 'SELECT_TRUMP', { suit: best });
}

// ---- Playing ----

function playingAction(state: TwentyNineState, actor: TwentyNinePlayer): GameAction {
  const hand = actor.hand;
  const leadSuit = state.leadSuit;
  const trumpSuit = state.trump.suit;
  const mustPlayTrump = state.trump.mustPlayTrump && state.trump.revealedBy === actor.id;

  // Leading the trick.
  if (leadSuit === null) {
    return action(actor.id, 'PLAY_CARD', { cardIndex: chooseLead(state, actor) });
  }

  const withIndex = hand.map((c, i) => ({ c, i }));
  const winnerId = currentWinnerId(state);
  const partnerWinning = winnerId !== null && teamOf(state, winnerId) === actor.team;
  const trickPoints = getTrickPoints(state.currentTrick.plays.map((p) => ({ card: p.card })));

  const leadCards = withIndex.filter((x) => x.c.suit === leadSuit);

  // Must follow the led suit.
  if (leadCards.length > 0) {
    const winning = leadCards
      .filter((x) => wouldWin(state, actor.id, x.c))
      .sort((a, b) => rankVal(a.c) - rankVal(b.c)); // cheapest card that still wins

    if (!partnerWinning && winning.length > 0) {
      return action(actor.id, 'PLAY_CARD', { cardIndex: winning[0].i });
    }
    if (partnerWinning) {
      // Partner is taking the trick — throw the most valuable follow card.
      const byPoints = [...leadCards].sort(
        (a, b) => getCardPoints29(b.c) - getCardPoints29(a.c) || rankVal(a.c) - rankVal(b.c)
      );
      return action(actor.id, 'PLAY_CARD', { cardIndex: byPoints[0].i });
    }
    // Can't win — duck with the lowest card.
    const lowest = [...leadCards].sort(
      (a, b) => rankVal(a.c) - rankVal(b.c) || getCardPoints29(a.c) - getCardPoints29(b.c)
    );
    return action(actor.id, 'PLAY_CARD', { cardIndex: lowest[0].i });
  }

  // Cannot follow suit.

  // Consider revealing a hidden trump to capture a worthwhile trick.
  if (
    !state.trump.isRevealed &&
    state.trump.type &&
    state.trump.type !== 'joker' &&
    trumpSuit &&
    !partnerWinning &&
    trickPoints >= 1 &&
    hand.some((c) => c.suit === trumpSuit)
  ) {
    return action(actor.id, 'REQUEST_TRUMP_REVEAL');
  }

  const legal = withIndex.filter((x) => isValidPlay(hand, x.c, leadSuit, trumpSuit, mustPlayTrump));
  const pool = legal.length > 0 ? legal : withIndex; // pool is never empty in practice

  // Trump in to win a valuable trick (only when trump power is live).
  if (state.trump.isRevealed && trumpSuit && !partnerWinning) {
    const winningTrumps = pool
      .filter((x) => x.c.suit === trumpSuit && wouldWin(state, actor.id, x.c))
      .sort((a, b) => rankVal(a.c) - rankVal(b.c));
    if (winningTrumps.length > 0 && (trickPoints >= 1 || mustPlayTrump)) {
      return action(actor.id, 'PLAY_CARD', { cardIndex: winningTrumps[0].i });
    }
  }

  // Obligated to play trump this turn (just revealed) but can't win — play lowest trump.
  if (mustPlayTrump && trumpSuit) {
    const trumps = pool
      .filter((x) => x.c.suit === trumpSuit)
      .sort((a, b) => rankVal(a.c) - rankVal(b.c));
    if (trumps.length > 0) {
      return action(actor.id, 'PLAY_CARD', { cardIndex: trumps[0].i });
    }
  }

  // Otherwise discard: prefer a low, point-free, non-trump card.
  const discard = [...pool].sort((a, b) => {
    const at = trumpSuit && a.c.suit === trumpSuit ? 1 : 0;
    const bt = trumpSuit && b.c.suit === trumpSuit ? 1 : 0;
    if (at !== bt) return at - bt; // keep trumps for later
    return getCardPoints29(a.c) - getCardPoints29(b.c) || rankVal(a.c) - rankVal(b.c);
  });
  return action(actor.id, 'PLAY_CARD', { cardIndex: discard[0].i });
}

/** Choose which card to lead a trick with. */
function chooseLead(state: TwentyNineState, actor: TwentyNinePlayer): number {
  const trumpSuit = state.trump.suit;
  const revealed = state.trump.isRevealed;
  const withIndex = actor.hand.map((c, i) => ({ c, i }));

  // Prefer leading a strong non-trump card; conserve trumps unless that's all we hold.
  const nonTrump = withIndex.filter((x) => !(revealed && trumpSuit && x.c.suit === trumpSuit));
  const pool = nonTrump.length > 0 ? nonTrump : withIndex;

  const sorted = [...pool].sort(
    (a, b) => rankVal(b.c) - rankVal(a.c) || getCardPoints29(b.c) - getCardPoints29(a.c)
  );
  return sorted[0].i;
}
