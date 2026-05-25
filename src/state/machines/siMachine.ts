import { setup, type SnapshotFrom } from 'xstate';
import { timings } from './timings';

export interface SiContext {
  dealId: string;
}

export type SiEvent =
  | { type: 'PickUp' }
  | { type: 'Quote' }
  | { type: 'Withdraw' }
  | { type: 'Hold' }
  | { type: 'Reject' }
  | { type: 'ClientReject' }
  | { type: 'TradeConfirmed' };

export interface SiInput {
  dealId: string;
}

// Sales Intervention machine per docs/03 §2 + §4. Active states accept
// trader-driven events; *Sent states transition via `after: ackDelay`
// to model the simulated 200–300ms backend ack. Terminal SI states
// (`TraderRejected`, `ClientRejected`, `TradeConfirmed`) accept no
// events, and after `removalDelay` (5s per docs/02 §Active Blotter)
// transition to a hidden `Removed` state. The dealsStore observes the
// `Removed` transition and unmounts the row.
export const siMachine = setup({
  types: {
    context: {} as SiContext,
    events: {} as SiEvent,
    input: {} as SiInput,
  },
  delays: {
    ackDelay: () => timings.ackDelayMs,
    removalDelay: () => timings.removalDelayMs,
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
    PickedUp: {
      on: {
        Quote: 'QuoteSent',
        Hold: 'HoldSent',
        Reject: 'RejectSent',
      },
    },
    QuoteSent: {
      after: { ackDelay: 'Quoted' },
    },
    Quoted: {
      on: {
        Quote: 'QuoteSent',
        Withdraw: 'WithdrawSent',
        Hold: 'HoldSent',
        Reject: 'RejectSent',
        ClientReject: 'ClientRejected',
        TradeConfirmed: 'TradeConfirmed',
      },
    },
    WithdrawSent: {
      after: { ackDelay: 'PickedUp' },
    },
    HoldSent: {
      after: { ackDelay: 'Initial' },
    },
    RejectSent: {
      after: { ackDelay: 'TraderRejected' },
    },
    TraderRejected: {
      after: { removalDelay: 'Removed' },
    },
    ClientRejected: {
      after: { removalDelay: 'Removed' },
    },
    TradeConfirmed: {
      after: { removalDelay: 'Removed' },
    },
    Removed: {
      type: 'final',
    },
  },
});

export type SiSnapshot = SnapshotFrom<typeof siMachine>;
export type SiStateValue = SiSnapshot['value'];
