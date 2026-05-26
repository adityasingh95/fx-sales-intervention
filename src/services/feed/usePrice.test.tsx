import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { pricingFeed } from './pricingFeed';
import { usePrice } from './usePrice';

const setSeed = (n: number | undefined): void => {
  const w = window as Window & { __seedFeed?: number };
  if (n === undefined) delete w.__seedFeed;
  else w.__seedFeed = n;
};

function Probe({ onTick }: { onTick: (mid: number | null) => void }) {
  const tick = usePrice('EURUSD');
  onTick(tick?.mid ?? null);
  return null;
}

describe('usePrice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setSeed(42);
  });

  afterEach(() => {
    pricingFeed.stop();
    setSeed(undefined);
    vi.useRealTimers();
  });

  it('subscribes on mount and delivers a tick within 600ms of start()', () => {
    const mids: Array<number | null> = [];
    render(<Probe onTick={(m) => mids.push(m)} />);
    expect(mids[0]).toBeNull();
    act(() => {
      pricingFeed.start();
      vi.advanceTimersByTime(300);
    });
    expect(mids.at(-1)).not.toBeNull();
    expect(typeof mids.at(-1)).toBe('number');
  });

  it('unsubscribes on unmount; no further state updates after', () => {
    const mids: Array<number | null> = [];
    const { unmount } = render(<Probe onTick={(m) => mids.push(m)} />);
    act(() => {
      pricingFeed.start();
      vi.advanceTimersByTime(300);
    });
    const ticksSeen = mids.length;
    unmount();
    act(() => {
      vi.advanceTimersByTime(900); // 3 more ticks would arrive
    });
    expect(mids.length).toBe(ticksSeen);
  });
});
