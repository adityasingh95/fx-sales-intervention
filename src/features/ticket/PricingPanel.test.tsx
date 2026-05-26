import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { pricingFeed } from '@/services/feed/pricingFeed';
import PricingPanel from './PricingPanel';

const setSeed = (n: number | undefined): void => {
  const w = window as Window & { __seedFeed?: number };
  if (n === undefined) delete w.__seedFeed;
  else w.__seedFeed = n;
};

describe('<PricingPanel />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setSeed(42);
  });

  afterEach(() => {
    pricingFeed.stop();
    setSeed(undefined);
    vi.useRealTimers();
  });

  it('with the seeded feed, bid/ask/mid cells render expected pair-precision values', () => {
    render(<PricingPanel pair="EURUSD" />);
    expect(screen.getByTestId('bid-cell')).toHaveTextContent('—');
    act(() => {
      pricingFeed.start();
      vi.advanceTimersByTime(300);
    });
    // Seed-42 first EURUSD tick: mid_float sits in the
    // [1.17145, 1.171475) window — mid rounds to 1.1715, but
    // bid = mid_float − 0.000025 (half of the 0.5-pip spread) lands
    // below 1.17145 and rounds to 1.1714. FXSW-007's golden sequence
    // locked the mid only; this captures the bid/ask asymmetry that
    // emerges at the half-spread rounding boundary.
    expect(screen.getByTestId('bid-cell')).toHaveTextContent('1.1714');
    expect(screen.getByTestId('mid-cell')).toHaveTextContent('1.1715');
    expect(screen.getByTestId('ask-cell')).toHaveTextContent('1.1715');
  });

  it('on a value change, the cell gets data-flash="down" that clears after 80ms', () => {
    // Seed-42 GBPUSD bid/ask both drop on tick 2 (1.3510 → 1.3509 on bid,
    // 1.3511 → 1.3510 on ask) — clean both-cells-flash setup.
    render(<PricingPanel pair="GBPUSD" />);
    act(() => {
      pricingFeed.start();
      vi.advanceTimersByTime(300); // tick 1 — no flash (no previous value)
    });
    expect(screen.getByTestId('bid-cell')).not.toHaveAttribute('data-flash');
    expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-flash');
    act(() => {
      vi.advanceTimersByTime(300); // tick 2 — both bid + ask move down
    });
    expect(screen.getByTestId('bid-cell')).toHaveAttribute('data-flash', 'down');
    expect(screen.getByTestId('ask-cell')).toHaveAttribute('data-flash', 'down');
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(screen.getByTestId('bid-cell')).not.toHaveAttribute('data-flash');
    expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-flash');
  });

  it('stale-feed (no tick for 3s) renders the em-dash placeholder in all cells', () => {
    render(<PricingPanel pair="EURUSD" />);
    act(() => {
      pricingFeed.start();
      vi.advanceTimersByTime(300);
    });
    // (See the seed-42 test above for why bid is 1.1714 not 1.1715.)
    expect(screen.getByTestId('bid-cell')).toHaveTextContent('1.1714');
    // Stop the feed → no more ticks. Advance past the 3-second stale window.
    pricingFeed.stop();
    act(() => {
      vi.advanceTimersByTime(3001);
    });
    expect(screen.getByTestId('bid-cell')).toHaveTextContent('—');
    expect(screen.getByTestId('ask-cell')).toHaveTextContent('—');
    expect(screen.getByTestId('mid-cell')).toHaveTextContent('—');
  });
});
