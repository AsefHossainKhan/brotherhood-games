export type Rng = () => number;

/**
 * Mulberry32 32-bit PRNG. Returns uniform float ∈ [0, 1).
 * Period: 2^32. Statistical quality sufficient for card shuffling.
 */
export function createSeededRng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Avalanche/mixing function. Ensures sequential counter values
 * produce uncorrelated derived seeds.
 */
export function splitmix32(x: number): number {
  let z = (x + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) | 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) | 0;
  return (z ^ (z >>> 16)) | 0;
}

/**
 * Per-shuffle RNG derivation. XORs base seed with shuffle index,
 * then applies splitmix32 avalanche before seeding Mulberry32.
 */
export function createShuffleRng(baseSeed: number, index: number): Rng {
  return createSeededRng(splitmix32(baseSeed ^ index));
}

/**
 * Web Crypto wrapper. Returns single 32-bit unsigned integer.
 */
export function generateRandomSeed(): number {
  const u32 = new Uint32Array(1);
  crypto.getRandomValues(u32);
  return u32[0];
}
