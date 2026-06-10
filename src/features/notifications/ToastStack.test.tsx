import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useNotificationsStore } from '@/state/stores/notificationsStore';
import { useUiStore } from '@/state/stores/uiStore';
import { timings } from '@/state/machines/timings';
import type { Deal } from '@/types/deal';
import ToastStack from './ToastStack';
import { dispatchNotifications } from './dispatcher';
import { _resetTitleFlash } from './titleFlash';

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  dealId: 'd_toast',
  clientName: 'Globex Industries',
  accountCode: 'GLBX-JPY-2',
  pair: 'USDJPY',
  side: 'SELL',
  notional: 5_000_000,
  dealtCcy: 'BASE',
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: new Date(2026, 4, 26, 14, 0, 0).getTime(),
  ...overrides,
});

const resetAll = (): void => {
  for (const entry of useDealsStore.getState().deals.values()) {
    entry.actor.stop();
  }
  useDealsStore.setState({ deals: new Map(), historic: [] });
  useNotificationsStore.getState().reset();
  useUiStore.setState({ openDealId: null });
  _resetTitleFlash();
};

describe('<ToastStack /> + dispatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAll();
    document.title = 'FX Sales Workstation';
  });
  afterEach(() => {
    resetAll();
    vi.useRealTimers();
  });

  it('toast appears when a new SI deal lands in Initial + dealable', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    render(<ToastStack />);
    expect(screen.getByTestId('toast-stack')).toBeInTheDocument();
    const toast = screen.getByTestId('toast-d_toast');
    expect(toast).toHaveTextContent('Globex Industries');
    expect(toast).toHaveTextContent(/sell/);
    expect(toast).toHaveTextContent('USDJPY');
  });

  it('toast auto-dismisses at 6s', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    render(<ToastStack />);
    expect(screen.getByTestId('toast-d_toast')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByTestId('toast-d_toast')).toBeNull();
    // Whole stack unmounts when there are no toasts left.
    expect(screen.queryByTestId('toast-stack')).toBeNull();
  });

  it('toast click calls uiStore.openTicket(dealId) and dismisses the toast', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    render(<ToastStack />);
    expect(useUiStore.getState().openDealId).toBeNull();
    act(() => {
      fireEvent.click(screen.getByTestId('toast-d_toast'));
    });
    expect(useUiStore.getState().openDealId).toBe('d_toast');
    expect(screen.queryByTestId('toast-d_toast')).toBeNull();
  });

  it('does NOT re-fire when a previously-picked-up deal is Released back to dealable', () => {
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    render(<ToastStack />);
    expect(useNotificationsStore.getState().toasts).toHaveLength(1);
    const firstId = useNotificationsStore.getState().toasts[0].id;
    // Manually dismiss the first toast so we can see if a new one appears.
    act(() => {
      useNotificationsStore.getState().dismissToast(firstId);
    });
    expect(useNotificationsStore.getState().toasts).toHaveLength(0);

    // Drive PickUp → PickedUp → Hold → Initial (back to dealable).
    act(() => {
      useDealsStore.getState().forwardEvent('d_toast', { type: 'PickUp' });
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(useDealsStore.getState().deals.get('d_toast')?.siState).toBe('PickedUp');
    act(() => {
      useDealsStore.getState().forwardEvent('d_toast', { type: 'Hold' });
      vi.advanceTimersByTime(timings.ackDelayMs);
    });
    expect(useDealsStore.getState().deals.get('d_toast')?.siState).toBe('Initial');
    expect(useDealsStore.getState().deals.get('d_toast')?.dealable).toBe(true);
    // Dispatcher runs again on this store update; should NOT fire again.
    act(() => {
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(useNotificationsStore.getState().toasts).toHaveLength(0);
  });

  it('ESP deals (no rejection reasons) do not trigger a toast', () => {
    act(() => {
      useDealsStore
        .getState()
        .addDeal(makeDeal({ dealId: 'd_esp' }), [], 'ESP');
      dispatchNotifications(useDealsStore.getState().deals);
    });
    render(<ToastStack />);
    expect(screen.queryByTestId('toast-d_esp')).toBeNull();
    expect(useNotificationsStore.getState().toasts).toHaveLength(0);
  });

  it('dispatcher also fires the document-title flash', () => {
    expect(document.title).toBe('FX Sales Workstation');
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(document.title).toBe('● FX Sales Workstation');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(document.title).toBe('FX Sales Workstation');
  });
});
