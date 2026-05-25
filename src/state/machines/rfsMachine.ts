import { setup, type SnapshotFrom } from 'xstate';

export interface RfsContext {
  dealId: string;
}

export type RfsEvent =
  | { type: 'PickUp' }
  | { type: 'Hold' }
  | { type: 'PriceUpdate' }
  | { type: 'Withdraw' }
  | { type: 'TradeConfirmed' }
  | { type: 'Expire' }
  | { type: 'ClientClose' };

export interface RfsInput {
  dealId: string;
}

// RFS Trade Model per docs/03 §1 + §4 (the prototype subset). Events
// arrive from the dealMachine parent as a result of trader actions on
// the SI side or simulated client/timeout events. The `Submitted`
// state is collapsed into `Queued` for v1 per docs/03 §1.
export const rfsMachine = setup({
  types: {
    context: {} as RfsContext,
    events: {} as RfsEvent,
    input: {} as RfsInput,
  },
}).createMachine({
  id: 'rfs',
  initial: 'Queued',
  context: ({ input }) => ({ dealId: input.dealId }),
  states: {
    Queued: {
      on: {
        PickUp: 'PickedUp',
        Expire: 'Expired',
      },
    },
    PickedUp: {
      on: {
        Hold: 'Queued',
        PriceUpdate: 'Executable',
        TradeConfirmed: 'TradeConfirmed',
        Expire: 'Expired',
      },
    },
    Executable: {
      on: {
        Withdraw: 'PickedUp',
        TradeConfirmed: 'TradeConfirmed',
        ClientClose: 'ClientClosed',
        Expire: 'Expired',
      },
    },
    TradeConfirmed: {
      type: 'final',
    },
    ClientClosed: {
      type: 'final',
    },
    Expired: {
      type: 'final',
    },
  },
});

export type RfsSnapshot = SnapshotFrom<typeof rfsMachine>;
export type RfsStateValue = RfsSnapshot['value'];
