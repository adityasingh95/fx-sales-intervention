import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { dealMachine } from './dealMachine';
import { timings } from './timings';

const ACK = () => timings.ackDelayMs;
const REMOVAL = () => timings.removalDelayMs;

const fresh = () => {
  const actor = createActor(dealMachine, { input: { dealId: 'd_001' } });
  actor.start();
  return actor;
};

const si = (actor: ReturnType<typeof fresh>) =>
  String(actor.getSnapshot().context.si.getSnapshot().value);
const rfs = (actor: ReturnType<typeof fresh>) =>
  String(actor.getSnapshot().context.rfs.getSnapshot().value);

describe('dealMachine cross-model coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns both children on init with shared dealId in context', () => {
    const actor = fresh();
    const ctx = actor.getSnapshot().context;
    expect(ctx.dealId).toBe('d_001');
    expect(ctx.rfs.getSnapshot().value).toBe('Queued');
    expect(ctx.si.getSnapshot().value).toBe('Initial');
    expect(ctx.rfs.getSnapshot().context.dealId).toBe('d_001');
    expect(ctx.si.getSnapshot().context.dealId).toBe('d_001');
    actor.stop();
  });

  it('PickUp: SI Initial → PickUpSent → PickedUp; RFS Queued → PickedUp', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    expect(si(actor)).toBe('PickUpSent');
    expect(rfs(actor)).toBe('PickedUp');
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('PickedUp');
    expect(rfs(actor)).toBe('PickedUp');
    actor.stop();
  });

  it('Hold from PickedUp: SI PickedUp → HoldSent → Initial; RFS PickedUp → Queued', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('PickedUp');
    actor.send({ type: 'Hold' });
    expect(si(actor)).toBe('HoldSent');
    expect(rfs(actor)).toBe('Queued');
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('Initial');
    expect(rfs(actor)).toBe('Queued');
    actor.stop();
  });

  it('Quote: SI PickedUp → QuoteSent → Quoted; RFS PickedUp → Executable', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Quote' });
    expect(si(actor)).toBe('QuoteSent');
    expect(rfs(actor)).toBe('Executable');
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('Quoted');
    expect(rfs(actor)).toBe('Executable');
    actor.stop();
  });

  it('Withdraw from Quoted: SI Quoted → WithdrawSent → PickedUp; RFS Executable → PickedUp', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Quote' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Withdraw' });
    expect(si(actor)).toBe('WithdrawSent');
    expect(rfs(actor)).toBe('PickedUp');
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('PickedUp');
    expect(rfs(actor)).toBe('PickedUp');
    actor.stop();
  });

  it('Reject from PickedUp: SI → RejectSent → TraderRejected (terminal)', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Reject' });
    expect(si(actor)).toBe('RejectSent');
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('TraderRejected');
    actor.stop();
  });

  it('Reject from Quoted: SI → RejectSent → TraderRejected (terminal)', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Quote' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Reject' });
    expect(si(actor)).toBe('RejectSent');
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('TraderRejected');
    actor.stop();
  });

  it('ClientReject in Quoted: SI → ClientRejected (terminal)', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Quote' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'ClientReject' });
    expect(si(actor)).toBe('ClientRejected');
    actor.stop();
  });

  it('TradeConfirmed: both SI and RFS go to TradeConfirmed', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Quote' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'TradeConfirmed' });
    expect(si(actor)).toBe('TradeConfirmed');
    expect(rfs(actor)).toBe('TradeConfirmed');
    actor.stop();
  });

  it('every terminal SI state fires removeFromActive (transitions to Removed) after 5000ms', () => {
    const cases: Array<{ name: string; reach: (a: ReturnType<typeof fresh>) => void }> = [
      {
        name: 'TraderRejected',
        reach: (a) => {
          a.send({ type: 'PickUp' });
          vi.advanceTimersByTime(ACK());
          a.send({ type: 'Reject' });
          vi.advanceTimersByTime(ACK());
        },
      },
      {
        name: 'ClientRejected',
        reach: (a) => {
          a.send({ type: 'PickUp' });
          vi.advanceTimersByTime(ACK());
          a.send({ type: 'Quote' });
          vi.advanceTimersByTime(ACK());
          a.send({ type: 'ClientReject' });
        },
      },
      {
        name: 'TradeConfirmed',
        reach: (a) => {
          a.send({ type: 'PickUp' });
          vi.advanceTimersByTime(ACK());
          a.send({ type: 'Quote' });
          vi.advanceTimersByTime(ACK());
          a.send({ type: 'TradeConfirmed' });
        },
      },
    ];

    for (const { name, reach } of cases) {
      const actor = fresh();
      reach(actor);
      expect(si(actor)).toBe(name);
      vi.advanceTimersByTime(REMOVAL() - 1);
      expect(si(actor)).toBe(name);
      vi.advanceTimersByTime(1);
      expect(si(actor)).toBe('Removed');
      actor.stop();
    }
  });

  it('terminal states reject all subsequent events (no transitions)', () => {
    const actor = fresh();
    actor.send({ type: 'PickUp' });
    vi.advanceTimersByTime(ACK());
    actor.send({ type: 'Reject' });
    vi.advanceTimersByTime(ACK());
    expect(si(actor)).toBe('TraderRejected');
    // Send every event type; none should move the SI machine off TraderRejected.
    for (const type of ['PickUp', 'Quote', 'Withdraw', 'Hold', 'Reject', 'ClientReject', 'TradeConfirmed'] as const) {
      actor.send({ type });
      expect(si(actor)).toBe('TraderRejected');
    }
    actor.stop();
  });
});
