import type { Pair } from '@/services/feed/types';

export type Side = 'BUY' | 'SELL' | 'BOTH';

// Which leg of the pair the notional is denominated in.
// 'BASE'  — the first three letters of the pair (e.g. EUR in EURUSD).
// 'QUOTE' — the last three letters (e.g. JPY in USDJPY).
// V1 scenarios are all base-dealt; quote-dealt arrives in v2 alongside the
// `?dev=v2` URL gate.
export type DealtCcy = 'BASE' | 'QUOTE';

export type Tenor = 'SPOT';

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
};

// Independent bid + ask markups. In v1 the single PricingPanel input
// keeps both sides equal (the dual UI lands in FXSW-040). The AI
// suggestion engine produces a single value applied to both sides on
// Apply; Undo restores the prior pair (FXSW-039 + FXSW-041).
export type MarginPair = { bid: number; ask: number };
