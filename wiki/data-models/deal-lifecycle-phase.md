---
last_updated: 2026-06-16
sources:
  - docs/03-trade-state-model.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-049
---

# Data Model — Deal Lifecycle Phase

The **display-only** phase vocabulary for the v3 [historical trade detail](../features/historical-detail.md) timeline. These phases are **observed**, not authoritative: they are derived by watching the existing [SI](../components/si-machine.md) and [RFS](../components/rfs-machine.md) machine transitions. **No new canonical machine states or events are introduced** (per `docs/03-trade-state-model.md` §9). The two state machines remain the single source of truth for the deal lifecycle.

## `LifecyclePhase`

`src/types/lifecycle.ts` — verified against source at this ingest:

```typescript
type LifecyclePhase =
  | 'REQUEST'
  | 'PICKUP'
  | 'RELEASE'
  | 'PRICE_BACK'
  | 'AUTO_PRICE'
  | 'WITHDRAWN'
  | 'RESPONSE';
```

| Phase | Meaning | Observed from |
|---|---|---|
| `REQUEST` | Deal arrived in the blotter | deal creation (`NEW_*_DEAL`) |
| `PICKUP` | Trader picked the deal up | SI `PickUpSent` |
| `RELEASE` | Trader handed the deal back to the desk | SI `HoldSent` |
| `PRICE_BACK` | Trader priced the deal back to the client | SI `QuoteSent` |
| `AUTO_PRICE` | Deal was auto-priced (ESP), no manual markup | RFS `Executable` |
| `WITHDRAWN` | Trader took a live quote back | SI `WithdrawSent` |
| `RESPONSE` | Terminal outcome (confirmed / rejected / expired / closed) | SI or RFS terminal state |

## Single phase source per deal

Each deal logs from **exactly one** machine to avoid double-logging (an agent-directed decision):

- **ESP / auto-priced** deals never leave SI `Initial`, so their timeline is derived from the **RFS** machine.
- **All other (SI) deals** are derived from the **SI** machine.

The mapping is a pure function, kept out of the [deals store](../components/deals-store.md) so it can be unit-tested in isolation (`src/state/stores/lifecyclePhase.ts`):

```typescript
lifecyclePhaseFor(channel: 'SI' | 'RFS', toState: string): LifecyclePhase | null
```

Keyed by **destination** state. Steady states and ack-only `*Sent` states that don't represent a waypoint return `null` and are not logged.

| channel | toState → phase |
|---|---|
| SI | `PickUpSent`→`PICKUP`, `QuoteSent`→`PRICE_BACK`, `HoldSent`→`RELEASE`, `WithdrawSent`→`WITHDRAWN`, `TradeConfirmed`/`ClientRejected`/`TraderRejected`→`RESPONSE` |
| RFS | `Executable`→`AUTO_PRICE`, `TradeConfirmed`/`Expired`/`ClientClosed`→`RESPONSE` |

### `AUTO_PRICE` vs `PRICE_BACK` (FXSW-070)

An ESP deal auto-prices straight to RFS `Executable`. That maps to **`AUTO_PRICE`** — a distinct waypoint — so the timeline reads "Auto-priced" rather than implying a manual "Priced back". The trader never marked it up; the [detail overlay](../features/historical-detail.md) shows the auto-priced note instead of a markup reason.

### `WITHDRAWN` (FXSW-065)

A trader take-back (`Quoted` → `Withdraw` → SI `WithdrawSent` → `PickedUp`) is logged as its own `WITHDRAWN` waypoint so the timeline shows the quote being pulled. This is an **observation only** — `WithdrawSent` is an existing SI state; see [si-machine.md](../components/si-machine.md).

## Event record

`DealLifecycleEvent` is what the timeline stores per waypoint:

```typescript
type DealLifecycleEvent = {
  phase: LifecyclePhase;
  at: number;             // timestamp
  channel: 'SI' | 'RFS';
  fromState?: string;
  toState: string;
  trigger?: string;
} & QuoteContext;
```

`QuoteContext` (merged into the `PRICE_BACK` event so the detail view can explain the price):

```typescript
type QuoteContext = {
  appliedMargin?: AppliedMargin;   // spot pair, or spot+fwd pairs for a forward
  aiSuggested?: boolean;
  rationale?: string;
};

type AppliedMargin =
  | { kind: 'spot'; margin: MarginPair }
  | { kind: 'forward'; spot: MarginPair; fwd: MarginPair };
```

The log is **captured live** during the deal's life (it cannot be reconstructed after archival — FXSW-049) and travels with the archived entry into Historic.

## Tests

`lifecyclePhase.test.ts` exercises the SI/RFS destination→phase mapping (including the `AUTO_PRICE` and `WITHDRAWN` cases) and the `null` no-log states. Capture wiring is tested via the [deals store](../components/deals-store.md); rendering via [TimelinePanel](../features/historical-detail.md).

## Sources

- `docs/03-trade-state-model.md` §9 — lifecycle event log, WITHDRAWN + AUTO_PRICE notes, "no new canonical states"
- `docs/phase-summaries/phase-08-v3-summary.md` — FXSW-049
- `docs/dev-log.md` FXSW-049, FXSW-065, FXSW-070
- `src/types/lifecycle.ts`, `src/state/stores/lifecyclePhase.ts` (drift-checked at this ingest)
- Commits `1631e0a`, `f800115`, `eca0754`
