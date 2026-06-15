import { type Pair } from './types';
import { makeRng, hashSeed } from './rng';
import type { Tenor } from '@/types/deal';

// Simulated forward-points feed (v3, FXSW-055). Deterministic per (pair, tenor)
// so any future golden test is stable, and seeded independently of the spot RNG
// so it never perturbs the seed-42 sequence. Exposed behind a tiny interface so
// a real forward-curve adapter can replace it later (mirrors the pricingFeed
// reference-anchor seam).
//
// Points are quoted in pips. Magnitude scales with tenor (an interest-rate-
// differential shape); sign is per-pair. A small deterministic jitter keeps the
// numbers from looking perfectly linear without breaking monotonic magnitude.

const FWD_SEED = 0x46574450; // 'FWDP'

const TENOR_YEARS: Record<Tenor, number> = {
  SPOT: 0,
  '1W': 1 / 52,
  '2W': 2 / 52,
  '1M': 1 / 12,
  '2M': 2 / 12,
  '3M': 0.25,
  '6M': 0.5,
  '9M': 0.75,
  '1Y': 1,
};

// Annualised forward points (pips/year) per pair.
const ANNUAL_POINTS: Record<Pair, number> = {
  EURUSD: -120,
  GBPUSD: -90,
  USDJPY: 600,
  USDINR: 800,
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

const cache = new Map<string, number>();

function compute(pair: Pair, tenor: Tenor): number {
  if (tenor === 'SPOT') return 0;
  const base = ANNUAL_POINTS[pair] * TENOR_YEARS[tenor];
  const rng = makeRng(hashSeed(`${pair}:${tenor}`) ^ FWD_SEED);
  const jitter = (rng() - 0.5) * 0.6; // ±0.3 pip, deterministic
  return round1(base + jitter);
}

export type ForwardPointsFeed = {
  get: (pair: Pair, tenor: Tenor) => number;
};

export const forwardPointsFeed: ForwardPointsFeed = {
  get(pair, tenor) {
    const key = `${pair}:${tenor}`;
    let v = cache.get(key);
    if (v === undefined) {
      v = compute(pair, tenor);
      cache.set(key, v);
    }
    return v;
  },
};
