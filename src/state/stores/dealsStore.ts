import { create } from 'zustand';
import { createActor, type Actor } from 'xstate';
import { dealFeed } from '@/services/feed/dealFeed';
import { dealMachine, type DealEvent as ParentDealEvent } from '@/state/machines/dealMachine';
import type { Deal, RejectionReason } from '@/types/deal';
import type { DealChannel } from '@/types/scenario';
import type { DealLifecycleEvent, QuoteContext } from '@/types/lifecycle';
import { makeRequestId, makeTradeId } from '@/lib/ids';
import { quoteSideFor } from '@/lib/quoteSide';
import { lifecyclePhaseFor } from './lifecyclePhase';

// Terminal SI states per docs/03-trade-state-model.md §2 §8. The full SI
// state graph lives in `src/state/machines/siMachine.ts` (landed in
// FXSW-010); the store only needs to know which states pull a deal out
// of the active blotter and into historic.
export const TERMINAL_SI_STATES: ReadonlySet<string> = new Set([
  'TraderRejected',
  'ClientRejected',
  'TradeConfirmed',
]);

export const isHistoric = (siState: string): boolean => TERMINAL_SI_STATES.has(siState);

export type DealEntry = {
  deal: Deal;
  rejectionReasons: RejectionReason[];
  actor: Actor<typeof dealMachine>;
  siState: string;
  rfsState: string;
  dealable: boolean;
  // Display request identifier assigned at creation (FXSW-066), shown in the
  // Active + Historic blotters and detail view.
  requestId: string;
  // Timestamped lifecycle journey (FXSW-049), captured live and carried into
  // the HistoricEntry on archival for the detail-view timeline.
  events: DealLifecycleEvent[];
};

// Historic entries no longer have a live actor — they're a snapshot of
// the deal's final state, kept session-only so the Historic Blotter can
// render the row indefinitely after the 5-second active-window elapses.
export type HistoricOutcome =
  | 'Executed'
  | 'Rejected by Trader'
  | 'Rejected by Client'
  | 'Expired'
  | 'Cancelled';

export type HistoricEntry = {
  deal: Deal;
  rejectionReasons: RejectionReason[];
  finalSiState: string;
  finalRfsState: string;
  outcome: HistoricOutcome;
  archivedAt: number;
  // Display identifiers (FXSW-066). `requestId` carries over from the active
  // entry; `tradeId` is assigned only when the deal actually executed.
  requestId: string;
  tradeId?: string;
  events: DealLifecycleEvent[];
};

const outcomeFromFinalStates = (siState: string, rfsState: string): HistoricOutcome => {
  // Either machine reaching TradeConfirmed counts as Executed — SI for
  // the intervention flow, RFS for the ESP auto-priced flow (where SI
  // stays at `Initial`).
  if (siState === 'TradeConfirmed' || rfsState === 'TradeConfirmed') return 'Executed';
  if (siState === 'TraderRejected') return 'Rejected by Trader';
  if (siState === 'ClientRejected') return 'Rejected by Client';
  if (rfsState === 'Expired') return 'Expired';
  if (rfsState === 'ClientClosed') return 'Cancelled';
  return 'Cancelled';
};

interface DealsState {
  deals: Map<string, DealEntry>;
  historic: HistoricEntry[];
  addDeal: (
    deal: Deal,
    rejectionReasons?: RejectionReason[],
    channel?: DealChannel,
  ) => void;
  removeDeal: (dealId: string) => void;
  forwardEvent: (dealId: string, event: ParentDealEvent) => void;
  // Records the markup reason at quote time, merging it into the deal's most
  // recent PRICE_BACK lifecycle event (FXSW-049). Called from the ticket when
  // the trader sends a price / applies an AI suggestion.
  recordQuoteContext: (dealId: string, ctx: QuoteContext) => void;
}

// XState's snapshot type doesn't surface the triggering event, but it's
// present at runtime. Read it through a narrow cast so the lifecycle log can
// record what caused each transition without a `any` / ts-ignore.
const triggerOf = (snap: unknown): string | undefined => {
  const event = (snap as { event?: { type?: unknown } }).event;
  return typeof event?.type === 'string' ? event.type : undefined;
};

const replaceEntry = (
  deals: Map<string, DealEntry>,
  dealId: string,
  patch: Partial<DealEntry>,
): Map<string, DealEntry> => {
  const cur = deals.get(dealId);
  if (!cur) return deals;
  const next = new Map(deals);
  next.set(dealId, { ...cur, ...patch });
  return next;
};

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: new Map<string, DealEntry>(),
  historic: [],

  addDeal: (deal, rejectionReasons = [], channel = 'SI') => {
    // FXSW-090 F-3: a duplicate dealId is a generator collision, not an expected
    // no-op. Signal it (rather than silently dropping the new deal or clobbering
    // the live one) so it is diagnosable; the existing deal is preserved.
    if (get().deals.has(deal.dealId)) {
      console.error(`addDeal: duplicate dealId ${deal.dealId} ignored (id collision)`);
      return;
    }

    const requestId = makeRequestId();
    // FXSW-088 F-1: carry the request's quotable side into the machine so the
    // one-sided lock can be enforced by the parent's `canQuote` guard.
    const actor = createActor(dealMachine, {
      input: { dealId: deal.dealId, quoteSide: quoteSideFor(deal.side, deal.dealtCcy) },
    });
    actor.start();
    const ctx = actor.getSnapshot().context;
    const initialSi = String(ctx.si.getSnapshot().value);
    const initialRfs = String(ctx.rfs.getSnapshot().value);

    // ESP (auto-priced) deals keep SI at `Initial`, so their lifecycle phases
    // come from the RFS machine; SI-driven deals from the SI machine. Choosing
    // one source per deal avoids double-logging the shared PRICE_BACK /
    // RESPONSE transitions that the parent fans into both children.
    const phaseChannel: 'SI' | 'RFS' = channel === 'ESP' ? 'RFS' : 'SI';
    const initialEvents: DealLifecycleEvent[] = [
      {
        phase: 'REQUEST',
        at: deal.createdAt,
        channel: phaseChannel,
        toState: phaseChannel === 'SI' ? initialSi : initialRfs,
      },
    ];

    // Shared archival path — invoked from either child subscriber when
    // it transitions to its `Removed` cleanup state. Idempotent via the
    // `if (!cur) return` guard: whichever side reaches Removed first
    // archives; the second call is a no-op.
    const archive = (): void => {
      queueMicrotask(() => {
        const cur = useDealsStore.getState().deals.get(deal.dealId);
        if (!cur) return;
        const outcome = outcomeFromFinalStates(cur.siState, cur.rfsState);
        const historicEntry: HistoricEntry = {
          deal: cur.deal,
          rejectionReasons: cur.rejectionReasons,
          finalSiState: cur.siState,
          finalRfsState: cur.rfsState,
          outcome,
          archivedAt: Date.now(),
          requestId: cur.requestId,
          // A Trade ID is only minted for deals that actually executed.
          tradeId: outcome === 'Executed' ? makeTradeId() : undefined,
          events: cur.events,
        };
        cur.actor.stop();
        // FXSW-090 F-2: release the player's pending timers/gates for this deal
        // before it leaves the active set, so no stale follow-up fires.
        dealFeed.forgetDeal(deal.dealId);
        set((state) => {
          const next = new Map(state.deals);
          next.delete(deal.dealId);
          return { deals: next, historic: [historicEntry, ...state.historic] };
        });
      });
    };

    ctx.si.subscribe((snap) => {
      const stateName = String(snap.value);
      if (stateName === 'Removed') {
        archive();
        return;
      }
      set((state) => {
        const cur = state.deals.get(deal.dealId);
        if (!cur || cur.siState === stateName) return state;
        const patch: Partial<DealEntry> = {
          siState: stateName,
          dealable: stateName === 'Initial',
        };
        if (phaseChannel === 'SI') {
          const phase = lifecyclePhaseFor('SI', stateName);
          if (phase) {
            patch.events = [
              ...cur.events,
              {
                phase,
                at: Date.now(),
                channel: 'SI',
                fromState: cur.siState,
                toState: stateName,
                trigger: triggerOf(snap),
              },
            ];
          }
        }
        return { deals: replaceEntry(state.deals, deal.dealId, patch) };
      });
      dealFeed.notifyDealState(deal.dealId, stateName);
    });

    ctx.rfs.subscribe((snap) => {
      const stateName = String(snap.value);
      if (stateName === 'Removed') {
        archive();
        return;
      }
      set((state) => {
        const cur = state.deals.get(deal.dealId);
        if (!cur || cur.rfsState === stateName) return state;
        const patch: Partial<DealEntry> = { rfsState: stateName };
        if (phaseChannel === 'RFS') {
          const phase = lifecyclePhaseFor('RFS', stateName);
          if (phase) {
            patch.events = [
              ...cur.events,
              {
                phase,
                at: Date.now(),
                channel: 'RFS',
                fromState: cur.rfsState,
                toState: stateName,
                trigger: triggerOf(snap),
              },
            ];
          }
        }
        return { deals: replaceEntry(state.deals, deal.dealId, patch) };
      });
    });

    set((state) => {
      const next = new Map(state.deals);
      next.set(deal.dealId, {
        deal,
        rejectionReasons,
        actor,
        siState: initialSi,
        rfsState: initialRfs,
        dealable: initialSi === 'Initial',
        requestId,
        events: initialEvents,
      });
      return { deals: next };
    });

    // ESP deals are auto-priced — push RFS straight to Executable so the
    // display label is AUTO (per docs/03 §6 + §4 Mermaid). SI stays at
    // Initial. The subscriber catches the rfsState transition and
    // updates the entry synchronously.
    if (channel === 'ESP') {
      actor.send({ type: 'AutoPrice' });
    }
  },

  removeDeal: (dealId) => {
    const entry = get().deals.get(dealId);
    if (!entry) return;
    entry.actor.stop();
    dealFeed.forgetDeal(dealId);
    set((state) => {
      const next = new Map(state.deals);
      next.delete(dealId);
      return { deals: next };
    });
  },

  forwardEvent: (dealId, event) => {
    const entry = get().deals.get(dealId);
    if (!entry) return;
    entry.actor.send(event);
  },

  recordQuoteContext: (dealId, quoteCtx) => {
    set((state) => {
      const cur = state.deals.get(dealId);
      if (!cur) return state;
      const events = [...cur.events];
      // Merge into the most recent PRICE_BACK event (the SI/RFS subscriber
      // creates it synchronously when the trader sends the price, so it
      // normally already exists by the time the ticket records context).
      for (let i = events.length - 1; i >= 0; i -= 1) {
        if (events[i].phase === 'PRICE_BACK') {
          events[i] = { ...events[i], ...quoteCtx };
          return { deals: replaceEntry(state.deals, dealId, { events }) };
        }
      }
      // Defensive fallback: no PRICE_BACK yet — record one carrying context.
      events.push({
        phase: 'PRICE_BACK',
        at: Date.now(),
        channel: 'SI',
        toState: cur.siState,
        ...quoteCtx,
      });
      return { deals: replaceEntry(state.deals, dealId, { events }) };
    });
  },
}));

// Active = every live entry, including those in the 5-second post-terminal
// window (the siMachine still has them in TraderRejected / ClientRejected /
// TradeConfirmed at that point; they only leave when the SI machine
// transitions to `Removed` and the subscriber moves them to `historic`).
const selectActiveDeals = (state: DealsState): DealEntry[] => [...state.deals.values()];

const selectHistoricDeals = (state: DealsState): HistoricEntry[] => state.historic;

export const useActiveDeals = (): DealEntry[] => useDealsStore(selectActiveDeals);
export const useHistoricDeals = (): HistoricEntry[] => useDealsStore(selectHistoricDeals);
export const useDealById = (dealId: string): DealEntry | undefined =>
  useDealsStore((state) => state.deals.get(dealId));
export const useHistoricDealById = (dealId: string): HistoricEntry | undefined =>
  useDealsStore((state) => state.historic.find((h) => h.deal.dealId === dealId));
