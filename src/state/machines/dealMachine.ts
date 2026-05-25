import { sendTo, setup, type ActorRefFrom, type SnapshotFrom } from 'xstate';
import { rfsMachine } from './rfsMachine';
import { siMachine } from './siMachine';

// Parent-level events the dealMachine accepts from the dealsStore.
// Per docs/03 §3, each one triggers a cross-model coordination — the
// parent sends the right event to each child so the RFS and SI
// machines stay in sync without the store having to know about the
// dual-machine model.
export type DealEvent =
  | { type: 'PickUp' }
  | { type: 'Quote' }
  | { type: 'Withdraw' }
  | { type: 'Hold' }
  | { type: 'Reject' }
  | { type: 'ClientReject' }
  | { type: 'TradeConfirmed' };

export type DealEventType = DealEvent['type'];

export interface DealContext {
  dealId: string;
  rfs: ActorRefFrom<typeof rfsMachine>;
  si: ActorRefFrom<typeof siMachine>;
}

export interface DealInput {
  dealId: string;
}

export const dealMachine = setup({
  types: {
    context: {} as DealContext,
    events: {} as DealEvent,
    input: {} as DealInput,
  },
  actors: {
    rfsMachine,
    siMachine,
  },
}).createMachine({
  id: 'deal',
  context: ({ input, spawn }) => ({
    dealId: input.dealId,
    rfs: spawn('rfsMachine', { input: { dealId: input.dealId } }),
    si: spawn('siMachine', { input: { dealId: input.dealId } }),
  }),
  initial: 'Running',
  states: {
    Running: {
      // Each trader-driven event below maps onto the cross-model rows
      // in docs/03 §3. The parent fans the event into both children;
      // each child's local on-handlers determine whether the event
      // actually advances that machine. (Sending an event a child
      // doesn't accept is a no-op under XState v5.)
      on: {
        PickUp: {
          actions: [
            sendTo(({ context }) => context.si, { type: 'PickUp' }),
            sendTo(({ context }) => context.rfs, { type: 'PickUp' }),
          ],
        },
        Quote: {
          actions: [
            sendTo(({ context }) => context.si, { type: 'Quote' }),
            sendTo(({ context }) => context.rfs, { type: 'PriceUpdate' }),
          ],
        },
        Withdraw: {
          actions: [
            sendTo(({ context }) => context.si, { type: 'Withdraw' }),
            sendTo(({ context }) => context.rfs, { type: 'Withdraw' }),
          ],
        },
        Hold: {
          actions: [
            sendTo(({ context }) => context.si, { type: 'Hold' }),
            sendTo(({ context }) => context.rfs, { type: 'Hold' }),
          ],
        },
        Reject: {
          // RFS has no `Reject` event in docs/03 §1; the prototype
          // leaves the RFS side alone on trader-reject. The blotter
          // pulls the row out of Active via SI's terminal state.
          actions: [sendTo(({ context }) => context.si, { type: 'Reject' })],
        },
        ClientReject: {
          actions: [sendTo(({ context }) => context.si, { type: 'ClientReject' })],
        },
        TradeConfirmed: {
          actions: [
            sendTo(({ context }) => context.si, { type: 'TradeConfirmed' }),
            sendTo(({ context }) => context.rfs, { type: 'TradeConfirmed' }),
          ],
        },
      },
    },
  },
});

export type DealSnapshot = SnapshotFrom<typeof dealMachine>;
export type DealStateValue = DealSnapshot['value'];
