import { create } from 'zustand';
import { createActor, type Actor } from 'xstate';
import { dealFeed } from '@/services/feed/dealFeed';
import { dealMachine, type DealEvent as ParentDealEvent } from '@/state/machines/dealMachine';
import type { Deal, RejectionReason } from '@/types/deal';
import type { DealChannel } from '@/types/scenario';

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
}

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
    if (get().deals.has(deal.dealId)) return;

    const actor = createActor(dealMachine, { input: { dealId: deal.dealId } });
    actor.start();
    const ctx = actor.getSnapshot().context;
    const initialSi = String(ctx.si.getSnapshot().value);
    const initialRfs = String(ctx.rfs.getSnapshot().value);

    // Shared archival path — invoked from either child subscriber when
    // it transitions to its `Removed` cleanup state. Idempotent via the
    // `if (!cur) return` guard: whichever side reaches Removed first
    // archives; the second call is a no-op.
    const archive = (): void => {
      queueMicrotask(() => {
        const cur = useDealsStore.getState().deals.get(deal.dealId);
        if (!cur) return;
        const historicEntry: HistoricEntry = {
          deal: cur.deal,
          rejectionReasons: cur.rejectionReasons,
          finalSiState: cur.siState,
          finalRfsState: cur.rfsState,
          outcome: outcomeFromFinalStates(cur.siState, cur.rfsState),
          archivedAt: Date.now(),
        };
        cur.actor.stop();
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
        return {
          deals: replaceEntry(state.deals, deal.dealId, {
            siState: stateName,
            dealable: stateName === 'Initial',
          }),
        };
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
        return { deals: replaceEntry(state.deals, deal.dealId, { rfsState: stateName }) };
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
