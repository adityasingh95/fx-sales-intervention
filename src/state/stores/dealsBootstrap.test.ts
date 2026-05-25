import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dealFeed } from '@/services/feed/dealFeed';
import { wireDealFeedToStore } from './dealsBootstrap';
import { useDealsStore } from './dealsStore';

const resetStore = (): void => {
  for (const entry of useDealsStore.getState().deals.values()) {
    entry.actor.stop();
  }
  useDealsStore.setState({ deals: new Map() });
};

describe('wireDealFeedToStore', () => {
  let teardown: () => void = () => {};

  beforeEach(() => {
    vi.useFakeTimers();
    dealFeed.reset();
    resetStore();
    teardown = wireDealFeedToStore();
  });

  afterEach(() => {
    teardown();
    dealFeed.reset();
    resetStore();
    vi.useRealTimers();
  });

  it('inject(HAPPY_PATH_ESP) adds an entry to dealsStore', () => {
    dealFeed.inject('HAPPY_PATH_ESP');
    const entries = [...useDealsStore.getState().deals.values()];
    expect(entries).toHaveLength(1);
    expect(entries[0].deal.clientName).toBe('Acme Corp');
    expect(entries[0].deal.pair).toBe('EURUSD');
  });

  it('inject(CREDIT_BREACH) adds an entry with the SI deal payload', () => {
    dealFeed.inject('CREDIT_BREACH');
    const entries = [...useDealsStore.getState().deals.values()];
    expect(entries).toHaveLength(1);
    expect(entries[0].deal.clientName).toBe('Halcyon Capital');
    expect(entries[0].deal.pair).toBe('GBPUSD');
  });
});
