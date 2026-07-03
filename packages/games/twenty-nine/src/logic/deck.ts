import type { Card, Suit } from '@brotherhood/shared';
import { SUITS, RANKS_32 } from '@brotherhood/shared';
import type { Rng } from './rng';

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
 * Generate a cryptographically random float in [0, 1).
 */
function cryptoRandomFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm.
 * If an rng is provided, uses it for deterministic shuffling.
 * Otherwise falls back to crypto-random values.
 * Returns a new array (does not mutate the input).
 */
export function shuffleDeck(deck: Card[], rng?: Rng): Card[] {
  const result = [...deck];
  const rand = rng ?? cryptoRandomFloat;

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
