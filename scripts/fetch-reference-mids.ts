import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const PAIRS = ['EUR', 'GBP', 'JPY', 'INR'] as const;
export const OUT_PATH = resolve('src/services/feed/referenceMids.json');

export interface ReferenceMids {
  EURUSD: number;
  GBPUSD: number;
  USDJPY: number;
  USDINR: number;
}

export interface ReferenceMidsPayload {
  date: string;
  source: 'frankfurter.dev' | 'fallback';
  mids: ReferenceMids;
}

// Hard-coded fallback in case Frankfurter is unreachable at build time.
// Refresh manually if this file is the only source for > 1 month.
export const FALLBACK: ReferenceMidsPayload = {
  date: '2026-05-13',
  source: 'fallback',
  mids: { EURUSD: 1.1715, GBPUSD: 1.351, USDJPY: 157.77, USDINR: 95.67 },
};

export const round = (n: number, dp: number): number =>
  Math.round(n * 10 ** dp) / 10 ** dp;

interface FrankfurterResponse {
  date: string;
  rates: Record<string, number>;
}

// Plausible ranges for each computed mid. A live response is only trusted if
// every field is finite and inside its band — a poisoned-but-HTTP-200 payload
// (or a missing/zero rate that would produce NaN/Infinity on inversion) is
// rejected and the build falls back to the pinned mids. (FXSW-088)
const RANGES: Record<keyof ReferenceMids, readonly [number, number]> = {
  EURUSD: [0.5, 2.0],
  GBPUSD: [0.5, 2.5],
  USDJPY: [50, 300],
  USDINR: [40, 200],
};

const validateMids = (mids: ReferenceMids): void => {
  for (const key of Object.keys(RANGES) as Array<keyof ReferenceMids>) {
    const value = mids[key];
    const [lo, hi] = RANGES[key];
    if (!Number.isFinite(value) || value < lo || value > hi) {
      throw new Error(`reference mid ${key}=${value} outside plausible range [${lo}, ${hi}]`);
    }
  }
};

export async function fetchReferenceMids(): Promise<ReferenceMidsPayload> {
  // FXSW-088 (security): the live third-party fetch is now OPT-IN. By default —
  // and in CI — the build uses the pinned FALLBACK mids, so a normal
  // build/predev/prebuild makes no unauthenticated call to a third party and the
  // seed-42 golden sequence (recorded against EURUSD 1.1715) stays deterministic.
  // Set FETCH_LIVE_MIDS=true to refresh from the provider (e.g. a live-demo
  // deploy); USE_FALLBACK_MIDS=true still forces the fallback as a hard override.
  if (process.env.FETCH_LIVE_MIDS !== 'true' || process.env.USE_FALLBACK_MIDS === 'true') {
    return FALLBACK;
  }

  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${PAIRS.join(',')}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as FrankfurterResponse;

    const mids: ReferenceMids = {
      EURUSD: round(1 / data.rates.EUR, 4),
      GBPUSD: round(1 / data.rates.GBP, 4),
      USDJPY: round(data.rates.JPY, 2),
      USDINR: round(data.rates.INR, 2),
    };
    validateMids(mids);
    return { date: data.date, source: 'frankfurter.dev', mids };
  } catch (err) {
    console.warn(
      `Live reference-mids fetch failed or rejected (${(err as Error).message}); using pinned fallback.`,
    );
    return FALLBACK;
  }
}

export async function main(outPath: string = OUT_PATH): Promise<void> {
  const payload = await fetchReferenceMids();
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (payload.source === 'frankfurter.dev') {
    console.log(`Reference mids written for ${payload.date}:`, payload.mids);
  }
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
