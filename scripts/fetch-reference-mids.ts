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

export async function fetchReferenceMids(): Promise<ReferenceMidsPayload> {
  // Pinned-fallback escape hatch for CI. The seed-42 golden sequence in
  // pricingFeed.test.ts was recorded against the FALLBACK mids (EURUSD
  // 1.1715); when Frankfurter responds with today's live rate the
  // sequence shifts and the test fails. CI sets USE_FALLBACK_MIDS=true
  // so the unit suite stays deterministic regardless of network state.
  // Production builds (predev / prebuild + the deploy workflow) leave
  // this unset so the live demo gets fresh mids.
  if (process.env.USE_FALLBACK_MIDS === 'true') {
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
    return { date: data.date, source: 'frankfurter.dev', mids };
  } catch (err) {
    console.warn(
      `Frankfurter fetch failed (${(err as Error).message}); using fallback.`,
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
