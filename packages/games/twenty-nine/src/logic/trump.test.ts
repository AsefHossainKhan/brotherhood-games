import { describe, it, expect } from 'vitest';
import {
  selectSuitTrump,
  selectSeventhCardTrump,
  selectJoker,
  revealTrump,
  canRevealTrump,
  shouldCancelForHiddenTrump,
} from './trump';
import type { Card, Suit } from '@brotherhood/shared';

const card = (suit: Suit, rank: string): Card => ({ suit, rank } as Card);

describe('selectSuitTrump', () => {
  it('returns the selected suit, not hidden', () => {
    const result = selectSuitTrump('hearts');
    expect(result.suit).toBe('hearts');
    expect(result.isHidden).toBe(false);
  });
});

describe('selectSeventhCardTrump', () => {
  it('returns the suit of the 7th card in hand', () => {
    const hand: Card[] = [
      card('hearts', 'J'),
      card('hearts', '9'),
      card('spades', 'A'),
      card('spades', 'K'),
      card('diamonds', 'Q'),
      card('diamonds', '8'),
      card('clubs', '7'),     // 7th card → trump is clubs
      card('clubs', '10'),
    ];
    const result = selectSeventhCardTrump(hand);
    expect(result.suit).toBe('clubs');
    expect(result.seventhCard).toEqual(card('clubs', '7'));
  });

  it('throws if hand has fewer than 7 cards', () => {
    const shortHand: Card[] = [card('hearts', 'J'), card('spades', 'A')];
    expect(() => selectSeventhCardTrump(shortHand)).toThrow('at least 7 cards');
  });
});

describe('selectJoker', () => {
  it('returns null suit (no trump)', () => {
    const result = selectJoker();
    expect(result.suit).toBe(null);
    expect(result.isHidden).toBe(false);
  });
});

describe('revealTrump', () => {
  it('reveals trump and flags mustPlaySuit if revealer has trump cards', () => {
    const hand: Card[] = [
      card('hearts', 'J'),
      card('hearts', '9'),
      card('spades', 'A'),
    ];
    const result = revealTrump(hand, 'hearts');
    expect(result.revealed).toBe(true);
    expect(result.mustPlaySuit).toBe(true);
  });

  it('reveals trump, no mustPlaySuit if revealer has no trump cards', () => {
    const hand: Card[] = [
      card('spades', 'A'),
      card('diamonds', 'K'),
    ];
    const result = revealTrump(hand, 'hearts');
    expect(result.revealed).toBe(true);
    expect(result.mustPlaySuit).toBe(false);
  });
});

describe('canRevealTrump', () => {
  it('true if hand contains trump suit', () => {
    const hand: Card[] = [card('hearts', 'J'), card('spades', 'A')];
    expect(canRevealTrump(hand, 'hearts')).toBe(true);
  });

  it('false if hand has no trump suit', () => {
    const hand: Card[] = [card('spades', 'A'), card('diamonds', 'K')];
    expect(canRevealTrump(hand, 'hearts')).toBe(false);
  });

  it('false if trump is null', () => {
    const hand: Card[] = [card('hearts', 'J')];
    expect(canRevealTrump(hand, null)).toBe(false);
  });
});

describe('shouldCancelForHiddenTrump', () => {
  it('cancels if seventh-card trump never revealed after all tricks', () => {
    expect(shouldCancelForHiddenTrump('seventh-card', false, 8, 8)).toBe(true);
  });

  it('cancels if suit trump never revealed after all tricks', () => {
    expect(shouldCancelForHiddenTrump('suit', false, 8, 8)).toBe(true);
  });

  it('cancels if joker trump never revealed after all tricks', () => {
    expect(shouldCancelForHiddenTrump('joker', false, 8, 8)).toBe(true);
  });

  it('does not cancel if trump was revealed', () => {
    expect(shouldCancelForHiddenTrump('seventh-card', true, 8, 8)).toBe(false);
  });

  it('does not cancel if tricks still remaining', () => {
    expect(shouldCancelForHiddenTrump('seventh-card', false, 4, 8)).toBe(false);
  });
});
