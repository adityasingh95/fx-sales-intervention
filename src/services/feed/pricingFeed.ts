import referenceMidsFile from './referenceMids.json';
import { makeRng } from './rng';
import { PAIRS, type Pair, type PriceTick, type PricingFeed } from './types';

type PairConfig = {
  pipSize: number;
  sigmaPips: number;
  spreadPips: number;
  precision: number;
};

const CONFIG: Record<Pair, PairConfig> = {
  EURUSD: { pipSize: 0.0001, sigmaPips: 0.3, spreadPips: 0.5, precision: 4 },
  GBPUSD: { pipSize: 0.0001, sigmaPips: 0.4, spreadPips: 1.0, precision: 4 },
  USDJPY: { pipSize: 0.01, sigmaPips: 0.3, spreadPips: 1.0, precision: 2 },
  USDINR: { pipSize: 0.01, sigmaPips: 0.5, spreadPips: 2.0, precision: 2 },
};

const TICK_INTERVAL_MS = 300;
const MEAN_REVERSION = 0.1;

declare global {
  interface Window {
    __seedFeed?: number;
  }
}

function makeNormal(rng: () => number): () => number {
  let cached: number | null = null;
  return () => {
    if (cached !== null) {
      const v = cached;
      cached = null;
      return v;
    }
    let u = rng();
    const v = rng();
    if (u < 1e-12) u = 1e-12;
    const r = Math.sqrt(-2 * Math.log(u));
    const theta = 2 * Math.PI * v;
    cached = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
}

const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

const referenceMids = (referenceMidsFile as { mids: Record<Pair, number> }).mids;

type Subscriber = (tick: PriceTick) => void;

const subscribers = new Map<Pair, Set<Subscriber>>();
const latest = new Map<Pair, PriceTick>();
const mids = new Map<Pair, number>();
const references = new Map<Pair, number>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let normal: () => number = () => 0;

function tick(): void {
  const now = Date.now();
  for (const pair of PAIRS) {
    const cfg = CONFIG[pair];
    const ref = references.get(pair) ?? referenceMids[pair];
    const cur = mids.get(pair) ?? ref;
    const drift = MEAN_REVERSION * (ref - cur) + normal() * cfg.sigmaPips * cfg.pipSize;
    const newMid = cur + drift;
    mids.set(pair, newMid);
    const halfSpread = (cfg.spreadPips / 2) * cfg.pipSize;
    const t: PriceTick = {
      pair,
      mid: round(newMid, cfg.precision),
      bid: round(newMid - halfSpread, cfg.precision),
      ask: round(newMid + halfSpread, cfg.precision),
      timestamp: now,
    };
    latest.set(pair, t);
    const subs = subscribers.get(pair);
    if (subs) {
      for (const cb of subs) cb(t);
    }
  }
}

export const pricingFeed: PricingFeed = {
  subscribe(pair, cb) {
    let set = subscribers.get(pair);
    if (!set) {
      set = new Set();
      subscribers.set(pair, set);
    }
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  },

  getLatest(pair) {
    return latest.get(pair) ?? null;
  },

  start() {
    if (intervalId !== null) return;
    const seed =
      typeof window !== 'undefined' && typeof window.__seedFeed === 'number'
        ? window.__seedFeed
        : Date.now() & 0xffffffff;
    normal = makeNormal(makeRng(seed));
    for (const pair of PAIRS) {
      references.set(pair, referenceMids[pair]);
      mids.set(pair, referenceMids[pair]);
    }
    intervalId = setInterval(tick, TICK_INTERVAL_MS);
  },

  stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    subscribers.clear();
    latest.clear();
    mids.clear();
    references.clear();
    normal = () => 0;
  },

  setReferences(next) {
    // Move the mean-reversion target only; `tick()` reads `references` first
    // (line: `references.get(pair) ?? referenceMids[pair]`), so the next tick
    // drifts toward the new anchor. Mids/RNG state are untouched.
    for (const pair of PAIRS) {
      const v = next[pair];
      if (typeof v === 'number' && Number.isFinite(v)) {
        references.set(pair, v);
      }
    }
  },

  clearReferences() {
    // Revert to the baked reference mids (used when the external feed is
    // disabled). If the feed is running, re-seed the anchors; otherwise leave
    // the map empty so `tick()` falls back to the baked file.
    references.clear();
    if (intervalId !== null) {
      for (const pair of PAIRS) {
        references.set(pair, referenceMids[pair]);
      }
    }
  },
};
