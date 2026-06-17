import { describe, expect, it } from 'vitest';
import { swapPointsFeed } from './swapPoints';
import { forwardPointsFeed } from './forwardPoints';

const round1 = (n: number): number => Math.round(n * 10) / 10;

describe('swapPointsFeed', () => {
  it('forward-forward: returns each leg pair and net = far − near per side', () => {
    const near = forwardPointsFeed.get('EURUSD', '1M');
    const far = forwardPointsFeed.get('EURUSD', '6M');
    const swap = swapPointsFeed.get('EURUSD', '1M', '6M');

    expect(swap.near).toEqual(near);
    expect(swap.far).toEqual(far);
    expect(swap.net.bid).toBe(round1(far.bid - near.bid));
    expect(swap.net.ask).toBe(round1(far.ask - near.ask));
  });

  it('SPOT-near: the near leg is all-zero so net equals the far points', () => {
    const far = forwardPointsFeed.get('USDJPY', '3M');
    const swap = swapPointsFeed.get('USDJPY', 'SPOT', '3M');

    expect(swap.near).toEqual({ bid: 0, ask: 0, mid: 0 });
    expect(swap.net.bid).toBe(far.bid);
    expect(swap.net.ask).toBe(far.ask);
  });

  it('net magnitude grows as the far leg moves further from a fixed near leg', () => {
    const shorter = swapPointsFeed.get('USDINR', '1M', '3M');
    const longer = swapPointsFeed.get('USDINR', '1M', '9M');

    expect(Math.abs(longer.net.bid)).toBeGreaterThan(Math.abs(shorter.net.bid));
    expect(Math.abs(longer.net.ask)).toBeGreaterThan(Math.abs(shorter.net.ask));
  });

  it('is a pure composition — querying swaps does not perturb the forward mid sequence', () => {
    const before = forwardPointsFeed.get('GBPUSD', '6M').mid;
    swapPointsFeed.get('GBPUSD', '1M', '6M');
    swapPointsFeed.get('GBPUSD', 'SPOT', '9M');
    expect(forwardPointsFeed.get('GBPUSD', '6M').mid).toBe(before);
  });
});
