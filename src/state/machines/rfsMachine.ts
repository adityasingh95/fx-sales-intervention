import { setup, type SnapshotFrom } from 'xstate';

export interface RfsContext {
  dealId: string;
}

export type RfsEvent = { type: 'PickUp' };

export interface RfsInput {
  dealId: string;
}

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
      on: { PickUp: 'PickedUp' },
    },
    PickedUp: {},
  },
});

export type RfsSnapshot = SnapshotFrom<typeof rfsMachine>;
export type RfsStateValue = RfsSnapshot['value'];
