import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { rfsMachine } from './rfsMachine';

describe('rfsMachine', () => {
  it('starts in Queued', () => {
    const actor = createActor(rfsMachine, { input: { dealId: 'd_001' } }).start();
    expect(actor.getSnapshot().value).toBe('Queued');
    actor.stop();
  });

  it("send({type:'PickUp'}) transitions Queued → PickedUp", () => {
    const actor = createActor(rfsMachine, { input: { dealId: 'd_001' } }).start();
    actor.send({ type: 'PickUp' });
    expect(actor.getSnapshot().value).toBe('PickedUp');
    actor.stop();
  });
});
