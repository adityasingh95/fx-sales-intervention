import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { timings } from '@/state/machines/timings';
import { useDealsStore } from '@/state/stores/dealsStore';
import type { Deal } from '@/types/deal';
import TicketFooter from './TicketFooter';

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  dealId: 'd_footer',
  clientName: 'Globex Industries',
  accountCode: 'GLBX-JPY-2',
  pair: 'USDJPY',
  side: 'SELL',
  notional: 5_000_000,
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: new Date(2026, 4, 25, 14, 0, 0).getTime(),
  ...overrides,
});

const resetStore = (): void => {
  for (const entry of useDealsStore.getState().deals.values()) {
    entry.actor.stop();
  }
  useDealsStore.setState({ deals: new Map(), historic: [] });
};

const siOf = (dealId: string): string =>
  useDealsStore.getState().deals.get(dealId)?.siState ?? '__missing__';

// Lightweight harness that wires the live deal entry's siState into
// the footer. Mirrors what TicketPanel does without dragging the
// overlay shell into the tests.
function Harness({
  dealId,
  initialPricingMode = 'streaming',
}: {
  dealId: string;
  initialPricingMode?: 'streaming' | 'fixed';
}) {
  const [pricingMode, setPricingMode] = useState(initialPricingMode);
  const siState = useDealsStore(
    (s) => s.deals.get(dealId)?.siState ?? 'Initial',
  );
  return (
    <TicketFooter
      dealId={dealId}
      siState={siState}
      pricingMode={pricingMode}
      onReturnToStream={() => setPricingMode('streaming')}
    />
  );
}

describe('<TicketFooter />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
    });
    // Drive to PickedUp (the most common starting state for footer tests).
    act(() => {
      useDealsStore.getState().forwardEvent('d_footer', { type: 'PickUp' });
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  it('in SI PickedUp streaming mode: Send Stream + Release + Reject visible; Withdraw / Send Quote / Return-to-Stream hidden', () => {
    render(<Harness dealId="d_footer" initialPricingMode="streaming" />);
    expect(siOf('d_footer')).toBe('PickedUp');
    expect(screen.queryByTestId('btn-send-stream')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-release')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-reject')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-withdraw')).toBeNull();
    expect(screen.queryByTestId('btn-send-quote')).toBeNull();
    expect(screen.queryByTestId('btn-return-stream')).toBeNull();
  });

  it('in SI PickedUp fixed mode: Send Quote + Release + Reject + Return-to-Stream visible; Send Stream hidden', () => {
    render(<Harness dealId="d_footer" initialPricingMode="fixed" />);
    expect(screen.queryByTestId('btn-send-quote')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-release')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-reject')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-return-stream')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-send-stream')).toBeNull();
  });

  it('in SI Quoted: Withdraw + Reject visible; Release also visible per §4.7', () => {
    // Drive PickedUp → Quoted via Send Stream (Quote + ack).
    act(() => {
      useDealsStore.getState().forwardEvent('d_footer', { type: 'Quote' });
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(siOf('d_footer')).toBe('Quoted');
    render(<Harness dealId="d_footer" initialPricingMode="streaming" />);
    expect(screen.queryByTestId('btn-withdraw')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-reject')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-release')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-send-stream')).toBeNull();
    expect(screen.queryByTestId('btn-send-quote')).toBeNull();
  });

  it('Reject single-click does not fire; pointerDown + 600ms hold fires', () => {
    render(<Harness dealId="d_footer" initialPricingMode="streaming" />);
    const btn = screen.getByTestId('btn-reject');
    // Single click = pointerDown + pointerUp immediately → cancels.
    act(() => {
      fireEvent.pointerDown(btn);
      fireEvent.pointerUp(btn);
    });
    expect(siOf('d_footer')).toBe('PickedUp'); // unchanged
    // Hold for 600ms → fires.
    act(() => {
      fireEvent.pointerDown(btn);
      vi.advanceTimersByTime(600);
    });
    expect(siOf('d_footer')).toBe('RejectSent');
  });

  it('Send Stream fires Quote; siState cycles QuoteSent → Quoted with the ack delay', () => {
    render(<Harness dealId="d_footer" initialPricingMode="streaming" />);
    const btn = screen.getByTestId('btn-send-stream');
    act(() => {
      fireEvent.pointerDown(btn);
      vi.advanceTimersByTime(600);
    });
    expect(siOf('d_footer')).toBe('QuoteSent');
    act(() => {
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(siOf('d_footer')).toBe('Quoted');
  });

  it('Send Stream button shows in-flight spinner during QuoteSent', () => {
    render(<Harness dealId="d_footer" initialPricingMode="streaming" />);
    const btn = screen.getByTestId('btn-send-stream');
    act(() => {
      fireEvent.pointerDown(btn);
      vi.advanceTimersByTime(600);
    });
    // Now in QuoteSent — the button stays mounted with in-flight state.
    const inFlightBtn = screen.getByTestId('btn-send-stream');
    expect(inFlightBtn).toHaveAttribute('data-in-flight', 'true');
    expect(inFlightBtn).toBeDisabled();
  });

  it('Release fires Hold; siState cycles HoldSent → Initial; dealable flips back to true', () => {
    render(<Harness dealId="d_footer" initialPricingMode="streaming" />);
    expect(useDealsStore.getState().deals.get('d_footer')?.dealable).toBe(false);
    act(() => {
      fireEvent.click(screen.getByTestId('btn-release'));
    });
    expect(siOf('d_footer')).toBe('HoldSent');
    act(() => {
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(siOf('d_footer')).toBe('Initial');
    expect(useDealsStore.getState().deals.get('d_footer')?.dealable).toBe(true);
  });
});
