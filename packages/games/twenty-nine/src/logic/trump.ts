import type { Card, Suit } from '@brotherhood/shared';
import { RANK_ORDER_29 } from '@brotherhood/shared';

/**
 * Select the trump suit normally.
 * The suit is immediately known to all players.
 */
export function selectSuitTrump(suit: Suit): { suit: Suit; isHidden: boolean } {
  return { suit, isHidden: false };
}

/**
 * Select seventh-card trump mode.
 * The trump is determined by the actual 7th card in the declarer's hand.
 * Only the declarer sees it until reveal.
 */
export function selectSeventhCardTrump(hand: Card[]): {
  suit: Suit;
  seventhCard: Card;
} {
  if (hand.length < 7) {
    throw new Error('Hand must have at least 7 cards for seventh-card trump');
  }

  const seventhCard = hand[6]; // 0-indexed, so index 6 = 7th card
  return {
    suit: seventhCard.suit,
    seventhCard,
  };
}

/**
 * Select Joker (no trump).
 * No trump exists for the entire game.
 * Marriage is disabled. Double/Re-Double/Full Set still allowed.
 */
export function selectJoker(): { suit: null; isHidden: boolean } {
  return { suit: null, isHidden: false };
}

/**
 * Reveal a hidden trump.
 * After reveal, the trump suit becomes public.
 * If the revealer has cards of the revealed suit, they must play it.
 */
export function revealTrump(
  revealerHand: Card[],
  trumpSuit: Suit
): {
  revealed: boolean;
  mustPlaySuit: boolean;
} {
  const hasSuit = revealerHand.some((c) => c.suit === trumpSuit);
  return {
    revealed: true,
    mustPlaySuit: hasSuit,
  };
}

/**
 * Check if a player can reveal the hidden trump.
 * A player can reveal if they have at least one card of the hidden trump suit.
 */
export function canRevealTrump(hand: Card[], trumpSuit: Suit | null): boolean {
  if (!trumpSuit) return false;
  return hand.some((c) => c.suit === trumpSuit);
}

/**
 * Check if the game should be cancelled because hidden trump was never revealed.
 * If all 8 tricks are played without revealing, the game is cancelled.
 */
export function shouldCancelForHiddenTrump(
  trumpType: string,
  trumpRevealed: boolean,
  tricksPlayed: number,
  totalTricks: number
): boolean {
  return trumpType === 'seventh-card' && !trumpRevealed && tricksPlayed >= totalTricks;
}
