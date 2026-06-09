import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { timings } from '@/state/machines/timings';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { Deal } from '@/types/deal';
import { ActiveBlotter } from './ActiveBlotter';

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  dealId: 'd_test',
  clientName: 'Test Client',
  accountCode: 'TST-001',
  pair: 'EURUSD',
  side: 'BUY',
  notional: 1_000_000,
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

describe('<ActiveBlotter />', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    resetStores();
    vi.useRealTimers();
  });

  it('renders the empty-state message when there are no active deals', () => {
    render(<ActiveBlotter />);
    expect(
      screen.getByText(/No active deals\. Use the dev injector/),
    ).toBeInTheDocument();
  });

  it('renders one row per active deal with correct data-deal-id', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_a' }), ['OFF_HOURS']);
      useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_b' }), ['SIZE_LIMIT']);
    });
    render(<ActiveBlotter />);
    const body = screen.getByTestId('active-blotter-body');
    const rows = within(body).getAllByRole('button');
    expect(rows).toHaveLength(2);
    const ids = rows.map((r) => r.getAttribute('data-deal-id'));
    expect(ids.sort()).toEqual(['d_a', 'd_b']);
  });

  it('row data-si-state and data-display-status reflect the underlying machine', () => {
    vi.useFakeTimers();
    act(() => {
      useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_s' }), ['OFF_HOURS']);
    });
    render(<ActiveBlotter />);
    const row = () =>
      screen.getByTestId('active-blotter-body').querySelector('[data-deal-id="d_s"]');
    expect(row()).toHaveAttribute('data-si-state', 'Initial');
    expect(row()).toHaveAttribute('data-display-status', 'INTERVENE');
    expect(row()).toHaveAttribute('data-dealable', 'true');
    act(() => {
      useDealsStore.getState().forwardEvent('d_s', { type: 'PickUp' });
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(row()).toHaveAttribute('data-si-state', 'PickedUp');
    expect(row()).toHaveAttribute('data-display-status', 'PICKED UP');
    expect(row()).toHaveAttribute('data-dealable', 'false');
  });

  it('clicking a row calls uiStore.openTicket(dealId)', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_click' }), ['OFF_HOURS']);
    });
    render(<ActiveBlotter />);
    const row = screen
      .getByTestId('active-blotter-body')
      .querySelector('[data-deal-id="d_click"]') as HTMLElement;
    fireEvent.click(row);
    expect(useUiStore.getState().openDealId).toBe('d_click');
  });

  it('terminal-state row gets data-removing="true" and unmounts at t+5000ms', async () => {
    vi.useFakeTimers();
    act(() => {
      useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_term' }), ['CREDIT_LIMIT']);
      useDealsStore.getState().forwardEvent('d_term', { type: 'PickUp' });
      vi.advanceTimersByTime(timings.ackDelayMs);
      useDealsStore.getState().forwardEvent('d_term', { type: 'Reject' });
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    render(<ActiveBlotter />);
    const findRow = () =>
      screen.getByTestId('active-blotter-body').querySelector('[data-deal-id="d_term"]');
    expect(findRow()).not.toBeNull();
    expect(findRow()).toHaveAttribute('data-removing', 'true');
    expect(findRow()).toHaveAttribute('data-display-status', 'REJECTED');
    // 5s elapses → siMachine reaches Removed → store moves to historic.
    await act(async () => {
      vi.advanceTimersByTime(timings.removalDelayMs);
      await Promise.resolve();
    });
    expect(findRow()).toBeNull();
  });
});
