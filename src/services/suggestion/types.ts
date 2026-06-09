import type { RejectionReason } from '@/types/deal';

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
  suggestedPips: number;
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
