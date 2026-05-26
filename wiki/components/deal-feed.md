---
last_updated: 2026-05-26
sources:
  - docs/04-dummy-feed-spec.md
status: stable
ticket: FXSW-008
---

# Component — `dealFeed`

In-browser deal-event simulator. Emits new deals (ESP and SI), client decisions on outstanding quotes, and expiry / cancel events. **Scenario-driven** — does not auto-generate deals. The dev injector calls `dealFeed.inject(scenarioId)` and the feed plays the pre-defined script.

File: `src/services/feed/dealFeed.ts`. Tests: `dealFeed.test.ts`.

## Public API

```typescript
interface DealFeed {
  subscribe(cb: (event: DealEvent) => void): () => void;
  inject(scenarioId: ScenarioId): void;
  reset(): void;
  notifyDealState(dealId: string, siState: string): void;
}
```

`subscribe` returns an unsubscribe function. `inject` starts a scripted scenario. `reset()` clears all in-flight scenarios.

`notifyDealState` is the bridge wire-up that closes the loop with the [dealsStore](deals-store.md): state-gated scenarios like `OFF_HOURS_INTERVENTION` (`CLIENT_ACCEPT` 1500ms after SI reaches `Quoted`) only fire once the SI machine actually reaches that state. The store calls `dealFeed.notifyDealState(dealId, stateName)` on every SI transition. See `docs/04-dummy-feed-spec.md` §6.

## Why scenario-driven, not auto-generated

Random deal generation in a demo creates noise. Scripted scenarios are reproducible, demoable, and testable. Each scenario has a deterministic data payload (client name, account, pair, notional, reasons) registered in `src/services/scenarios/definitions.ts` — see the [Scenarios section of the index](../index.md#scenarios).

## Event types

```typescript
type DealEvent =
  | { type: 'NEW_SI_DEAL'; deal: Deal; rejectionReasons: RejectionReason[] }
  | { type: 'NEW_ESP_DEAL'; deal: Deal }
  | { type: 'CLIENT_ACCEPT'; dealId: string }
  | { type: 'CLIENT_REJECT'; dealId: string }
  | { type: 'CLIENT_CANCEL'; dealId: string }
  | { type: 'EXPIRE'; dealId: string };
```

See also: [data-models/deal-event.md](../data-models/deal-event.md).

## How events become deal state

The bootstrap module `src/state/stores/dealsBootstrap.ts` subscribes to the dealFeed once at app boot and routes:

- `NEW_ESP_DEAL` → `dealsStore.addDeal(deal, [], 'ESP')`
- `NEW_SI_DEAL` → `dealsStore.addDeal(deal, event.rejectionReasons, 'SI')`
- `CLIENT_ACCEPT` → `dealsStore.forwardEvent(dealId, TradeConfirmed)`
- `CLIENT_REJECT` / `CLIENT_CANCEL` → `dealsStore.forwardEvent(dealId, ClientReject)`
- `EXPIRE` — currently a no-op (no scenario uses it; RFS `Expire` would need parent-level routing not in scope).

Idempotency: the store guards `addDeal` against duplicate `dealId`s; the dealFeed's per-deal one-shot timers prevent same-deal double-firing.

## Idempotency

- `inject(id)` for the same scenario twice creates two independent deals with two independent follow-up timers (fresh `dealId` per call). The spec's "no double-firing if called twice mid-scenario for the same deal" is structurally satisfied by the one-shot timer model.
- `reset()` cancels both time-gated `setTimeout` callbacks and unarmed state-gates.

## Sources

- `docs/04-dummy-feed-spec.md` §4, §6 — public API, client-simulation logic
- `docs/dev-log.md` FXSW-008, FXSW-009, FXSW-013 — bridge wire-up, bootstrap, ESP routing
- `docs/BACKLOG.md` FXSW-008 — implementation ticket
