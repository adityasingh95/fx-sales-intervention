import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timings } from '@/state/machines/timings';
import type { Deal } from '@/types/deal';
import { isHistoric, useDealsStore } from './dealsStore';

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  dealId: 'd_test',
  clientName: 'Test Client',
  accountCode: 'TST-001',
  pair: 'EURUSD',
  side: 'BUY',
  notional: 1_000_000,
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: 0,
  ...overrides,
});

const resetStore = (): void => {
  for (const entry of useDealsStore.getState().deals.values()) {
    entry.actor.stop();
  }
  useDealsStore.setState({ deals: new Map(), historic: [] });
};

describe('dealsStore', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  it('addDeal creates an entry and starts an actor in the initial state', () => {
    const deal = makeDeal();
    useDealsStore.getState().addDeal(deal);
    const entry = useDealsStore.getState().deals.get('d_test');
    expect(entry).toBeDefined();
    expect(entry?.deal).toBe(deal);
    expect(entry?.siState).toBe('Initial');
    expect(entry?.rfsState).toBe('Queued');
    expect(entry?.dealable).toBe(true);
  });

  it('removeDeal stops the actor; subsequent forwardEvent is a no-op (no errors)', () => {
    useDealsStore.getState().addDeal(makeDeal());
    useDealsStore.getState().removeDeal('d_test');
    expect(useDealsStore.getState().deals.has('d_test')).toBe(false);
    expect(() =>
      useDealsStore.getState().forwardEvent('d_test', { type: 'PickUp' }),
    ).not.toThrow();
  });

  it('forwardEvent advances the SI machine through PickUpSent → PickedUp', () => {
    vi.useFakeTimers();
    useDealsStore.getState().addDeal(makeDeal());
    useDealsStore.getState().forwardEvent('d_test', { type: 'PickUp' });
    expect(useDealsStore.getState().deals.get('d_test')?.siState).toBe('PickUpSent');
    vi.advanceTimersByTime(timings.ackDelayMs);
    expect(useDealsStore.getState().deals.get('d_test')?.siState).toBe('PickedUp');
  });

  it('addDeal lands the entry in the active map, not historic', () => {
    useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_a' }));
    useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_b' }));
    const state = useDealsStore.getState();
    expect([...state.deals.keys()].sort()).toEqual(['d_a', 'd_b']);
    expect(state.historic).toHaveLength(0);
  });

  it('a deal driven through TradeConfirmed → Removed migrates to historic with the right outcome', async () => {
    vi.useFakeTimers();
    useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_done' }), ['OFF_HOURS']);
    useDealsStore.getState().forwardEvent('d_done', { type: 'PickUp' });
    vi.advanceTimersByTime(timings.ackDelayMs);
    useDealsStore.getState().forwardEvent('d_done', { type: 'Quote' });
    vi.advanceTimersByTime(timings.ackDelayMs);
    useDealsStore.getState().forwardEvent('d_done', { type: 'TradeConfirmed' });
    // 5-second active window: entry still in deals, still in terminal SI state.
    expect(useDealsStore.getState().deals.get('d_done')?.siState).toBe('TradeConfirmed');
    expect(useDealsStore.getState().historic).toHaveLength(0);
    vi.advanceTimersByTime(timings.removalDelayMs);
    // queueMicrotask defers the archival; flush microtasks before asserting.
    await Promise.resolve();
    expect(useDealsStore.getState().deals.has('d_done')).toBe(false);
    expect(useDealsStore.getState().historic).toHaveLength(1);
    const h = useDealsStore.getState().historic[0];
    expect(h.deal.dealId).toBe('d_done');
    expect(h.outcome).toBe('Executed');
    expect(h.finalSiState).toBe('TradeConfirmed');
    expect(h.rejectionReasons).toEqual(['OFF_HOURS']);
  });

  it('addDeal for two deals creates two independent actors', () => {
    useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_x' }));
    useDealsStore.getState().addDeal(makeDeal({ dealId: 'd_y' }));
    useDealsStore.getState().forwardEvent('d_x', { type: 'PickUp' });
    const x = useDealsStore.getState().deals.get('d_x');
    const y = useDealsStore.getState().deals.get('d_y');
    expect(x?.siState).toBe('PickUpSent');
    expect(y?.siState).toBe('Initial');
  });
});

describe('isHistoric', () => {
  it.each(['TradeConfirmed', 'TraderRejected', 'ClientRejected'])(
    'classifies %s as historic',
    (s) => {
      expect(isHistoric(s)).toBe(true);
    },
  );

  it.each(['Initial', 'PickUpSent', 'PickedUp', 'QuoteSent', 'Quoted'])(
    'classifies %s as active',
    (s) => {
      expect(isHistoric(s)).toBe(false);
    },
  );
});
