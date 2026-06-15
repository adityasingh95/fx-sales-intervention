import { suggestForwardPointsMargin } from './forwardEngine';
import { CREDIT_DECLINE_RATIONALE, buildRationale } from './rationale';
import type {
  ClientTier,
  Factor,
  MarginSuggestion,
  SuggestionInput,
} from './types';

const TIER_BASE: Record<ClientTier, number> = {
  platinum: 1.5,
  gold: 2,
  standard: 3,
  new: 4,
};

const HIGH_VOL_PAIRS = new Set(['USDJPY', 'USDINR']);

// USD-equivalent notional. Pairs with USD as the base currency (USDJPY,
// USDINR) are already in USD; for USD-quote pairs (EURUSD, GBPUSD) we
// convert via the current mid.
function approxUsdNotional(
  deal: SuggestionInput['deal'],
  market: SuggestionInput['market'],
): number {
  if (deal.pair.startsWith('USD')) return deal.notional;
  const mid = (market.currentBid + market.currentAsk) / 2;
  return deal.notional * mid;
}

function computeConfidence(input: SuggestionInput): 'low' | 'medium' | 'high' {
  const { client, market } = input;
  if (
    client.tier !== 'new' &&
    client.recent30dVolume > 10_000_000 &&
    market.sessionLiquidity !== 'thin'
  ) {
    return 'high';
  }
  if (
    client.tier === 'new' ||
    market.sessionLiquidity === 'thin' ||
    client.recent30dVolume < 1_000_000
  ) {
    return 'low';
  }
  return 'medium';
}

export function suggestMargin(input: SuggestionInput): MarginSuggestion {
  // docs/09 §7 — CREDIT_LIMIT short-circuits the rule engine entirely.
  if (input.deal.rejectionReasons.includes('CREDIT_LIMIT')) {
    return {
      kind: 'credit-decline',
      rationale: CREDIT_DECLINE_RATIONALE,
      computedAt: Date.now(),
    };
  }

  const factors: Factor[] = [];
  let base = TIER_BASE[input.client.tier];
  factors.push({
    name: 'Client tier',
    delta: 0,
    note: `${input.client.tier} client baseline ${base} pips`,
  });

  // 1. Notional size
  const notionalUsd = approxUsdNotional(input.deal, input.market);
  if (notionalUsd > 20_000_000) {
    base += 2.5;
    factors.push({
      name: 'Notional size',
      delta: 2.5,
      note: '>20M USD-equivalent — material risk premium',
    });
  } else if (notionalUsd > 10_000_000) {
    base += 1.5;
    factors.push({ name: 'Notional size', delta: 1.5, note: '10–20M USD-equivalent' });
  } else if (notionalUsd > 5_000_000) {
    base += 0.5;
    factors.push({ name: 'Notional size', delta: 0.5, note: '5–10M USD-equivalent' });
  }

  // 2. Pair-level vol & liquidity
  if (input.market.pairVolatility > 1.5) {
    base += 1;
    factors.push({ name: 'Volatility', delta: 1, note: 'Above-normal vol on this pair' });
  }
  if (input.market.sessionLiquidity === 'thin') {
    base += 1.5;
    factors.push({
      name: 'Session liquidity',
      delta: 1.5,
      note: 'Thin liquidity — wider spread justified',
    });
  }
  if (HIGH_VOL_PAIRS.has(input.deal.pair)) {
    base += 0.5;
    factors.push({ name: 'Pair class', delta: 0.5, note: 'Historically wider-spread pair' });
  }

  // 3. Rejection-reason context
  if (input.deal.rejectionReasons.includes('OFF_HOURS')) {
    base += 1.5;
    factors.push({
      name: 'Off-hours',
      delta: 1.5,
      note: 'Quote outside standard session — risk premium',
    });
  }
  if (input.deal.rejectionReasons.includes('SIZE_LIMIT')) {
    base += 0.5;
    factors.push({
      name: 'Size band breach',
      delta: 0.5,
      note: 'Above auto-pricer band — manual margin',
    });
  }

  // 4. Client behaviour
  if (input.client.recentBehaviorFlag === 'flight_risk') {
    base -= 1;
    factors.push({
      name: 'Retention',
      delta: -1,
      note: 'Recent decline streak — tightening to win business',
    });
  }
  if (
    input.client.recentBehaviorFlag === 'high_engagement' &&
    input.client.recent30dVolume > 100_000_000
  ) {
    base -= 0.5;
    factors.push({
      name: 'VIP volume',
      delta: -0.5,
      note: 'Top-10 client by volume — preferred pricing',
    });
  }
  if (input.client.recent30dAcceptanceRate < 0.4) {
    base -= 0.5;
    factors.push({
      name: 'Acceptance rate',
      delta: -0.5,
      note: 'Below 40% acceptance — softer margin',
    });
  }

  // 5. Floor & rounding (spot component)
  const final = Math.max(1, Math.round(base));

  // 6. Forward-points component (v3). The spot rule chain above is unchanged;
  // for non-SPOT deals we add a separate forward-points margin and surface it
  // as its own factor in the Why table.
  const tenor = input.deal.tenor ?? 'SPOT';
  let fwdPointsPips: number | undefined;
  if (tenor !== 'SPOT') {
    const fwd = suggestForwardPointsMargin(tenor, input);
    fwdPointsPips = fwd.pips;
    factors.push(fwd.factor);
  }

  return {
    kind: 'ready',
    suggestedPips: final,
    ...(fwdPointsPips !== undefined ? { fwdPointsPips } : {}),
    confidence: computeConfidence(input),
    rationale: buildRationale(factors, final, input),
    factors,
    computedAt: Date.now(),
  };
}
