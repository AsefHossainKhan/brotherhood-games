import type { Card, Suit } from '@brotherhood/shared';
import { SUITS, RANKS_32 } from '@brotherhood/shared';

/**
 * Build a 32-card deck for Bangladeshi 29.
 * Cards: J, 9, A, 10, K, Q, 8, 7 × 4 suits
 */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS_32) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm with crypto-random values.
 * Returns a new array (does not mutate the input).
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a cryptographically random integer in [0, max).
 */
function cryptoRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Deal cards from the deck.
 * Returns the dealt cards and the remaining deck.
 */
export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const totalNeeded = playerCount * cardsPerPlayer;

  if (deck.length < totalNeeded) {
    throw new Error(`Not enough cards: need ${totalNeeded}, have ${deck.length}`);
  }

  for (let i = 0; i < totalNeeded; i++) {
    hands[i % playerCount].push(deck[i]);
  }

  return {
    hands,
    remaining: deck.slice(totalNeeded),
  };
}
