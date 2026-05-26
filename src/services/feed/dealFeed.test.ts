import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dealFeed } from './dealFeed';
import type { DealEvent } from './types';

describe('dealFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    dealFeed.reset();
    vi.useRealTimers();
  });

  it('subscribe(cb) receives events', () => {
    const events: DealEvent[] = [];
    const unsub = dealFeed.subscribe((e) => events.push(e));
    dealFeed.inject('HAPPY_PATH_ESP');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('NEW_ESP_DEAL');
    unsub();
    dealFeed.inject('HAPPY_PATH_ESP');
    expect(events).toHaveLength(1);
  });

  it('inject(HAPPY_PATH_ESP) emits NEW_ESP_DEAL synchronously, schedules CLIENT_ACCEPT for t+2000', () => {
    const events: DealEvent[] = [];
    dealFeed.subscribe((e) => events.push(e));
    dealFeed.inject('HAPPY_PATH_ESP');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('NEW_ESP_DEAL');
    if (events[0].type !== 'NEW_ESP_DEAL') throw new Error('unreachable');
    const { dealId } = events[0].deal;
    vi.advanceTimersByTime(1999);
    expect(events).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual({ type: 'CLIENT_ACCEPT', dealId });
  });

  it('inject(OFF_HOURS_INTERVENTION) emits NEW_SI_DEAL; CLIENT_ACCEPT fires only after a SEND_STREAM ack', () => {
    const events: DealEvent[] = [];
    dealFeed.subscribe((e) => events.push(e));
    dealFeed.inject('OFF_HOURS_INTERVENTION');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('NEW_SI_DEAL');
    if (events[0].type !== 'NEW_SI_DEAL') throw new Error('unreachable');
    const { dealId } = events[0].deal;
    expect(events[0].rejectionReasons).toEqual(['OFF_HOURS']);
    vi.advanceTimersByTime(5000);
    expect(events).toHaveLength(1);
    dealFeed.notifyDealState(dealId, 'Quoted');
    vi.advanceTimersByTime(1499);
    expect(events).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual({ type: 'CLIENT_ACCEPT', dealId });
  });

  it('reset() mid-scenario cancels pending events; no callbacks fire after', () => {
    const events: DealEvent[] = [];
    dealFeed.subscribe((e) => events.push(e));
    dealFeed.inject('HAPPY_PATH_ESP');
    dealFeed.inject('OFF_HOURS_INTERVENTION');
    expect(events).toHaveLength(2);
    const ohEvent = events[1];
    if (ohEvent.type !== 'NEW_SI_DEAL') throw new Error('unreachable');
    const ohId = ohEvent.deal.dealId;
    dealFeed.reset();
    vi.advanceTimersByTime(5000);
    expect(events).toHaveLength(2);
    dealFeed.notifyDealState(ohId, 'Quoted');
    vi.advanceTimersByTime(5000);
    expect(events).toHaveLength(2);
  });
});
