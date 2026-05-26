---
last_updated: 2026-05-26
sources:
  - docs/06-tech-architecture.md
  - docs/03-trade-state-model.md
status: stable
---

# ADR-0003 — XState v5 for deal lifecycle, Zustand for UI / transient state

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The prototype has two distinct kinds of state:

1. **Deal lifecycle** — finite-state, transition-driven, with simulated ack delays and 5-second removal timers. Per [ADR-0002](ADR-0002-two-parallel-state-machines.md), each deal runs two parallel state machines (RFS + SI) coordinated by a parent.
2. **UI / transient state** — ticket open / close, mute toggle, focus, pending toasts. Flat key/value reactivity with selectors.

Mixing both kinds in one library either forces state machines into a reducer pattern (hostile to the documented transition table) or forces UI state through machine actors (hostile to the simple flat shape).

## Options considered

1. **Redux + Redux Toolkit** for everything. Familiar, single-store. Reducers handle both shapes.
2. **MobX** for everything. Reactive observables; less ceremony.
3. **Recoil / Jotai** for everything. Atom-based reactivity.
4. **XState** for the deal lifecycle + **Zustand** for UI / transient state. Two libraries, but each fit-for-purpose.

## Decision

Option 4: XState v5 for the deal lifecycle, Zustand for everything else.

## Consequences

**Positive:**
- XState models the documented state graph directly — transitions, guards, side-effect timers (`*Sent` ack delays, 5-second removal). The trade model in `docs/03-trade-state-model.md` is essentially the XState definition.
- Zustand for UI state is ~10 lines per store: `dealsStore`, `uiStore`, `settingsStore`. No provider tree, no boilerplate, plays nice with selectors.
- The two libraries are tiny (combined < 30KB gzipped) and have no overlap in responsibility — Zustand never owns deal state; XState never owns UI state.
- Test isolation: each XState machine has a unit test that doesn't touch Zustand; each Zustand store has a unit test that doesn't touch XState.

**Negative:**
- Two libraries to learn. XState v5 in particular has a learning curve (typed setup, `setup({...}).createMachine(...)` generic narrowing).
- The bridge between them — Zustand stores subscribing to XState actor snapshots — is custom code in the [dealsStore](../components/deals-store.md). It's documented + tested but it's a seam to maintain.
- One specific XState v5 quirk: `setup`-typed machines reject helper factories like `toSi(type)` because the inline `sendTo` form is the only one that satisfies the strong generic types. The dealMachine handlers are verbose as a result. See `docs/dev-log.md` FXSW-010 entry.

## Pinned versions

- `xstate@5.13.0`, `@xstate/react@4.1.1`
- `zustand@4.5.2`

## Bridge pattern

For each deal, the [dealsStore](../components/deals-store.md) subscribes to the spawned RFS and SI child actors and mirrors their state names into the store entry's `siState` / `rfsState` fields. React selectors then read `siState` / `rfsState` from the store, not from the actor directly — keeps `getSnapshot()` calls out of components.

## Sources

- `docs/06-tech-architecture.md` §1, §5 — stack choice, state-management contract
- `docs/03-trade-state-model.md` §6 — XState implementation
- `docs/dev-log.md` FXSW-009, FXSW-010 — bridge pattern + verbose-handler trade-off
