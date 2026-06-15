import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ForwardPointsPanel from './ForwardPointsPanel';
import { allInRate } from '@/lib/pips';
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
      fwdMarginPair={{ bid: 0, ask: 0 }}
      onFwdMarginPairChange={vi.fn()}
      {...overrides}
    />,
  );

describe('ForwardPointsPanel', () => {
  afterEach(cleanup);

  it('shows forward points and the all-in outright rates', () => {
    renderPanel();
    expect(screen.getByTestId('fwd-points').textContent).toBe('-25.0');
    expect(screen.getByTestId('all-in-mid').textContent).toBe(
      allInRate(tick.mid, -25, 'EURUSD').toFixed(4),
    );
    expect(screen.getByTestId('all-in-bid').textContent).toBe(
      allInRate(tick.bid, -25, 'EURUSD').toFixed(4),
    );
  });

  it('shows the forward-points margin row only in component mode', () => {
    const { rerender } = renderPanel({ markupMode: 'component' });
    expect(screen.getByTestId('margin-input-fwd-bid')).toBeTruthy();
    rerender(
      <ForwardPointsPanel
        pair="EURUSD"
        tenor="3M"
        tick={tick}
        fwdPoints={-25}
        markupMode="all-in"
        onMarkupModeChange={vi.fn()}
        fwdMarginPair={{ bid: 0, ask: 0 }}
        onFwdMarginPairChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('margin-input-fwd-bid')).toBeNull();
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
});
