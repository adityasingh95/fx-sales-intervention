import { describe, expect, it } from 'vitest';
import type { RejectionReason } from '@/types/deal';
import { suggestMargin } from './engine';
import { CREDIT_DECLINE_RATIONALE, buildRationale } from './rationale';
import type {
  ClientBehaviorFlag,
  ClientTier,
  SuggestionInput,
} from './types';

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

describe('buildRationale', () => {
  it('docs/09 §8 example — Northwind / 12M EURUSD / SIZE_LIMIT → matches "Gold-tier client … 12M EURUSD … above auto-pricer band … 4 pips"', () => {
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
    if (s.kind !== 'ready') throw new Error('expected ready');
    expect(s.rationale).toMatch(/Gold-tier client.*12M EURUSD.*above auto-pricer band.*— suggesting 4 pips\./);
    expect(s.rationale.length).toBeLessThanOrEqual(120);
  });

  it('docs/09 §8 example — Globex / 5M USDJPY / OFF_HOURS → matches "Standard-tier client … off-hours … USDJPY … 5 pips"', () => {
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
    if (s.kind !== 'ready') throw new Error('expected ready');
    expect(s.rationale).toMatch(/Standard-tier client.*off-hours.*USDJPY.*— suggesting 5 pips\./);
    expect(s.rationale.length).toBeLessThanOrEqual(120);
  });

  it('0-factor (only tier) input → concise, grammatical, starts with tier label and ends with — suggesting N pips.', () => {
    const s = suggestMargin(makeInput({ tier: 'standard' }));
    if (s.kind !== 'ready') throw new Error('expected ready');
    expect(s.rationale).toMatch(/^Standard-tier client/);
    expect(s.rationale).toMatch(/— suggesting 3 pips\.$/);
    expect(s.rationale.length).toBeLessThanOrEqual(120);
    // No stray commas from missing factors:
    expect(s.rationale).not.toMatch(/,\s*—/);
  });

  it('5+ factor input → truncates lowest-magnitude factors, stays ≤ 120 chars, retains tier + pip count', () => {
    // Construct an input that triggers many factors:
    // gold (tier=2) + 25M USDJPY (+2.5) + vol 2.0 (+1) + thin (+1.5) +
    // USDJPY pair-class (+0.5) + OFF_HOURS (+1.5) + SIZE_LIMIT (+0.5) +
    // flight_risk (-1) + acceptance 0.3 (-0.5)  →  9 factors
    const s = suggestMargin(
      makeInput({
        tier: 'gold',
        pair: 'USDJPY',
        notional: 25_000_000,
        pairVolatility: 2.0,
        sessionLiquidity: 'thin',
        rejectionReasons: ['OFF_HOURS', 'SIZE_LIMIT'],
        behavior: 'flight_risk',
        acceptanceRate: 0.3,
      }),
    );
    if (s.kind !== 'ready') throw new Error('expected ready');
    expect(s.rationale.length).toBeLessThanOrEqual(120);
    expect(s.rationale).toMatch(/Gold-tier client/);
    expect(s.rationale).toMatch(new RegExp(`— suggesting ${s.suggestedPips} pips\\.$`));
  });

  it('CREDIT_DECLINE_RATIONALE constant is the §7 message', () => {
    expect(CREDIT_DECLINE_RATIONALE).toBe(
      'Credit limit breach — recommend declining. Suggested action: Reject.',
    );
  });

  it('engine wires the §7 message into credit-decline output', () => {
    const s = suggestMargin(makeInput({ rejectionReasons: ['CREDIT_LIMIT'] }));
    expect(s.kind).toBe('credit-decline');
    expect(s.rationale).toBe(CREDIT_DECLINE_RATIONALE);
  });

  it('called directly: returns a string ending with — suggesting N pips.', () => {
    const input = makeInput({ tier: 'platinum' });
    const s = suggestMargin(input);
    if (s.kind !== 'ready') throw new Error('expected ready');
    const direct = buildRationale(s.factors, s.suggestedPips, input);
    expect(direct).toMatch(/— suggesting \d+ pips\.$/);
  });
});
