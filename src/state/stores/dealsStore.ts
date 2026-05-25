import { create } from 'zustand';
import { createActor, type Actor } from 'xstate';
import { dealFeed } from '@/services/feed/dealFeed';
import { dealMachine } from '@/state/machines/dealMachine';
import type { SiEvent } from '@/state/machines/siMachine';
import type { Deal } from '@/types/deal';

// Terminal SI states per docs/03-trade-state-model.md §2 §8. The full SI
// state graph lands in FXSW-010; the store only needs to know which
// states pull a deal out of the active blotter and into historic.
export const TERMINAL_SI_STATES: ReadonlySet<string> = new Set([
  'TraderRejected',
  'ClientRejected',
  'TradeConfirmed',
]);

export const isHistoric = (siState: string): boolean => TERMINAL_SI_STATES.has(siState);

export type DealEntry = {
  deal: Deal;
  actor: Actor<typeof dealMachine>;
  siState: string;
  rfsState: string;
  dealable: boolean;
};

interface DealsState {
  deals: Map<string, DealEntry>;
  addDeal: (deal: Deal) => void;
  removeDeal: (dealId: string) => void;
  forwardEvent: (dealId: string, event: SiEvent) => void;
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

  addDeal: (deal) => {
    if (get().deals.has(deal.dealId)) return;

    const actor = createActor(dealMachine, { input: { dealId: deal.dealId } });
    actor.start();
    const ctx = actor.getSnapshot().context;
    const initialSi = String(ctx.si.getSnapshot().value);
    const initialRfs = String(ctx.rfs.getSnapshot().value);

    ctx.si.subscribe((snap) => {
      const stateName = String(snap.value);
      set((state) => {
        const cur = state.deals.get(deal.dealId);
        if (!cur || cur.siState === stateName) return state;
        return { deals: replaceEntry(state.deals, deal.dealId, { siState: stateName }) };
      });
      dealFeed.notifyDealState(deal.dealId, stateName);
    });

    ctx.rfs.subscribe((snap) => {
      const stateName = String(snap.value);
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
        actor,
        siState: initialSi,
        rfsState: initialRfs,
        dealable: true,
      });
      return { deals: next };
    });
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
    // Interim until FXSW-010: the parent dealMachine's event handlers are
    // still the no-op placeholders from FXSW-005, so sending `event` to
    // `entry.actor` would be silently dropped. We route SI events to the
    // SI child directly. forwardEvent is currently typed `SiEvent` (only
    // `PickUp` per FXSW-005); FXSW-010 expands the SI event union and
    // swaps this to parent-level routing with the full RFS↔SI
    // coordination from docs/03 §3.
    entry.actor.getSnapshot().context.si.send(event);
  },
}));

const selectActiveDeals = (state: DealsState): DealEntry[] =>
  [...state.deals.values()].filter((e) => !isHistoric(e.siState));

const selectHistoricDeals = (state: DealsState): DealEntry[] =>
  [...state.deals.values()].filter((e) => isHistoric(e.siState));

export const useActiveDeals = (): DealEntry[] => useDealsStore(selectActiveDeals);
export const useHistoricDeals = (): DealEntry[] => useDealsStore(selectHistoricDeals);
export const useDealById = (dealId: string): DealEntry | undefined =>
  useDealsStore((state) => state.deals.get(dealId));
