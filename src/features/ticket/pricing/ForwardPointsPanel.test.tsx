import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ForwardPointsPanel from './ForwardPointsPanel';
import { allInRate, clientAskFromForward, clientBidFromForward } from '@/lib/pips';
import { formatRate } from '@/lib/format';
import type { ForwardPointsPair } from '@/services/feed/forwardPoints';
import type { PriceTick } from '@/services/feed/types';

const tick: PriceTick = { pair: 'EURUSD', bid: 1.1712, mid: 1.1715, ask: 1.1718, timestamp: 0 };
// Asymmetric two-sided points so bid/ask selection is observable.
const points: ForwardPointsPair = { bid: -27, ask: -23, mid: -25 };

const renderPanel = (overrides: Partial<React.ComponentProps<typeof ForwardPointsPanel>> = {}) =>
  render(
    <ForwardPointsPanel
      pair="EURUSD"
      tenor="3M"
      tick={tick}
      fwdPoints={points}
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

  it('shows two-sided forward points (bid/mid/ask) and, with no markup, the raw all-in outright', () => {
    renderPanel();
    expect(screen.getByTestId('fwd-points-bid').textContent).toBe('-27.0');
    expect(screen.getByTestId('fwd-points-mid').textContent).toBe('-25.0');
    expect(screen.getByTestId('fwd-points-ask').textContent).toBe('-23.0');
    expect(screen.getByTestId('all-in-mid').textContent).toBe(
      allInRate(tick.mid, points.mid, 'EURUSD').toFixed(4),
    );
    // With zero margins the client all-in equals the raw outright — bid uses bid
    // points, ask uses ask points.
    expect(screen.getByTestId('all-in-bid').textContent).toBe(
      allInRate(tick.bid, points.bid, 'EURUSD').toFixed(4),
    );
    expect(screen.getByTestId('all-in-ask').textContent).toBe(
      allInRate(tick.ask, points.ask, 'EURUSD').toFixed(4),
    );
  });

  it('all-in bid/ask reflect the side-specific points + spot/forward markup', () => {
    renderPanel({ marginPair: { bid: 4, ask: 5 }, fwdMarginPair: { bid: 1, ask: 2 } });
    expect(screen.getByTestId('all-in-bid').textContent).toBe(
      formatRate(clientBidFromForward(tick.bid, points.bid, 4, 1, 'EURUSD'), 'EURUSD'),
    );
    expect(screen.getByTestId('all-in-ask').textContent).toBe(
      formatRate(clientAskFromForward(tick.ask, points.ask, 5, 2, 'EURUSD'), 'EURUSD'),
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
        fwdPoints={points}
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

  it('locks the non-quotable side and hides Balance/Zero for a one-sided request (FXSW-068)', () => {
    // BID-only request: the ask forward markup cannot be priced.
    renderPanel({ restrictMarginSides: true, quoteSide: 'BID' });
    expect(screen.getByTestId('margin-input-fwd-bid')).not.toBeDisabled();
    expect(screen.getByTestId('margin-input-fwd-ask')).toBeDisabled();
    expect(screen.queryByTestId('margin-balance-fwd')).toBeNull();
    expect(screen.queryByTestId('margin-zero-fwd')).toBeNull();
  });

  it('keeps both forward sides editable for a two-sided request', () => {
    renderPanel({ restrictMarginSides: true, quoteSide: 'BOTH' });
    expect(screen.getByTestId('margin-input-fwd-bid')).not.toBeDisabled();
    expect(screen.getByTestId('margin-input-fwd-ask')).not.toBeDisabled();
    expect(screen.getByTestId('margin-balance-fwd')).toBeTruthy();
  });
});
