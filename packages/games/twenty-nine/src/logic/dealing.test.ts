import { describe, it, expect } from 'vitest';
import { canCancelWeakHand, firstDeal, secondDeal, getHandPoints } from './dealing';
import type { Card } from '@brotherhood/shared';

const card = (suit: 'hearts' | 'diamonds' | 'clubs' | 'spades', rank: string): Card =>
  ({ suit, rank } as Card);

describe('canCancelWeakHand', () => {
  it('returns true for a hand with 0 points (no J, 9, A, 10)', () => {
    const weakHand: Card[] = [
      card('hearts', 'K'),
      card('hearts', 'Q'),
      card('spades', '8'),
      card('spades', '7'),
      card('diamonds', 'K'),
      card('diamonds', 'Q'),
      card('clubs', '8'),
      card('clubs', '7'),
    ];
    expect(canCancelWeakHand(weakHand)).toBe(true);
  });

  it('returns false if hand has any point card', () => {
    const hand: Card[] = [
      card('hearts', 'J'),  // 3 pts
      card('hearts', 'Q'),
      card('spades', '8'),
      card('spades', '7'),
      card('diamonds', 'K'),
      card('diamonds', 'Q'),
      card('clubs', '8'),
      card('clubs', '7'),
    ];
    expect(canCancelWeakHand(hand)).toBe(false);
  });

  it('returns false if hand has a 9', () => {
    const hand: Card[] = [
      card('hearts', '9'),  // 2 pts
      card('hearts', 'Q'),
      card('spades', '8'),
      card('spades', '7'),
    ];
    expect(canCancelWeakHand(hand)).toBe(false);
  });
});

describe('firstDeal', () => {
  it('deals 4 cards to each player', () => {
    const deck = Array.from({ length: 32 }, (_, i) =>
      card(['hearts', 'diamonds', 'clubs', 'spades'][i % 4] as any, 'A')
    );
    const { hands, remaining } = firstDeal(deck, 4);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(4);
    }
    expect(remaining).toHaveLength(16);
  });

  it('deals round-robin (p0 gets cards 0,4,8,12)', () => {
    const deck = Array.from({ length: 32 }, (_, i) =>
      card('hearts', `${i}`) as Card
    );
    const { hands } = firstDeal(deck, 4);
    expect(hands[0][0]).toBe(deck[0]);
    expect(hands[0][1]).toBe(deck[4]);
    expect(hands[0][2]).toBe(deck[8]);
    expect(hands[0][3]).toBe(deck[12]);
  });
});

describe('secondDeal', () => {
  it('appends 4 more cards to each existing hand', () => {
    const existingHands: Card[][] = [
      [card('hearts', 'J'), card('hearts', '9'), card('hearts', 'A'), card('hearts', '10')],
      [card('spades', 'J'), card('spades', '9'), card('spades', 'A'), card('spades', '10')],
      [card('diamonds', 'J'), card('diamonds', '9'), card('diamonds', 'A'), card('diamonds', '10')],
      [card('clubs', 'J'), card('clubs', '9'), card('clubs', 'A'), card('clubs', '10')],
    ];
    const remaining = Array.from({ length: 16 }, (_, i) =>
      card('hearts', 'K') as Card
    );
    const { hands, remaining: left } = secondDeal(remaining, existingHands, 4);
    for (const hand of hands) {
      expect(hand).toHaveLength(8);
    }
    expect(left).toHaveLength(0);
  });

  it('does not mutate original hands', () => {
    const original: Card[][] = [
      [card('hearts', 'J'), card('hearts', '9')],
      [card('spades', 'J'), card('spades', '9')],
    ];
    const remaining = Array.from({ length: 8 }, () => card('diamonds', 'K'));
    secondDeal(remaining, original, 2);
    expect(original[0]).toHaveLength(2); // unchanged
  });
});

describe('getHandPoints', () => {
  it('sums card points correctly', () => {
    const hand: Card[] = [
      card('hearts', 'J'),    // 3
      card('hearts', '9'),    // 2
      card('hearts', 'A'),    // 1
      card('hearts', '10'),   // 1
      card('hearts', 'K'),    // 0
      card('hearts', 'Q'),    // 0
      card('hearts', '8'),    // 0
      card('hearts', '7'),    // 0
    ];
    expect(getHandPoints(hand)).toBe(7);
  });

  it('returns 0 for a hand with no point cards', () => {
    const hand: Card[] = [
      card('hearts', 'K'),
      card('hearts', 'Q'),
      card('hearts', '8'),
      card('hearts', '7'),
    ];
    expect(getHandPoints(hand)).toBe(0);
  });
});
