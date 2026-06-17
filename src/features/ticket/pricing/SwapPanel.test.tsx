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

  it('renders legs section with per-leg bid/ask points, side tiles, and value dates', () => {
    renderPanel();
    // Legs section present with both leg columns.
    expect(screen.getByTestId('swap-legs-section')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid').textContent).toBe(fmtPoints(swap.near.bid));
    expect(screen.getByTestId('leg-far-points-ask').textContent).toBe(fmtPoints(swap.far.ask));
    // Side tiles present.
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('swap-side-ask')).toBeTruthy();
    // Value dates in the legs section headers.
    expect(screen.getByTestId('leg-near-value-date').textContent).not.toBe('');
    expect(screen.getByTestId('leg-far-value-date').textContent).not.toBe('');
  });

  it('component-adjusted net (swap-net-bid/ask) equals raw net at zero component margins', () => {
    renderPanel();
    expect(screen.getByTestId('swap-net-bid').textContent).toBe(fmtPoints(swap.net.bid));
    expect(screen.getByTestId('swap-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('two-layer markup: per-leg steppers AND all-in net steppers are always visible; widening either widens the client net', () => {
    renderPanel();
    // Layer 1 — per-component steppers (near + far, bid + ask).
    expect(screen.getByTestId('margin-input-near-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-near-ask')).toBeTruthy();
    expect(screen.getByTestId('margin-input-far-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-far-ask')).toBeTruthy();
    // Layer 2 — all-in net steppers (one per side tile).
    expect(screen.getByTestId('margin-input-net-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-net-ask')).toBeTruthy();
    // No mode toggle — both layers always present.
    expect(screen.queryByTestId('swap-markup-mode')).toBeNull();

    // Widening a per-leg margin widens the component-adjusted net and client net.
    const netBefore = screen.getByTestId('swap-net-bid').textContent;
    const clientBefore = screen.getByTestId('client-net-bid').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-far-bid'));
    expect(screen.getByTestId('swap-net-bid').textContent).not.toBe(netBefore);
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe(clientBefore);

    // Widening the all-in net margin widens the client net but NOT the component net.
    const netAfterComponent = screen.getByTestId('swap-net-bid').textContent;
    const clientAfterComponent = screen.getByTestId('client-net-bid').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-net-bid'));
    // Component net unchanged (all-in is a separate layer).
    expect(screen.getByTestId('swap-net-bid').textContent).toBe(netAfterComponent);
    // Client net widens further.
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe(clientAfterComponent);
  });

  it('one-sided lock: a BID-only request disables ask steppers on both layers and dims the ask tile', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    // Layer 1: ask steppers locked on both legs.
    expect((screen.getByTestId('margin-input-near-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-far-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).disabled).toBe(false);
    // Layer 2: all-in ask stepper locked.
    expect((screen.getByTestId('margin-input-net-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-net-bid') as HTMLInputElement).disabled).toBe(false);
    // The whole ask tile is flagged non-quotable (dimmed).
    expect(screen.getByTestId('swap-side-ask').getAttribute('data-quotable')).toBe('false');
    expect(screen.queryByTestId('margin-balance-net')).toBeNull();
  });

  it('one-sided lock suppresses the off-side client net + P/L (shows a dash, not raw net) (FXSW-091 F-2)', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe('—');
    expect(screen.getByTestId('client-net-ask').textContent).toBe('—');
    expect(screen.getByTestId('swap-pnl-ask').textContent).toBe('—');
  });

  it('labels tiles as fixed swap directions: bid=Buy/Sell, ask=Sell/Buy, regardless of deal.side', () => {
    renderPanel({
      restrictMarginSides: true,
      quoteSide: 'ASK',
      deal: { ...deal, pair: 'EURUSD', side: 'BUY', legs: deal.legs },
    } as Partial<React.ComponentProps<typeof SwapPanel>>);
    expect(screen.getByTestId('swap-side-bid-direction').textContent).toBe('Buy/Sell EUR');
    expect(screen.getByTestId('swap-side-ask-direction').textContent).toBe('Sell/Buy EUR');
    // Also verify for a two-sided deal.
    cleanup();
    renderPanel({ deal: { ...deal, pair: 'EURUSD', side: 'BOTH', legs: deal.legs } });
    expect(screen.getByTestId('swap-side-bid-direction').textContent).toBe('Buy/Sell EUR');
    expect(screen.getByTestId('swap-side-ask-direction').textContent).toBe('Sell/Buy EUR');
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

  it('two-sided request keeps all steppers on both layers editable with Balance/Zero', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BOTH' });
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByTestId('margin-input-near-ask') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByTestId('margin-input-net-bid') as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByTestId('margin-balance-near')).toBeTruthy();
    expect(screen.getByTestId('margin-balance-net')).toBeTruthy();
  });

  it('read-only (auto-priced) hides all markup steppers but keeps the breakdown visible', () => {
    renderPanel({ readOnly: true });
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-balance-net')).toBeNull();
    // Side tiles + legs section still render for context.
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('swap-legs-section')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid')).toBeTruthy();
  });
});
