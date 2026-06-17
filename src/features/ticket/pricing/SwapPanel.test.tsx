import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SwapPanel from './SwapPanel';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { PriceTick } from '@/services/feed/types';
import type { Deal } from '@/types/deal';

const tick: PriceTick = { pair: 'USDINR', bid: 95.6, mid: 95.65, ask: 95.7, timestamp: 0 };

const deal: Deal = {
  dealId: 'd_swap',
  clientName: 'Acme',
  accountCode: 'ACME01',
  pair: 'USDINR',
  side: 'BOTH',
  dealtCcy: 'BASE',
  notional: 1_000_000,
  tenor: '1M',
  defaultMarginPips: 3,
  createdAt: Date.UTC(2026, 4, 25),
  legs: [
    { kind: 'NEAR', tenor: '1M' },
    { kind: 'FAR', tenor: '6M' },
  ],
  instrumentType: 'SWAP',
};

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

const renderPanel = (overrides: Partial<React.ComponentProps<typeof SwapPanel>> = {}) =>
  render(<SwapPanel deal={deal} tick={tick} {...overrides} />);

describe('SwapPanel', () => {
  afterEach(cleanup);

  const swap = swapPointsFeed.get('USDINR', '1M', '6M');

  it('renders legs section, side tiles, and value dates', () => {
    renderPanel();
    expect(screen.getByTestId('swap-legs-section')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid').textContent).toBe(fmtPoints(swap.near.bid));
    expect(screen.getByTestId('leg-far-points-ask').textContent).toBe(fmtPoints(swap.far.ask));
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('swap-side-ask')).toBeTruthy();
    expect(screen.getByTestId('leg-near-value-date').textContent).not.toBe('');
    expect(screen.getByTestId('leg-far-value-date').textContent).not.toBe('');
  });

  it('net row equals raw net at zero margins', () => {
    renderPanel();
    expect(screen.getByTestId('swap-net-bid').textContent).toBe(fmtPoints(swap.net.bid));
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('defaults to Per-component: per-leg steppers shown, all-in net stepper hidden', () => {
    renderPanel();
    expect(screen.getByTestId('swap-markup-mode')).toBeTruthy();
    expect(screen.getByTestId('margin-input-near-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-far-ask')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();

    // Marking up a leg moves the net row and the client net.
    const netBefore = screen.getByTestId('swap-net-bid').textContent;
    const clientBefore = screen.getByTestId('client-net-bid').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-far-bid'));
    expect(screen.getByTestId('swap-net-bid').textContent).not.toBe(netBefore);
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe(clientBefore);
  });

  it('All-in mode: swaps per-leg steppers for a single net stepper per side', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('swap-markup-mode-total'));
    expect(screen.getByTestId('margin-input-net-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-net-ask')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-far-bid')).toBeNull();

    // The raw net row is unchanged by all-in markup; the client net widens.
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
    const before = screen.getByTestId('client-net-ask').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-net-ask'));
    expect(screen.getByTestId('client-net-ask').textContent).not.toBe(before);
    // Net row still raw (all-in is a tile-level layer).
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('one-sided lock (Per-component): ask leg steppers disabled, ask tile dimmed', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect((screen.getByTestId('margin-input-near-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-far-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByTestId('swap-side-ask').getAttribute('data-quotable')).toBe('false');
    expect(screen.queryByTestId('margin-balance-near')).toBeNull();
  });

  it('one-sided lock (All-in): off-side net stepper disabled', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    fireEvent.click(screen.getByTestId('swap-markup-mode-total'));
    expect((screen.getByTestId('margin-input-net-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-net-bid') as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByTestId('margin-balance-net')).toBeNull();
  });

  it('one-sided lock suppresses the off-side client net + P/L (dash, not raw net) (FXSW-091 F-2)', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe('—');
    expect(screen.getByTestId('client-net-ask').textContent).toBe('—');
    expect(screen.getByTestId('swap-pnl-ask').textContent).toBe('—');
  });

  it('labels tiles as fixed swap directions: bid=Buy/Sell, ask=Sell/Buy, regardless of deal.side', () => {
    renderPanel({
      deal: { ...deal, pair: 'EURUSD', side: 'BUY', legs: deal.legs },
    } as Partial<React.ComponentProps<typeof SwapPanel>>);
    expect(screen.getByTestId('swap-side-bid-direction').textContent).toBe('Buy/Sell EUR');
    expect(screen.getByTestId('swap-side-ask-direction').textContent).toBe('Sell/Buy EUR');
    cleanup();
    renderPanel({ deal: { ...deal, pair: 'EURUSD', side: 'BOTH', legs: deal.legs } });
    expect(screen.getByTestId('swap-side-bid-direction').textContent).toBe('Buy/Sell EUR');
    expect(screen.getByTestId('swap-side-ask-direction').textContent).toBe('Sell/Buy EUR');
  });

  it('shows a legs-adjusted note when coerced, none for a valid request (FXSW-091 F-1)', () => {
    const { rerender } = renderPanel();
    expect(screen.queryByTestId('swap-adjust-note')).toBeNull();
    rerender(
      <SwapPanel
        deal={{
          ...deal,
          dealId: 'd_adj',
          tenor: '3M',
          legs: [
            { kind: 'NEAR', tenor: '3M' },
            { kind: 'FAR', tenor: '6M' },
          ],
          swapRequested: { near: '3M', far: '1M' },
        }}
        tick={tick}
      />,
    );
    const note = screen.getByTestId('swap-adjust-note');
    expect(note.textContent).toContain('3M');
    expect(note.textContent).toContain('1M');
  });

  it('read-only (auto-priced) hides the toggle and all steppers but keeps the breakdown', () => {
    renderPanel({ readOnly: true });
    expect(screen.queryByTestId('swap-markup-mode')).toBeNull();
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-balance-net')).toBeNull();
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('swap-legs-section')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid')).toBeTruthy();
  });
});
