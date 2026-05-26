---
last_updated: 2026-05-26
sources:
  - docs/03-trade-state-model.md
status: stable
---

# ADR-0009 — Simulated 250ms ack delays for `*Sent` states

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The SI Trade Model includes a family of in-flight states — `PickUpSent`, `QuoteSent`, `WithdrawSent`, `HoldSent`, `RejectSent` — that represent trader actions awaiting acknowledgement from the trading backend. In a real deployment these states are visible because there is real network latency between the action and its ack. The prototype has no backend.

## Options considered

1. **Collapse `*Sent` states.** Skip the intermediate state — `PickedUp + Quote → Quoted` directly. Simpler, fewer transitions, no timer plumbing.
2. **Keep `*Sent` states with a simulated ack delay.** Each transitions to its post-ack state via `after: { ackDelay: 'NextState' }`. Delay is sourced from `src/state/machines/timings.ts`.

## Decision

Keep the `*Sent` states. Use a configurable simulated ack delay of 250ms by default; zero-able in tests.

## Consequences

**Positive:**
- UX fidelity. Real backends have ack latency. The 200-300ms window is long enough for the UI to show a "sending" affordance on the action button (button spinner, disabled state) and short enough that the demo flows smoothly.
- Models the real workflow. The state machine matches the canonical SI Trade Model 1:1 — no shortcuts that would have to be re-introduced in v2.
- Configurable. `timings.ackDelayMs = 0` from tests makes transitions synchronous, so unit tests don't need to wait.
- Plays well with the `data-si-state` test contract — Playwright can assert the row passes through `PickUpSent` before reaching `PickedUp` if needed, or zero the delay and assert the end state only.

**Negative:**
- Five extra states (one per trader action). More transitions to define and test.
- Each `*Sent` state needs a corresponding [TicketFooter](../features/ticket.md) spinner-state branch.
- The XState `after` transition with a named delay function (`delays: { ackDelay: () => timings.ackDelayMs }`) instead of a literal `after: { 250: ... }` is the only form that lets test reassignment of `timings.ackDelayMs` take effect on subsequent transitions without rebuilding the machine.

## Implementation

- File: `src/state/machines/timings.ts` — exports `{ ackDelayMs: 250 }` as a **mutable object property**, not a `const`. ES modules make `const` bindings read-only across module boundaries, which would break the "tests can zero it" requirement.
- Delays in [si-machine.md](../components/si-machine.md) use named `ackDelay` delay functions, evaluated lazily on state entry.

## Test contract

- Unit tests use `vi.useFakeTimers()` + `vi.advanceTimersByTime(timings.ackDelayMs)` to step through `*Sent` → post-ack.
- E2E tests pin `window.__zeroAckDelay = true` via Playwright's `addInitScript` before navigation; `main.tsx` reads it at boot and sets `timings.ackDelayMs = 0`. The 5-second removal delay is **not** zeroed — the demo + tests both depend on real wall-clock for that.

## Sources

- `docs/03-trade-state-model.md` §2, §6, §10 — `*Sent` state semantics, anti-patterns
- `docs/dev-log.md` FXSW-005 + FXSW-013 — `timings.ts` shape decision + zero-ack-delay hook
- `CLAUDE.md` rule §8
