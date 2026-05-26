import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { pricingFeed } from '@/services/feed/pricingFeed';
import type { Pair, PriceTick } from '@/services/feed/types';
import { usePrice } from '@/services/feed/usePrice';
import PricingPanel from './PricingPanel';

const setSeed = (n: number | undefined): void => {
  const w = window as Window & { __seedFeed?: number };
  if (n === undefined) delete w.__seedFeed;
  else w.__seedFeed = n;
};

// Harness mirrors what TicketPanel does: subscribes to the live feed
// via usePrice, owns the pricing-mode + frozen-tick state, owns the
// margin state. Lets the tests drive PricingPanel through the same
// surface the app uses.
function Harness({
  pair,
  initialMargin = 3,
  onMarginChange,
}: {
  pair: Pair;
  initialMargin?: number;
  onMarginChange?: (n: number) => void;
}) {
  const [margin, setMargin] = useState(initialMargin);
  const [pricingMode, setPricingMode] = useState<'streaming' | 'fixed'>('streaming');
  const [fixedSide, setFixedSide] = useState<'bid' | 'ask' | null>(null);
  const [frozenTick, setFrozenTick] = useState<PriceTick | null>(null);
  const liveTick = usePrice(pair);

  return (
    <PricingPanel
      pair={pair}
      liveTick={liveTick}
      frozenTick={frozenTick}
      pricingMode={pricingMode}
      fixedSide={fixedSide}
      margin={margin}
      onMarginChange={(n) => {
        setMargin(n);
        onMarginChange?.(n);
      }}
      onEnterFixed={(side) => {
        if (!liveTick) return;
        setPricingMode('fixed');
        setFixedSide(side);
        setFrozenTick(liveTick);
      }}
      onRefresh={() => {
        if (liveTick) setFrozenTick(liveTick);
      }}
    />
  );
}

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

  describe('streaming mode (FXSW-017)', () => {
    it('with the seeded feed, bid/ask/mid cells render expected pair-precision values', () => {
      render(<Harness pair="EURUSD" />);
      expect(screen.getByTestId('bid-cell')).toHaveTextContent('—');
      act(() => {
        pricingFeed.start();
        vi.advanceTimersByTime(300);
      });
      // Seed-42 first EURUSD tick: mid 1.1715, bid 1.1714, ask 1.1715
      // (half-spread rounding asymmetry — see dev-log FXSW-017).
      expect(screen.getByTestId('bid-cell')).toHaveTextContent('1.1714');
      expect(screen.getByTestId('mid-cell')).toHaveTextContent('1.1715');
      expect(screen.getByTestId('ask-cell')).toHaveTextContent('1.1715');
    });

    it('on a value change, the cell gets data-flash="down" that clears after 80ms', () => {
      render(<Harness pair="GBPUSD" />);
      act(() => {
        pricingFeed.start();
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByTestId('bid-cell')).not.toHaveAttribute('data-flash');
      expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-flash');
      act(() => {
        vi.advanceTimersByTime(300);
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
      render(<Harness pair="EURUSD" />);
      act(() => {
        pricingFeed.start();
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByTestId('bid-cell')).toHaveTextContent('1.1714');
      pricingFeed.stop();
      act(() => {
        vi.advanceTimersByTime(3001);
      });
      expect(screen.getByTestId('bid-cell')).toHaveTextContent('—');
      expect(screen.getByTestId('ask-cell')).toHaveTextContent('—');
      expect(screen.getByTestId('mid-cell')).toHaveTextContent('—');
    });
  });

  describe('fixed mode (FXSW-018)', () => {
    it('click bid → data-pricing-mode="fixed" + bid cell gets data-focused', () => {
      render(<Harness pair="EURUSD" />);
      act(() => {
        pricingFeed.start();
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByTestId('pricing-panel')).toHaveAttribute(
        'data-pricing-mode',
        'streaming',
      );
      act(() => {
        fireEvent.click(screen.getByTestId('bid-cell'));
      });
      expect(screen.getByTestId('pricing-panel')).toHaveAttribute(
        'data-pricing-mode',
        'fixed',
      );
      expect(screen.getByTestId('bid-cell')).toHaveAttribute('data-focused', 'true');
      expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-focused');
    });

    it('Refresh button renders only in fixed mode', () => {
      render(<Harness pair="EURUSD" />);
      act(() => {
        pricingFeed.start();
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByTestId('refresh-button')).toBeNull();
      act(() => {
        fireEvent.click(screen.getByTestId('ask-cell'));
      });
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('+ button increments margin by 1; - decrements', () => {
      const seen: number[] = [];
      render(<Harness pair="EURUSD" initialMargin={3} onMarginChange={(n) => seen.push(n)} />);
      act(() => {
        fireEvent.click(screen.getByTestId('margin-plus'));
      });
      expect(seen.at(-1)).toBe(4);
      act(() => {
        fireEvent.click(screen.getByTestId('margin-minus'));
      });
      expect(seen.at(-1)).toBe(3);
    });

    it('keypress "+"/"−" does the same as the buttons', () => {
      const seen: number[] = [];
      render(<Harness pair="EURUSD" initialMargin={3} onMarginChange={(n) => seen.push(n)} />);
      act(() => {
        fireEvent.keyDown(document, { key: '+' });
      });
      expect(seen.at(-1)).toBe(4);
      act(() => {
        fireEvent.keyDown(document, { key: '-' });
      });
      expect(seen.at(-1)).toBe(3);
    });

    it('margin floor is 1 — both - button and - key clamp', () => {
      const seen: number[] = [];
      render(<Harness pair="EURUSD" initialMargin={1} onMarginChange={(n) => seen.push(n)} />);
      expect(screen.getByTestId('margin-minus')).toBeDisabled();
      act(() => {
        fireEvent.click(screen.getByTestId('margin-minus'));
      });
      expect(seen).toEqual([]);
      act(() => {
        fireEvent.keyDown(document, { key: '-' });
      });
      expect(seen.at(-1)).toBe(1);
    });

    it('programmatic margin update (FXSW-025 Apply simulation) animates data-margin-glow for 600ms', () => {
      function ControlledHarness({ value }: { value: number }) {
        return (
          <PricingPanel
            pair="EURUSD"
            liveTick={null}
            frozenTick={null}
            pricingMode="streaming"
            fixedSide={null}
            margin={value}
            onMarginChange={() => {}}
            onEnterFixed={() => {}}
            onRefresh={() => {}}
          />
        );
      }
      const { rerender } = render(<ControlledHarness value={3} />);
      expect(screen.getByTestId('margin-input')).not.toHaveAttribute(
        'data-margin-glow',
      );
      rerender(<ControlledHarness value={4} />);
      expect(screen.getByTestId('margin-input')).toHaveAttribute(
        'data-margin-glow',
        'true',
      );
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('margin-input')).not.toHaveAttribute(
        'data-margin-glow',
      );
    });
  });
});
