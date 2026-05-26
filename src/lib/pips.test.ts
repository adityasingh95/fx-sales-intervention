import { describe, expect, it } from 'vitest';
import {
  clientAskFromTrader,
  clientBidFromTrader,
  estimatedProfitUsd,
  pipSizeFor,
} from './pips';

describe('pipSizeFor', () => {
  it('returns 0.0001 for the USD-quoted majors', () => {
    expect(pipSizeFor('EURUSD')).toBe(0.0001);
    expect(pipSizeFor('GBPUSD')).toBe(0.0001);
  });

  it('returns 0.01 for the USD-based JPY/INR pairs', () => {
    expect(pipSizeFor('USDJPY')).toBe(0.01);
    expect(pipSizeFor('USDINR')).toBe(0.01);
  });
});

describe('clientBidFromTrader + clientAskFromTrader', () => {
  it('EURUSD bid 1.0850 ask 1.0852 margin 3 → client 1.0847 / 1.0855', () => {
    expect(clientBidFromTrader(1.085, 3, 'EURUSD')).toBe(1.0847);
    expect(clientAskFromTrader(1.0852, 3, 'EURUSD')).toBe(1.0855);
  });

  it('USDJPY bid 157.77 ask 157.78 margin 3 → client 157.74 / 157.81', () => {
    expect(clientBidFromTrader(157.77, 3, 'USDJPY')).toBe(157.74);
    expect(clientAskFromTrader(157.78, 3, 'USDJPY')).toBe(157.81);
  });

  it('rounds to the pair precision (no float drift)', () => {
    // 1.0850 − 3*0.0001 in JS floats = 1.0846999999999998.
    // The helper must round to 4dp before returning.
    expect(clientBidFromTrader(1.085, 3, 'EURUSD')).toBe(1.0847);
  });
});

describe('estimatedProfitUsd', () => {
  it('EURUSD: profit is in USD directly, no conversion', () => {
    // 3 pips × 0.0001 × 1,000,000 = 300 USD.
    expect(estimatedProfitUsd(3, 1_000_000, 'EURUSD', 1.1715)).toBe(300);
  });

  it('USDJPY: profit in JPY, converted to USD via mid rate', () => {
    // 3 pips × 0.01 × 5,000,000 = 150,000 JPY ÷ 157.77 ≈ 950.75 USD.
    const profit = estimatedProfitUsd(3, 5_000_000, 'USDJPY', 157.77);
    expect(profit).toBeCloseTo(150_000 / 157.77, 6);
  });

  it('margin change scales linearly', () => {
    const at3 = estimatedProfitUsd(3, 1_000_000, 'EURUSD', 1.1715);
    const at6 = estimatedProfitUsd(6, 1_000_000, 'EURUSD', 1.1715);
    expect(at6).toBeCloseTo(at3 * 2);
  });

  it('handles a zero midRate without dividing by zero (USD-based pairs only)', () => {
    expect(estimatedProfitUsd(3, 1_000_000, 'USDJPY', 0)).toBe(0);
  });
});
