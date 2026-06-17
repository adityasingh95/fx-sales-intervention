---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-082..FXSW-087
---

# Feature — FX Swaps (forward-forward)

The second v4 instrument (`?dev=v4`). An **FX swap** is **two legs** — `NEAR` + `FAR`, with the far leg strictly later — priced together on the **net forward-points differential** (`net = far − near` per side). The trader marks up either each leg independently (**Per-component**) or the net as a whole (**Total**). Gated behind `isV4()`; GA and `?dev=v3` are byte-unchanged.

Per `docs/03-trade-state-model.md` §10 a swap is **one deal with one lifecycle**: the FAR leg is a pricing/display concern, so **no new XState states, events, or machines** are introduced — the RFS + SI children and the `*Sent` contract are untouched. See [components/deal-machine.md](../components/deal-machine.md).

## Two-leg data model

`instrumentType: 'SWAP'` populates `Deal.legs` (`[{kind:'NEAR',tenor}, {kind:'FAR',tenor}]`); `Deal.tenor` mirrors the NEAR leg so single-leg consumers stay coherent. Each leg may be SPOT or any forward tenor, **far strictly later than near**.

`buildSwapLegs(near, far?)` / `resolveSwapLegs(near, far?)` (in `src/types/deal.ts`) validate ordering and **coerce** a missing or out-of-order (`far ≤ near`) far to the shortest valid far (`nearRank + 1`); if the near is the last tenor (`1Y`) it steps back one so a far can exist. `resolveSwapLegs` reports `{ legs, adjusted, requested }`; when `adjusted`, `buildDeal` records the original request on `Deal.swapRequested` so the coercion is auditable. See [data-models/deal.md](../data-models/deal.md).

### "Legs adjusted" note (FXSW-091 F-1)

When `Deal.swapRequested` is present, `SwapAdjustNote` (`data-testid="swap-adjust-note"`) renders a visible note showing the requested vs. applied legs — so the operator sees the desk is pricing a different tenor pair than was typed. This addresses the security review's "silently coerces" finding (FXSW-087 F-1): valid requests are untouched (goldens stable); invalid ones are surfaced, not hidden.

## Net-points pricing

`swapPointsFeed.get(pair, near, far)` returns each leg's two-sided points plus `net = far − near` per side — a **pure composition** of the [forward-points feed](forward-pricing.md) with no new RNG draws (seed-42 + the mid sequence stay intact). See [components/swap-points-feed.md](../components/swap-points-feed.md).

Markup math lives in `src/lib/pips.ts` (no pip math in components):

- **`SwapMarkupMode = 'PER_COMPONENT' | 'TOTAL'`**.
- **Per-component** — an independent `MarginPair` on each leg; the two **sum** into the net (`sumMargins(near, far)`), mirroring the v3 spot+fwd sum.
- **Total** — one `MarginPair` applied to the net directly.
- `effectiveSwapMargin(mode, {total, near, far}, quoteSide)` resolves the mode, then applies `gateMarginToSide` so the non-quotable side's margin is **zeroed in the math** (not just hidden) — the one-sided lock is enforced in `pips.ts`, closing the single-point-enforcement gap flagged in earlier phases (FXSW-087 F-4, positive finding).
- `clientSwapNetPoints(net, margin)` widens the dealer side (`bid − margin.bid`, `ask + margin.ask`), rounded to tenths.

## Pricing UI — `SwapPanel`

`src/features/ticket/pricing/SwapPanel.tsx`, `data-instrument="SWAP"`. Two `SwapLegBlock`s (NEAR/FAR) above a prominent net row.

| Element | testid |
|---|---|
| Markup-mode toggle | `swap-markup-mode` · buttons `swap-markup-mode-per-component` / `swap-markup-mode-total` |
| Raw net differential | `swap-net-bid` / `swap-net-ask` (far − near, un-marked) |
| Client net (marked-up) | `client-net-bid` / `client-net-ask` (`—` on a locked side, F-2) |
| Est. P/L | `swap-pnl-bid` / `swap-pnl-ask` |
| Per-leg block | `leg-near` / `leg-far` (`data-tenor`), points `leg-{near,far}-points-{bid,ask}`, value date `leg-{near,far}-value-date` |
| Per-component leg margins | `MarginRow` `idPrefix` `near-` / `far-` → `margin-{minus,input,plus}-{near,far}-{bid,ask}`, Balance/Zero `margin-{balance,zero}-{near,far}` |
| Net margin (Total mode) | `idPrefix` `net-` → `margin-{minus,input,plus}-net-{bid,ask}`, `margin-{balance,zero}-net` |

- **Per-component** mode shows each leg's margin row; **Total** hides them and shows the net margin row instead.
- The **net row shows the raw differential** (far − near), with client net + P/L derived from it — so a zero-markup quote shows exactly the differential.
- `SwapPanel` owns its markup state and reports only the **effective net margin** upward (`onPricingChange({ mode, net })`) for capture — keeping `TicketPanel` from growing.
- **One-sided lock** applies across **both legs and the net row** via `restrictMarginSides` + `quoteSide` (same primitives as v3 forwards). The off-side client-net renders `—` (F-2 residual: the *raw* net behind it is dimmed, not fully suppressed).
- **Read-only** variant (`readOnly`) for **auto-priced (ESP) swaps**: mode toggle hidden, all margins locked, no PickUp fired.

## Blotter + historic detail

- The v4 **Instrument** cell shows `SWAP`; the value-date cell shows **both** leg dates (`near → far`) — see [active-blotter.md](active-blotter.md) / [historic-blotter.md](historic-blotter.md).
- The [historical detail](historical-detail.md) overlay lists **per-leg** tenors / points / value-dates via `SwapLegDetail` (`swap-detail`, `swap-detail-{near,far}`, raw net `swap-detail-net-{bid,ask}`, executed net `swap-detail-exec-{bid,ask}`), plus the **net used for execution** captured at `QuoteSent` through a new `AppliedMargin` swap variant. The captured net reconciles with what the detail recomputes (FXSW-087 F-4).

## Tests

`tests/e2e/v4-swap.spec.ts` (two specs). Unit: swap net math + `gateMarginToSide` + `effectiveSwapMargin` in `pips.test.ts`; the leg-resolution coercion in `deal.test.ts`; `swapPointsFeed` composition. Seed-42 golden, the GA spot + mid sequence, and the v3 forward goldens are byte-stable (no new RNG); `data-*` names unchanged; all swap surfaces `isV4()`-gated. See [ADR-0014](../decisions/ADR-0014-swap-net-points-pricing.md).

## Sources

- `docs/02-functional-spec.md` §12.3 — swaps
- `docs/03-trade-state-model.md` §10 — one deal, one lifecycle, no new machines
- `docs/05-ui-ux-spec.md` §17/§18 — SwapPanel, leg blocks, net row
- `docs/phase-summaries/phase-11-swaps-summary.md` — FXSW-082..FXSW-087
- `docs/dev-log.md` FXSW-082..FXSW-088
- `security/FXSW-087-review.md` — F-1 (leg coercion), F-2 (off-side display), F-4 (positive)
- Commit `a8b475c` (Phase 11 on `main`)
