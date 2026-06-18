---
last_updated: 2026-06-18
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-082..FXSW-091
---

# Feature — FX Swaps (forward-forward)

The second v4 instrument (`?dev=v4`). An **FX swap** is **two legs** — `NEAR` + `FAR`, with the far leg strictly later — priced together on the **net forward-points differential** (`net = far − near` per side). The trader marks up either each component of each side (**Per-component**) or the net as a whole (**All-in / Total**). Gated behind `isV4()`; GA and `?dev=v3` are byte-unchanged.

Per `docs/03-trade-state-model.md` §10 a swap is **one deal with one lifecycle**: the FAR leg is a pricing/display concern, so **no new XState states, events, or machines** are introduced — the RFS + SI children and the `*Sent` contract are untouched. See [components/deal-machine.md](../components/deal-machine.md).

> **The swap pricing panel was reshaped across a run of post-Phase-11 GUI-feedback rounds** (`docs/dev-log.md`, 2026-06-17 → 2026-06-18). The earlier net-only / per-leg-only layout (`SwapLegBlock`, a single net row) is gone; the panel is now **side-first** with per-direction tiles and a **shared-spot + per-leg-forward** component model. See [ADR-0017](../decisions/ADR-0017-swap-markup-model-and-executed-side.md), which refines [ADR-0014](../decisions/ADR-0014-swap-net-points-pricing.md).

## Two-leg data model

`instrumentType: 'SWAP'` populates `Deal.legs` (`[{kind:'NEAR',tenor}, {kind:'FAR',tenor}]`); `Deal.tenor` mirrors the NEAR leg so single-leg consumers stay coherent. Each leg may be SPOT or any forward tenor, **far strictly later than near**. The two legs deal in **opposite directions** — `swapLegSide(deal.side, 'NEAR'|'FAR')` derives the per-leg side from the single `Deal.side` (`BOTH` stays two-sided).

`buildSwapLegs(near, far?)` / `resolveSwapLegs(near, far?)` (in `src/types/deal.ts`) validate ordering and **coerce** a missing or out-of-order (`far ≤ near`) far to the shortest valid far (`nearRank + 1`); if the near is the last tenor (`1Y`) it steps back one so a far can exist. `resolveSwapLegs` reports `{ legs, adjusted, requested }`; when `adjusted`, `buildDeal` records the original request on `Deal.swapRequested` so the coercion is auditable. See [data-models/deal.md](../data-models/deal.md).

### "Legs adjusted" note (FXSW-091 F-1)

When `Deal.swapRequested` is present, `SwapAdjustNote` (`data-testid="swap-adjust-note"`) renders a visible note showing the requested vs. applied legs — so the operator sees the desk is pricing a different tenor pair than was typed. This addresses the security review's "silently coerces" finding (FXSW-087 F-1): valid requests are untouched (goldens stable); invalid ones are surfaced, not hidden.

## Net-points pricing

`swapPointsFeed.get(pair, near, far)` returns each leg's two-sided points plus `net = far − near` per side — a **pure composition** of the [forward-points feed](forward-pricing.md) with no new RNG draws (seed-42 + the mid sequence stay intact). See [components/swap-points-feed.md](../components/swap-points-feed.md).

Markup math lives in `src/lib/pips.ts` (no pip math in components):

- **`SwapMarkupMode = 'PER_COMPONENT' | 'TOTAL'`**.
- **Per-component** — a **shared spot margin** plus an independent **forward-points margin on each leg** (near + far), per side. All three **sum** into the net spread (`sumMargins(sumMargins(near, far), spot)`), mirroring the v3 outright's spot+fwd sum.
- **All-in (Total)** — one `MarginPair` applied to the net directly.
- `effectiveSwapMargin(mode, { total, near, far, spot? }, quoteSide)` resolves the active mode, then applies `gateMarginToSide` so the non-quotable side's margin is **zeroed in the math** (not just hidden) — the one-sided lock is enforced in `pips.ts`, closing the single-point-enforcement gap flagged in earlier phases (FXSW-087 F-4, positive finding). The `spot` component **defaults to zero**, so callers/tests that don't model a spot margin are unaffected (FXSW-091).
- `clientSwapNetPoints(net, margin)` widens the dealer side (`bid − margin.bid`, `ask + margin.ask`), rounded to tenths.

## Pricing UI — `SwapPanel` (side-first tiles)

`src/features/ticket/pricing/SwapPanel.tsx`, `data-testid="swap-panel"`. A swap quotes **two dealing directions**, each rendered as its own full-height tile (`SwapSideTile`) so the layout matches a real swap dealing pod — instead of exposing four leg×side steppers with two greyed out. Per-tile **CLIENT BID / CLIENT ASK** labels were removed in favour of the dealing-direction label.

| Tile | testid | Direction label |
|---|---|---|
| **Bid** side | `swap-side-bid` (`data-quotable`) | `Buy/Sell {CCY}` — buy near, sell far (`swap-side-bid-direction`) |
| **Ask** side | `swap-side-ask` (`data-quotable`) | `Sell/Buy {CCY}` — sell near, buy far (`swap-side-ask-direction`) |

Each tile carries:

| Element | testid |
|---|---|
| Shared spot rate for the side | `swap-spot-bid` / `swap-spot-ask` |
| Per-leg forward points (informational) | `leg-near-points-{bid,ask}` / `leg-far-points-{bid,ask}` |
| Marked-up client net | `client-net-bid` / `client-net-ask` (`—` on a locked side) |
| Est. P/L | `swap-pnl-bid` / `swap-pnl-ask` |
| Per-component Zero (per side) | `swap-zero-bid` / `swap-zero-ask` |

The two leg **value dates** (`near → far`) sit in the panel header: `leg-near-value-date` / `leg-far-value-date`.

### Markup-mode toggle + the two layers

A mutually-exclusive toggle (`data-testid="swap-markup-mode"`, buttons `swap-markup-mode-per-component` / `swap-markup-mode-total`, default **Per-component**) switches which markup controls each tile shows:

| Mode | Controls per tile | Margin testids (via `MarginRow` `idPrefix`) |
|---|---|---|
| **Per-component** | a shared **Spot** margin + a **Near pts** margin + a **Far pts** margin | `margin-input-spot-{bid,ask}`, `margin-input-near-{bid,ask}`, `margin-input-far-{bid,ask}` (each with `margin-minus-…` / `margin-plus-…`) |
| **All-in** | one net **All-in** margin | `margin-input-net-{bid,ask}` |

- The marked-up **client net** + **P/L** in each tile derive from `effectiveSwapMargin` under the active mode — a zero-markup quote shows exactly the raw differential.
- `SwapPanel` owns its markup state and reports upward (`onPricingChange`) a **`SwapPricingReport`**: `{ mode, net, components?, quoteSide }` — `components` (`{ spot, near, far }`) is present only in Per-component mode. Captured into `QuoteContext` at `QuoteSent`. See [data-models/deal-lifecycle-phase.md](../data-models/deal-lifecycle-phase.md).
- **AI suggestion** targets the All-in layer: Apply switches the toggle to **All-in**, writes the suggested pips to both sides of the net margin, and flows the AI-applied flag + rationale up for capture; Undo restores losslessly.

### One-sided lock + read-only

- **One-sided lock** applies across **both modes** via `restrictMarginSides` + `quoteSide`: the non-quotable tile is dimmed (`data-quotable="false"`), its client-net renders `—`, and **every** stepper inside it is `disabled` (spot, near, far, and all-in) — backed by `gateMarginToSide` zeroing that side in the math. Same primitives as the v3 outright lock (FXSW-068).
- **Read-only** variant (`readOnly`) for **auto-priced (ESP) swaps**: mode toggle hidden, all margins locked, no PickUp fired.

### Per-component overflow fix (FXSW, 2026-06-17)

In Per-component mode the bid/ask margin rows inside each tile are **stacked vertically** (`flex flex-col`) rather than laid out side-by-side, so the fixed-width stepper+input elements no longer overflow the right boundary of the FAR leg when both tiles sit `sm:flex-row`.

## Blotter + historic detail

- The v4 **Instrument** cell shows `SWAP`; the value-date cell shows **both** leg dates (`near → far`) — see [active-blotter.md](active-blotter.md) / [historic-blotter.md](historic-blotter.md).
- The [historical detail](historical-detail.md) overlay lists **per-leg** tenors / points / value-dates via `SwapLegDetail` (`swap-detail`, `swap-detail-{near,far}`, raw net `swap-detail-net-{bid,ask}`, executed net `swap-detail-exec-{bid,ask}`), with a **Markup applied** row separating the street net from the **net used for execution**. For Per-component captures the markup reason renders a `SwapMarkupDetail` breakdown grid (spot / near / far / net). When the request was two-way, the **dealt side is emphasized and the off side dimmed** (FXSW-092). Full detail: [historical-detail.md](historical-detail.md).

## Tests

`tests/e2e/v4-swap.spec.ts`. Unit: swap net math + `gateMarginToSide` + `effectiveSwapMargin` (incl. the spot component) in `pips.test.ts`; the leg-resolution coercion in `swap-legs.test.ts`; `swapPointsFeed` composition; `SwapPanel.test.tsx` covers the side-first tiles, two-layer markup, mode toggle, and one-sided lock. Seed-42 golden, the GA spot + mid sequence, and the v3 forward goldens are byte-stable (no new RNG); `data-*` names are stable; all swap surfaces `isV4()`-gated. See [ADR-0014](../decisions/ADR-0014-swap-net-points-pricing.md) + [ADR-0017](../decisions/ADR-0017-swap-markup-model-and-executed-side.md).

## Sources

- `docs/02-functional-spec.md` §12.3 — swaps, §7.3 — bid/ask truth table
- `docs/03-trade-state-model.md` §10 — one deal, one lifecycle, no new machines
- `docs/05-ui-ux-spec.md` §18.4 — swap pricing UI (side-first tiles, two-layer markup)
- `docs/phase-summaries/phase-11-swaps-summary.md` — FXSW-082..FXSW-087 (original build)
- `docs/dev-log.md` — the 2026-06-17/18 swap-panel redesign rounds (FXSW-088..FXSW-091)
- `security/FXSW-087-review.md` — F-1 (leg coercion), F-4 (positive)
- Source: `SwapPanel.tsx`, `SwapSideTile.tsx`, `SwapLegDetail.tsx`, `pips.ts` (drift-checked at this ingest)
