---
last_updated: 2026-06-17
sources:
  - docs/03-trade-state-model.md
  - docs/06-tech-architecture.md
  - docs/phase-summaries/phase-11-swaps-summary.md
status: stable
ticket: FXSW-010, FXSW-088
---

# Component — `dealMachine`

The parent XState actor that spawns one [rfsMachine](rfs-machine.md) and one [siMachine](si-machine.md) per deal and implements the cross-model coordination between them. File: `src/state/machines/dealMachine.ts`.

The two trade models are distinct and run in parallel — see [decisions/ADR-0002-two-parallel-state-machines.md](../decisions/ADR-0002-two-parallel-state-machines.md). The parent's job is fanning a single trader event (e.g. `PickUp`) into the right events on both children.

## Context

```typescript
type DealContext = {
  dealId: string;            // == TradeRequestId
  pickedUpBy?: string;       // populated on PickUpAck
  clientName: string;
  accountCode: string;
  pair: Pair;                // 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'
  side: 'BUY' | 'SELL';
  notional: number;
  tenor: 'SPOT';
  rejectionReasons: RejectionReason[];
  marginPips: number;
  isFixedMode: boolean;
  capturedRate?: number;
  finalRate?: number;
  createdAt: number;
};
```

`dealable` is **not** stored on context — it's derived from `siState === 'Initial'` in the [dealsStore](deals-store.md) entry. The parent has no natural way to observe child state transitions without subscribing, so deriving in the store (which already subscribes for status purposes) keeps the plumbing single-source.

## Cross-model coordination table

Each row is implemented as an `on: { Trigger: [sendTo(rfs, ...), sendTo(si, ...)] }` handler in the parent. The parent fans every event to both children — XState v5 silently no-ops events a child doesn't define, so this is safe and avoids duplicating routing logic.

| Trigger | RFS action | SI action |
|---|---|---|
| `NEW_SI_DEAL` (risk failed) | start in `Queued` | start in `Initial` |
| `NEW_ESP_DEAL` (auto-priced) | start in `Executable` | start in `Initial` (stays there for the lifetime of the deal) |
| `PickUp` (trader clicks row) | `PickUp` → `PickedUp` | `PickUp` → `PickUpSent` → `PickedUp` |
| `Quote` (Send Stream / Send Quote) | `PriceUpdate` → `Executable` | `Quote` → `QuoteSent` → `Quoted` |
| `Withdraw` | `Withdraw` → `PickedUp` | `Withdraw` → `WithdrawSent` → `PickedUp` |
| `Hold` (Release) | `Hold` → `Queued` | `Hold` → `HoldSent` → `Initial` (Dealable=true again) |
| `Reject` | (no change — see below) | `Reject` → `RejectSent` → `TraderRejected` (terminal) |
| `ClientReject` (client decline / timeout) | `ClientClose` → `ClientClosed` (terminal) — **routed to both legs** since FXSW-088 | `ClientReject` → `ClientRejected` (terminal) |
| `TradeConfirmed` (client accept) | `TradeConfirmed` → terminal | `TradeConfirmed` → terminal |
| `AutoPrice` (ESP bootstrap) | `PriceUpdate` → `Executable` | (no-op; SI stays at `Initial`) |

### Trader `Reject` doesn't transition RFS

`docs/03 §3` says "Raise `Reject` on RFS → RFS terminal" but `docs/03 §1` doesn't list a `Reject` event for RFS — the spec is inconsistent. The build leaves RFS untouched on trader-reject; the row leaves the Active Blotter via the SI terminal state and the 5-second removal rule. Raising `ClientClose` on RFS (the spec-adjacent alternative) would change `rfsState` to `ClientClosed` for the 5-second window, which adds nothing visible and risks confusing the [status-derivation](status-derivation.md). See `docs/dev-log.md` FXSW-010 entry.

## Explicit terminal protection + side-lock guards (FXSW-088)

The parent gained explicit guards so a finished or side-locked deal can never be re-animated by a late or duplicate trader event — protection that is **explicit, not merely topological** (the old behaviour relied on the children's terminal states simply having no handlers):

- **`terminal: boolean`** context flag, set by a `markTerminal` action once a terminal event (`Reject` / `ClientReject` / `TradeConfirmed`) is processed.
- **`notTerminal` guard** on every trader-driven transition — a terminal deal forwards nothing.
- **`canQuote` guard** — a `Quote` is allowed only when the deal is not terminal **and** the named side matches the quotable side (`quoteSide === 'BOTH'`, or the event's side equals `quoteSide`). This is the side-lock at the machine level, complementing the pricing-math lock (`gateMarginToSide`) and the UI lock.
- **`ClientReject` routed to BOTH legs** — SI to `ClientRejected` **and** RFS to `ClientClosed` (via `ClientClose`, accepted from `Executable`, the state RFS is in while SI is `Quoted`) — so both legs close explicitly rather than relying on the store to stop a live RFS. Then `markTerminal`.

No new XState states, events, or machines were added for NDF or swaps — instrument handling lives in the scenario player / pricing layers, not the machines (`docs/03` §10).

## Children spawned at init

```typescript
{
  rfs: spawn(rfsMachine, { input: { dealId } }),
  si:  spawn(siMachine,  { input: { dealId } }),
}
```

The store pulls both child actors out of the parent's context and subscribes to each so React selectors stay reactive without anyone calling `getSnapshot()` from a component. See [deals-store.md](deals-store.md).

## Side-effect timers

- **Simulated ack delays** (250ms by default) — each `*Sent` state in [si-machine.md](si-machine.md) has an `after: { ackDelay: 'NextState' }` transition. Zero-able via `timings.ackDelayMs = 0`. See [decisions/ADR-0009-simulated-ack-delays.md](../decisions/ADR-0009-simulated-ack-delays.md).
- **5-second blotter removal** — every terminal state on both machines schedules `after: { removalDelay: 'Removed' }`. See [active-blotter.md](../features/active-blotter.md) §5-second-removal-rule.

## Anti-patterns

- **Do not collapse** RFS and SI into one machine — they are distinct models per ADR-0002.
- **Do not skip** the `*Sent` → `*Ack` transitions — the simulated delay is part of the UX fidelity (ADR-0009).
- **Do not derive status labels** anywhere except `statusFromMachines.ts` — see [status-derivation.md](status-derivation.md).
- **Do not mutate** `dealable` directly — it's derived from SI state in the store.

## Tests

`src/state/machines/dealMachine.test.ts` — **11 cases**. The integration coverage for the full RFS + SI state graph and every cross-model send from `docs/03 §3`:

- Context + spawn shape (RFS in `Queued`, SI in `Initial`, shared `dealId`).
- `PickUp` → SI `Initial → PickUpSent → PickedUp` + RFS `Queued → PickedUp`.
- `Hold` from PickedUp → SI `PickedUp → HoldSent → Initial` + RFS `PickedUp → Queued` (Dealable=true again).
- `Quote` → SI `PickedUp → QuoteSent → Quoted` + RFS `PickedUp → Executable`.
- `Withdraw` from Quoted → SI `Quoted → WithdrawSent → PickedUp` + RFS `Executable → PickedUp`.
- `Reject` from PickedUp + `Reject` from Quoted → SI terminal `TraderRejected`.
- `ClientReject` in Quoted → SI terminal `ClientRejected`.
- `TradeConfirmed` → both machines terminal.
- 5-second `removeFromActive` rule via `after: 5000` across all three terminal SI states.
- Terminal states reject all subsequent events (no transitions).

All run under `vi.useFakeTimers()` + `vi.advanceTimersByTime(timings.ackDelayMs)`.

Fake-timer pattern: see [test-patterns.md](test-patterns.md) §2.

## Sources

- `docs/03-trade-state-model.md` §3, §4, §6, §10 — cross-model relationships, diagrams, status derivation, anti-patterns
- `docs/06-tech-architecture.md` §5 — state-management contract
- `docs/dev-log.md` FXSW-010 — implementation notes
- `docs/BACKLOG.md` FXSW-010 — implementation ticket
