---
last_updated: 2026-06-16
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-08-v3-summary.md
status: stable
ticket: FXSW-012
---

# Feature — Active Deals Blotter

The primary work area. Live view of every deal in progress: auto-priced (ESP), awaiting pricing, under SI review, being priced by SI, and just-completed (kept 5s after completion per the 5-second removal rule). All deals — including ESP — pass through. Sits below the header, occupying ~55% of remaining vertical height.

## Columns

| Column | Source | Width | Notes |
|---|---|---|---|
| Status | Deal state (derived) | 110px | Color-coded pill. Derivation lives in [components/status-derivation.md](../components/status-derivation.md). |
| Time | Deal `createdAt` | 80px | `HH:mm:ss`, local. |
| Client | Deal `clientName` | 160px | |
| Account | Deal `accountCode` | 100px | |
| CCY Pair | Deal `pair` | 80px | Monospace, uppercase. |
| Side | Deal `side` | 60px | `BUY` green, `SELL` red. |
| Amount | Deal `notional` | 120px | Right-aligned, thousands separator. Base CCY suffix. |
| Tenor | Deal `tenor` | 60px | `SPOT` for spot deals. |
| Rate | Current trader rate | 120px | Monospace, blinks 1 tick on update. |
| Reasons | Rejection reasons | 200px | Comma-joined chip labels. Empty for ESP deals. |
| Trader | Picked-up-by | 100px | Empty until a trader picks up. |

Default sort: Status (intervention states first), then Time descending. Column headers clickable to re-sort. No filter UI in v1.

### v3 columns (`?dev=v3`)

Under v3, two extra columns are inserted, gated by `isV3()` (the column list is built with `...(isV3() ? [col] : [])` spreads, so the GA layout is byte-for-byte unchanged when the flag is absent):

| Column | Source | Notes |
|---|---|---|
| Request ID | `makeRequestId()` → `REQ-XXXXXX` | Synthetic display id minted at deal creation (`src/lib/ids.ts`). |
| Value Date | `valueDateForTenor(deal, tenor)` | Tenor-aware settlement date; `SPOT` resolves to the standard spot value date. See [forward-pricing.md](forward-pricing.md). |

The mobile card-stack (narrow viewports) gains a matching line carrying the Request ID + value date for v3 deals (FXSW-066). Historic adds a Trade ID on top of these — see [historic-blotter.md](historic-blotter.md).

## Row treatment per display status

| Display label | SI state behind it | Treatment |
|---|---|---|
| `INTERVENE` | `Initial` + `Dealable=true` | Amber 4px left-edge bar, row flash on entry (300ms fade from amber 30% → transparent), amber pill |
| `PICKING UP` | `PickUpSent` | Blue bar, pill blue, subtle pulse |
| `PICKED UP` | `PickedUp` | Blue bar, pill blue |
| `STREAMING` | `Quoted` | Teal bar, pill teal, Rate cell pulses on every tick |
| `WITHDRAWING` | `WithdrawSent` | Teal bar, pill teal with spinner |
| `RELEASING` | `HoldSent` | Amber bar (transitional), pill amber with spinner |
| `REJECTING` | `RejectSent` | Red bar (transitional), pill red with spinner |
| `AUTO` | `Initial` (ESP path) | No bar, pill grey |
| `DONE` | `TradeConfirmed` | Green pill, row dims to 60% opacity then unmounts at 5000ms |
| `REJECTED` | `TraderRejected` | Red pill, dim + unmount at 5000ms |
| `DECLINED` | `ClientRejected` | Red pill, dim + unmount at 5000ms |
| `EXPIRED` | RFS `Expired` | Grey pill, dim + unmount at 5000ms |

## 5-second removal rule

Completed / rejected / expired deals stay in Active for exactly 5 seconds after entering the terminal state, then move to Historic. Terminal states: `TradeConfirmed`, `TraderRejected`, `ClientRejected`, `Expired`, `ClientClosed`. Implemented per [components/si-machine.md](../components/si-machine.md) — each terminal SI state has an `after: 5000 → Removed` transition; the row's `data-removing="true"` attribute toggles at t+0 for the dim animation; the row unmounts when the SI machine reaches `Removed`.

## Row interactions

- Single click on an intervention-state row → fires SI `PickUp` and opens the ticket.
- Single click on a non-intervention row → no-op.
- Hover → row highlight (4% lighter background).

## Empty state

> "No active deals. Use the dev injector (top right) to start a scenario."

## Dim when ticket open

When the [ticket panel](ticket.md) is open, the blotters dim to `opacity-75` via a `transition-opacity duration-[240ms]` on the `<main>` wrapper, per `docs/05-ui-ux-spec.md` §2.

## Test contract

The blotter body wrapper carries `data-testid="active-blotter-body"`. Each row is a `<button>` inside:

```html
<div data-testid="active-blotter-body">
  <button
    data-deal-id="d_001"
    data-rfs-state="PickedUp"
    data-si-state="Quoted"
    data-display-status="STREAMING"
    data-dealable="false"
    data-removing="false"
  >
</div>
```

Playwright tests assert on `data-si-state` (most informative) and `data-display-status` (user-facing label). Both are stable parts of the test contract — see the [Scenarios section of the index](../index.md#scenarios) for the per-scenario assertions.

## Tests

`src/features/blotter/ActiveBlotter.test.tsx` — **5 cases**. Empty-state message; two rows render with `data-deal-id`; `data-si-state` / `data-display-status` / `data-dealable` reflect machine through a `PickUp` transition; row click calls `uiStore.openTicket`; terminal-state row gets `data-removing="true"` then unmounts at `timings.removalDelayMs`.

`src/lib/format.test.ts` — **6 cases**. `formatTime`, `formatAmount`, `formatRate` across the four pairs at both precisions.

## Implementation

- Component: `src/features/blotter/ActiveBlotter.tsx`.
- Cells: `StatusCell.tsx`, `RateCell.tsx`, `AmountCell.tsx`, `ReasonsCell.tsx`.
- Wired to `useActiveDeals()` from `dealsStore`. Each terminal row stays in the Active list (dimmed) for 5s before the store archives it to Historic.
- Did **not** use AG-Grid despite the original AC wording — a flex table covers every column the spec requires and gives clean per-row `data-*` attributes that AG-Grid 31 has no first-class API for. See `docs/dev-log.md` FXSW-012 entry for the trade-off.

## Sources

- `docs/02-functional-spec.md` §2 — column definitions, row treatment, 5-second rule
- `docs/03-trade-state-model.md` §6, §8 — display-status derivation, data-attributes test contract
- `docs/05-ui-ux-spec.md` §3.2 — cell components
- `docs/BACKLOG.md` FXSW-012 — implementation ticket
