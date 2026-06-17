import { describe, expect, it } from 'vitest';
import {
  allInRate,
  clientAskFromForward,
  clientAskFromTrader,
  clientBidFromForward,
  clientBidFromTrader,
  clientForwardPair,
  clientSwapNetPoints,
  effectiveSwapMargin,
  estimatedProfitUsd,
  gateMarginToSide,
  outrightPair,
  spotMarginFor,
  sumMargins,
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

describe('forward pricing (v3)', () => {
  it('allInRate adds forward points (in pips) to the spot rate', () => {
    // EURUSD spot 1.1715 + (-25 points × 0.0001) = 1.169.
    expect(allInRate(1.1715, -25, 'EURUSD')).toBe(1.169);
    // USDJPY spot 157.77 + (40 points × 0.01) = 158.17.
    expect(allInRate(157.77, 40, 'USDJPY')).toBe(158.17);
  });

  it('sumMargins adds the two components per side', () => {
    expect(sumMargins({ bid: 2, ask: 3 }, { bid: 1, ask: 1.5 })).toEqual({
      bid: 3,
      ask: 4.5,
    });
  });

  it('client forward bid/ask widen by the sum of spot + forward margins', () => {
    // All-in bid = 1.1715 - 0.0025 = 1.169; client bid subtracts (2+1)=3 pips.
    expect(clientBidFromForward(1.1715, -25, 2, 1, 'EURUSD')).toBe(
      clientBidFromTrader(1.169, 3, 'EURUSD'),
    );
    expect(clientAskFromForward(1.1717, -25, 2, 1, 'EURUSD')).toBe(
      clientAskFromTrader(allInRate(1.1717, -25, 'EURUSD'), 3, 'EURUSD'),
    );
  });

  it('zero forward points + zero forward margin reduces to the spot case', () => {
    expect(clientBidFromForward(1.1715, 0, 3, 0, 'EURUSD')).toBe(
      clientBidFromTrader(1.1715, 3, 'EURUSD'),
    );
  });
});

describe('side-specific forward points (v3+, FXSW-074)', () => {
  it('outrightPair: bid uses bid points, ask uses ask points (asymmetric even at zero margin)', () => {
    const spot = { bid: 1.1715, ask: 1.1717, mid: 1.1716 };
    const points = { bid: -27, ask: -23, mid: -25 };
    const o = outrightPair(spot, points, 'EURUSD');
    expect(o.bid).toBe(allInRate(1.1715, -27, 'EURUSD'));
    expect(o.ask).toBe(allInRate(1.1717, -23, 'EURUSD'));
    expect(o.mid).toBe(allInRate(1.1716, -25, 'EURUSD'));
    // Asymmetric points => the outright spread differs from the raw spot spread,
    // with no margin applied at all.
    expect(o.ask - o.bid).not.toBeCloseTo(spot.ask - spot.bid, 10);
  });

  it('outrightPair: all-zero (SPOT) points collapse each side back to spot', () => {
    const spot = { bid: 157.75, ask: 157.79, mid: 157.77 };
    const o = outrightPair(spot, { bid: 0, ask: 0, mid: 0 }, 'USDJPY');
    expect(o).toEqual(spot);
  });

  it('clientForwardPair: each side widens by its own points + margins', () => {
    const spot = { bid: 1.1715, ask: 1.1717, mid: 1.1716 };
    const points = { bid: -27, ask: -23, mid: -25 };
    const p = clientForwardPair(spot, points, { bid: 2, ask: 4 }, { bid: 1, ask: 3 }, 'EURUSD');
    expect(p.bid).toBe(clientBidFromForward(1.1715, -27, 2, 1, 'EURUSD'));
    expect(p.ask).toBe(clientAskFromForward(1.1717, -23, 4, 3, 'EURUSD'));
  });
});

describe('spotMarginFor (FXSW-089 F-2 — NDF spot-margin inertness)', () => {
  it('zeroes the spot margin for an NDF regardless of the raw marginPair', () => {
    expect(spotMarginFor('NDF', { bid: 7, ask: 9 })).toEqual({ bid: 0, ask: 0 });
  });

  it('passes the margin through unchanged for SPOT / OUTRIGHT / SWAP', () => {
    const m = { bid: 3, ask: 4 };
    expect(spotMarginFor('SPOT', m)).toBe(m);
    expect(spotMarginFor('OUTRIGHT', m)).toBe(m);
    expect(spotMarginFor('SWAP', m)).toBe(m);
  });
});

describe('swap pricing (FXSW-084)', () => {
  const net = { bid: 130, ask: 140 };

  it('effectiveSwapMargin TOTAL uses the entered net margin directly', () => {
    const m = effectiveSwapMargin(
      'TOTAL',
      { total: { bid: 3, ask: 5 }, near: { bid: 1, ask: 1 }, far: { bid: 2, ask: 2 } },
      'BOTH',
    );
    expect(m).toEqual({ bid: 3, ask: 5 });
  });

  it('effectiveSwapMargin PER_COMPONENT sums the two legs per side', () => {
    const m = effectiveSwapMargin(
      'PER_COMPONENT',
      { total: { bid: 99, ask: 99 }, near: { bid: 1, ask: 2 }, far: { bid: 4, ask: 6 } },
      'BOTH',
    );
    expect(m).toEqual({ bid: 5, ask: 8 });
  });

  it('clientSwapNetPoints widens the net (bid down, ask up) by the margin', () => {
    expect(clientSwapNetPoints(net, { bid: 3, ask: 5 })).toEqual({ bid: 127, ask: 145 });
  });

  it('total vs per-component reach the same net client points when totals match', () => {
    const total = effectiveSwapMargin(
      'TOTAL',
      { total: { bid: 5, ask: 8 }, near: { bid: 0, ask: 0 }, far: { bid: 0, ask: 0 } },
      'BOTH',
    );
    const perComp = effectiveSwapMargin(
      'PER_COMPONENT',
      { total: { bid: 0, ask: 0 }, near: { bid: 1, ask: 2 }, far: { bid: 4, ask: 6 } },
      'BOTH',
    );
    expect(clientSwapNetPoints(net, total)).toEqual(clientSwapNetPoints(net, perComp));
  });

  it('one-sided gating: a BID request zeroes the ask margin (off-side not priced)', () => {
    expect(gateMarginToSide({ bid: 3, ask: 5 }, 'BID')).toEqual({ bid: 3, ask: 0 });
    const m = effectiveSwapMargin(
      'PER_COMPONENT',
      { total: { bid: 0, ask: 0 }, near: { bid: 1, ask: 2 }, far: { bid: 4, ask: 6 } },
      'BID',
    );
    expect(m).toEqual({ bid: 5, ask: 0 });
    // The locked ask side reverts to the raw net (no markup).
    expect(clientSwapNetPoints(net, m)).toEqual({ bid: 125, ask: 140 });
  });

  it('one-sided gating: an ASK request zeroes the bid margin', () => {
    expect(gateMarginToSide({ bid: 3, ask: 5 }, 'ASK')).toEqual({ bid: 0, ask: 5 });
  });

  it('swap P/L reuses estimatedProfitUsd on the effective margin per side', () => {
    const m = effectiveSwapMargin(
      'TOTAL',
      { total: { bid: 4, ask: 4 }, near: { bid: 0, ask: 0 }, far: { bid: 0, ask: 0 } },
      'BID',
    );
    // BID quotable, ask gated to 0 → only the bid side earns.
    expect(estimatedProfitUsd(m.bid, 1_000_000, 'EURUSD', 1.17)).toBeGreaterThan(0);
    expect(estimatedProfitUsd(m.ask, 1_000_000, 'EURUSD', 1.17)).toBe(0);
  });
});
