import { setup, type ActorRefFrom, type SnapshotFrom } from 'xstate';
import { rfsMachine } from './rfsMachine';
import { siMachine } from './siMachine';

// All SI events from docs/03-trade-state-model.md §2.
// FXSW-005 declares them as placeholder no-op handlers on the parent so
// downstream code can already send them; the real RFS↔SI cross-model
// coordination (docs/03 §3, CLAUDE.md rule §7) lands in FXSW-010.
const SI_EVENT_TYPES = [
  'PickUp',
  'PickUpAck',
  'PickUpRejected',
  'PriceUnavailable',
  'PriceUpdate',
  'Accept',
  'Hold',
  'HoldAck',
  'Reject',
  'RejectAck',
  'ClientReject',
  'Quote',
  'QuoteAck',
  'Withdraw',
  'WithdrawAck',
  'TradeConfirmed',
] as const;

export type DealEventType = (typeof SI_EVENT_TYPES)[number];
export type DealEvent = { type: DealEventType };

export interface DealContext {
  dealId: string;
  rfs: ActorRefFrom<typeof rfsMachine>;
  si: ActorRefFrom<typeof siMachine>;
}

export interface DealInput {
  dealId: string;
}

const noopHandlers: Record<DealEventType, Record<string, never>> = Object.fromEntries(
  SI_EVENT_TYPES.map((type) => [type, {}]),
) as Record<DealEventType, Record<string, never>>;

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
      on: noopHandlers,
    },
  },
});

export type DealSnapshot = SnapshotFrom<typeof dealMachine>;
export type DealStateValue = DealSnapshot['value'];
