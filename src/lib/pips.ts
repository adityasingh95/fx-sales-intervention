import type { Pair } from '@/services/feed/types';
import type { MarginPair } from '@/types/deal';

// Pip math per docs/02 §2 + §4.4 + §4.5. CLAUDE.md mandates this module
// as the single source of truth for pip / margin arithmetic — no inline
// math in components.

const PIP_SIZE: Record<Pair, number> = {
  EURUSD: 0.0001,
  GBPUSD: 0.0001,
  USDJPY: 0.01,
  USDINR: 0.01,
};

export const pipSizeFor = (pair: Pair): number => PIP_SIZE[pair];

// Round to the pair's display precision to avoid float-drift artifacts
// (e.g. 1.0850 − 3*0.0001 = 1.0846999999999998).
const DECIMALS: Record<Pair, number> = {
  EURUSD: 4,
  GBPUSD: 4,
  USDJPY: 2,
  USDINR: 2,
};

const roundTo = (n: number, dp: number): number => {
  const factor = 10 ** dp;
  return Math.round(n * factor) / factor;
};

export const clientBidFromTrader = (
  traderBid: number,
  marginPips: number,
  pair: Pair,
): number => roundTo(traderBid - marginPips * pipSizeFor(pair), DECIMALS[pair]);

export const clientAskFromTrader = (
  traderAsk: number,
  marginPips: number,
  pair: Pair,
): number => roundTo(traderAsk + marginPips * pipSizeFor(pair), DECIMALS[pair]);

// Estimated profit in USD. For USD-quoted pairs (EURUSD, GBPUSD) the
// pip value is already a USD amount per base-CCY unit. For USD-based
// pairs (USDJPY, USDINR) the pip value is in the quote CCY and needs
// the current mid rate to convert back to USD.
//
// docs/02 §4.5: "use a static EUR/USD-style table for v1; precision
// doesn't matter as long as it changes when margin changes." We do
// the precise per-pair calculation anyway — same code-cost.
export const estimatedProfitUsd = (
  marginPips: number,
  notional: number,
  pair: Pair,
  midRate: number,
): number => {
  const profitInQuote = marginPips * pipSizeFor(pair) * notional;
  if (pair.endsWith('USD')) return profitInQuote;
  if (midRate === 0) return 0;
  return profitInQuote / midRate;
};

// --- Forward pricing (v3, FXSW-054) -----------------------------------------
// A forward outright = spot rate + forward points (points quoted in pips).
// The trader marks up the spot component and the forward-points component
// independently; the client price is the all-in rate widened by the *sum* of
// both margins, so the existing spot client-rate semantics are reused.

export const allInRate = (spotRate: number, fwdPoints: number, pair: Pair): number =>
  roundTo(spotRate + fwdPoints * pipSizeFor(pair), DECIMALS[pair]);

// Component-wise margin total per side (bid/ask).
export const sumMargins = (a: MarginPair, b: MarginPair): MarginPair => ({
  bid: a.bid + b.bid,
  ask: a.ask + b.ask,
});

export const clientBidFromForward = (
  spotBid: number,
  fwdPoints: number,
  spotMarginPips: number,
  fwdMarginPips: number,
  pair: Pair,
): number =>
  clientBidFromTrader(allInRate(spotBid, fwdPoints, pair), spotMarginPips + fwdMarginPips, pair);

export const clientAskFromForward = (
  spotAsk: number,
  fwdPoints: number,
  spotMarginPips: number,
  fwdMarginPips: number,
  pair: Pair,
): number =>
  clientAskFromTrader(allInRate(spotAsk, fwdPoints, pair), spotMarginPips + fwdMarginPips, pair);
