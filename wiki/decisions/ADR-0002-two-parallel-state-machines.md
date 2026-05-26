---
last_updated: 2026-05-26
sources:
  - docs/03-trade-state-model.md
status: stable
---

# ADR-0002 — Two parallel state machines per deal (RFS + SI)

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

Each deal in the prototype has two distinct lifecycles running in parallel:

- **RFS Trade Model** — the client-side Request for Stream lifecycle: `Queued` → `PickedUp` → `Executable` → `TradeConfirmed`/`Expired`/`ClientClosed`.
- **Sales Intervention (SI) Trade Model** — the trader-side intervention lifecycle: `Initial` → `PickUpSent` → `PickedUp` → `QuoteSent` → `Quoted` → terminals.

Some transitions across the two models are related — when a trader picks up a trade, SI transitions to `PickUpSent` while RFS transitions to `PickedUp`. The relationship between the two models is **not** automatic in the reference workflow; it has to be coded explicitly at the implementation level.

## Options considered

1. **Single combined flat state machine.** One machine with states like `Queued-Initial`, `PickedUp-PickedUp`, `Executable-Quoted`. Smaller, fewer moving parts, no cross-machine sends.
2. **Two parallel machines coordinated by a parent.** Each machine owns its own concern; the parent dealMachine implements the cross-model relationships from the spec table as send-actions on transitions.

## Decision

Two parallel machines, coordinated by a parent `dealMachine` actor.

## Consequences

**Positive:**
- Models the real workflow directly. The spec is explicit that these are two distinct trade models with documented cross-model relationships — collapsing them loses that clarity.
- Cleaner v2 path. Each child machine can become a thin adapter onto a real backend state stream without restructuring.
- "This is an RFS-side concern" vs "this is an SI-side concern" stays legible in the code.
- The cross-model relationship table from `docs/03-trade-state-model.md` §3 maps directly to handlers on the parent — one row, one handler.

**Negative:**
- More files, more events, more boilerplate. The parent fans every trader event to both children (XState v5 silently no-ops events a child doesn't define), which is verbose.
- `dealable` has to be derived from the SI state in the [dealsStore](../components/deals-store.md) rather than stored on parent context, because the parent doesn't naturally observe child state transitions without subscribing.
- Coordinating terminal-state cleanup across two machines required a hidden `Removed` cleanup state on each, reached via `after: { removalDelay: 'Removed' }`. ESP deals (which keep SI at `Initial`) needed a guarded `Initial → TradeConfirmed` synthetic transition on SI to preserve the "every deal has both machines reach a terminal" invariant.

## Implementation

- [components/rfs-machine.md](../components/rfs-machine.md)
- [components/si-machine.md](../components/si-machine.md)
- [components/deal-machine.md](../components/deal-machine.md) — the parent + cross-model coordination
- [components/status-derivation.md](../components/status-derivation.md) — the read-side projection that uses both states

## Sources

- `docs/03-trade-state-model.md` §6 — "Why two machines, not one combined"
- `docs/03-trade-state-model.md` §3 — cross-model relationship table
- `CLAUDE.md` rule §7
