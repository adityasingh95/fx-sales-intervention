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

  it('renders Bid + Ask side tiles with per-leg points and value dates', () => {
    renderPanel();
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('swap-side-ask')).toBeTruthy();
    // Per-leg points appear as read-only context inside each side tile.
    expect(screen.getByTestId('leg-near-points-bid').textContent).toBe(fmtPoints(swap.near.bid));
    expect(screen.getByTestId('leg-far-points-ask').textContent).toBe(fmtPoints(swap.far.ask));
    // Value dates render once in the header (far strictly later than near).
    expect(screen.getByTestId('leg-near-value-date').textContent).not.toBe('');
    expect(screen.getByTestId('leg-far-value-date').textContent).not.toBe('');
  });

  it('shows the raw net differential row = far − near per side', () => {
    renderPanel();
    expect(screen.getByTestId('swap-net-bid').textContent).toBe(fmtPoints(swap.net.bid));
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('net-only markup: one net stepper per side; widening it widens the client net', () => {
    renderPanel();
    // A single net-points markup per side — no per-leg steppers.
    expect(screen.getByTestId('margin-input-net-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-net-ask')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-far-bid')).toBeNull();
    // No per-component / total toggle remains.
    expect(screen.queryByTestId('swap-markup-mode')).toBeNull();

    // The raw net row is unchanged by markup; the client net widens with margin.
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
    const before = screen.getByTestId('client-net-ask').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-net-ask'));
    expect(screen.getByTestId('client-net-ask').textContent).not.toBe(before);
  });

  it('one-sided lock: a BID-only request disables the ask stepper and dims the ask tile', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect((screen.getByTestId('margin-input-net-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-net-bid') as HTMLInputElement).disabled).toBe(false);
    // The whole non-quotable tile is flagged not-quotable; Balance/Zero hidden.
    expect(screen.getByTestId('swap-side-ask').getAttribute('data-quotable')).toBe('false');
    expect(screen.getByTestId('swap-side-bid').getAttribute('data-quotable')).toBe('true');
    expect(screen.queryByTestId('margin-balance-net')).toBeNull();
  });

  it('one-sided lock suppresses the off-side client net + P/L (shows a dash, not raw net) (FXSW-091 F-2)', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    // BID quotable → real client net; ASK locked → dash, never the raw un-marked net.
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe('—');
    expect(screen.getByTestId('client-net-ask').textContent).toBe('—');
    expect(screen.getByTestId('swap-pnl-ask').textContent).toBe('—');
  });

  it('labels each tile with its dealing direction for a one-sided request', () => {
    // A BUY/base request quotes on ASK: that tile carries the deal direction
    // (near buy / far sell); the bid tile inverts it (near sell / far buy).
    renderPanel({
      restrictMarginSides: true,
      quoteSide: 'ASK',
      deal: { ...deal, pair: 'EURUSD', side: 'BUY', legs: deal.legs },
    } as Partial<React.ComponentProps<typeof SwapPanel>>);
    expect(screen.getByTestId('swap-side-ask-direction').textContent).toBe('Buy/Sell EUR');
    expect(screen.getByTestId('swap-side-bid-direction').textContent).toBe('Sell/Buy EUR');
  });

  it('shows a legs-adjusted note when the swap was coerced, and none for a valid request (FXSW-091 F-1)', () => {
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

  it('two-sided request keeps both sides editable with Balance/Zero', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BOTH' });
    expect((screen.getByTestId('margin-input-net-bid') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByTestId('margin-input-net-ask') as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByTestId('margin-balance-net')).toBeTruthy();
  });

  it('read-only (auto-priced) hides the markup steppers but keeps the breakdown', () => {
    renderPanel({ readOnly: true });
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();
    expect(screen.queryByTestId('margin-balance-net')).toBeNull();
    // The side tiles + per-leg points still render for context.
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid')).toBeTruthy();
  });
});
