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

  it('renders NEAR + FAR legs with their points and value dates', () => {
    renderPanel();
    expect(screen.getByTestId('leg-near')).toBeTruthy();
    expect(screen.getByTestId('leg-far')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid').textContent).toBe(fmtPoints(swap.near.bid));
    expect(screen.getByTestId('leg-far-points-ask').textContent).toBe(fmtPoints(swap.far.ask));
    // Value dates render (far strictly later than near).
    expect(screen.getByTestId('leg-near-value-date').textContent).not.toBe('');
    expect(screen.getByTestId('leg-far-value-date').textContent).not.toBe('');
  });

  it('shows the net differential row = far − near per side', () => {
    renderPanel();
    expect(screen.getByTestId('swap-net-bid').textContent).toBe(fmtPoints(swap.net.bid));
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('per-component mode: shows a margin on each leg; widening a leg margin widens the client net', () => {
    renderPanel();
    // Per-component is the default — per-leg steppers are present, net margin absent.
    expect(screen.getByTestId('margin-input-near-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-far-ask')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();

    const before = screen.getByTestId('client-net-bid').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-far-bid'));
    // Marking up the far leg moves the client net bid down (dealer takes margin).
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe(before);
  });

  it('total mode: swaps the per-leg margins for a single net-points margin', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('swap-markup-mode-total'));
    expect(screen.getByTestId('margin-input-net-bid')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-far-bid')).toBeNull();

    // The raw net row is unchanged by mode; the client net widens with margin.
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
    const before = screen.getByTestId('client-net-ask').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-net-ask'));
    expect(screen.getByTestId('client-net-ask').textContent).not.toBe(before);
  });

  it('one-sided lock: a BID-only request disables the ask steppers and hides Balance/Zero', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect((screen.getByTestId('margin-input-near-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-far-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).disabled).toBe(false);
    // Balance/Zero are hidden for a one-sided request.
    expect(screen.queryByTestId('margin-balance-near')).toBeNull();
  });

  it('one-sided lock suppresses the off-side client net + P/L (shows a dash, not raw net) (FXSW-091 F-2)', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    // BID quotable → real client net; ASK locked → dash, never the raw un-marked net.
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe('—');
    expect(screen.getByTestId('client-net-ask').textContent).toBe('—');
    expect(screen.getByTestId('swap-pnl-ask').textContent).toBe('—');
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
    expect((screen.getByTestId('margin-input-near-ask') as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByTestId('margin-balance-near')).toBeTruthy();
  });

  it('read-only (auto-priced) hides the markup toggle and disables steppers', () => {
    renderPanel({ readOnly: true });
    expect(screen.queryByTestId('swap-markup-mode')).toBeNull();
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).disabled).toBe(true);
  });
});
