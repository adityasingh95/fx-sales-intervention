import type { ForwardPointsPair } from '@/services/feed/forwardPoints';
import type { Pair } from '@/services/feed/types';
import type { InstrumentType, MarginPair } from '@/types/deal';
import type { QuoteSide } from '@/lib/quoteSide';

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

// NDF is points-only (docs/02 §12.2): the spot-level margin is structurally inert.
// Every consumer of a priced deal's spot margin must go through this single helper
// (keyed off the instrument) so the raw `marginPair` state can never reintroduce a
// spot markup via the keyboard or AI-Apply paths — defence-in-depth below the
// render boundary (FXSW-089 F-2). Non-NDF instruments keep their margin unchanged.
export const spotMarginFor = (instrument: InstrumentType, marginPair: MarginPair): MarginPair =>
  instrument === 'NDF' ? { bid: 0, ask: 0 } : marginPair;

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

// --- Side-specific forward points (v3+, FXSW-074) ---------------------------
// The feed quotes two-sided forward points (FXSW-073). The trader outright is
// therefore side-specific *before* any margin: the bid all-in uses the bid
// points, the ask all-in uses the ask points, and the mid (used as the P/L
// reference) uses the mid points. SPOT points are all-zero and collapse each
// side back to the spot rate. Keeping this selection in pips.ts honours the
// "no pip math in components" rule — consumers pass the whole points pair.

export type SpotRates = { bid: number; ask: number; mid: number };
export type OutrightRates = { bid: number; ask: number; mid: number };

export const outrightPair = (
  spot: SpotRates,
  points: ForwardPointsPair,
  pair: Pair,
): OutrightRates => ({
  bid: allInRate(spot.bid, points.bid, pair),
  ask: allInRate(spot.ask, points.ask, pair),
  mid: allInRate(spot.mid, points.mid, pair),
});

// Side-specific client prices for a forward: bid takes the bid points, ask the
// ask points, each widened by its own (spot + forward) margin.
export const clientForwardPair = (
  spot: SpotRates,
  points: ForwardPointsPair,
  spotMargin: MarginPair,
  fwdMargin: MarginPair,
  pair: Pair,
): MarginPair => ({
  bid: clientBidFromForward(spot.bid, points.bid, spotMargin.bid, fwdMargin.bid, pair),
  ask: clientAskFromForward(spot.ask, points.ask, spotMargin.ask, fwdMargin.ask, pair),
});

// --- Swap pricing (v4, FXSW-084) --------------------------------------------
// A swap is priced on the *net* forward-points differential (far − near, from
// swapPointsFeed). The trader marks up either:
//   • TOTAL          — one bid/ask margin applied to the net points, or
//   • PER_COMPONENT  — an independent bid/ask margin on each leg (up to four
//                      values), whose contributions sum into the net spread
//                      (mirrors the forward spot+fwd margin sum).
// Net points are already a pip differential, so margins (pips) apply directly —
// no pipSize scaling (unlike an outright rate). The dealer takes margin off the
// bid and adds it to the ask, widening the net in the dealer's favour. P/L reuses
// estimatedProfitUsd with the effective net margin per side.

export type SwapMarkupMode = 'PER_COMPONENT' | 'TOTAL';

const round1 = (n: number): number => Math.round(n * 10) / 10;

// Zero the non-quotable side's margin for a one-sided request: the off-side
// cannot be priced, so it carries no markup and earns no P/L. BOTH is untouched.
// Mirrors the ForwardPointsPanel/MarginControls lock (FXSW-068).
export const gateMarginToSide = (margin: MarginPair, quoteSide: QuoteSide): MarginPair => ({
  bid: quoteSide === 'ASK' ? 0 : margin.bid,
  ask: quoteSide === 'BID' ? 0 : margin.ask,
});

// Effective net-points margin per side, after markup-mode resolution + one-sided
// gating. TOTAL uses the entered net margin directly; PER_COMPONENT sums the two
// legs' margins (each leg widens the net).
export const effectiveSwapMargin = (
  mode: SwapMarkupMode,
  margins: { total: MarginPair; near: MarginPair; far: MarginPair },
  quoteSide: QuoteSide = 'BOTH',
): MarginPair => {
  const raw = mode === 'TOTAL' ? margins.total : sumMargins(margins.near, margins.far);
  return gateMarginToSide(raw, quoteSide);
};

// Client net swap points (pips): bid widened down, ask widened up, by the
// effective net margin. Pass an already-gated margin for one-sided requests.
export const clientSwapNetPoints = (
  net: { bid: number; ask: number },
  margin: MarginPair,
): { bid: number; ask: number } => ({
  bid: round1(net.bid - margin.bid),
  ask: round1(net.ask + margin.ask),
});
