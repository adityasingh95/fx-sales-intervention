---
last_updated: 2026-06-18
sources:
  - docs/06-tech-architecture.md
  - docs/03-trade-state-model.md
  - docs/dev-log.md
status: stable
ticket: FXSW-009, FXSW-092
---

# Component — `dealsStore`

Zustand store that holds every live and historic deal, spawns the [dealMachine](deal-machine.md) actor for each one, and exposes selectors for the [Active](../features/active-blotter.md) and [Historic](../features/historic-blotter.md) blotters.

File: `src/state/stores/dealsStore.ts`. Bootstrap: `src/state/stores/dealsBootstrap.ts`. Tests: `dealsStore.test.ts`, `dealsBootstrap.test.ts`.

## Shape

```typescript
type DealEntry = {
  deal: Deal;
  actor: DealMachineActor;      // the spawned parent
  siActor: SiMachineActor;      // pulled from parent context for subscription
  rfsActor: RfsMachineActor;
  siState: SiState;             // mirrored from siActor snapshots
  rfsState: RfsState;
  dealable: boolean;            // derived: siState === 'Initial'
  rejectionReasons: RejectionReason[];
  executedSide?: DealtSide;     // FXSW-092: the side the client dealt on (executed deals)
};

type HistoricEntry = {
  deal: Deal;
  rejectionReasons: RejectionReason[];
  finalSiState: SiState;
  finalRfsState: RfsState;
  outcome: Outcome;
  archivedAt: number;
  executedSide?: DealtSide;     // FXSW-092: snapshotted from the live entry on archival
};

type State = {
  deals: Map<string, DealEntry>;
  historic: HistoricEntry[];
};
```

## API

- `addDeal(deal, rejectionReasons?, channel?)` — creates a `dealMachine` actor with `{ dealId }` input, starts it, pulls the spawned `rfs`/`si` children out of context, subscribes to both, inserts the entry. Idempotent on duplicate `dealId`. For `channel === 'ESP'`, also fires `AutoPrice` on the parent so RFS goes Queued → Executable and SI stays at `Initial`.
- `removeDeal(dealId)` — stops the actor and removes the entry.
- `forwardEvent(dealId, event)` — routes the event into that deal's parent dealMachine.
- `recordExecutedSide(dealId, side)` — **FXSW-092:** records the dealt side on the live `DealEntry`, set from the `CLIENT_ACCEPT` feed event just before the confirm so archival can snapshot it. Archival copies `executedSide` into the `HistoricEntry` **only when `outcome === 'Executed'`**. See [data-models/deal.md](../data-models/deal.md#dealt-side--dealtside-fxsw-092).
- `useActiveDeals()`, `useHistoricDeals()`, `useDealById(id)` — React selector hooks.

## Why subscribe to children, not the parent

The parent `dealMachine` runs in a single `Running` state — its snapshot never changes when children transition. A parent-only subscription would miss every SI / RFS state change. The store subscribes to both children and writes back to the entry's `siState` / `rfsState`, which is the standard XState-React pattern and is what makes the selector hooks reactive without components calling `getSnapshot()` directly.

## Why a separate `historic` list (not filter on `isHistoric`)

The 5-second blotter removal rule means terminal rows are still "active" — just dimmed — for 5 seconds. Filtering by terminal state would hide them too early.

When the SI machine reaches `Removed` (5 seconds after a terminal SI state) — **or** when the RFS machine reaches `Removed` for ESP deals — the store moves the entry from `deals` to `historic` via `queueMicrotask` (deferring so the actor isn't stopped mid-subscription-callback).

The `archive()` helper is idempotent — whichever subscriber fires `Removed` first wins; the second is a no-op via the `if (!cur) return` guard.

## Outcome derivation at archival time

`outcomeFromFinalStates(siState, rfsState)` maps the final state pair to one of `Executed` / `Rejected by Trader` / `Rejected by Client` / `Expired` / `Cancelled`. Derived at archival, not on the fly — avoids needing to store the previous state separately for downstream renders.

## Mutation discipline

All state updates use immutable `Map` replacement: `new Map(state.deals); next.set(id, {...cur, ...patch})`. Zustand needs reference inequality to trigger re-renders, and `Map.set()` returns the same reference, so the `replaceEntry` helper centralises the pattern.

## Bridge to dealFeed

`dealsBootstrap.ts` exports `wireDealFeedToStore()`: subscribes to [dealFeed](deal-feed.md) once at boot and routes `NEW_*_DEAL` + client events into the store per [deal-feed.md](deal-feed.md) §How-events-become-deal-state.

The SI subscriber additionally calls `dealFeed.notifyDealState(dealId, siState)` on every SI transition. This closes the state-gate loop for [scenario-player.md](scenario-player.md) follow-ups.

## Tests

`src/state/stores/dealsStore.test.ts` — **6 cases**. `addDeal` creates entry + starts actor; `removeDeal` stops actor + subsequent `forwardEvent` is safe no-op; `forwardEvent` advances SI through `PickUpSent → PickedUp` (uses fake timers); active/historic split; two `addDeal` calls → two independent actors; `TradeConfirmed → Removed → historic` archival end-to-end.

`src/state/stores/dealsBootstrap.test.ts` — **2 cases**. `dealFeed.inject('HAPPY_PATH_ESP')` lands the deal in the store; `inject('CREDIT_BREACH')` lands with the right payload.

Subscribe-to-children pattern: see [test-patterns.md](test-patterns.md) §6. `queueMicrotask` archival timing: §7.

## Sources

- `docs/06-tech-architecture.md` §5 — store contract, machine wiring
- `docs/03-trade-state-model.md` §6 — terminal-state cleanup behavior
- `docs/dev-log.md` FXSW-009, FXSW-010, FXSW-012 — design rationale
- `docs/BACKLOG.md` FXSW-009 — implementation ticket
