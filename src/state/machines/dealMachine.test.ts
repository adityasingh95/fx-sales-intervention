import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { dealMachine } from './dealMachine';

describe('dealMachine', () => {
  it('spawns both children on init with shared dealId in context', () => {
    const actor = createActor(dealMachine, { input: { dealId: 'd_001' } }).start();
    const ctx = actor.getSnapshot().context;

    expect(ctx.dealId).toBe('d_001');
    expect(ctx.rfs).toBeDefined();
    expect(ctx.si).toBeDefined();

    expect(ctx.rfs.getSnapshot().value).toBe('Queued');
    expect(ctx.si.getSnapshot().value).toBe('Initial');

    expect(ctx.rfs.getSnapshot().context.dealId).toBe('d_001');
    expect(ctx.si.getSnapshot().context.dealId).toBe('d_001');

    actor.stop();
  });
});
