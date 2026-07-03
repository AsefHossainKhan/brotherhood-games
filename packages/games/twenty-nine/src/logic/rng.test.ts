import { describe, it, expect } from 'vitest';
import { createSeededRng, splitmix32, createShuffleRng, generateRandomSeed } from './rng';

describe('createSeededRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for same seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('splitmix32', () => {
  it('avalanches similar inputs', () => {
    const a = splitmix32(1000);
    const b = splitmix32(1001);
    expect(a).not.toBe(b);
    expect(Math.abs(a - b)).toBeGreaterThan(10000);
  });

  it('handles zero correctly', () => {
    expect(splitmix32(0)).toBe(splitmix32(0));
  });

  it('handles negative inputs', () => {
    const val = splitmix32(-1);
    expect(typeof val).toBe('number');
    expect(Number.isFinite(val)).toBe(true);
  });
});

describe('createShuffleRng', () => {
  it('produces different RNGs for different indices', () => {
    const rng0 = createShuffleRng(999, 0);
    const rng1 = createShuffleRng(999, 1);
    const vals0 = Array.from({ length: 10 }, () => rng0());
    const vals1 = Array.from({ length: 10 }, () => rng1());
    expect(vals0).not.toEqual(vals1);
  });

  it('produces same RNG for same base seed and index', () => {
    const rng1 = createShuffleRng(42, 5);
    const rng2 = createShuffleRng(42, 5);
    const vals1 = Array.from({ length: 10 }, () => rng1());
    const vals2 = Array.from({ length: 10 }, () => rng2());
    expect(vals1).toEqual(vals2);
  });
});

describe('generateRandomSeed', () => {
  it('returns a number', () => {
    const seed = generateRandomSeed();
    expect(typeof seed).toBe('number');
    expect(Number.isFinite(seed)).toBe(true);
  });

  it('produces different values on successive calls', () => {
    const seeds = new Set(Array.from({ length: 10 }, () => generateRandomSeed()));
    expect(seeds.size).toBeGreaterThan(1);
  });
});
