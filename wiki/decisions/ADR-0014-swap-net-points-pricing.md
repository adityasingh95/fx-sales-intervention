---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/phase-summaries/phase-11-swaps-summary.md
status: stable
ticket: FXSW-083, FXSW-084, FXSW-085
---

# ADR-0014 — Swaps price on net forward points; Per-component vs Total markup

**Date:** 2026-06-17 (Phase 11)
**Status:** Stable

## Context

An FX [swap](../features/swaps.md) is two legs (NEAR + FAR). The economics are the **differential** between the two forward points, not each leg in isolation. The build had to decide where the net is computed, how the trader marks it up, and how to keep the existing determinism guarantees and lifecycle untouched.

## Decision

**Compute the net once, at the feed boundary, as a pure composition.** `swapPointsFeed.get(pair, near, far)` returns each leg's two-sided points plus `net = far − near` per side, composing the existing [forward-points feed](../components/swap-points-feed.md) with **no new RNG draws** — so seed-42 and the forward goldens stay byte-stable.

**Two markup modes**, both resolving in `src/lib/pips.ts` (no pip math in components):

- **Per-component** — an independent `MarginPair` per leg, **summed** into the net (mirrors the v3 spot+fwd sum).
- **Total** — one `MarginPair` on the net.

`effectiveSwapMargin(mode, margins, quoteSide)` resolves the mode and then applies **`gateMarginToSide`**, so the **one-sided lock is enforced in the math** — the non-quotable side's margin is zeroed before any client number is produced, not merely hidden in the UI. The raw net row shows the un-marked differential; client net + P/L derive from it, so a zero-markup quote shows exactly `far − near`. `SwapPanel` owns its markup state and reports only the effective net margin upward for capture, keeping `TicketPanel` lean.

Per `docs/03` §10, a swap is one deal with one lifecycle: **no new XState states, events, or machines** — the FAR leg is a pricing/display concern over the existing RFS + SI transitions.

### Options considered

- **Per-leg client prices instead of a net.** Rejected — a forward-forward swap is quoted on the differential; showing two independent leg prices misrepresents the product.
- **Enforce the one-sided lock only in the UI (as v3 originally did).** Rejected — earlier reviews flagged single-point UI enforcement; moving the gate into `lib/pips.ts` (`gateMarginToSide`) closes it for every consumer (FXSW-087 F-4, positive finding).
- **A bespoke swap RNG.** Rejected — would perturb the seed sequence; pure composition keeps every prior golden stable.

## Consequences

- **Positive:** net built once with no new entropy; one-sided lock enforced in math; captured execution margin reconciles with the historic recompute; Per-component reuses the v3 sum pattern; lifecycle/determinism untouched.
- **Negative:** two markup modes add UI state and a mode-reset-on-deal-switch invariant (FXSW-087 F-3, defensive Low). A one-sided swap still renders the off-side raw net dimmed rather than fully suppressed (F-2, Low) — client net shows `—` but the underlying raw value is present.

## Sources

- `docs/02-functional-spec.md` §12.3 — swap net pricing, markup modes
- `docs/03-trade-state-model.md` §10 — one deal, no new machines
- `docs/phase-summaries/phase-11-swaps-summary.md` — FXSW-083/084/085
- `security/FXSW-087-review.md` — F-2, F-3, F-4
- Related: [components/swap-points-feed.md](../components/swap-points-feed.md), [features/swaps.md](../features/swaps.md)
