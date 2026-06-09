import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { timings } from '@/state/machines/timings';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { Deal } from '@/types/deal';
import TicketPanel from './TicketPanel';

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  dealId: 'd_ticket',
  clientName: 'Globex Industries',
  accountCode: 'GLBX-JPY-2',
  pair: 'USDJPY',
  side: 'SELL',
  notional: 5_000_000,
  dealtCcy: 'BASE',
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: new Date(2026, 4, 25, 14, 23, 8).getTime(),
  ...overrides,
});

const resetStores = (): void => {
  for (const entry of useDealsStore.getState().deals.values()) {
    entry.actor.stop();
  }
  useDealsStore.setState({ deals: new Map(), historic: [] });
  useUiStore.setState({ openDealId: null });
};

const siState = (dealId: string): string =>
  useDealsStore.getState().deals.get(dealId)?.siState ?? '__missing__';

describe('<TicketPanel />', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    resetStores();
    vi.useRealTimers();
  });

  it('is not rendered when uiStore.openDealId === null', () => {
    render(<TicketPanel />);
    expect(screen.queryByTestId('ticket-panel')).toBeNull();
  });

  it('renders when openDealId is set; contains the deal basic info', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      useUiStore.getState().openTicket('d_ticket');
    });
    render(<TicketPanel />);
    const panel = screen.getByTestId('ticket-panel');
    expect(panel).toHaveAttribute('data-deal-id', 'd_ticket');
    expect(panel).toHaveTextContent('Globex Industries');
    expect(panel).toHaveTextContent('GLBX-JPY-2');
    // FXSW-016's SummaryPanel splits the pair into base + quote in the
    // natural-language sentence ("SELL ... USD vs JPY"), and the
    // DealSummary direction shows "SELL USD". So we assert on base and
    // quote separately rather than the concatenated pair code.
    expect(panel).toHaveTextContent('USD');
    expect(panel).toHaveTextContent('JPY');
    expect(panel).toHaveTextContent('SELL');
    expect(panel).toHaveTextContent('5,000,000');
    expect(panel).toHaveTextContent('Outside trading window');
  });

  it('Esc keypress calls uiStore.closeTicket()', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      useUiStore.getState().openTicket('d_ticket');
    });
    render(<TicketPanel />);
    expect(useUiStore.getState().openDealId).toBe('d_ticket');
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(useUiStore.getState().openDealId).toBeNull();
  });

  it('opening fires SI PickUp on the deal machine (Initial → PickUpSent → PickedUp)', () => {
    vi.useFakeTimers();
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
    });
    expect(siState('d_ticket')).toBe('Initial');
    act(() => {
      useUiStore.getState().openTicket('d_ticket');
    });
    render(<TicketPanel />);
    expect(siState('d_ticket')).toBe('PickUpSent');
    act(() => {
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(siState('d_ticket')).toBe('PickedUp');
  });

  it('closing does NOT fire Hold (the deal stays in PickedUp)', () => {
    vi.useFakeTimers();
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      useUiStore.getState().openTicket('d_ticket');
    });
    render(<TicketPanel />);
    act(() => {
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(siState('d_ticket')).toBe('PickedUp');
    // Close via Esc.
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    // No HoldSent transition — deal stays in PickedUp until the operator
    // explicitly clicks Release in the (future) ticket footer.
    expect(siState('d_ticket')).toBe('PickedUp');
    expect(useUiStore.getState().openDealId).toBeNull();
  });
});
