import type { Deal, RejectionReason } from '@/types/deal';
import type { ScenarioId, ScenarioOverrides } from '@/types/scenario';

export type Pair = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR';

export const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR'] as const satisfies readonly Pair[];

// Non-deliverable pairs — the only pairs an NDF can be struck on (docs/02 §12.2).
// USDINR (INR is non-convertible/non-deliverable) is the NDF pair in this set;
// EURUSD/GBPUSD/USDJPY are deliverable and cannot be NDFs.
export const NDF_PAIRS = ['USDINR'] as const satisfies readonly Pair[];

export const isNdfPair = (pair: Pair): boolean => (NDF_PAIRS as readonly Pair[]).includes(pair);

export type PriceTick = {
  pair: Pair;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
};

export interface PricingFeed {
  subscribe(pair: Pair, cb: (tick: PriceTick) => void): () => void;
  getLatest(pair: Pair): PriceTick | null;
  start(): void;
  stop(): void;
  // Optional external-anchor seam (FXSW-050). An opt-in market-data adapter
  // (see src/services/feed/external/) calls setReferences to move the
  // mean-reversion target; the randomizer keeps ticking between updates.
  // clearReferences reverts to the build-time baked mids. Never called on the
  // default (simulated) path, so the seeded golden sequence is unaffected.
  setReferences(mids: Partial<Record<Pair, number>>): void;
  clearReferences(): void;
}

export type DealEvent =
  | { type: 'NEW_SI_DEAL'; deal: Deal; rejectionReasons: RejectionReason[] }
  | { type: 'NEW_ESP_DEAL'; deal: Deal }
  | { type: 'CLIENT_ACCEPT'; dealId: string }
  | { type: 'CLIENT_REJECT'; dealId: string }
  | { type: 'CLIENT_CANCEL'; dealId: string }
  | { type: 'EXPIRE'; dealId: string };

export interface DealFeed {
  subscribe(cb: (event: DealEvent) => void): () => void;
  inject(scenarioId: ScenarioId, overrides?: ScenarioOverrides): void;
  reset(): void;
  // Bridge: the deals store calls this when an SI machine state changes,
  // so scenario follow-ups gated on an SI state (e.g. "fire CLIENT_ACCEPT
  // 1500ms after SI reaches `Quoted`") can fire. Not in the spec sketch
  // at 04 §4.4; added to keep dealFeed's coupling to the deals store
  // explicit. See dev-log FXSW-008 for rationale.
  notifyDealState(dealId: string, siState: string): void;
  // FXSW-090 F-2: the deals store calls this when a deal is archived or removed,
  // so the player drops that deal's pending timers + gates (no stale follow-up).
  forgetDeal(dealId: string): void;
}
