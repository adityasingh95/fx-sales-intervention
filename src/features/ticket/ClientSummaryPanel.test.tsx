import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Pair, PriceTick } from '@/services/feed/types';
import ClientSummaryPanel from './ClientSummaryPanel';

const tickOf = (pair: Pair, bid: number, ask: number, mid: number): PriceTick => ({
  pair,
  bid,
  ask,
  mid,
  timestamp: 1_700_000_000_000,
});

describe('<ClientSummaryPanel />', () => {
  it('EURUSD bid=1.0850, ask=1.0852, margin=3 → client bid 1.0847 / client ask 1.0855', () => {
    render(
      <ClientSummaryPanel
        pair="EURUSD"
        tick={tickOf('EURUSD', 1.085, 1.0852, 1.0851)}
        margin={3}
        notional={1_000_000}
      />,
    );
    expect(screen.getByTestId('client-bid')).toHaveTextContent('1.0847');
    expect(screen.getByTestId('client-ask')).toHaveTextContent('1.0855');
  });

  it('USDJPY (2-decimal pip): bid=157.77, ask=157.78, margin=3 → 157.74 / 157.81', () => {
    render(
      <ClientSummaryPanel
        pair="USDJPY"
        tick={tickOf('USDJPY', 157.77, 157.78, 157.77)}
        margin={3}
        notional={5_000_000}
      />,
    );
    expect(screen.getByTestId('client-bid')).toHaveTextContent('157.74');
    expect(screen.getByTestId('client-ask')).toHaveTextContent('157.81');
  });

  it('estimated profit updates when margin changes (re-renders within one frame)', () => {
    const tick = tickOf('EURUSD', 1.085, 1.0852, 1.0851);
    const { rerender } = render(
      <ClientSummaryPanel pair="EURUSD" tick={tick} margin={3} notional={1_000_000} />,
    );
    expect(screen.getByTestId('estimated-profit')).toHaveTextContent('$300');
    rerender(
      <ClientSummaryPanel pair="EURUSD" tick={tick} margin={6} notional={1_000_000} />,
    );
    expect(screen.getByTestId('estimated-profit')).toHaveTextContent('$600');
    expect(screen.getByTestId('client-bid')).toHaveTextContent('1.0844');
  });

  it('uses whichever tick the parent passes (fixed-mode captured rate vs live)', () => {
    // Parent in fixed mode passes the captured tick (1.0900). The panel
    // should compute from THAT, not the live tick (1.1000) which the
    // parent isn't passing.
    const captured = tickOf('EURUSD', 1.09, 1.0902, 1.0901);
    render(
      <ClientSummaryPanel
        pair="EURUSD"
        tick={captured}
        margin={3}
        notional={1_000_000}
      />,
    );
    expect(screen.getByTestId('client-bid')).toHaveTextContent('1.0897');
    expect(screen.getByTestId('client-ask')).toHaveTextContent('1.0905');
  });

  it('renders em-dash placeholders when no tick is available', () => {
    render(
      <ClientSummaryPanel
        pair="EURUSD"
        tick={null}
        margin={3}
        notional={1_000_000}
      />,
    );
    expect(screen.getByTestId('client-bid')).toHaveTextContent('—');
    expect(screen.getByTestId('client-ask')).toHaveTextContent('—');
    expect(screen.getByTestId('estimated-profit')).toHaveTextContent('—');
  });
});
