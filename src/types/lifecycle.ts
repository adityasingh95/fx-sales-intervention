import type { MarginPair } from './deal';

// Per-deal lifecycle event log (FXSW-049). v3 captures the deal's journey as
// it happens — it cannot be reconstructed after archival — so the Historical
// Trade Detail view can render a timestamped timeline and the markup reason.
//
// These are display-only phases derived by *observing* the existing SI/RFS
// transitions; no new canonical machine states are introduced (see
// docs/03-trade-state-model.md v3 note).
export type LifecyclePhase = 'REQUEST' | 'PICKUP' | 'RELEASE' | 'PRICE_BACK' | 'RESPONSE';

// The margin actually applied when the trader priced the deal. Spot deals
// carry a single bid/ask pair; forwards (FXSW-054+) carry independent spot and
// forward-points components.
export type AppliedMargin =
  | { kind: 'spot'; margin: MarginPair }
  | { kind: 'forward'; spot: MarginPair; fwd: MarginPair };

// Context captured at quote time, merged into the PRICE_BACK event so the
// detail view can explain *why* the price was what it was.
export type QuoteContext = {
  appliedMargin?: AppliedMargin;
  aiSuggested?: boolean;
  rationale?: string;
};

export type DealLifecycleEvent = {
  phase: LifecyclePhase;
  at: number;
  channel: 'SI' | 'RFS';
  fromState?: string;
  toState: string;
  trigger?: string;
} & QuoteContext;
