import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pricingFeed } from './pricingFeed';
import type { PriceTick } from './types';

const TICK = 300;

const setSeed = (n: number | undefined): void => {
  const w = window as Window & { __seedFeed?: number };
  if (n === undefined) delete w.__seedFeed;
  else w.__seedFeed = n;
};

describe('pricingFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setSeed(undefined);
  });

  afterEach(() => {
    pricingFeed.stop();
    vi.useRealTimers();
  });

  it('subscribe receives a tick within 600ms of start()', () => {
    const eur: PriceTick[] = [];
    const jpy: PriceTick[] = [];
    pricingFeed.subscribe('EURUSD', (t) => eur.push(t));
    pricingFeed.subscribe('USDJPY', (t) => jpy.push(t));
    pricingFeed.start();
    vi.advanceTimersByTime(TICK);
    expect(eur).toHaveLength(1);
    expect(eur[0].pair).toBe('EURUSD');
    expect(eur[0].ask).toBeGreaterThanOrEqual(eur[0].bid);
    expect(eur[0].mid).toBeGreaterThanOrEqual(eur[0].bid);
    expect(eur[0].mid).toBeLessThanOrEqual(eur[0].ask);
    // USDJPY has a 1.0-pip spread at 2dp display — always visible.
    expect(jpy[0].ask).toBeGreaterThan(jpy[0].bid);
  });

  it('two subscriptions to the same pair both receive ticks', () => {
    const a: PriceTick[] = [];
    const b: PriceTick[] = [];
    pricingFeed.subscribe('USDJPY', (t) => a.push(t));
    pricingFeed.subscribe('USDJPY', (t) => b.push(t));
    pricingFeed.start();
    vi.advanceTimersByTime(TICK);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0]).toEqual(b[0]);
  });

  it('unsubscribe stops one callback; other subscribers keep receiving', () => {
    const a: PriceTick[] = [];
    const b: PriceTick[] = [];
    const unsubA = pricingFeed.subscribe('GBPUSD', (t) => a.push(t));
    pricingFeed.subscribe('GBPUSD', (t) => b.push(t));
    pricingFeed.start();
    vi.advanceTimersByTime(TICK);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    unsubA();
    vi.advanceTimersByTime(TICK);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(2);
  });

  it('with seed = 42, first 5 EURUSD ticks match the recorded reference sequence', () => {
    setSeed(42);
    const ticks: PriceTick[] = [];
    pricingFeed.subscribe('EURUSD', (t) => ticks.push(t));
    pricingFeed.start();
    vi.advanceTimersByTime(TICK * 5);
    expect(ticks).toHaveLength(5);
    const mids = ticks.map((t) => t.mid);
    expect(mids).toEqual([1.1715, 1.1714, 1.1714, 1.1714, 1.1714]);
  });

  it('after stop(), no further callbacks fire even if start() is called again with the same seed', () => {
    setSeed(42);
    const ticks: PriceTick[] = [];
    pricingFeed.subscribe('EURUSD', (t) => ticks.push(t));
    pricingFeed.start();
    vi.advanceTimersByTime(TICK);
    expect(ticks).toHaveLength(1);
    pricingFeed.stop();
    vi.advanceTimersByTime(TICK * 3);
    expect(ticks).toHaveLength(1);
    setSeed(42);
    pricingFeed.start();
    vi.advanceTimersByTime(TICK * 3);
    expect(ticks).toHaveLength(1);
  });

  it('getLatest returns null before any tick, then the latest tick', () => {
    expect(pricingFeed.getLatest('USDJPY')).toBeNull();
    pricingFeed.start();
    vi.advanceTimersByTime(TICK);
    const first = pricingFeed.getLatest('USDJPY');
    expect(first).not.toBeNull();
    expect(first?.pair).toBe('USDJPY');
    vi.advanceTimersByTime(TICK);
    const second = pricingFeed.getLatest('USDJPY');
    expect(second).not.toBeNull();
    expect(second?.timestamp).toBeGreaterThanOrEqual(first!.timestamp);
  });
});
