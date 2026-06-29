import { describe, it, expect } from 'vitest';
import { resolveTrick, isValidPlay, getTrickPoints } from './tricks';
import type { Card, Suit } from '@brotherhood/shared';

// Helper to create cards quickly
const card = (suit: Suit, rank: string): Card => ({ suit, rank } as Card);

describe('resolveTrick', () => {
  it('should throw on empty plays', () => {
    expect(() => resolveTrick([], 'hearts')).toThrow('No plays to resolve');
  });

  it('should return the only player when one play', () => {
    const plays = [{ playerId: 'p1', card: card('hearts', 'J') }];
    const result = resolveTrick(plays, 'hearts');
    expect(result.winnerId).toBe('p1');
  });

  it('highest card of led suit wins (no trump)', () => {
    const plays = [
      { playerId: 'p1', card: card('hearts', 'A') },
      { playerId: 'p2', card: card('hearts', 'K') },
      { playerId: 'p3', card: card('hearts', 'Q') },
      { playerId: 'p4', card: card('hearts', '10') },
    ];
    const result = resolveTrick(plays, 'spades');
    expect(result.winnerId).toBe('p1'); // A > K > Q > 10
  });

  it('trump beats non-trump', () => {
    const plays = [
      { playerId: 'p1', card: card('hearts', 'J') },   // led: hearts J (highest)
      { playerId: 'p2', card: card('hearts', '9') },
      { playerId: 'p3', card: card('spades', '7') },    // trump (spades)
      { playerId: 'p4', card: card('hearts', 'A') },
    ];
    const result = resolveTrick(plays, 'spades');
    expect(result.winnerId).toBe('p3'); // trump wins
  });

  it('higher trump beats lower trump', () => {
    const plays = [
      { playerId: 'p1', card: card('hearts', 'J') },
      { playerId: 'p2', card: card('spades', '7') },    // low trump
      { playerId: 'p3', card: card('spades', 'J') },    // high trump
      { playerId: 'p4', card: card('hearts', '9') },
    ];
    const result = resolveTrick(plays, 'spades');
    expect(result.winnerId).toBe('p3'); // J of spades > 7 of spades
  });

  it('off-suit non-trump cards do not win', () => {
    const plays = [
      { playerId: 'p1', card: card('hearts', '7') },
      { playerId: 'p2', card: card('diamonds', 'J') },  // off-suit, not trump
      { playerId: 'p3', card: card('clubs', '9') },     // off-suit, not trump
      { playerId: 'p4', card: card('hearts', 'K') },    // follows suit, beats 7
    ];
    const result = resolveTrick(plays, 'spades');
    expect(result.winnerId).toBe('p4'); // K of hearts beats 7 of hearts
  });

  it('Jack of trump is the highest card overall', () => {
    const plays = [
      { playerId: 'p1', card: card('hearts', 'J') },    // J but not trump
      { playerId: 'p2', card: card('spades', '9') },    // trump 9
      { playerId: 'p3', card: card('spades', 'J') },    // trump J — highest!
      { playerId: 'p4', card: card('hearts', 'A') },
    ];
    const result = resolveTrick(plays, 'spades');
    expect(result.winnerId).toBe('p3');
  });

  it('ranking: J > 9 > A > 10 > K > Q > 8 > 7', () => {
    // All same suit, no trump — J should win
    const plays = [
      { playerId: 'p7', card: card('hearts', '7') },
      { playerId: 'p8', card: card('hearts', '8') },
      { playerId: 'pQ', card: card('hearts', 'Q') },
      { playerId: 'pK', card: card('hearts', 'K') },
    ];
    // K beats Q beats 8 beats 7
    const result = resolveTrick(plays, 'spades');
    expect(result.winnerId).toBe('pK');
  });

  it('returns the winning card', () => {
    const winningCard = card('spades', 'J');
    const plays = [
      { playerId: 'p1', card: card('hearts', 'A') },
      { playerId: 'p2', card: winningCard },
    ];
    const result = resolveTrick(plays, 'spades');
    expect(result.winningCard).toEqual(winningCard);
  });
});

describe('isValidPlay', () => {
  const hand: Card[] = [
    card('hearts', 'J'),
    card('hearts', '9'),
    card('spades', 'A'),
    card('diamonds', 'K'),
  ];

  it('any card is valid when leading (leadSuit = null)', () => {
    expect(isValidPlay(hand, card('hearts', 'J'), null)).toBe(true);
    expect(isValidPlay(hand, card('spades', 'A'), null)).toBe(true);
    expect(isValidPlay(hand, card('diamonds', 'K'), null)).toBe(true);
  });

  it('must follow suit if possible', () => {
    // Lead suit is hearts, player has hearts → must play hearts
    expect(isValidPlay(hand, card('hearts', 'J'), 'hearts')).toBe(true);
    expect(isValidPlay(hand, card('spades', 'A'), 'hearts')).toBe(false);
    expect(isValidPlay(hand, card('diamonds', 'K'), 'hearts')).toBe(false);
  });

  it('can play anything if void in lead suit', () => {
    const noHearts: Card[] = [
      card('spades', 'A'),
      card('diamonds', 'K'),
      card('clubs', 'Q'),
    ];
    expect(isValidPlay(noHearts, card('spades', 'A'), 'hearts')).toBe(true);
    expect(isValidPlay(noHearts, card('diamonds', 'K'), 'hearts')).toBe(true);
    expect(isValidPlay(noHearts, card('clubs', 'Q'), 'hearts')).toBe(true);
  });
});

describe('getTrickPoints', () => {
  it('should sum card points correctly', () => {
    // J=3, 9=2, A=1, 10=1, K=0, Q=0, 8=0, 7=0
    const plays = [
      { card: card('hearts', 'J') },    // 3
      { card: card('spades', '9') },    // 2
      { card: card('hearts', 'A') },    // 1
      { card: card('diamonds', '7') },  // 0
    ];
    expect(getTrickPoints(plays)).toBe(6);
  });

  it('should return 0 for a trick with no point cards', () => {
    const plays = [
      { card: card('hearts', 'K') },
      { card: card('spades', 'Q') },
      { card: card('clubs', '8') },
      { card: card('diamonds', '7') },
    ];
    expect(getTrickPoints(plays)).toBe(0);
  });

  it('max trick points = J + 9 + A + 10 = 7', () => {
    const plays = [
      { card: card('hearts', 'J') },   // 3
      { card: card('hearts', '9') },   // 2
      { card: card('hearts', 'A') },   // 1
      { card: card('hearts', '10') },  // 1
    ];
    expect(getTrickPoints(plays)).toBe(7);
  });
});
