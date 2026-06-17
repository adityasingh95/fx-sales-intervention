---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-10-ndf-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-078..FXSW-081
---

# Feature — NDF (Non-Deliverable Forward)

The first v4 instrument (`?dev=v4`). An **NDF** is a single-leg, **cash-settled** forward priced **points-only**: the trader marks up the **forward points**, never the spot. There is no all-in / per-component toggle and no spot-margin control. Selected via the [dev injector](dev-injector.md) instrument selector; gated entirely behind `isV4()`, so GA and `?dev=v3` are byte-unchanged.

NDF builds directly on the v3 [forward pricing](forward-pricing.md) surface — same two-sided forward points, same all-in / P&L readout, same one-sided lock — and removes the spot-markup degree of freedom.

## The instrument discriminator

`Deal.instrumentType` (`SPOT | OUTRIGHT | NDF | SWAP`, in `src/types/deal.ts`) is the discriminator; it is **optional**, with `instrumentOf(deal)` deriving a default from the tenor for legacy deals (`SPOT` tenor → `SPOT`, any forward tenor → `OUTRIGHT`). NDF and SWAP are never auto-derived — they are set explicitly by `buildDeal` on injection. See [data-models/deal.md](../data-models/deal.md) and [ADR-0012](../decisions/ADR-0012-dev-v4-instrument-gate.md).

## Forward-tenor coercion

An NDF must carry a **forward** tenor (a cash-settled spot makes no sense). `buildDeal` coerces a SPOT request to the **shortest forward tenor** (`FORWARD_TENORS[0]`, i.e. `1W`) rather than rejecting it — a single source of coercion in the scenario player. See [components/scenario-player.md](../components/scenario-player.md).

## Points-only pricing — structural inertness (FXSW-089)

NDF's "no spot markup" is enforced **structurally**, not by hiding a control. `spotMarginFor(instrument, marginPair)` in `src/lib/pips.ts` returns `{ bid: 0, ask: 0 }` for an NDF and the entered pair for everything else. Every consumer of the priced deal's spot margin calls it, so the zero is the single source of truth:

- the **manual** ticket computes `effectiveSpotMargin = spotMarginFor(instrument, marginPair)`,
- the **auto-priced (ESP) view** uses the same effective margin,
- the **quote-context capture** records the effective (zeroed) margin.

This closed a Phase-10 regression where the auto-priced NDF view still applied a 3-pip spot markup and the capture recorded a phantom markup (FXSW-081 F-1/F-3, fixed in-phase during FXSW-080). The markup-mode toggle is likewise forced off for NDF (`effectiveMarkupMode = 'component'`, `showMarkupToggle={!isNdf}`). See [ADR-0013](../decisions/ADR-0013-ndf-points-only-pricing.md).

## In the ticket

`TicketPanel` branches on `instrumentOf(deal)`. For an NDF it renders the [forward points panel](forward-pricing.md) (two-sided points, all-in outright, points margin + Balance/Zero) **minus** the spot-margin control and the markup-mode toggle, plus an explanatory note:

- `data-testid="ndf-note"` — "Non-Deliverable Forward — cash-settled. Markup is taken on the forward points only; there is no spot-level markup." Rendered in **both** the manual and auto-priced branches.
- The Trader Rate (spot) cells stay visible — the spot still feeds the outright; only the spot **markup** is removed.
- One-sided lock and the All-in / Est. P&L readout carry over from v3 forwards unchanged.

`data-instrument="NDF"` on the ticket panel. AI Margin Suggestion applies to the **points margin only** for NDF (a user-directed spec decision).

## Surfaces

- v4-only [dev injector](dev-injector.md) instrument selector (`inject-instrument`: `Auto` / `NDF` / `Swap`).
- v4-only **Instrument** column in both [Active](active-blotter.md) and [Historic](historic-blotter.md) blotters (cell shows `NDF`).
- **Instrument** field + the markup-reason summary in the [historical detail](historical-detail.md) overlay.

## No new state machine

An NDF is one deal with the existing RFS + SI lifecycle. **No new XState states, events, or machines** were added — instrument is a pricing/display concern over the existing transitions (`docs/03-trade-state-model.md`). See [components/deal-machine.md](../components/deal-machine.md).

## Tests

`tests/e2e/v4-ndf.spec.ts` covers the manual **and** the auto-priced NDF paths (the auto path was added as the FXSW-080 regression guard). Unit coverage: `spotMarginFor` (NDF zeroing) in `pips.test.ts`, the SPOT→forward coercion in the player tests. The seed-42 golden and the GA spot + mid sequence are unchanged; all NDF behaviour is `?dev=v4`-gated.

## Sources

- `docs/02-functional-spec.md` §12 (instrument discriminator, NDF points-only)
- `docs/05-ui-ux-spec.md` §17/§18 — NDF surfaces
- `docs/phase-summaries/phase-10-ndf-summary.md` — FXSW-078..FXSW-081
- `docs/dev-log.md` FXSW-078..FXSW-081, FXSW-089
- `security/FXSW-081-review.md` — F-1/F-3 (spot-markup inertness), fixed in-phase
- Commit on `main` landing Phase 10
