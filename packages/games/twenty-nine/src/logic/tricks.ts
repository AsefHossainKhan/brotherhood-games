import type { Card, Suit } from '@brotherhood/shared';
import { RANK_ORDER_29, getCardPoints29 } from '@brotherhood/shared/cards/utils';

/**
 * Resolve a trick: determine the winner.
 *
 * Rules:
 * - Highest card of the led suit wins
 * - Trump beats non-trump
 * - Highest trump wins
 * - If no trump played, highest card of led suit wins
 *
 * @param plays Array of { playerId, card } in play order
 * @param trumpSuit The active trump suit (null if no trump / joker)
 * @returns The winning player id
 */
export function resolveTrick(
  plays: { playerId: string; card: Card }[],
  trumpSuit: Suit | null
): { winnerId: string; winningCard: Card } {
  if (plays.length === 0) {
    throw new Error('No plays to resolve');
  }

  const leadSuit = plays[0].card.suit;
  let winnerId = plays[0].playerId;
  let winningCard = plays[0].card;
  let winningIsTrump = trumpSuit !== null && plays[0].card.suit === trumpSuit;
  let winningRank = RANK_ORDER_29[plays[0].card.rank] ?? 0;

  for (let i = 1; i < plays.length; i++) {
    const { playerId, card } = plays[i];
    const cardIsTrump = trumpSuit !== null && card.suit === trumpSuit;
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
 * @param hand The player's current hand
 * @param card The card they want to play
 * @param leadSuit The suit that was led (null if leading)
 * @returns Whether the play is valid
 */
export function isValidPlay(hand: Card[], card: Card, leadSuit: Suit | null): boolean {
  // If leading (no lead suit), any card is valid
  if (leadSuit === null) return true;

  // Check if player has cards of the lead suit
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);

  if (hasLeadSuit) {
    // Must follow suit
    return card.suit === leadSuit;
  }

  // Player doesn't have the lead suit — can play anything
  return true;
}

/**
 * Calculate the points earned in a trick.
 */
export function getTrickPoints(plays: { card: Card }[]): number {
  return plays.reduce((sum, { card }) => sum + getCardPoints29(card), 0);
}
