---
last_updated: 2026-06-18
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/dev-log.md
status: stable
ticket: FXSW-088, FXSW-091, FXSW-092
---

# ADR-0017 — Swap markup model (shared spot + per-leg forward) and executed side for two-way requests

**Date:** 2026-06-18 (post-Phase-11 GUI-feedback rounds)
**Status:** Stable — refines [ADR-0014](ADR-0014-swap-net-points-pricing.md)

## Context

[ADR-0014](ADR-0014-swap-net-points-pricing.md) established that a [swap](../features/swaps.md) prices on the net forward-points differential with two markup modes (Per-component / Total), the one-sided lock enforced in `lib/pips.ts`, and no new machine states. A run of GUI-feedback rounds (`docs/dev-log.md`, 2026-06-17 → 2026-06-18) then reshaped two things that ADR-0014 did not pin down: **what "per-component" actually decomposes into**, and **how a two-way request's outcome is represented** once it deals on one side. This ADR records both decisions.

## Decision 1 — Side-first tiles with a shared-spot + per-leg-forward component model

The panel is **side-first**: two per-direction tiles (`SwapSideTile`) — **Bid** `Buy/Sell {CCY}` (buy near / sell far) and **Ask** `Sell/Buy {CCY}` (sell near / buy far) — replacing the earlier leg-block layout that exposed four leg×side steppers with two greyed out. The per-tile `CLIENT BID / CLIENT ASK` labels were dropped in favour of the dealing-direction label.

**Per-component markup decomposes into a shared spot margin + an independent forward-points margin on each leg** (near + far), per side — *not* a single margin per leg. `effectiveSwapMargin` sums `spot + near + far` into the net (`spot` defaults to zero, so callers/tests that don't model it are unaffected). **All-in (Total)** keeps one net margin per side. A mutually-exclusive toggle (default Per-component) selects the mode; AI Apply switches to All-in. The one-sided lock disables **every** stepper in the non-quotable tile across both modes, backed by `gateMarginToSide` in the math.

The capture (`SwapPricingReport` → `AppliedMargin` swap variant) gained optional **`components` + `quoteSide`** so the [historical detail](../features/historical-detail.md) can render a per-component breakdown grid (`SwapMarkupDetail`) filtered by the priced side; Total keeps the concise net summary. A **"Markup applied"** row was inserted between the street net and the execution net so a zero-markup quote's identical figures are explained.

### Options considered (markup model)

- **Net-only markup (the first side-first cut).** Rejected after feedback — the desk needed to mark up the spot and forward components, not just the net.
- **Fully independent per-leg spot+fwd margins (a spot margin on each leg).** Rejected — a swap deals on one spot for both legs; a *shared* spot margin matches how the pod actually prices and halves the stepper count.
- **Keep both layers always visible (no toggle).** Rejected — too many controls on screen; a mutually-exclusive Per-component/All-in toggle is clearer.

## Decision 2 — Executed side for two-way requests

A two-way (`side: 'BOTH'`) request is **quoted on both sides but deals on exactly one**. Rather than drop the un-dealt side or show both as if both executed, the dealt side is **captured, persisted, and surfaced with the off side dimmed**:

- **Capture:** `CLIENT_ACCEPT` carries `executedSide` (`DealtSide = BID | ASK`). The [scenario player](../components/scenario-player.md#executed-side-for-two-way-requests-fxsw-092) resolves it — one-sided requests deal on their only quotable side; two-way requests pick one via a per-deal **seeded flip** (`EXEC_SIDE_SEED`, separate from the accept/reject seed, reproducible and test-pinnable).
- **Persist:** `recordExecutedSide` writes it to the live entry before the confirm; the archival snapshot copies it **only when Executed**.
- **Surface:** an executed-side banner names both perspectives (`Client Bid`/`Client Ask` + `Bank bid`/`Bank ask`) for **every** instrument; the single buy/sell direction line shows **only for single-leg instruments** (a swap's two opposite-direction legs have no one direction). The dealt column is emphasized and the off side dimmed across the swap leg detail + breakdown grid.

### Options considered (executed side)

- **Drop the un-dealt side at execution.** Rejected — the quoted-but-not-dealt side is useful context in the post-trade view; dimming preserves it without implying both traded.
- **Pick the executed side randomly (`Math.random`).** Rejected — non-reproducible; a seeded per-deal flip keeps demos and tests deterministic, matching the GA-core determinism decision ([ADR-0016](ADR-0016-ga-core-determinism.md)).

## Consequences

- **Positive:** the markup model matches a real swap pod (one spot, per-leg forwards); `spot` defaulting to zero keeps every prior caller/golden stable; the executed side is reproducible and fully auditable in the historic view; no new machine states (lifecycle untouched).
- **Negative:** more per-deal UI state (markup mode + four margin scopes per side) and a small persistence surface (`executedSide` threaded feed → store → snapshot). The historic breakdown grid + banner add render branches keyed on instrument and dealt side.

## Sources

- `docs/02-functional-spec.md` §12.3 (swap), §7.3 (bid/ask truth table)
- `docs/05-ui-ux-spec.md` §18.4 — side-first tiles, two-layer markup, executed-side banner
- `docs/dev-log.md` — the 2026-06-17/18 swap-panel redesign + executed-side rounds (FXSW-088..FXSW-092)
- Related: [ADR-0014](ADR-0014-swap-net-points-pricing.md), [ADR-0016](ADR-0016-ga-core-determinism.md), [features/swaps.md](../features/swaps.md), [features/historical-detail.md](../features/historical-detail.md), [components/scenario-player.md](../components/scenario-player.md)
- Source drift-checked: `SwapPanel.tsx`, `SwapSideTile.tsx`, `pips.ts`, `quoteSide.ts`, `player.ts`, `dealsStore.ts`, `lifecycle.ts`
