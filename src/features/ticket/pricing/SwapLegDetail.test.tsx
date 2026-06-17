import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SwapLegDetail from './SwapLegDetail';
import { clientSwapNetPoints } from '@/lib/pips';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { Deal } from '@/types/deal';

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
  instrumentType: 'SWAP',
  legs: [
    { kind: 'NEAR', tenor: '1M' },
    { kind: 'FAR', tenor: '6M' },
  ],
};

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

describe('SwapLegDetail (FXSW-086)', () => {
  afterEach(cleanup);
  const swap = swapPointsFeed.get('USDINR', '1M', '6M');

  it('lists each leg with its tenor + value date and the net differential', () => {
    render(<SwapLegDetail deal={deal} />);
    expect(screen.getByTestId('swap-detail-near').textContent).toContain('1M');
    expect(screen.getByTestId('swap-detail-far').textContent).toContain('6M');
    expect(screen.getByTestId('swap-detail-net-bid').textContent).toBe(fmtPoints(swap.net.bid));
    expect(screen.getByTestId('swap-detail-net-ask').textContent).toBe(fmtPoints(swap.net.ask));
  });

  it('omits the execution row when no price was sent', () => {
    render(<SwapLegDetail deal={deal} />);
    expect(screen.queryByTestId('swap-detail-exec-bid')).toBeNull();
  });

  it('shows the net used for execution = raw net marked up by the captured margin', () => {
    const executedNetMargin = { bid: 2, ask: 3 };
    render(<SwapLegDetail deal={deal} executedNetMargin={executedNetMargin} />);
    const exec = clientSwapNetPoints(swap.net, executedNetMargin);
    expect(screen.getByTestId('swap-detail-exec-bid').textContent).toBe(fmtPoints(exec.bid));
    expect(screen.getByTestId('swap-detail-exec-ask').textContent).toBe(fmtPoints(exec.ask));
  });

  it('surfaces the legs-adjusted note in the historic detail when the swap was coerced (FXSW-091 F-1)', () => {
    render(<SwapLegDetail deal={{ ...deal, swapRequested: { near: '1M', far: undefined } }} />);
    expect(screen.getByTestId('swap-adjust-note')).toBeTruthy();
  });

  it('omits the legs-adjusted note for a valid (un-coerced) swap', () => {
    render(<SwapLegDetail deal={deal} />);
    expect(screen.queryByTestId('swap-adjust-note')).toBeNull();
  });
});
