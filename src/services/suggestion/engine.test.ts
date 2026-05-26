import { describe, expect, it } from 'vitest';
import type { RejectionReason } from '@/types/deal';
import { suggestMargin } from './engine';
import type {
  ClientBehaviorFlag,
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

function makeInput(overrides: {
  tier?: ClientTier;
  notional?: number;
  pair?: string;
  rejectionReasons?: RejectionReason[];
  pairVolatility?: number;
  sessionLiquidity?: 'high' | 'normal' | 'thin';
  behavior?: ClientBehaviorFlag;
  volume?: number;
  acceptanceRate?: number;
  currentBid?: number;
  currentAsk?: number;
} = {}): SuggestionInput {
  return {
    deal: {
      pair: overrides.pair ?? 'EURUSD',
      side: 'BUY',
      notional: overrides.notional ?? 1_000_000,
      defaultMarginPips: 3,
      rejectionReasons: overrides.rejectionReasons ?? [],
    },
    client: {
      clientId: 'test',
      clientName: 'Test',
      tier: overrides.tier ?? 'standard',
      recent30dVolume: overrides.volume ?? 5_000_000,
      recent30dAcceptanceRate: overrides.acceptanceRate ?? 0.6,
      averageMarginPaid: 3,
      recentBehaviorFlag: overrides.behavior ?? 'normal',
    },
    market: {
      currentBid: overrides.currentBid ?? 1.1715,
      currentAsk: overrides.currentAsk ?? 1.1716,
      pairVolatility: overrides.pairVolatility ?? 0.5,
      sessionLiquidity: overrides.sessionLiquidity ?? 'normal',
    },
  };
}

function expectReady(s: MarginSuggestion): asserts s is Extract<MarginSuggestion, { kind: 'ready' }> {
  expect(s.kind).toBe('ready');
}

function factor(s: MarginSuggestion, name: string): Factor | undefined {
  if (s.kind !== 'ready') return undefined;
  return s.factors.find((f) => f.name === name);
}

describe('suggestMargin', () => {
  describe('tier baseline', () => {
    it('platinum (1.5) → 2 pips with only the Client tier factor', () => {
      const s = suggestMargin(makeInput({ tier: 'platinum' }));
      expectReady(s);
      expect(s.suggestedPips).toBe(2);
      expect(factor(s, 'Client tier')?.delta).toBe(0);
    });
    it('gold (2) → 2 pips', () => {
      const s = suggestMargin(makeInput({ tier: 'gold' }));
      expectReady(s);
      expect(s.suggestedPips).toBe(2);
    });
    it('standard (3) → 3 pips', () => {
      const s = suggestMargin(makeInput({ tier: 'standard' }));
      expectReady(s);
      expect(s.suggestedPips).toBe(3);
    });
    it('new (4) → 4 pips', () => {
      const s = suggestMargin(makeInput({ tier: 'new' }));
      expectReady(s);
      expect(s.suggestedPips).toBe(4);
    });
  });

  describe('notional band', () => {
    it('≤5M USD → no Notional size factor', () => {
      const s = suggestMargin(makeInput({ pair: 'USDJPY', notional: 5_000_000 }));
      expect(factor(s, 'Notional size')).toBeUndefined();
    });
    it('5–10M USD → +0.5', () => {
      const s = suggestMargin(makeInput({ pair: 'USDJPY', notional: 7_000_000 }));
      expect(factor(s, 'Notional size')?.delta).toBe(0.5);
    });
    it('10–20M USD → +1.5', () => {
      const s = suggestMargin(makeInput({ pair: 'USDJPY', notional: 12_000_000 }));
      expect(factor(s, 'Notional size')?.delta).toBe(1.5);
    });
    it('>20M USD → +2.5', () => {
      const s = suggestMargin(makeInput({ pair: 'USDJPY', notional: 25_000_000 }));
      expect(factor(s, 'Notional size')?.delta).toBe(2.5);
    });
    it('non-USD-base pair: 12M EUR × 1.1715 mid ≈ 14M USD → 10–20M band (+1.5)', () => {
      const s = suggestMargin(
        makeInput({ pair: 'EURUSD', notional: 12_000_000, currentBid: 1.1714, currentAsk: 1.1716 }),
      );
      expect(factor(s, 'Notional size')?.delta).toBe(1.5);
    });
  });

  describe('market context', () => {
    it('pairVolatility > 1.5 → +1 Volatility factor', () => {
      const s = suggestMargin(makeInput({ pairVolatility: 2.0 }));
      expect(factor(s, 'Volatility')?.delta).toBe(1);
    });
    it('pairVolatility ≤ 1.5 → no Volatility factor', () => {
      const s = suggestMargin(makeInput({ pairVolatility: 1.2 }));
      expect(factor(s, 'Volatility')).toBeUndefined();
    });
    it('thin liquidity → +1.5 Session liquidity factor', () => {
      const s = suggestMargin(makeInput({ sessionLiquidity: 'thin' }));
      expect(factor(s, 'Session liquidity')?.delta).toBe(1.5);
    });
    it('USDJPY (HIGH_VOL_PAIRS) → +0.5 Pair class factor', () => {
      const s = suggestMargin(makeInput({ pair: 'USDJPY' }));
      expect(factor(s, 'Pair class')?.delta).toBe(0.5);
    });
    it('USDINR (HIGH_VOL_PAIRS) → +0.5 Pair class factor', () => {
      const s = suggestMargin(makeInput({ pair: 'USDINR' }));
      expect(factor(s, 'Pair class')?.delta).toBe(0.5);
    });
    it('EURUSD → no Pair class factor', () => {
      const s = suggestMargin(makeInput({ pair: 'EURUSD' }));
      expect(factor(s, 'Pair class')).toBeUndefined();
    });
  });

  describe('rejection reasons', () => {
    it('OFF_HOURS → +1.5 Off-hours factor', () => {
      const s = suggestMargin(makeInput({ rejectionReasons: ['OFF_HOURS'] }));
      expect(factor(s, 'Off-hours')?.delta).toBe(1.5);
    });
    it('SIZE_LIMIT → +0.5 Size band breach factor', () => {
      const s = suggestMargin(makeInput({ rejectionReasons: ['SIZE_LIMIT'] }));
      expect(factor(s, 'Size band breach')?.delta).toBe(0.5);
    });
    it('CREDIT_LIMIT → returns credit-decline shape with no suggestedPips', () => {
      const s = suggestMargin(makeInput({ rejectionReasons: ['CREDIT_LIMIT'] }));
      expect(s.kind).toBe('credit-decline');
      expect(s).not.toHaveProperty('suggestedPips');
      expect(s.rationale).toContain('Credit limit');
    });
    it('CREDIT_LIMIT takes precedence over other reasons', () => {
      const s = suggestMargin(makeInput({ rejectionReasons: ['OFF_HOURS', 'CREDIT_LIMIT'] }));
      expect(s.kind).toBe('credit-decline');
    });
  });

  describe('client behavior', () => {
    it('flight_risk → -1 Retention factor', () => {
      const s = suggestMargin(makeInput({ behavior: 'flight_risk' }));
      expect(factor(s, 'Retention')?.delta).toBe(-1);
    });
    it('high_engagement + vol > 100M → -0.5 VIP volume factor', () => {
      const s = suggestMargin(
        makeInput({ behavior: 'high_engagement', volume: 150_000_000 }),
      );
      expect(factor(s, 'VIP volume')?.delta).toBe(-0.5);
    });
    it('high_engagement + vol ≤ 100M → no VIP volume factor', () => {
      const s = suggestMargin(
        makeInput({ behavior: 'high_engagement', volume: 50_000_000 }),
      );
      expect(factor(s, 'VIP volume')).toBeUndefined();
    });
    it('normal behavior → no Retention or VIP factor', () => {
      const s = suggestMargin(makeInput({ behavior: 'normal' }));
      expect(factor(s, 'Retention')).toBeUndefined();
      expect(factor(s, 'VIP volume')).toBeUndefined();
    });
    it('acceptance rate < 0.4 → -0.5 Acceptance rate factor', () => {
      const s = suggestMargin(makeInput({ acceptanceRate: 0.3 }));
      expect(factor(s, 'Acceptance rate')?.delta).toBe(-0.5);
    });
    it('acceptance rate ≥ 0.4 → no Acceptance rate factor', () => {
      const s = suggestMargin(makeInput({ acceptanceRate: 0.5 }));
      expect(factor(s, 'Acceptance rate')).toBeUndefined();
    });
  });

  describe('confidence', () => {
    it('established tier + vol > 10M + normal liquidity → high', () => {
      const s = suggestMargin(
        makeInput({ tier: 'gold', volume: 50_000_000, sessionLiquidity: 'normal' }),
      );
      expectReady(s);
      expect(s.confidence).toBe('high');
    });
    it('new tier → low (even with high volume + normal liquidity)', () => {
      const s = suggestMargin(makeInput({ tier: 'new', volume: 50_000_000 }));
      expectReady(s);
      expect(s.confidence).toBe('low');
    });
    it('thin liquidity → low', () => {
      const s = suggestMargin(makeInput({ tier: 'gold', sessionLiquidity: 'thin' }));
      expectReady(s);
      expect(s.confidence).toBe('low');
    });
    it('vol < 1M → low', () => {
      const s = suggestMargin(makeInput({ tier: 'standard', volume: 500_000 }));
      expectReady(s);
      expect(s.confidence).toBe('low');
    });
    it('between 1M and 10M with established tier + normal liquidity → medium', () => {
      const s = suggestMargin(
        makeInput({ tier: 'standard', volume: 5_000_000, sessionLiquidity: 'normal' }),
      );
      expectReady(s);
      expect(s.confidence).toBe('medium');
    });
  });

  describe('algebraic invariant', () => {
    it('sum of factor deltas + tier base equals pre-rounded base (across 5 sampled inputs)', () => {
      const samples = [
        makeInput({ tier: 'platinum', behavior: 'high_engagement', volume: 200_000_000 }),
        makeInput({ tier: 'gold', notional: 12_000_000, rejectionReasons: ['SIZE_LIMIT'] }),
        makeInput({
          tier: 'standard',
          pair: 'USDJPY',
          notional: 5_000_000,
          rejectionReasons: ['OFF_HOURS'],
        }),
        makeInput({ tier: 'new', notional: 25_000_000, pairVolatility: 2.0 }),
        makeInput({
          tier: 'standard',
          behavior: 'flight_risk',
          acceptanceRate: 0.3,
          sessionLiquidity: 'thin',
        }),
      ];
      for (const input of samples) {
        const s = suggestMargin(input);
        expectReady(s);
        const deltaSum = s.factors.reduce((sum, f) => sum + f.delta, 0);
        const preRounded = deltaSum + TIER_BASE[input.client.tier];
        expect(s.suggestedPips).toBe(Math.max(1, Math.round(preRounded)));
      }
    });
  });

  describe('floor', () => {
    it('platinum + flight_risk + low acceptance still yields ≥ 1 pip', () => {
      // base 1.5 - 1 (Retention) - 0.5 (Acceptance) = 0 → floor at 1
      const s = suggestMargin(
        makeInput({ tier: 'platinum', behavior: 'flight_risk', acceptanceRate: 0.3 }),
      );
      expectReady(s);
      expect(s.suggestedPips).toBe(1);
    });
  });

  describe('canonical scenarios (docs/09 §8)', () => {
    it('Globex / 5M USDJPY / OFF_HOURS → 5 pips', () => {
      const s = suggestMargin(
        makeInput({
          tier: 'standard',
          pair: 'USDJPY',
          notional: 5_000_000,
          rejectionReasons: ['OFF_HOURS'],
          volume: 35_000_000,
          acceptanceRate: 0.62,
          behavior: 'normal',
        }),
      );
      expectReady(s);
      expect(s.suggestedPips).toBe(5);
    });
    it('Northwind / 12M EURUSD / SIZE_LIMIT → 4 pips', () => {
      const s = suggestMargin(
        makeInput({
          tier: 'gold',
          pair: 'EURUSD',
          notional: 12_000_000,
          rejectionReasons: ['SIZE_LIMIT'],
          volume: 120_000_000,
          acceptanceRate: 0.71,
          behavior: 'high_engagement',
          currentBid: 1.1714,
          currentAsk: 1.1716,
        }),
      );
      expectReady(s);
      expect(s.suggestedPips).toBe(4);
    });
  });
});
