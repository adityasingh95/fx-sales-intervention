---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/phase-summaries/phase-09-v4-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-054..FXSW-059, FXSW-073..FXSW-075
---

# Feature — Forward Pricing

v3 (`?dev=v3`) extends the [ticket](ticket.md) beyond Spot to **outright forwards** across standard tenors. A forward deal prices as **spot + forward points**, and the trader can mark up either the all-in rate as a whole or the spot and forward-points components independently.

> **Updated since v3 first shipped:** (1) forward points are now **two-sided** (`{ bid, ask, mid }`) rather than a single scalar — Phase 9 (FXSW-073..075), which re-baselined the v3 outright-forward goldens (the one intended visible change). (2) The leg model is now a **real two-leg [swap](swaps.md)** instrument (Phase 11), not just "swap-ready". This page covers the single-leg **outright** forward (and the shared forward-points surface that NDF and swaps reuse); see [ndf.md](ndf.md) and [swaps.md](swaps.md) for the instruments.

## Tenors + value dates

`Tenor` (`src/types/deal.ts`): `SPOT | 1W | 2W | 1M | 2M | 3M | 6M | 9M | 1Y`. `isForwardTenor(tenor)` is `tenor !== 'SPOT'`.

- Forward **points are simulated per `(pair, tenor)`** from a **separate seeded RNG instance** (FXSW-055) — kept distinct from the spot price feed's RNG so forward points move independently and determinism is preserved per stream.
- **Two-sided points (FXSW-073):** `forwardPointsFeed.get(pair, tenor)` returns a `ForwardPointsPair` `{ bid, ask, mid }`. The **`mid` is the original scalar** (so the seed sequence is byte-stable), and the **spread is derived RNG-free from the tenor** — it widens with maturity, symmetric around mid (`bid = round1(mid − halfSpread)`, `ask = round1(mid + halfSpread)`). The bid all-in uses the bid points, the ask uses the ask points; side-specific selection is centralised in `lib/pips.ts` (`outrightPair`, `clientForwardPair`) per the "no pip math in components" rule. SPOT returns all-zeros.
- **Value date** is tenor-aware: `valueDateForTenor(trade, tenor)` in `src/lib/time.ts` rolls the spot value date forward by the tenor (week tenors by exact days, month/year tenors by calendar months), skipping weekends. Surfaced in the ticket, the [blotters](active-blotter.md), and the [historical detail](historical-detail.md).

## Outright = spot + forward points

The all-in outright rate is the spot rate plus the forward points (in pips). The **mid** is the un-marked reference; client **bid/ask** apply the trader's markup.

### Markup modes (FXSW-057, FXSW-064)

A toggle (`markup-mode-toggle`, buttons `markup-mode-all-in` / `markup-mode-component`) switches how margin is applied:

- **All-in** — a single spot-margin bid/ask pair marks up the whole outright. The forward-points margin row is hidden.
- **Per-component** — **two independent margin pairs**: the spot margin (`MarginPair`) and the **forward-points margin** (`fwdMarginPair`), each with its own bid/ask. Lets the trader price spot risk and forward/interest-rate risk separately.

In **both** modes the displayed **all-in bid/ask reflect the full client markup** — spot rate + forward points + *both* margin components per side — computed by `clientBidFromForward` / `clientAskFromForward` in `src/lib/pips.ts` (FXSW-064). Before that fix the all-in figures ignored the forward-points component; now Balance/Zero and either margin row move the all-in numbers correctly.

## ForwardPointsPanel

`src/features/ticket/pricing/ForwardPointsPanel.tsx`. Rendered for non-SPOT deals.

- **Forward-points figures** are **two-sided** (FXSW-075): `data-testid="fwd-points-bid"`, `fwd-points-mid`, `fwd-points-ask`, each carrying the **`pips` suffix** (FXSW-071) — e.g. `−120.1 pips`. The testid wraps the value only; the `pips` label is an adjacent span (same scoping pattern as the suggestion-pips span in [ai-margin-suggestion.md](ai-margin-suggestion.md)).
- **All-in cells**: `all-in-bid`, `all-in-mid`, `all-in-ask`.
- **Forward-points margin row** (per-component mode) reuses the shared `MarginRow` with `idPrefix="fwd-"` → testids `margin-{minus,input,plus}-fwd-{bid,ask}`, and its own **Balance / Zero** (`margin-balance-fwd`, `margin-zero-fwd`) with a **floor of 0** (`minMargin={0}`) — forward points can legitimately be marked to zero, unlike spot margin which floors at 1.
- **Markup-mode toggle** was hoisted to module scope in FXSW-063 (`ToggleButton` was re-declared inside the panel and unmounted/remounted on every ~300ms tick, causing flicker).

### One-sided markup lock (FXSW-068)

When the request is one-sided (`quoteSide !== 'BOTH'`) and `restrictMarginSides` is set (v3), the non-quotable side's margin stepper is **disabled** and **Balance/Zero are hidden** — in both the spot block ([PricingPanel](ticket.md)) and this forward block. Driven by `quoteSide` + `restrictMarginSides`; the price cells were already side-gated. See [ticket.md](ticket.md#one-sided-markup-lock-v3).

## Leg model — now a real two-leg swap (v4)

The `DealLeg` (`NEAR` / `FAR`) structure introduced here as "swap-ready" became a **real two-leg instrument** in Phase 11. A v4 [swap](swaps.md) populates `Deal.legs` with NEAR + FAR and prices on the **net** forward-points differential via its own `SwapPanel` (the single-leg `LegTabs` affordance is not used for swaps — the SwapPanel shows both legs at once). v3 outrights remain single-leg. See [swaps.md](swaps.md) and [data-models/deal.md](../data-models/deal.md).

## AI per-component suggestion (FXSW-058)

The [AI Margin Suggestion](ai-margin-suggestion.md) extends to forwards: it can suggest the spot and forward-points margin components independently. Still deterministic per [ADR-0006](../decisions/ADR-0006-deterministic-suggestion-engine.md).

## Dev Injector tenor selector (FXSW-059)

The [dev injector](dev-injector.md) gains a **tenor selector** (`tenor-select`) so **any** scenario can be injected as a forward at a chosen tenor — no duplicated forward scenarios (a user-directed decision). SPOT keeps the existing spot behaviour.

## PricingPanel refactor (FXSW-056)

To stay under the 300-line file limit and host the forward UI, `PricingPanel` was split into `src/features/ticket/pricing/` sub-components (`Cell`, `MarginControls` with `MarginRow` + `BalanceZeroRow`, `ForwardPointsPanel`, `LegTabs`). **Every existing `data-testid` was preserved** — a pure refactor with no behavioural change to spot pricing.

## Tests

Component tests for `ForwardPointsPanel`, `LegTabs`, `MarginControls`, plus `src/lib/pips.test.ts` (forward client-rate math) and `src/lib/time.test.ts` (`valueDateForTenor` across tenors). The seed-42 golden sequence and the six scenario E2Es never set `?dev=v3`, so they exercise the unchanged spot/GA path.

## Sources

- `docs/02-functional-spec.md` §10 (forwards), §11 (all-in markup, fwd Balance/Zero, points unit)
- `docs/05-ui-ux-spec.md` §17 (ForwardPointsPanel, LegTabs), §17.1 (one-sided lock, points unit)
- `docs/phase-summaries/phase-08-v3-summary.md` — FXSW-054..FXSW-059
- `docs/dev-log.md` FXSW-054..FXSW-059, FXSW-063, FXSW-064, FXSW-068, FXSW-071
- Commits `1631e0a` (Phase 8), `f800115` (FXSW-062..067), `eca0754` (FXSW-068..071)
