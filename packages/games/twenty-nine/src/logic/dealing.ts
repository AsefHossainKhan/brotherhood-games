import type { Card } from '@brotherhood/shared';
import { getCardPoints29, isWeakHand } from '@brotherhood/shared/cards/utils';

/**
 * Check if a hand qualifies for weak hand cancellation.
 * A weak hand has 0 points: no J, no 9, no A, no 10.
 */
export function canCancelWeakHand(hand: Card[]): boolean {
  return isWeakHand(hand);
}

/**
 * Create a new deck, shuffle, and deal the first 4 cards to each player.
 */
export function firstDeal(
  deck: Card[],
  playerCount: number
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  for (let i = 0; i < playerCount * 4; i++) {
    hands[i % playerCount].push(deck[i]);
  }

  return {
    hands,
    remaining: deck.slice(playerCount * 4),
  };
}

/**
 * Deal the second 4 cards to each player.
 */
export function secondDeal(
  remaining: Card[],
  existingHands: Card[][],
  playerCount: number
): { hands: Card[][]; remaining: Card[] } {
  const hands = existingHands.map((h) => [...h]);

  for (let i = 0; i < playerCount * 4; i++) {
    hands[i % playerCount].push(remaining[i]);
  }

  return {
    hands,
    remaining: remaining.slice(playerCount * 4),
  };
}

/**
 * Get the total points in a hand.
 */
export function getHandPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + getCardPoints29(card), 0);
}
