import type { Pair } from '@/services/feed/types';

export type Side = 'BUY' | 'SELL' | 'BOTH';

// Which leg of the pair the notional is denominated in.
// 'BASE'  — the first three letters of the pair (e.g. EUR in EURUSD).
// 'QUOTE' — the last three letters (e.g. JPY in USDJPY).
export type DealtCcy = 'BASE' | 'QUOTE';

// v3 (FXSW-054): forward tenors alongside SPOT. State machines are
// tenor-agnostic, so this is a pure widening — existing SPOT deals are
// unaffected.
export type Tenor = 'SPOT' | '1W' | '2W' | '1M' | '2M' | '3M' | '6M' | '9M' | '1Y';

export const TENORS: readonly Tenor[] = [
  'SPOT',
  '1W',
  '2W',
  '1M',
  '2M',
  '3M',
  '6M',
  '9M',
  '1Y',
];

export const FORWARD_TENORS: readonly Tenor[] = TENORS.filter((t) => t !== 'SPOT');

export const isForwardTenor = (tenor: Tenor): boolean => tenor !== 'SPOT';

// v4 (FXSW-078): the instrument discriminator. `SPOT`/`OUTRIGHT` are the existing
// single-leg deliverable deals (distinguished by tenor); `NDF` and `SWAP` are the
// new v4 instruments. It is orthogonal to `tenor`.
export type InstrumentType = 'SPOT' | 'OUTRIGHT' | 'NDF' | 'SWAP';

// Default instrument for a deal that predates the discriminator (legacy/spot/
// outright fixtures): SPOT tenor → SPOT, any forward tenor → OUTRIGHT. NDF and
// SWAP are never derived — they must be set explicitly at construction.
export const defaultInstrumentForTenor = (tenor: Tenor): InstrumentType =>
  isForwardTenor(tenor) ? 'OUTRIGHT' : 'SPOT';

// Leg model — the swap-extension seam (FXSW-054). v3 forwards are a single
// NEAR leg; a later swap ticket adds a FAR leg with no type change. v3 derives
// the (single) leg from `Deal.tenor`, so `legs` stays optional and unused for
// now; it exists so multi-leg consumers can be written leg-first.
export type LegKind = 'NEAR' | 'FAR';
export type DealLeg = { kind: LegKind; tenor: Tenor };

// Ordinal position of a tenor in the canonical ladder (SPOT=0 … 1Y=last).
// Used to order swap legs; -1 is impossible since every Tenor is in TENORS.
export const tenorRank = (tenor: Tenor): number => TENORS.indexOf(tenor);

// Build validated swap legs (FXSW-082). A forward-forward swap needs a NEAR and a
// FAR leg with FAR strictly later than NEAR. A missing or out-of-order (far ≤ near)
// far is coerced to the shortest valid far — the tenor immediately after near; if
// near is the last tenor, near is stepped back one so a later far exists.
export const buildSwapLegs = (near: Tenor, far?: Tenor): [DealLeg, DealLeg] => {
  let nearRank = tenorRank(near);
  if (nearRank >= TENORS.length - 1) nearRank = TENORS.length - 2;
  const requestedFarRank = far !== undefined ? tenorRank(far) : -1;
  const farRank = requestedFarRank > nearRank ? requestedFarRank : nearRank + 1;
  return [
    { kind: 'NEAR', tenor: TENORS[nearRank] },
    { kind: 'FAR', tenor: TENORS[farRank] },
  ];
};

// Resolve swap legs AND report whether the request had to be coerced (FXSW-091
// F-1). `adjusted` is true when the far was missing, far ≤ near, or near was the
// last tenor (so it stepped back) — i.e. the applied legs differ from a naive
// (near, far) request. The original request is returned so the ticket can surface
// a visible "legs adjusted" note rather than silently pricing a different pair.
// A valid request yields `adjusted: false` and the identical legs `buildSwapLegs`
// already produced (swap goldens unchanged).
export type SwapLegResolution = {
  legs: [DealLeg, DealLeg];
  adjusted: boolean;
  requested: { near: Tenor; far?: Tenor };
};

export const resolveSwapLegs = (near: Tenor, far?: Tenor): SwapLegResolution => {
  const legs = buildSwapLegs(near, far);
  const adjusted = far === undefined || legs[0].tenor !== near || legs[1].tenor !== far;
  return { legs, adjusted, requested: { near, far } };
};

export type RejectionReason = 'OFF_HOURS' | 'SIZE_LIMIT' | 'CREDIT_LIMIT';

export type Deal = {
  dealId: string;
  clientName: string;
  accountCode: string;
  pair: Pair;
  side: Side;
  dealtCcy: DealtCcy;
  notional: number;
  tenor: Tenor;
  defaultMarginPips: number;
  createdAt: number;
  // Optional multi-leg description (swap seam). Absent for v3 spot + outright
  // forwards, which are fully described by `tenor`.
  legs?: DealLeg[];
  // FXSW-091 (F-1): set only when a SWAP injection's legs were coerced (far
  // missing / far ≤ near / last-tenor near stepped back). Carries the originally
  // requested near/far so the ticket can show a visible "legs adjusted" note.
  swapRequested?: { near: Tenor; far?: Tenor };
  // Instrument discriminator (v4, FXSW-078). Optional: legacy/spot/outright
  // deals omit it and derive a default from `tenor` via `instrumentOf()`;
  // `buildDeal` always sets it on injected deals. NDF/SWAP are only ever explicit.
  instrumentType?: InstrumentType;
};

// Resolve a deal's instrument, deriving the default from tenor when the
// discriminator is absent (legacy/spot/outright deals). Use this everywhere the
// instrument is read so consumers never branch on a raw `undefined`.
export const instrumentOf = (deal: Pick<Deal, 'instrumentType' | 'tenor'>): InstrumentType =>
  deal.instrumentType ?? defaultInstrumentForTenor(deal.tenor);

// Independent bid + ask markups. In v1 the single PricingPanel input
// keeps both sides equal (the dual UI lands in FXSW-040). The AI
// suggestion engine produces a single value applied to both sides on
// Apply; Undo restores the prior pair (FXSW-039 + FXSW-041).
export type MarginPair = { bid: number; ask: number };
