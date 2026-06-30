import type { Card, Suit } from '@brotherhood/shared';
import { RANK_ORDER_29, getCardPoints29 } from '@brotherhood/shared/cards/utils';

/**
 * Resolve a trick: determine the winner.
 *
 * Rules:
 * - Highest card of the led suit wins
 * - Trump beats non-trump ONLY if trump has been revealed
 * - If trump not revealed, trump cards are treated as regular cards
 * - Highest card of led suit wins when no trump power
 *
 * @param plays Array of { playerId, card } in play order
 * @param trumpSuit The active trump suit (null if no trump / joker)
 * @param trumpRevealed Whether trump has been revealed (if false, trump cards have no power)
 * @returns The winning player id
 */
export function resolveTrick(
  plays: { playerId: string; card: Card }[],
  trumpSuit: Suit | null,
  trumpRevealed: boolean = true
): { winnerId: string; winningCard: Card } {
  if (plays.length === 0) {
    throw new Error('No plays to resolve');
  }

  const leadSuit = plays[0].card.suit;
  let winnerId = plays[0].playerId;
  let winningCard = plays[0].card;
  let winningIsTrump = trumpRevealed && trumpSuit !== null && plays[0].card.suit === trumpSuit;
  let winningRank = RANK_ORDER_29[plays[0].card.rank] ?? 0;

  for (let i = 1; i < plays.length; i++) {
    const { playerId, card } = plays[i];
    const cardIsTrump = trumpRevealed && trumpSuit !== null && card.suit === trumpSuit;
    const cardIsLeadSuit = card.suit === leadSuit;
    const cardRank = RANK_ORDER_29[card.rank] ?? 0;

    if (winningIsTrump) {
      // Current winner is trump: only a higher trump can beat it
      if (cardIsTrump && cardRank > winningRank) {
        winnerId = playerId;
        winningCard = card;
        winningRank = cardRank;
      }
    } else {
      // Current winner is not trump
      if (cardIsTrump) {
        // Trump beats non-trump
        winnerId = playerId;
        winningCard = card;
        winningIsTrump = true;
        winningRank = cardRank;
      } else if (cardIsLeadSuit && cardRank > winningRank) {
        // Higher card of led suit
        winnerId = playerId;
        winningCard = card;
        winningRank = cardRank;
      }
      // else: off-suit, non-trump — doesn't win
    }
  }

  return { winnerId, winningCard };
}

/**
 * Check if a card play is valid (follows suit if possible).
 *
 * Rules:
 * 1. If leading (no lead suit), any card is valid
 * 2. Must follow lead suit if you have it
 * 3. If can't follow lead suit, can play anything
 * 4. Exception: if the revealer has mustPlayTrump flag AND trump cards, they must play trump THIS turn only
 *
 * @param hand The player's current hand
 * @param card The card they want to play
 * @param leadSuit The suit that was led (null if leading)
 * @param trumpSuit The active trump suit (null if no trump)
 * @param mustPlayTrump Whether the revealer must play trump this turn
 * @returns Whether the play is valid
 */
export function isValidPlay(
  hand: Card[],
  card: Card,
  leadSuit: Suit | null,
  trumpSuit: Suit | null = null,
  mustPlayTrump: boolean = false
): boolean {
  // If leading (no lead suit), any card is valid
  if (leadSuit === null) return true;

  // Check if player has cards of the lead suit
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);

  if (hasLeadSuit) {
    // Must follow suit
    return card.suit === leadSuit;
  }

  // Player doesn't have the lead suit
  // If this player must play trump (revealer's one-turn obligation), enforce it
  if (mustPlayTrump && trumpSuit) {
    const hasTrump = hand.some((c) => c.suit === trumpSuit);
    if (hasTrump) {
      return card.suit === trumpSuit;
    }
  }

  // No lead suit, no revealer obligation — can play anything
  return true;
}

/**
 * Check which cards in hand are playable.
 * Returns a boolean array parallel to the hand.
 */
export function getPlayableCards(
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null = null,
  mustPlayTrump: boolean = false
): boolean[] {
  return hand.map((card) => isValidPlay(hand, card, leadSuit, trumpSuit, mustPlayTrump));
}

/**
 * Calculate the points earned in a trick.
 */
export function getTrickPoints(plays: { card: Card }[]): number {
  return plays.reduce((sum, { card }) => sum + getCardPoints29(card), 0);
}
