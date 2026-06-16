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

// Leg model — the swap-extension seam (FXSW-054). v3 forwards are a single
// NEAR leg; a later swap ticket adds a FAR leg with no type change. v3 derives
// the (single) leg from `Deal.tenor`, so `legs` stays optional and unused for
// now; it exists so multi-leg consumers can be written leg-first.
export type LegKind = 'NEAR' | 'FAR';
export type DealLeg = { kind: LegKind; tenor: Tenor };

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
};

// Independent bid + ask markups. In v1 the single PricingPanel input
// keeps both sides equal (the dual UI lands in FXSW-040). The AI
// suggestion engine produces a single value applied to both sides on
// Apply; Undo restores the prior pair (FXSW-039 + FXSW-041).
export type MarginPair = { bid: number; ask: number };
