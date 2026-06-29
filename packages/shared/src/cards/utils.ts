/**
 * Pure card utility functions — no React, no JSX.
 * Safe to import from backend/Node.js code.
 */
import type { Suit, Card } from '../types/card';
import { SUITS, RANKS_32, RANKS_52 } from '../types/card';
import { RANK_ORDER_29, RANK_POINTS_29 } from '../constants/twenty-nine';

// Re-export constants
export { RANK_ORDER_29, RANK_POINTS_29 };

// ---- Deck Builders ----

/** Build a 32-card deck for Bangladeshi 29 */
export function buildDeck32(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS_32) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** Build a 52-card deck for Poker etc. */
export function buildDeck52(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS_52) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// ---- Card Utilities ----

/** Compare two cards by 29 ranking. Returns positive if a > b. */
export function compareCards29(a: Card, b: Card): number {
  return (RANK_ORDER_29[a.rank] ?? 0) - (RANK_ORDER_29[b.rank] ?? 0);
}

/** Get the point value of a card in 29 */
export function getCardPoints29(card: Card): number {
  return RANK_POINTS_29[card.rank] ?? 0;
}

/** Check if two cards have the same suit */
export function sameSuit(a: Card, b: Card): boolean {
  return a.suit === b.suit;
}

/** Get all cards of a given suit from a hand */
export function cardsOfSuit(hand: Card[], suit: Suit): Card[] {
  return hand.filter((c) => c.suit === suit);
}

/** Check if a hand has any cards of the given suit */
export function hasSuit(hand: Card[], suit: Suit): boolean {
  return hand.some((c) => c.suit === suit);
}

/** Check if a hand is a "weak hand" (0 points: no J, 9, A, 10) */
export function isWeakHand(hand: Card[]): boolean {
  return hand.every((c) => getCardPoints29(c) === 0);
}

/** Sort a hand by 29 ranking (highest first) */
export function sortHand29(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => compareCards29(b, a));
}
