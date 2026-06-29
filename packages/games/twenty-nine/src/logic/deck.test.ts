import { describe, it, expect } from 'vitest';
import { buildDeck, shuffleDeck, dealCards } from './deck';
import type { Card } from '@brotherhood/shared';

describe('buildDeck', () => {
  it('should create a 32-card deck', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(32);
  });

  it('should have 4 suits × 8 ranks', () => {
    const deck = buildDeck();
    const suits = new Set(deck.map((c) => c.suit));
    const ranks = new Set(deck.map((c) => c.rank));
    expect(suits).toHaveLength(4);
    expect(ranks).toHaveLength(8);
  });

  it('should have 8 cards per suit', () => {
    const deck = buildDeck();
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    for (const suit of suits) {
      const count = deck.filter((c) => c.suit === suit).length;
      expect(count).toBe(8);
    }
  });

  it('should contain only valid 29 ranks: J, 9, A, 10, K, Q, 8, 7', () => {
    const deck = buildDeck();
    const validRanks = new Set(['J', '9', 'A', '10', 'K', 'Q', '8', '7']);
    for (const card of deck) {
      expect(validRanks.has(card.rank)).toBe(true);
    }
  });
});

describe('shuffleDeck', () => {
  it('should return a deck of the same length', () => {
    const deck = buildDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(32);
  });

  it('should not mutate the original deck', () => {
    const deck = buildDeck();
    const originalFirst = { ...deck[0] };
    shuffleDeck(deck);
    expect(deck[0]).toEqual(originalFirst);
  });

  it('should contain all the same cards', () => {
    const deck = buildDeck();
    const shuffled = shuffleDeck(deck);
    const sorted = (cards: Card[]) =>
      cards
        .map((c) => `${c.suit}_${c.rank}`)
        .sort()
        .join(',');
    expect(sorted(shuffled)).toBe(sorted(deck));
  });

  it('should produce a different order (statistical)', () => {
    const deck = buildDeck();
    // Run shuffle 10 times — at least one should differ from original
    const original = deck.map((c) => `${c.suit}_${c.rank}`).join(',');
    let anyDifferent = false;
    for (let i = 0; i < 10; i++) {
      const shuffled = shuffleDeck(deck).map((c) => `${c.suit}_${c.rank}`).join(',');
      if (shuffled !== original) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);
  });
});

describe('dealCards', () => {
  it('should deal the correct number of cards per player', () => {
    const deck = buildDeck();
    const { hands } = dealCards(deck, 4, 8);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(8);
    }
  });

  it('should return remaining cards', () => {
    const deck = buildDeck();
    const { remaining } = dealCards(deck, 4, 8);
    expect(remaining).toHaveLength(0); // 32 - 4*8 = 0
  });

  it('should deal first 4 cards round-robin', () => {
    const deck = buildDeck();
    const { hands } = dealCards(deck, 4, 4);
    // First 4 cards go to players 0,1,2,3
    expect(hands[0][0]).toEqual(deck[0]);
    expect(hands[1][0]).toEqual(deck[1]);
    expect(hands[2][0]).toEqual(deck[2]);
    expect(hands[3][0]).toEqual(deck[3]);
  });

  it('should throw if not enough cards', () => {
    const smallDeck: Card[] = [
      { suit: 'hearts', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
    ];
    expect(() => dealCards(smallDeck, 4, 8)).toThrow('Not enough cards');
  });

  it('should handle partial dealing (first deal = 4 cards)', () => {
    const deck = buildDeck();
    const { hands, remaining } = dealCards(deck, 4, 4);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(4);
    }
    expect(remaining).toHaveLength(16);
  });
});
