import type { Card, Suit } from '@brotherhood/shared';
import { RANK_ORDER_29, TOTAL_DECK_POINTS } from '@brotherhood/shared';

/**
 * Detect if a hand contains a marriage (K + Q of the same suit).
 *
 * Only valid after trump reveal.
 * Returns the suit of the marriage, or null if none.
 */
export function detectMarriage(hand: Card[], trumpSuit: Suit | null): Suit | null {
  if (!trumpSuit) return null;

  const hasKing = hand.some((c) => c.suit === trumpSuit && c.rank === 'K');
  const hasQueen = hand.some((c) => c.suit === trumpSuit && c.rank === 'Q');

  if (hasKing && hasQueen) {
    return trumpSuit;
  }

  return null;
}

/**
 * Check if a specific card is part of a marriage.
 */
export function isMarriageCard(card: Card, trumpSuit: Suit | null): boolean {
  if (!trumpSuit) return false;
  return card.suit === trumpSuit && (card.rank === 'K' || card.rank === 'Q');
}

/**
 * Calculate the effective bid after marriage adjustment.
 *
 * Rules:
 * - If marriage belongs to bidding team: effectiveBid = max(16, bid - 4)
 * - If marriage belongs to defending team: effectiveBid = min(28, bid + 4)
 */
export function calculateEffectiveBid(
  originalBid: number,
  marriageTeam: 0 | 1,
  biddingTeam: 0 | 1
): number {
  if (marriageTeam === biddingTeam) {
    return Math.max(16, originalBid - 4);
  } else {
    return Math.min(28, originalBid + 4);
  }
}
