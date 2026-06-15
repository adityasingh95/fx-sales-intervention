import type { RejectionReason, Tenor } from '@/types/deal';

export type ClientTier = 'platinum' | 'gold' | 'standard' | 'new';

export type ClientBehaviorFlag =
  | 'high_engagement'
  | 'price_sensitive'
  | 'normal'
  | 'flight_risk';

export type ClientProfile = {
  clientId: string;
  clientName: string;
  tier: ClientTier;
  recent30dVolume: number;
  recent30dAcceptanceRate: number;
  averageMarginPaid: number;
  recentBehaviorFlag: ClientBehaviorFlag;
};

export type Factor = {
  name: string;
  delta: number;
  note: string;
};

export type SuggestionInput = {
  deal: {
    pair: string;
    side: 'BUY' | 'SELL' | 'BOTH';
    notional: number;
    defaultMarginPips: number;
    rejectionReasons: RejectionReason[];
    // FXSW-058: forward deals carry a tenor so the engine can add a
    // forward-points margin component. Optional/defaults to SPOT, so existing
    // spot callers and tests are unchanged.
    tenor?: Tenor;
  };
  client: ClientProfile;
  market: {
    currentBid: number;
    currentAsk: number;
    pairVolatility: number;
    sessionLiquidity: 'high' | 'normal' | 'thin';
  };
};

export type ReadySuggestion = {
  kind: 'ready';
  // For forwards this is the spot-component margin; the forward-points margin
  // is `fwdPointsPips`. For spot deals `fwdPointsPips` is absent.
  suggestedPips: number;
  fwdPointsPips?: number;
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
  factors: Factor[];
  computedAt: number;
};

export type CreditDeclineSuggestion = {
  kind: 'credit-decline';
  rationale: string;
  computedAt: number;
};

export type MarginSuggestion = ReadySuggestion | CreditDeclineSuggestion;
