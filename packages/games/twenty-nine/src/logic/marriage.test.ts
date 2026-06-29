import { describe, it, expect } from 'vitest';
import { detectMarriage, isMarriageCard, calculateEffectiveBid } from './marriage';
import type { Card, Suit } from '@brotherhood/shared';

const card = (suit: Suit, rank: string): Card => ({ suit, rank } as Card);

describe('detectMarriage', () => {
  it('returns trump suit when hand has K+Q of trump', () => {
    const hand: Card[] = [
      card('hearts', 'K'),
      card('hearts', 'Q'),
      card('spades', 'J'),
      card('diamonds', '7'),
    ];
    expect(detectMarriage(hand, 'hearts')).toBe('hearts');
  });

  it('returns null if missing K or Q of trump', () => {
    const onlyKing: Card[] = [card('hearts', 'K'), card('spades', 'J')];
    expect(detectMarriage(onlyKing, 'hearts')).toBe(null);

    const onlyQueen: Card[] = [card('hearts', 'Q'), card('spades', 'J')];
    expect(detectMarriage(onlyQueen, 'hearts')).toBe(null);
  });

  it('returns null if K+Q exist but of different suit than trump', () => {
    const hand: Card[] = [
      card('hearts', 'K'),
      card('hearts', 'Q'),
      card('spades', 'J'),
    ];
    expect(detectMarriage(hand, 'spades')).toBe(null);
  });

  it('returns null when trump is null (joker mode)', () => {
    const hand: Card[] = [card('hearts', 'K'), card('hearts', 'Q')];
    expect(detectMarriage(hand, null)).toBe(null);
  });
});

describe('isMarriageCard', () => {
  it('K of trump is a marriage card', () => {
    expect(isMarriageCard(card('hearts', 'K'), 'hearts')).toBe(true);
  });

  it('Q of trump is a marriage card', () => {
    expect(isMarriageCard(card('hearts', 'Q'), 'hearts')).toBe(true);
  });

  it('K of non-trump is not a marriage card', () => {
    expect(isMarriageCard(card('spades', 'K'), 'hearts')).toBe(false);
  });

  it('non-K/Q of trump is not a marriage card', () => {
    expect(isMarriageCard(card('hearts', 'J'), 'hearts')).toBe(false);
    expect(isMarriageCard(card('hearts', 'A'), 'hearts')).toBe(false);
  });

  it('returns false when trump is null', () => {
    expect(isMarriageCard(card('hearts', 'K'), null)).toBe(false);
  });
});

describe('calculateEffectiveBid', () => {
  it('marriage on bidding team: effectiveBid = max(16, bid - 4)', () => {
    expect(calculateEffectiveBid(24, 0, 0)).toBe(20); // 24 - 4 = 20
    expect(calculateEffectiveBid(20, 1, 1)).toBe(16); // 20 - 4 = 16
    expect(calculateEffectiveBid(18, 0, 0)).toBe(16); // max(16, 14) = 16
  });

  it('marriage on defending team: effectiveBid = min(28, bid + 4)', () => {
    expect(calculateEffectiveBid(20, 1, 0)).toBe(24); // 20 + 4 = 24
    expect(calculateEffectiveBid(26, 0, 1)).toBe(28); // min(28, 30) = 28
    expect(calculateEffectiveBid(24, 1, 0)).toBe(28); // min(28, 28) = 28
  });

  it('edge: minimum bid stays at 16', () => {
    expect(calculateEffectiveBid(16, 0, 0)).toBe(16); // max(16, 12)
  });

  it('edge: maximum bid stays at 28', () => {
    expect(calculateEffectiveBid(28, 1, 0)).toBe(28); // min(28, 32)
  });
});
