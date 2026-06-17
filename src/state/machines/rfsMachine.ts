import { setup, type SnapshotFrom } from 'xstate';
import { timings } from './timings';

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
//
// FXSW-088 F-2 — `*Sent` acknowledgement asymmetry, documented (not mirrored):
// the SI machine models the simulated backend ack with explicit `*Sent` states,
// but RFS does NOT — `Executable` means "auto-/re-priced and dealable", it is NOT
// the client-facing "price sent" signal. The single source of truth for "a price
// was sent to the client" is the SI side (`QuoteSent` → `Quoted`); see
// `statusFromMachines` (STREAMING requires SI `Quoted`) and the quote-context
// capture (records at SI `QuoteSent`). No consumer may read RFS `Executable` as
// the sent signal. Adding `*Sent` states to RFS would change canonical state
// names + the ESP `Queued → Executable` auto-price path, so the asymmetry is
// documented and constrained here rather than made symmetric.
export const rfsMachine = setup({
  types: {
    context: {} as RfsContext,
    events: {} as RfsEvent,
    input: {} as RfsInput,
  },
  delays: {
    removalDelay: () => timings.removalDelayMs,
  },
}).createMachine({
  id: 'rfs',
  initial: 'Queued',
  context: ({ input }) => ({ dealId: input.dealId }),
  states: {
    Queued: {
      on: {
        PickUp: 'PickedUp',
        // ESP auto-priced path per docs/03 §4: NEW_ESP_DEAL deals enter
        // Queued and are immediately advanced to Executable by the
        // dealMachine's `AutoPrice` action. The transition is here (not
        // an `always` guard on initial state) so that SI-channel deals
        // never accidentally trip it.
        PriceUpdate: 'Executable',
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
      after: { removalDelay: 'Removed' },
    },
    ClientClosed: {
      after: { removalDelay: 'Removed' },
    },
    Expired: {
      after: { removalDelay: 'Removed' },
    },
    // Hidden cleanup state — mirrors the siMachine pattern. The dealsStore
    // observes the transition and archives the deal. Needed at the RFS
    // level too so ESP-channel deals (which never advance the SI machine
    // past `Initial`) still get archived from the active blotter after
    // the 5-second rule elapses.
    Removed: {
      type: 'final',
    },
  },
});

export type RfsSnapshot = SnapshotFrom<typeof rfsMachine>;
export type RfsStateValue = RfsSnapshot['value'];
