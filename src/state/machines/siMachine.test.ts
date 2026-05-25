import { afterEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { siMachine } from './siMachine';
import { timings } from './timings';

describe('siMachine', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in Initial', () => {
    const actor = createActor(siMachine, { input: { dealId: 'd_001' } }).start();
    expect(actor.getSnapshot().value).toBe('Initial');
    actor.stop();
  });

  it("send({type:'PickUp'}) transitions to PickUpSent", () => {
    const actor = createActor(siMachine, { input: { dealId: 'd_001' } }).start();
    actor.send({ type: 'PickUp' });
    expect(actor.getSnapshot().value).toBe('PickUpSent');
    actor.stop();
  });

  it('after 250ms (ackDelayMs default) transitions PickUpSent → PickedUp', () => {
    vi.useFakeTimers();
    const actor = createActor(siMachine, { input: { dealId: 'd_001' } }).start();
    actor.send({ type: 'PickUp' });
    expect(actor.getSnapshot().value).toBe('PickUpSent');
    vi.advanceTimersByTime(249);
    expect(actor.getSnapshot().value).toBe('PickUpSent');
    vi.advanceTimersByTime(1);
    expect(actor.getSnapshot().value).toBe('PickedUp');
    actor.stop();
  });

  it('with timings.ackDelayMs = 0 the transition completes on the next tick', () => {
    const original = timings.ackDelayMs;
    timings.ackDelayMs = 0;
    try {
      vi.useFakeTimers();
      const actor = createActor(siMachine, { input: { dealId: 'd_001' } }).start();
      actor.send({ type: 'PickUp' });
      vi.advanceTimersByTime(0);
      expect(actor.getSnapshot().value).toBe('PickedUp');
      actor.stop();
    } finally {
      timings.ackDelayMs = original;
    }
  });
});
