// v1 static lookup per docs/09 §3.1. All pair vol values are ≤ 1.5, so the
// engine's `pairVolatility > 1.5` branch never fires in v1 — the rule
// lives in the engine for v2 (when vol may come from a real feed).
const PAIR_VOLATILITY: Record<string, number> = {
  EURUSD: 0.5,
  GBPUSD: 0.8,
  USDJPY: 1.0,
  USDINR: 1.2,
};

export function getMarketContext(pair: string): {
  pairVolatility: number;
  sessionLiquidity: 'high' | 'normal' | 'thin';
} {
  return {
    pairVolatility: PAIR_VOLATILITY[pair] ?? 0.5,
    sessionLiquidity: 'normal',
  };
}
