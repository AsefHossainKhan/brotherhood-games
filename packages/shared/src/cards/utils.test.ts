import { describe, it, expect } from 'vitest';
import {
  buildDeck32,
  buildDeck52,
  compareCards29,
  getCardPoints29,
  sameSuit,
  cardsOfSuit,
  hasSuit,
  isWeakHand,
  sortHand29,
} from './utils';
import type { Card, Suit } from '../types/card';

const card = (suit: Suit, rank: string): Card => ({ suit, rank } as Card);

describe('buildDeck32', () => {
  it('creates a 32-card deck', () => {
    expect(buildDeck32()).toHaveLength(32);
  });

  it('has 4 suits × 8 ranks', () => {
    const deck = buildDeck32();
    const suits = new Set(deck.map((c) => c.suit));
    const ranks = new Set(deck.map((c) => c.rank));
    expect(suits.size).toBe(4);
    expect(ranks.size).toBe(8);
  });
});

describe('buildDeck52', () => {
  it('creates a 52-card deck', () => {
    expect(buildDeck52()).toHaveLength(52);
  });

  it('has 4 suits × 13 ranks', () => {
    const deck = buildDeck52();
    const suits = new Set(deck.map((c) => c.suit));
    const ranks = new Set(deck.map((c) => c.rank));
    expect(suits.size).toBe(4);
    expect(ranks.size).toBe(13);
  });
});

describe('compareCards29', () => {
  it('J > 9 > A > 10 > K > Q > 8 > 7', () => {
    expect(compareCards29(card('hearts', 'J'), card('hearts', '9'))).toBeGreaterThan(0);
    expect(compareCards29(card('hearts', '9'), card('hearts', 'A'))).toBeGreaterThan(0);
    expect(compareCards29(card('hearts', 'A'), card('hearts', '10'))).toBeGreaterThan(0);
    expect(compareCards29(card('hearts', '10'), card('hearts', 'K'))).toBeGreaterThan(0);
    expect(compareCards29(card('hearts', 'K'), card('hearts', 'Q'))).toBeGreaterThan(0);
    expect(compareCards29(card('hearts', 'Q'), card('hearts', '8'))).toBeGreaterThan(0);
    expect(compareCards29(card('hearts', '8'), card('hearts', '7'))).toBeGreaterThan(0);
  });

  it('equal cards return 0', () => {
    expect(compareCards29(card('hearts', 'J'), card('spades', 'J'))).toBe(0);
  });

  it('suit does not affect ranking', () => {
    expect(compareCards29(card('hearts', 'J'), card('spades', 'J'))).toBe(0);
    expect(compareCards29(card('diamonds', '9'), card('clubs', '9'))).toBe(0);
  });
});

describe('getCardPoints29', () => {
  it('J = 3', () => expect(getCardPoints29(card('hearts', 'J'))).toBe(3));
  it('9 = 2', () => expect(getCardPoints29(card('hearts', '9'))).toBe(2));
  it('A = 1', () => expect(getCardPoints29(card('hearts', 'A'))).toBe(1));
  it('10 = 1', () => expect(getCardPoints29(card('hearts', '10'))).toBe(1));
  it('K = 0', () => expect(getCardPoints29(card('hearts', 'K'))).toBe(0));
  it('Q = 0', () => expect(getCardPoints29(card('hearts', 'Q'))).toBe(0));
  it('8 = 0', () => expect(getCardPoints29(card('hearts', '8'))).toBe(0));
  it('7 = 0', () => expect(getCardPoints29(card('hearts', '7'))).toBe(0));

  it('total deck points = 28', () => {
    const deck = buildDeck32();
    const total = deck.reduce((sum, c) => sum + getCardPoints29(c), 0);
    expect(total).toBe(28);
  });
});

describe('sameSuit', () => {
  it('true for same suit', () => {
    expect(sameSuit(card('hearts', 'J'), card('hearts', '7'))).toBe(true);
  });
  it('false for different suit', () => {
    expect(sameSuit(card('hearts', 'J'), card('spades', 'J'))).toBe(false);
  });
});

describe('cardsOfSuit', () => {
  it('returns only matching cards', () => {
    const hand = [
      card('hearts', 'J'),
      card('hearts', '9'),
      card('spades', 'A'),
    ];
    expect(cardsOfSuit(hand, 'hearts')).toHaveLength(2);
    expect(cardsOfSuit(hand, 'spades')).toHaveLength(1);
    expect(cardsOfSuit(hand, 'diamonds')).toHaveLength(0);
  });
});

describe('hasSuit', () => {
  it('true when hand has the suit', () => {
    const hand = [card('hearts', 'J'), card('spades', 'A')];
    expect(hasSuit(hand, 'hearts')).toBe(true);
  });
  it('false when hand lacks the suit', () => {
    const hand = [card('hearts', 'J'), card('spades', 'A')];
    expect(hasSuit(hand, 'diamonds')).toBe(false);
  });
});

describe('isWeakHand', () => {
  it('true when all cards have 0 points', () => {
    const hand = [
      card('hearts', 'K'),
      card('hearts', 'Q'),
      card('spades', '8'),
      card('spades', '7'),
    ];
    expect(isWeakHand(hand)).toBe(true);
  });
  it('false when any card has points', () => {
    const hand = [
      card('hearts', 'J'),
      card('hearts', 'Q'),
      card('spades', '8'),
    ];
    expect(isWeakHand(hand)).toBe(false);
  });
});

describe('sortHand29', () => {
  it('sorts by 29 ranking (highest first)', () => {
    const hand = [
      card('hearts', '7'),
      card('hearts', 'J'),
      card('hearts', '9'),
      card('hearts', 'K'),
    ];
    const sorted = sortHand29(hand);
    expect(sorted[0].rank).toBe('J');
    expect(sorted[1].rank).toBe('9');
    expect(sorted[2].rank).toBe('K');
    expect(sorted[3].rank).toBe('7');
  });

  it('does not mutate the original hand', () => {
    const hand = [card('hearts', '7'), card('hearts', 'J')];
    sortHand29(hand);
    expect(hand[0].rank).toBe('7');
  });
});
