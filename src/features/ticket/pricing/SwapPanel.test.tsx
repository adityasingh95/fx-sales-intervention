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

  it('renders two side tiles, each with its directional spot + near/far points', () => {
    renderPanel();
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('swap-side-ask')).toBeTruthy();
    // Directional points: bid tile uses bid points, ask tile uses ask points.
    expect(screen.getByTestId('leg-near-points-bid').textContent).toBe(fmtPoints(swap.near.bid));
    expect(screen.getByTestId('leg-far-points-bid').textContent).toBe(fmtPoints(swap.far.bid));
    expect(screen.getByTestId('leg-near-points-ask').textContent).toBe(fmtPoints(swap.near.ask));
    expect(screen.getByTestId('leg-far-points-ask').textContent).toBe(fmtPoints(swap.far.ask));
    // Spot rate per side + value dates.
    expect(screen.getByTestId('swap-spot-bid').textContent).not.toBe('');
    expect(screen.getByTestId('swap-spot-ask').textContent).not.toBe('');
    expect(screen.getByTestId('leg-near-value-date').textContent).not.toBe('');
    expect(screen.getByTestId('leg-far-value-date').textContent).not.toBe('');
    // The standalone net row is gone — the client net lives in each tile.
    expect(screen.queryByTestId('swap-net-bid')).toBeNull();
  });

  it('client net equals the raw net at zero markup', () => {
    renderPanel();
    expect(screen.getByTestId('client-net-bid').textContent).toBe(fmtPoints(swap.net.bid));
    expect(screen.getByTestId('client-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('defaults to Per-component: spot + near + far steppers per side, no all-in stepper', () => {
    renderPanel();
    expect(screen.getByTestId('swap-markup-mode')).toBeTruthy();
    // Bid tile per-component steppers.
    expect(screen.getByTestId('margin-input-spot-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-near-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-far-bid')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();

    // Marking up the near leg widens that side's client net.
    const before = screen.getByTestId('client-net-bid').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-near-bid'));
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe(before);
  });

  it('the shared spot markup also widens the client net (per-component)', () => {
    renderPanel();
    const before = screen.getByTestId('client-net-ask').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-spot-ask'));
    expect(screen.getByTestId('client-net-ask').textContent).not.toBe(before);
  });

  it('All-in mode: one net stepper per side; spot/leg steppers hidden', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('swap-markup-mode-total'));
    expect(screen.getByTestId('margin-input-net-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-input-net-ask')).toBeTruthy();
    expect(screen.queryByTestId('margin-input-spot-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-far-bid')).toBeNull();

    const before = screen.getByTestId('client-net-ask').textContent;
    fireEvent.click(screen.getByTestId('margin-plus-net-ask'));
    expect(screen.getByTestId('client-net-ask').textContent).not.toBe(before);
  });

  it('per-side Zero clears that side’s spot + leg markups', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('margin-plus-near-bid'));
    fireEvent.click(screen.getByTestId('margin-plus-spot-bid'));
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).value).toBe('1');
    fireEvent.click(screen.getByTestId('swap-zero-bid'));
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).value).toBe('0');
    expect((screen.getByTestId('margin-input-spot-bid') as HTMLInputElement).value).toBe('0');
  });

  it('one-sided lock (Per-component): ask side steppers disabled, ask tile dimmed', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect((screen.getByTestId('margin-input-near-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-spot-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-far-ask') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('margin-input-near-bid') as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByTestId('swap-side-ask').getAttribute('data-quotable')).toBe('false');
    // The locked side has no Zero button.
    expect(screen.queryByTestId('swap-zero-ask')).toBeNull();
  });

  it('one-sided lock suppresses the off-side client net + P/L (dash, not raw net) (FXSW-091 F-2)', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect(screen.getByTestId('client-net-bid').textContent).not.toBe('—');
    expect(screen.getByTestId('client-net-ask').textContent).toBe('—');
    expect(screen.getByTestId('swap-pnl-ask').textContent).toBe('Net client points');
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

  it('read-only (auto-priced) hides the toggle and all steppers but keeps the tiles', () => {
    renderPanel({ readOnly: true });
    expect(screen.queryByTestId('swap-markup-mode')).toBeNull();
    expect(screen.queryByTestId('margin-input-net-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-near-bid')).toBeNull();
    expect(screen.queryByTestId('margin-input-spot-bid')).toBeNull();
    expect(screen.getByTestId('swap-side-bid')).toBeTruthy();
    expect(screen.getByTestId('leg-near-points-bid')).toBeTruthy();
  });
});
