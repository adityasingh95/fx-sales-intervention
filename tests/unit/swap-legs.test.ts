import { describe, expect, it } from 'vitest';
import { buildSwapLegs, oppositeSide, resolveSwapLegs, swapLegSide, tenorRank } from '@/types/deal';

// FXSW-082 — forward-forward swap legs: NEAR + FAR with FAR strictly later.
describe('buildSwapLegs', () => {
  it('builds NEAR + FAR with the requested far when far is strictly later', () => {
    expect(buildSwapLegs('1M', '6M')).toEqual([
      { kind: 'NEAR', tenor: '1M' },
      { kind: 'FAR', tenor: '6M' },
    ]);
  });

  it('supports a SPOT near leg (forward-forward where near is spot)', () => {
    expect(buildSwapLegs('SPOT', '3M')).toEqual([
      { kind: 'NEAR', tenor: 'SPOT' },
      { kind: 'FAR', tenor: '3M' },
    ]);
  });

  it('coerces a far equal to near up to the next tenor (far ≤ near rejected)', () => {
    const [near, far] = buildSwapLegs('3M', '3M');
    expect(near.tenor).toBe('3M');
    expect(tenorRank(far.tenor)).toBeGreaterThan(tenorRank(near.tenor));
    expect(far.tenor).toBe('6M');
  });

  it('coerces a far earlier than near up to the next tenor after near', () => {
    expect(buildSwapLegs('6M', '1M')).toEqual([
      { kind: 'NEAR', tenor: '6M' },
      { kind: 'FAR', tenor: '9M' },
    ]);
  });

  it('defaults the far to the tenor immediately after near when far is omitted', () => {
    expect(buildSwapLegs('1M')).toEqual([
      { kind: 'NEAR', tenor: '1M' },
      { kind: 'FAR', tenor: '2M' },
    ]);
  });

  it('steps near back when near is the last tenor so a strictly-later far exists', () => {
    const [near, far] = buildSwapLegs('1Y', '1Y');
    expect(tenorRank(far.tenor)).toBeGreaterThan(tenorRank(near.tenor));
    expect(near.tenor).toBe('9M');
    expect(far.tenor).toBe('1Y');
  });
});

// FXSW-091 F-1 — resolveSwapLegs flags whether the request had to be coerced.
describe('resolveSwapLegs', () => {
  it('a valid forward-forward request is NOT flagged as adjusted', () => {
    const r = resolveSwapLegs('1M', '6M');
    expect(r.adjusted).toBe(false);
    expect(r.legs).toEqual([
      { kind: 'NEAR', tenor: '1M' },
      { kind: 'FAR', tenor: '6M' },
    ]);
    expect(r.requested).toEqual({ near: '1M', far: '6M' });
  });

  it('flags a missing far as adjusted (an invented far)', () => {
    const r = resolveSwapLegs('1M');
    expect(r.adjusted).toBe(true);
    expect(r.requested).toEqual({ near: '1M', far: undefined });
  });

  it('flags an out-of-order (far ≤ near) request as adjusted', () => {
    const r = resolveSwapLegs('6M', '1M');
    expect(r.adjusted).toBe(true);
    expect(r.legs[1].tenor).toBe('9M');
    expect(r.requested).toEqual({ near: '6M', far: '1M' });
  });

  it('flags a last-tenor near (stepped back) as adjusted', () => {
    const r = resolveSwapLegs('1Y', '1Y');
    expect(r.adjusted).toBe(true);
    expect(r.legs[0].tenor).toBe('9M');
  });
});

// A swap trades opposite directions per leg — near takes the deal side, far the
// opposite (near buy / far sell, and vice versa). BOTH stays two-sided per leg.
describe('swapLegSide', () => {
  it('inverts BUY/SELL', () => {
    expect(oppositeSide('BUY')).toBe('SELL');
    expect(oppositeSide('SELL')).toBe('BUY');
    expect(oppositeSide('BOTH')).toBe('BOTH');
  });

  it('near buy / far sell for a BUY deal', () => {
    expect(swapLegSide('BUY', 'NEAR')).toBe('BUY');
    expect(swapLegSide('BUY', 'FAR')).toBe('SELL');
  });

  it('near sell / far buy for a SELL deal', () => {
    expect(swapLegSide('SELL', 'NEAR')).toBe('SELL');
    expect(swapLegSide('SELL', 'FAR')).toBe('BUY');
  });

  it('a two-sided request stays two-sided on both legs', () => {
    expect(swapLegSide('BOTH', 'NEAR')).toBe('BOTH');
    expect(swapLegSide('BOTH', 'FAR')).toBe('BOTH');
  });
});
