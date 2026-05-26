---
last_updated: 2026-05-26
sources:
  - docs/03-trade-state-model.md
  - docs/02-functional-spec.md
status: stable
ticket: FXSW-011
---

# Component — Status derivation (`statusFromMachines`)

Pure function that maps the pair `(rfsState, siState, dealable)` to the user-facing display label shown on each blotter row's status pill. The single source of truth for display-status — no component should compute it from raw state names directly.

File: `src/features/blotter/statusFromMachines.ts`. Tests: `statusFromMachines.test.ts`.

## API

```typescript
export type DisplayStatus =
  | 'INTERVENE' | 'PICKING UP' | 'PICKED UP'
  | 'STREAMING' | 'WITHDRAWING' | 'RELEASING' | 'REJECTING'
  | 'AUTO'
  | 'DONE' | 'REJECTED' | 'DECLINED' | 'EXPIRED';

export function derivedStatus(
  rfsState: RfsState,
  siState: SiState,
  dealable: boolean,
): DisplayStatus;
```

## Mapping table

| Display label | RFS state | SI state | When |
|---|---|---|---|
| `INTERVENE` | `Queued` | `Initial` | Awaiting pickup; `Dealable === true` |
| `PICKING UP` | `Queued` | `PickUpSent` | In-flight pickup |
| `PICKED UP` | `PickedUp` | `PickedUp` | Trader has the ticket, no quote sent yet |
| `STREAMING` | `Executable` | `Quoted` | Quote live with client |
| `WITHDRAWING` | `Executable` | `WithdrawSent` | Withdraw in flight |
| `RELEASING` | `PickedUp` | `HoldSent` | Hold/Release in flight |
| `REJECTING` | `PickedUp`/`Executable` | `RejectSent` | Reject in flight |
| `AUTO` | `Executable` | `Initial` | ESP path; no SI involvement |
| `DONE` | `TradeConfirmed` | `TradeConfirmed` (or RFS-only for ESP) | Terminal success |
| `REJECTED` | (any) | `TraderRejected` | Terminal — trader |
| `DECLINED` | (any) | `ClientRejected` | Terminal — client |
| `EXPIRED` | `Expired` | (any) | Terminal — timeout |

## Predicate order

The function checks predicates in this order so terminals win over in-flight, and in-flight wins over live:

1. **Terminals first** — `TradeConfirmed`, `TraderRejected`, `ClientRejected`, `Expired`. Without this, a deal that's `TraderRejected` (terminal SI) but still showing `PickedUp` on RFS during the 5-second removal window would map to `PICKED UP` instead of `REJECTED`. Terminals winning preserves the user-facing finality of the action.
2. **In-flight `*Sent` states next** — `RejectSent`, `WithdrawSent`, `HoldSent`, `PickUpSent`. These override the underlying RFS state during the simulated ack delay.
3. **Live tuples** — `Quoted`, `PickedUp`.
4. **Fallback** → `'INTERVENE'`. The function's return type is the closed `DisplayStatus` union so it can never return `null`. The "awaiting trader attention" label is the safest visible state if we somehow land in an unmapped tuple — it surfaces the deal to the operator instead of hiding it.

## `RejectSent` ignores RFS

`docs/03 §6` row reads `PickedUp/Executable` for RFS — either underlying RFS state maps to the same display label. The function checks `siState === 'RejectSent'` first and ignores RFS for that branch. Both RFS variants get an explicit test case so the spec's "either RFS state" intent is locked in by tests.

## No `dealable` check in the `AUTO` row

ESP deals don't have a Sales Intervention machine in the canonical sense — they bypass intervention. `dealable` is meaningful for SI deals only; an ESP deal stays at `siState === 'Initial'` indefinitely, and the `dealable` flag is whatever the store derived (which would be `true` per the `siState === 'Initial'` rule, but that's irrelevant to ESP). The check is omitted because it would add a false invariant. See `docs/dev-log.md` FXSW-011 entry.

## Test contract

Each row's `data-display-status` attribute is the return value of this function. Playwright tests assert against it. The `docs/03 §6` table is implemented row-for-row in `statusFromMachines.test.ts` (13 `it.each` cases, including both RFS variants of `RejectSent`).

## Sources

- `docs/03-trade-state-model.md` §6 — the mapping table
- `docs/02-functional-spec.md` §2 row treatment — visual treatment per display label
- `docs/dev-log.md` FXSW-011 — implementation notes
- `docs/BACKLOG.md` FXSW-011 — implementation ticket
