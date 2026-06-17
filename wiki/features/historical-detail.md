---
last_updated: 2026-06-16
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-060, FXSW-086
---

# Feature — Historical Trade Detail

v3 (`?dev=v3`) makes [Historic blotter](historic-blotter.md) rows **clickable**, opening a **read-only detail overlay** for a concluded deal: its terms, **why the price was what it was** (the markup reason), and a **timestamped lifecycle timeline**. There are no actions — the deal is terminal.

## Opening

Under v3 each Historic row is a button; clicking sets `uiStore.openHistoricId` to that deal id. `HistoricDetailPanel` (`src/features/ticket/HistoricDetailPanel.tsx`) reads that id plus the archived entry snapshot from the [deals store](../components/deals-store.md) and renders. Close via the header ✕ (clears `openHistoricId`). This is distinct from the live [SI ticket](ticket.md) — a separate, action-less overlay.

## Contents (top to bottom)

| Section | Source | testid |
|---|---|---|
| Header + close | — | — |
| Outcome pill + archived time | derived outcome | `detail-outcome` (`data-outcome`) |
| Request ID / Trade ID | minted ids (FXSW-066) | `detail-request-id` / `detail-trade-id` (Trade ID only if it executed) |
| Reasons | rejection reasons, if any | reuses `ReasonsPanel` |
| Deal summary | trade terms | reuses `SummaryPanel` |
| **Markup reason** | captured at quote time | `markup-reason` |
| **Timeline** | lifecycle event log | `timeline-panel` |

## Markup reason

Explains the price after the fact, from the `QuoteContext` merged into the deal's `PRICE_BACK` event (see [deal-lifecycle-phase.md](../data-models/deal-lifecycle-phase.md)):

- the **applied margin** (`AppliedMargin` — a single spot bid/ask pair, independent `spot` + `fwd` pairs for a forward, **or a swap net-margin variant**),
- whether the margin was **AI-suggested** (`aiSuggested`) and the suggestion **rationale**, if any.

For **auto-priced ESP** deals there is no manual markup, so the block instead shows an **auto-priced note** (`auto-priced-note`) — "streamed within tolerance, no manual markup applied" — paired with the `AUTO_PRICE` timeline phase (FXSW-070).

For an **NDF** the summary reflects the points-only markup (the spot margin is structurally zero — see [ndf.md](ndf.md)). For a **swap** it reflects the markup mode (Per-component / Total) and the **net used for execution**.

### Swap leg detail (`SwapLegDetail`, FXSW-086)

For a swap, the overlay renders `SwapLegDetail` (`data-testid="swap-detail"`): per-leg rows (`swap-detail-near` / `swap-detail-far`) with each leg's tenor / two-sided points / value-date, the **raw net** differential (`swap-detail-net-bid` / `swap-detail-net-ask`, far − near), and the **net used for execution** (`swap-detail-exec-bid` / `swap-detail-exec-ask`) — the marked-up net captured at `QuoteSent` via the `AppliedMargin` swap variant. The captured net **reconciles** with what the detail recomputes (FXSW-087 F-4). See [swaps.md](swaps.md).

## Timeline (`TimelinePanel`)

`src/features/ticket/TimelinePanel.tsx`, `data-testid="timeline-panel"`. A vertical, timestamped list (Clock icon) of the deal's [lifecycle phases](../data-models/deal-lifecycle-phase.md), each row tagged `data-phase="{PHASE}"`. The log is **captured live** as the deal transitions — it cannot be reconstructed after archival — so it must be recorded during the deal's life (FXSW-049). A trader-driven take-back shows a `WITHDRAWN` row (FXSW-065); an auto-priced deal shows `AUTO_PRICE` rather than `PRICE_BACK` (FXSW-070).

## Test contract

```html
<aside data-testid="historic-detail-panel">
  <div data-testid="detail-outcome" data-outcome="TradeConfirmed">…</div>
  <div data-testid="detail-request-id">REQ-…</div>
  <div data-testid="detail-trade-id">TRD-…</div>      <!-- executed deals only -->
  <div data-testid="markup-reason">…                    <!-- or: -->
    <p data-testid="auto-priced-note">…</p>
  </div>
  <ol data-testid="timeline-panel">
    <li data-phase="REQUEST">…</li>
    <li data-phase="PICKUP">…</li>
    …
    <li data-phase="RESPONSE">…</li>
  </ol>
</aside>
```

## Tests

`HistoricDetailPanel.test.tsx` (overlay renders terms + markup reason / auto-priced note + outcome + ids) and `TimelinePanel.test.tsx` (phase rows + labels). The lifecycle-capture wiring is tested via the [deals store](../components/deals-store.md) and `lifecyclePhase` mapping ([deal-lifecycle-phase.md](../data-models/deal-lifecycle-phase.md)).

## Sources

- `docs/02-functional-spec.md` §10 (historical detail), §11 (markup reason, auto-priced note)
- `docs/03-trade-state-model.md` §9 — lifecycle event log
- `docs/05-ui-ux-spec.md` §17 (HistoricDetailPanel, TimelinePanel), §17.1
- `docs/phase-summaries/phase-08-v3-summary.md` — FXSW-060
- `docs/dev-log.md` FXSW-060, FXSW-065, FXSW-066, FXSW-070
- Commits `1631e0a`, `f800115`, `eca0754`
