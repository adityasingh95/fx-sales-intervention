import { describe, expect, it } from 'vitest';
import { forwardPointsFeed } from './forwardPoints';
import { FORWARD_TENORS } from '@/types/deal';

describe('forwardPointsFeed', () => {
  it('returns 0 for SPOT', () => {
    expect(forwardPointsFeed.get('EURUSD', 'SPOT')).toBe(0);
  });

  it('is deterministic across calls', () => {
    const a = forwardPointsFeed.get('USDJPY', '3M');
    const b = forwardPointsFeed.get('USDJPY', '3M');
    expect(a).toBe(b);
  });

  it('magnitude increases monotonically with tenor', () => {
    let prev = 0;
    for (const tenor of FORWARD_TENORS) {
      const mag = Math.abs(forwardPointsFeed.get('EURUSD', tenor));
      expect(mag).toBeGreaterThan(prev);
      prev = mag;
    }
  });

  it('keeps the per-pair sign convention', () => {
    expect(forwardPointsFeed.get('EURUSD', '1Y')).toBeLessThan(0);
    expect(forwardPointsFeed.get('USDJPY', '1Y')).toBeGreaterThan(0);
  });
});
