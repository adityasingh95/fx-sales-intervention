---
last_updated: 2026-06-18
sources:
  - docs/02-functional-spec.md
  - docs/03-trade-state-model.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-060, FXSW-086, FXSW-092
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
| Request ID / Trade ID / Instrument | minted ids (FXSW-066); v4 instrument | `detail-request-id` / `detail-trade-id` (executed only) / `deal-instrument` (v4) |
| **Executed side** | dealt side (executed deals) | `execution-side` (`data-executed-side`) |
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

#### Per-component markup breakdown (`SwapMarkupDetail`, FXSW-092)

When a swap was priced in **Per-component** mode, the markup reason renders `SwapMarkupDetail` — a small grid of the captured component margins (**Spot / Near pts / Far pts / Net**, bid + ask columns) read from the `AppliedMargin` swap variant's `components`. The grid is **filtered by `quoteSide`**: a one-sided quote shows only its column. **Total** mode keeps the concise one-line summary (`Net {bid}/{ask} pips · Total`). When the deal executed on one side, the dealt column is emphasized (`◂` marker) and the off column dimmed.

### Executed side banner (`execution-side`, FXSW-092)

A **two-way** request (`side: 'BOTH'`) is quoted on both sides but the client deals on exactly **one**; that dealt side was previously lost, so the detail showed both sides as if both executed. For an **executed** deal with a captured `executedSide`, a banner (`data-testid="execution-side"`, `data-executed-side="BID|ASK"`) now names the dealt side, **per instrument**:

- **Direction line** (`Client buys/sells {base}` via `clientDirectionForDealtSide`) — rendered **only for single-leg instruments** (spot / forward / NDF). A **swap omits it**: two legs in opposite directions have no single buy/sell direction.
- **Both perspectives, every instrument** — `Client Bid` / `Client Ask` (via `clientSideLabelForDealtSide`: bank BID → Client Ask, bank ASK → Client Bid) alongside `Bank bid` / `Bank ask`.
- When the original request was two-way, an `execution-request-note` adds "two-way request, executed one side".

The dealt side also drives a **column highlight** through the swap surfaces: `SwapLegDetail` and the `SwapMarkupDetail` grid emphasize the dealt column and dim the off (quoted-but-not-dealt) side.

### Swap leg detail (`SwapLegDetail`, FXSW-086 / FXSW-092)

For a swap, the overlay renders `SwapLegDetail` (`data-testid="swap-detail"`): per-leg rows (`swap-detail-near` / `swap-detail-far`) with each leg's tenor / two-sided points / value-date, the **street "Net swap points"** differential (`swap-detail-net-bid` / `swap-detail-net-ask`, far − near), a **"Markup applied"** row, and the **"Net used for execution"** (`swap-detail-exec-bid` / `swap-detail-exec-ask`) — the marked-up net captured at `QuoteSent` via the `AppliedMargin` swap variant. The Markup-applied row sits **between** the street net and the execution net so that at zero markup the two identical figures are explained rather than confusing (FXSW-092). The captured net **reconciles** with what the detail recomputes (FXSW-087 F-4). On an executed deal the dealt column is emphasized and the off side dimmed. See [swaps.md](swaps.md).

## Timeline (`TimelinePanel`)

`src/features/ticket/TimelinePanel.tsx`, `data-testid="timeline-panel"`. A vertical, timestamped list (Clock icon) of the deal's [lifecycle phases](../data-models/deal-lifecycle-phase.md), each row tagged `data-phase="{PHASE}"`. The log is **captured live** as the deal transitions — it cannot be reconstructed after archival — so it must be recorded during the deal's life (FXSW-049). A trader-driven take-back shows a `WITHDRAWN` row (FXSW-065); an auto-priced deal shows `AUTO_PRICE` rather than `PRICE_BACK` (FXSW-070).

## Test contract

```html
<aside data-testid="historic-detail-panel">
  <div data-testid="detail-outcome" data-outcome="TradeConfirmed">…</div>
  <div data-testid="detail-request-id">REQ-…</div>
  <div data-testid="detail-trade-id">TRD-…</div>      <!-- executed deals only -->
  <section data-testid="execution-side" data-executed-side="ASK">  <!-- executed deals -->
    …<span data-testid="execution-request-note">…</span>  <!-- two-way only -->
  </section>
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
- `docs/05-ui-ux-spec.md` §17 (HistoricDetailPanel, TimelinePanel), §17.1, §18.4 (swap detail)
- `docs/phase-summaries/phase-08-v3-summary.md` — FXSW-060
- `docs/dev-log.md` FXSW-060, FXSW-065, FXSW-066, FXSW-070; the 2026-06-18 markup-breakdown + executed-side rounds (FXSW-092)
- Source: `HistoricDetailPanel.tsx` (`SwapMarkupDetail`, execution-side banner), `SwapLegDetail.tsx`, `quoteSide.ts` (drift-checked at this ingest)
