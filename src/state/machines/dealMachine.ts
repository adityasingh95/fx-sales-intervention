import { assign, sendTo, setup, type ActorRefFrom, type SnapshotFrom } from 'xstate';
import type { QuoteSide } from '@/lib/quoteSide';
import { rfsMachine } from './rfsMachine';
import { siMachine } from './siMachine';

// Parent-level events the dealMachine accepts from the dealsStore.
// Per docs/03 §3, each one triggers a cross-model coordination — the
// parent sends the right event to each child so the RFS and SI
// machines stay in sync without the store having to know about the
// dual-machine model.
export type DealEvent =
  | { type: 'PickUp' }
  // FXSW-088 F-1: a Quote may name the side being quoted. The parent's `canQuote`
  // guard rejects a quote on the non-quotable side of a one-sided request, so the
  // side-lock is enforced in the machine — not only by the UI `disabled` prop.
  | { type: 'Quote'; side?: QuoteSide }
  | { type: 'Withdraw' }
  | { type: 'Hold' }
  | { type: 'Reject' }
  | { type: 'ClientReject' }
  | { type: 'TradeConfirmed' }
  // ESP-only bootstrap: fans `PriceUpdate` to RFS so the deal lands in
  // `Executable` immediately, without touching SI (which stays at
  // `Initial` for the AUTO display label). Sent by dealsStore.addDeal
  // when the channel is 'ESP'. See docs/03 §4 Mermaid + dev-log
  // FXSW-013.
  | { type: 'AutoPrice' };

export type DealEventType = DealEvent['type'];

export interface DealContext {
  dealId: string;
  // FXSW-088 F-1: the side(s) this request can be quoted on (BID/ASK/BOTH),
  // carried in context so the side-lock can be enforced by a guard.
  quoteSide: QuoteSide;
  // FXSW-088 F-3: explicit terminal protection. Set once a terminal event
  // (Reject / ClientReject / TradeConfirmed) is processed; every parent
  // forward is then guarded off so a late/duplicate trader event can never
  // re-animate a finished deal — protection that is explicit, not merely
  // topological (relying on the children's terminal states having no handlers).
  terminal: boolean;
  rfs: ActorRefFrom<typeof rfsMachine>;
  si: ActorRefFrom<typeof siMachine>;
}

export interface DealInput {
  dealId: string;
  quoteSide?: QuoteSide;
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
  guards: {
    // Block every forward once the deal is terminal (F-3).
    notTerminal: ({ context }) => !context.terminal,
    // Allow a quote only when the deal isn't terminal AND the named side is
    // quotable: a one-sided request (quoteSide BID/ASK) rejects a quote on the
    // other side or a two-sided ('BOTH') quote. An unspecified side is allowed so
    // the existing bare-Quote flow is unchanged (F-1).
    canQuote: ({ context, event }) =>
      !context.terminal &&
      (context.quoteSide === 'BOTH' ||
        event.type !== 'Quote' ||
        event.side === undefined ||
        event.side === context.quoteSide),
  },
  actions: {
    markTerminal: assign({ terminal: true }),
  },
}).createMachine({
  id: 'deal',
  context: ({ input, spawn }) => ({
    dealId: input.dealId,
    quoteSide: input.quoteSide ?? 'BOTH',
    terminal: false,
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
      // doesn't accept is a no-op under XState v5.) Every transition is
      // guarded `notTerminal` so a terminal deal forwards nothing (F-3).
      on: {
        PickUp: {
          guard: 'notTerminal',
          actions: [
            sendTo(({ context }) => context.si, { type: 'PickUp' }),
            sendTo(({ context }) => context.rfs, { type: 'PickUp' }),
          ],
        },
        Quote: {
          guard: 'canQuote',
          actions: [
            sendTo(({ context }) => context.si, { type: 'Quote' }),
            sendTo(({ context }) => context.rfs, { type: 'PriceUpdate' }),
          ],
        },
        Withdraw: {
          guard: 'notTerminal',
          actions: [
            sendTo(({ context }) => context.si, { type: 'Withdraw' }),
            sendTo(({ context }) => context.rfs, { type: 'Withdraw' }),
          ],
        },
        Hold: {
          guard: 'notTerminal',
          actions: [
            sendTo(({ context }) => context.si, { type: 'Hold' }),
            sendTo(({ context }) => context.rfs, { type: 'Hold' }),
          ],
        },
        Reject: {
          // RFS has no trader-`Reject` terminal in docs/03 §1; the prototype
          // leaves the RFS side for the store to stop on archival. The blotter
          // pulls the row out of Active via SI's terminal state. Marked terminal
          // so no further parent forward lands (F-3).
          guard: 'notTerminal',
          actions: [sendTo(({ context }) => context.si, { type: 'Reject' }), 'markTerminal'],
        },
        ClientReject: {
          // FXSW-088 F-3: route the terminal to BOTH legs — SI to ClientRejected
          // and RFS to its ClientClosed terminal (ClientClose is accepted from
          // Executable, the state RFS is in while SI is Quoted) — so both legs
          // close explicitly rather than relying on the store to stop a live RFS.
          guard: 'notTerminal',
          actions: [
            sendTo(({ context }) => context.si, { type: 'ClientReject' }),
            sendTo(({ context }) => context.rfs, { type: 'ClientClose' }),
            'markTerminal',
          ],
        },
        TradeConfirmed: {
          guard: 'notTerminal',
          actions: [
            sendTo(({ context }) => context.si, { type: 'TradeConfirmed' }),
            sendTo(({ context }) => context.rfs, { type: 'TradeConfirmed' }),
            'markTerminal',
          ],
        },
        AutoPrice: {
          guard: 'notTerminal',
          actions: [sendTo(({ context }) => context.rfs, { type: 'PriceUpdate' })],
        },
      },
    },
  },
});

export type DealSnapshot = SnapshotFrom<typeof dealMachine>;
export type DealStateValue = DealSnapshot['value'];
