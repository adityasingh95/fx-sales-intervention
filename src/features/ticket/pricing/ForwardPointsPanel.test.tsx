import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ForwardPointsPanel from './ForwardPointsPanel';
import { allInRate, clientAskFromForward, clientBidFromForward } from '@/lib/pips';
import { formatRate } from '@/lib/format';
import type { PriceTick } from '@/services/feed/types';

const tick: PriceTick = { pair: 'EURUSD', bid: 1.1712, mid: 1.1715, ask: 1.1718, timestamp: 0 };

const renderPanel = (overrides: Partial<React.ComponentProps<typeof ForwardPointsPanel>> = {}) =>
  render(
    <ForwardPointsPanel
      pair="EURUSD"
      tenor="3M"
      tick={tick}
      fwdPoints={-25}
      markupMode="component"
      onMarkupModeChange={vi.fn()}
      marginPair={{ bid: 0, ask: 0 }}
      fwdMarginPair={{ bid: 0, ask: 0 }}
      onFwdMarginPairChange={vi.fn()}
      {...overrides}
    />,
  );

describe('ForwardPointsPanel', () => {
  afterEach(cleanup);

  it('shows forward points and, with no markup, the raw all-in outright', () => {
    renderPanel();
    expect(screen.getByTestId('fwd-points').textContent).toBe('-25.0');
    expect(screen.getByTestId('all-in-mid').textContent).toBe(
      allInRate(tick.mid, -25, 'EURUSD').toFixed(4),
    );
    // With zero margins the client all-in equals the raw outright.
    expect(screen.getByTestId('all-in-bid').textContent).toBe(
      allInRate(tick.bid, -25, 'EURUSD').toFixed(4),
    );
  });

  it('all-in bid/ask reflect the spot + forward-points markup per side', () => {
    renderPanel({ marginPair: { bid: 4, ask: 5 }, fwdMarginPair: { bid: 1, ask: 2 } });
    expect(screen.getByTestId('all-in-bid').textContent).toBe(
      formatRate(clientBidFromForward(tick.bid, -25, 4, 1, 'EURUSD'), 'EURUSD'),
    );
    expect(screen.getByTestId('all-in-ask').textContent).toBe(
      formatRate(clientAskFromForward(tick.ask, -25, 5, 2, 'EURUSD'), 'EURUSD'),
    );
  });

  it('shows the forward-points margin row + balance/zero only in component mode', () => {
    const { rerender } = renderPanel({ markupMode: 'component' });
    expect(screen.getByTestId('margin-input-fwd-bid')).toBeTruthy();
    expect(screen.getByTestId('margin-balance-fwd')).toBeTruthy();
    expect(screen.getByTestId('margin-zero-fwd')).toBeTruthy();
    rerender(
      <ForwardPointsPanel
        pair="EURUSD"
        tenor="3M"
        tick={tick}
        fwdPoints={-25}
        markupMode="all-in"
        onMarkupModeChange={vi.fn()}
        marginPair={{ bid: 0, ask: 0 }}
        fwdMarginPair={{ bid: 0, ask: 0 }}
        onFwdMarginPairChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('margin-input-fwd-bid')).toBeNull();
    expect(screen.queryByTestId('margin-balance-fwd')).toBeNull();
  });

  it('toggling markup mode fires the callback', () => {
    const onMode = vi.fn();
    renderPanel({ onMarkupModeChange: onMode });
    fireEvent.click(screen.getByTestId('markup-mode-all-in'));
    expect(onMode).toHaveBeenCalledWith('all-in');
  });

  it('editing the forward-points margin fires the callback', () => {
    const onFwd = vi.fn();
    renderPanel({ onFwdMarginPairChange: onFwd });
    fireEvent.change(screen.getByTestId('margin-input-fwd-ask'), { target: { value: '2' } });
    expect(onFwd).toHaveBeenCalledWith({ bid: 0, ask: 2 });
  });

  it('forward Balance averages both sides; Zero clears them', () => {
    const onFwd = vi.fn();
    renderPanel({ fwdMarginPair: { bid: 2, ask: 6 }, onFwdMarginPairChange: onFwd });
    fireEvent.click(screen.getByTestId('margin-balance-fwd'));
    expect(onFwd).toHaveBeenCalledWith({ bid: 4, ask: 4 });
    fireEvent.click(screen.getByTestId('margin-zero-fwd'));
    expect(onFwd).toHaveBeenCalledWith({ bid: 0, ask: 0 });
  });
});
