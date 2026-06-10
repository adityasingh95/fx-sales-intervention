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

    it('Refresh button is always rendered; disabled in streaming, enabled in fixed', () => {
      render(<Harness pair="EURUSD" />);
      act(() => {
        pricingFeed.start();
        vi.advanceTimersByTime(300);
      });
      const refresh = screen.getByTestId('refresh-button');
      expect(refresh).toBeInTheDocument();
      expect(refresh).toBeDisabled();
      act(() => {
        fireEvent.click(screen.getByTestId('ask-cell'));
      });
      expect(screen.getByTestId('refresh-button')).not.toBeDisabled();
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

    // FXSW-038 — v2 side-selection UX
    it('v2 fixed mode: clicking ASK dims the BID cell via data-dimmed', () => {
      function V2Harness() {
        return (
          <PricingPanel
            pair="EURUSD"
            liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
            frozenTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
            pricingMode="fixed"
            fixedSide="ask"
            margin={3}
            onMarginChange={() => {}}
            onEnterFixed={() => {}}
            onRefresh={() => {}}
            quoteSide="BOTH"
          />
        );
      }
      render(<V2Harness />);
      expect(screen.getByTestId('bid-cell')).toHaveAttribute('data-dimmed', 'true');
      expect(screen.getByTestId('ask-cell')).toHaveAttribute('data-focused', 'true');
      expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-dimmed');
    });

    it('v2 re-click toggle: clicking the focused side again calls onExitFixed', () => {
      const onExitFixed = vi.fn();
      const onEnterFixed = vi.fn();
      render(
        <PricingPanel
          pair="EURUSD"
          liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          frozenTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          pricingMode="fixed"
          fixedSide="bid"
          margin={3}
          onMarginChange={() => {}}
          onEnterFixed={onEnterFixed}
          onExitFixed={onExitFixed}
          onRefresh={() => {}}
        />,
      );
      act(() => {
        fireEvent.click(screen.getByTestId('bid-cell'));
      });
      expect(onExitFixed).toHaveBeenCalledOnce();
      expect(onEnterFixed).not.toHaveBeenCalled();
    });

    it('v2 re-click toggle: clicking the OTHER side enters fixed for that side (not exit)', () => {
      const onExitFixed = vi.fn();
      const onEnterFixed = vi.fn();
      render(
        <PricingPanel
          pair="EURUSD"
          liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          frozenTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          pricingMode="fixed"
          fixedSide="bid"
          margin={3}
          onMarginChange={() => {}}
          onEnterFixed={onEnterFixed}
          onExitFixed={onExitFixed}
          onRefresh={() => {}}
        />,
      );
      act(() => {
        fireEvent.click(screen.getByTestId('ask-cell'));
      });
      expect(onEnterFixed).toHaveBeenCalledWith('ask');
      expect(onExitFixed).not.toHaveBeenCalled();
    });

    it('v2 quoteSide=ASK: BID cell is disabled (data-disabled) and ignores clicks', () => {
      const onEnterFixed = vi.fn();
      render(
        <PricingPanel
          pair="USDJPY"
          liveTick={{ pair: 'USDJPY', bid: 157.76, mid: 157.77, ask: 157.78, timestamp: 0 }}
          frozenTick={null}
          pricingMode="streaming"
          fixedSide={null}
          margin={3}
          onMarginChange={() => {}}
          onEnterFixed={onEnterFixed}
          onRefresh={() => {}}
          quoteSide="ASK"
        />,
      );
      expect(screen.getByTestId('bid-cell')).toHaveAttribute('data-disabled', 'true');
      expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-disabled');
      act(() => {
        fireEvent.click(screen.getByTestId('bid-cell'));
      });
      expect(onEnterFixed).not.toHaveBeenCalled();
      // The clickable side still works.
      act(() => {
        fireEvent.click(screen.getByTestId('ask-cell'));
      });
      expect(onEnterFixed).toHaveBeenCalledWith('ask');
    });

    it('v2 quoteSide=BID: ASK cell is disabled', () => {
      render(
        <PricingPanel
          pair="EURUSD"
          liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          frozenTick={null}
          pricingMode="streaming"
          fixedSide={null}
          margin={3}
          onMarginChange={() => {}}
          onEnterFixed={() => {}}
          onRefresh={() => {}}
          quoteSide="BID"
        />,
      );
      expect(screen.getByTestId('ask-cell')).toHaveAttribute('data-disabled', 'true');
      expect(screen.getByTestId('bid-cell')).not.toHaveAttribute('data-disabled');
    });

    it('v1 default (no quoteSide prop): both cells clickable, no disabled state', () => {
      const onEnterFixed = vi.fn();
      render(
        <PricingPanel
          pair="EURUSD"
          liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          frozenTick={null}
          pricingMode="streaming"
          fixedSide={null}
          margin={3}
          onMarginChange={() => {}}
          onEnterFixed={onEnterFixed}
          onRefresh={() => {}}
        />,
      );
      expect(screen.getByTestId('bid-cell')).not.toHaveAttribute('data-disabled');
      expect(screen.getByTestId('ask-cell')).not.toHaveAttribute('data-disabled');
      act(() => {
        fireEvent.click(screen.getByTestId('bid-cell'));
      });
      expect(onEnterFixed).toHaveBeenCalledWith('bid');
    });

    it('v1 (no onExitFixed): re-clicking focused side calls onEnterFixed again (v1 behaviour preserved)', () => {
      const onEnterFixed = vi.fn();
      render(
        <PricingPanel
          pair="EURUSD"
          liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          frozenTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
          pricingMode="fixed"
          fixedSide="bid"
          margin={3}
          onMarginChange={() => {}}
          onEnterFixed={onEnterFixed}
          onRefresh={() => {}}
        />,
      );
      act(() => {
        fireEvent.click(screen.getByTestId('bid-cell'));
      });
      // No onExitFixed prop means the v1 path is taken: re-click on the
      // focused side falls through to onEnterFixed (parent's handler is
      // idempotent — setting the same state has no visible effect).
      expect(onEnterFixed).toHaveBeenCalledWith('bid');
    });

    // FXSW-040 — v2 dual margin UI
    describe('v2 dual-margin UI', () => {
      function DualHarness({
        initialPair = { bid: 3, ask: 3 },
        onChange,
      }: {
        initialPair?: { bid: number; ask: number };
        onChange?: (p: { bid: number; ask: number }) => void;
      }) {
        const [pair, setPair] = useState(initialPair);
        return (
          <PricingPanel
            pair="EURUSD"
            liveTick={{ pair: 'EURUSD', bid: 1.08, mid: 1.0801, ask: 1.0802, timestamp: 0 }}
            frozenTick={null}
            pricingMode="streaming"
            fixedSide={null}
            margin={pair.bid}
            onMarginChange={() => {}}
            onEnterFixed={() => {}}
            onRefresh={() => {}}
            marginPair={pair}
            onMarginPairChange={(next) => {
              setPair(next);
              onChange?.(next);
            }}
          />
        );
      }

      it('renders bid + ask inputs + Balance + Zero buttons; hides the v1 single input', () => {
        render(<DualHarness />);
        expect(screen.getByTestId('margin-input-bid')).toBeInTheDocument();
        expect(screen.getByTestId('margin-input-ask')).toBeInTheDocument();
        expect(screen.getByTestId('margin-balance')).toBeInTheDocument();
        expect(screen.getByTestId('margin-zero')).toBeInTheDocument();
        expect(screen.queryByTestId('margin-input')).toBeNull();
      });

      it('+/- per side adjusts only that side', () => {
        const seen: Array<{ bid: number; ask: number }> = [];
        render(<DualHarness onChange={(p) => seen.push(p)} />);
        act(() => {
          fireEvent.click(screen.getByTestId('margin-plus-bid'));
        });
        expect(seen.at(-1)).toEqual({ bid: 4, ask: 3 });
        act(() => {
          fireEvent.click(screen.getByTestId('margin-plus-ask'));
        });
        expect(seen.at(-1)).toEqual({ bid: 4, ask: 4 });
        act(() => {
          fireEvent.click(screen.getByTestId('margin-minus-bid'));
        });
        expect(seen.at(-1)).toEqual({ bid: 3, ask: 4 });
      });

      it('Balance: averages the two sides, rounded; equalizes both', () => {
        const seen: Array<{ bid: number; ask: number }> = [];
        render(<DualHarness initialPair={{ bid: 2, ask: 8 }} onChange={(p) => seen.push(p)} />);
        act(() => {
          fireEvent.click(screen.getByTestId('margin-balance'));
        });
        // (2 + 8) / 2 = 5 → both sides 5
        expect(seen.at(-1)).toEqual({ bid: 5, ask: 5 });
      });

      it('Balance: odd-sum rounds to the nearest integer', () => {
        const seen: Array<{ bid: number; ask: number }> = [];
        render(<DualHarness initialPair={{ bid: 3, ask: 6 }} onChange={(p) => seen.push(p)} />);
        act(() => {
          fireEvent.click(screen.getByTestId('margin-balance'));
        });
        // (3 + 6) / 2 = 4.5 → Math.round → 5
        expect(seen.at(-1)).toEqual({ bid: 5, ask: 5 });
      });

      it('Zero: sets both sides to 0', () => {
        const seen: Array<{ bid: number; ask: number }> = [];
        render(<DualHarness initialPair={{ bid: 5, ask: 7 }} onChange={(p) => seen.push(p)} />);
        act(() => {
          fireEvent.click(screen.getByTestId('margin-zero'));
        });
        expect(seen.at(-1)).toEqual({ bid: 0, ask: 0 });
      });

      it('bid input does not affect ask (independent editing)', () => {
        const seen: Array<{ bid: number; ask: number }> = [];
        render(<DualHarness initialPair={{ bid: 3, ask: 6 }} onChange={(p) => seen.push(p)} />);
        act(() => {
          fireEvent.change(screen.getByTestId('margin-input-bid'), { target: { value: '9' } });
        });
        expect(seen.at(-1)).toEqual({ bid: 9, ask: 6 });
      });

      it('keypress "+" on the focused side input adjusts that side only', () => {
        const seen: Array<{ bid: number; ask: number }> = [];
        render(<DualHarness initialPair={{ bid: 3, ask: 6 }} onChange={(p) => seen.push(p)} />);
        const bidInput = screen.getByTestId('margin-input-bid');
        act(() => {
          fireEvent.keyDown(bidInput, { key: '+' });
        });
        expect(seen.at(-1)).toEqual({ bid: 4, ask: 6 });
      });
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
