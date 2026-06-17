import { describe, expect, it } from 'vitest';
import { forwardPointsFeed } from './forwardPoints';
import { FORWARD_TENORS } from '@/types/deal';

describe('forwardPointsFeed', () => {
  it('returns an all-zero pair for SPOT', () => {
    expect(forwardPointsFeed.get('EURUSD', 'SPOT')).toEqual({ bid: 0, ask: 0, mid: 0 });
  });

  it('is deterministic across calls', () => {
    const a = forwardPointsFeed.get('USDJPY', '3M');
    const b = forwardPointsFeed.get('USDJPY', '3M');
    expect(a).toEqual(b);
  });

  it('mid magnitude increases monotonically with tenor', () => {
    let prev = 0;
    for (const tenor of FORWARD_TENORS) {
      const mag = Math.abs(forwardPointsFeed.get('EURUSD', tenor).mid);
      expect(mag).toBeGreaterThan(prev);
      prev = mag;
    }
  });

  it('keeps the per-pair sign convention on the mid', () => {
    expect(forwardPointsFeed.get('EURUSD', '1Y').mid).toBeLessThan(0);
    expect(forwardPointsFeed.get('USDJPY', '1Y').mid).toBeGreaterThan(0);
  });

  it('is two-sided with bid <= mid <= ask on every forward tenor', () => {
    for (const tenor of FORWARD_TENORS) {
      const { bid, ask, mid } = forwardPointsFeed.get('EURUSD', tenor);
      expect(bid).toBeLessThan(mid);
      expect(ask).toBeGreaterThan(mid);
      // Spread is symmetric around mid (no RNG perturbation of either side).
      expect(round1(ask - mid)).toBe(round1(mid - bid));
    }
  });

  it('spread widens monotonically with tenor', () => {
    let prev = 0;
    for (const tenor of FORWARD_TENORS) {
      const { bid, ask } = forwardPointsFeed.get('USDJPY', tenor);
      const spread = round1(ask - bid);
      expect(spread).toBeGreaterThan(prev);
      prev = spread;
    }
  });
});

const round1 = (n: number): number => Math.round(n * 10) / 10;
