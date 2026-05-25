export type Pair = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR';

export const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR'] as const satisfies readonly Pair[];

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
}
