// Shared deterministic PRNG (FXSW-055). Extracted from pricingFeed so the
// forward-points feed can reuse the exact same Mulberry32 generator with an
// independent seed — keeping every simulated stream reproducible without the
// forward stream perturbing the spot seed-42 golden sequence.

export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a string hash → 32-bit seed, so a (pair, tenor) key maps to a stable
// per-series seed.
export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
