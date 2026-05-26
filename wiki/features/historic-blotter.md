---
last_updated: 2026-05-26
sources:
  - docs/02-functional-spec.md
status: stable
ticket: FXSW-012
---

# Feature — Historic Deals Blotter

Read-only view of deals in terminal states. Sits below the Active Blotter, ~30% of remaining vertical height. Session-only; no paging in v1.

## Columns

Same as the Active Blotter, except:

- Status column shows the terminal state (e.g. `TradeConfirmed`, `TraderRejected`).
- Rate column shows the final executed rate (or final quoted rate for non-completed deals).
- **Reasons column hidden.**
- **Outcome column added at the end (160px).** One of:
  - `Executed` — SI or RFS reached `TradeConfirmed`.
  - `Rejected by Trader` — SI reached `TraderRejected`.
  - `Rejected by Client` — SI reached `ClientRejected`.
  - `Expired` — RFS reached `Expired`.
  - `Cancelled` — RFS reached `ClientClosed`.

## Sorting & capacity

- Default sort: Time descending. Most recent terminal events at the top.
- Cap: 100 rendered rows. Oldest beyond that are dropped.

## Empty state

> "No historic deals yet."

## How deals get here

When the SI machine reaches the `Removed` final state (5 seconds after a terminal SI state) — or when the RFS machine reaches `Removed` for ESP deals (where SI stays at `Initial`) — the [dealsStore](../components/deals-store.md) archives the entry from `deals` to `historic`. The outcome label is derived at archival time from the final RFS and SI states.

The archive call is idempotent — whichever subscriber (RFS or SI) fires `Removed` first wins; the second is a no-op.

## Test contract

Each row carries:

```html
<button
  data-deal-id="d_001"
  data-outcome="Executed"
>
```

`data-outcome` is the canonical test-assertion attribute, per `docs/07-scenario-pack.md` test fidelity notes.

## Implementation

- Component: `src/features/blotter/HistoricBlotter.tsx`.
- Wired to `useHistoricDeals()` from `dealsStore`.
- `outcomeFromFinalStates(siState, rfsState)` maps the final state pair to one of the five outcome labels.

## Confirmation tickets — out of scope

The canonical workflow allows launching a confirmation ticket from a historic row. Not implemented in v1.

## Sources

- `docs/02-functional-spec.md` §3 — column definitions, outcome labels, capacity
- `docs/BACKLOG.md` FXSW-012 — implementation ticket
