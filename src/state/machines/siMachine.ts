import { setup, type SnapshotFrom } from 'xstate';
import { timings } from './timings';

export interface SiContext {
  dealId: string;
}

export type SiEvent = { type: 'PickUp' };

export interface SiInput {
  dealId: string;
}

export const siMachine = setup({
  types: {
    context: {} as SiContext,
    events: {} as SiEvent,
    input: {} as SiInput,
  },
  delays: {
    ackDelay: () => timings.ackDelayMs,
  },
}).createMachine({
  id: 'si',
  initial: 'Initial',
  context: ({ input }) => ({ dealId: input.dealId }),
  states: {
    Initial: {
      on: { PickUp: 'PickUpSent' },
    },
    PickUpSent: {
      after: { ackDelay: 'PickedUp' },
    },
    PickedUp: {},
  },
});

export type SiSnapshot = SnapshotFrom<typeof siMachine>;
export type SiStateValue = SiSnapshot['value'];
