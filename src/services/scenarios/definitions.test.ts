import { describe, expect, it } from 'vitest';
import { SCENARIO_IDS } from '@/types/scenario';
import { SCENARIOS } from './definitions';

// Source-of-truth values transcribed from docs/07-scenario-pack.md.
// If a doc value changes, this test must break — that's the point.
const EXPECTED = {
  HAPPY_PATH_ESP: {
    channel: 'ESP',
    clientName: 'Acme Corp',
    accountCode: 'ACME-EUR-1',
    pair: 'EURUSD',
    side: 'BUY',
    notional: 1_000_000,
    reasons: [] as string[],
  },
  OFF_HOURS_INTERVENTION: {
    channel: 'SI',
    clientName: 'Globex Industries',
    accountCode: 'GLBX-JPY-2',
    pair: 'USDJPY',
    side: 'SELL',
    notional: 5_000_000,
    reasons: ['OFF_HOURS'],
  },
  CREDIT_BREACH: {
    channel: 'SI',
    clientName: 'Halcyon Capital',
    accountCode: 'HALC-GBP-1',
    pair: 'GBPUSD',
    side: 'BUY',
    notional: 25_000_000,
    reasons: ['CREDIT_LIMIT'],
  },
  SIZE_LIMIT_MARGIN_TUNE: {
    channel: 'SI',
    clientName: 'Northwind FX',
    accountCode: 'NRTH-EUR-3',
    pair: 'EURUSD',
    side: 'SELL',
    notional: 12_000_000,
    reasons: ['SIZE_LIMIT'],
  },
  RELEASE_PATH: {
    channel: 'SI',
    clientName: 'Polaris Holdings',
    accountCode: 'POLR-INR-1',
    pair: 'USDINR',
    side: 'BUY',
    notional: 3_000_000,
    reasons: ['SIZE_LIMIT'],
  },
} as const;

describe('SCENARIOS', () => {
  it('registers every ScenarioId', () => {
    expect(Object.keys(SCENARIOS).sort()).toEqual([...SCENARIO_IDS].sort());
  });

  for (const id of SCENARIO_IDS) {
    it(`${id} matches the doc-7 test data`, () => {
      const scenario = SCENARIOS[id];
      const expected = EXPECTED[id];
      expect(scenario.id).toBe(id);
      expect(scenario.channel).toBe(expected.channel);
      expect(scenario.deal.clientName).toBe(expected.clientName);
      expect(scenario.deal.accountCode).toBe(expected.accountCode);
      expect(scenario.deal.pair).toBe(expected.pair);
      expect(scenario.deal.side).toBe(expected.side);
      expect(scenario.deal.notional).toBe(expected.notional);
      expect(scenario.rejectionReasons).toEqual(expected.reasons);
      expect(scenario.deal.tenor).toBe('SPOT');
      expect(scenario.deal.defaultMarginPips).toBe(3);
    });
  }
});
