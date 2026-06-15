import { PAIRS, type Pair } from '../types';
import type { MidMap } from './types';

// Market-data provider adapter (FXSW-051). Per the v3 brand-neutrality
// exception, the real provider may be named in *adapter code* only — never in
// UI strings or build-output identifiers.
//
// Uses the previous-close forex aggregate (`/v2/aggs/ticker/C:{PAIR}/prev`),
// which is available on the provider's free tier and refreshes slowly enough to
// suit the 5-minute poll cadence. The aggregate close `c` is already quoted in
// our pair convention (EURUSD ≈ 1.17, USDJPY ≈ 157), so no inversion is needed
// — unlike the build-time Frankfurter script which quotes USD-base rates.
//
// Endpoint: Massive (https://massive.com) — the rebrand of Polygon.io (2025-10).
// The legacy `api.polygon.io` host has been retired, so we target `api.massive.com`;
// the path, `C:{PAIR}` ticker convention, and `apiKey` query param are unchanged.
// Naming the provider is permitted here only (adapter code) per the v3
// brand-neutrality exception — never in UI strings or build-output identifiers.
const BASE_URL = 'https://api.massive.com/v2/aggs/ticker';

const PRECISION: Record<Pair, number> = {
  EURUSD: 4,
  GBPUSD: 4,
  USDJPY: 2,
  USDINR: 2,
};

const round = (n: number, dp: number): number => Math.round(n * 10 ** dp) / 10 ** dp;

export class ProviderError extends Error {
  readonly rateLimited: boolean;
  constructor(message: string, rateLimited = false) {
    super(message);
    this.name = 'ProviderError';
    this.rateLimited = rateLimited;
  }
}

type AggregateResponse = {
  results?: Array<{ c?: number }>;
};

// Fetch latest reference mids for the requested pairs. Sequential to stay within
// the provider's free-tier request budget. `fetchImpl` is injectable for tests
// so no real network call is made under Vitest (CLAUDE.md "no real network in
// /src" — the live call exists only here and is exercised via a mock).
export async function fetchMids(
  apiKey: string,
  pairs: readonly Pair[] = PAIRS,
  fetchImpl: typeof fetch = fetch,
): Promise<MidMap> {
  const out: MidMap = {};
  for (const pair of pairs) {
    const url = `${BASE_URL}/C:${pair}/prev?adjusted=true&apiKey=${encodeURIComponent(apiKey)}`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
    if (res.status === 429) {
      throw new ProviderError('Rate limit exceeded', true);
    }
    if (!res.ok) {
      throw new ProviderError(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as AggregateResponse;
    const close = data.results?.[0]?.c;
    if (typeof close === 'number' && Number.isFinite(close)) {
      out[pair] = round(close, PRECISION[pair]);
    }
  }
  return out;
}
