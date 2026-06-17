---
last_updated: 2026-06-17
sources:
  - docs/00-glossary.md
  - docs/phase-summaries/FXSW-046-summary.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/phase-summaries/phase-10-ndf-summary.md
  - docs/phase-summaries/phase-11-swaps-summary.md
status: stable
---

# Glossary — FX Sales Workstation

Domain terms used across this prototype. Prefer the industry-standard term over a generic synonym; where the prototype reuses canonical state names from the established FX Sales Intervention workflow, the names are kept verbatim for fidelity.

## Sales Intervention terms

| Term | Definition |
|---|---|
| **Sales Intervention (SI)** | The workflow in which a human sales trader manually prices a quote that auto-pricing couldn't (or wouldn't) handle. |
| **RFS** | Request for Stream. A client-initiated request for a streaming price. The "outer" trade model that may invoke SI. |
| **Quote ticket** | The trading-app ticket through which a client submits a quote request. Off-screen in this prototype — we simulate its requests. |
| **Quote handler** | The backend code that coordinates pricing and risk for a quote. Off-screen here; the dummy feed plays its role. |
| **Risk system** | Backend that decides whether a quote can be auto-priced. Off-screen; in this prototype, risk verdicts are part of the injected scenario. |
| **Pricing system** | Backend that computes an auto-price using market rate, client default margin, volume bands, forward points. Simulated by the dummy feed. |
| **Active Deals Blotter** | The live view of all deals in progress, including auto-priced, awaiting pricing, under SI review, being priced by SI, and just-completed (kept 5s after completion). |
| **Historic Deals Blotter** | The view of deals in terminal states: completed, cancelled, rejected, expired. |
| **Ticket (SI ticket)** | The pricing panel a sales trader opens for a single deal. Six product variants exist in the canonical workflow; **only Spot in this prototype**. |
| **Reasons Panel** | Section of an SI ticket showing the risk-analysis result and warnings — why the deal needs intervention. |
| **Summary Panel** | High-level details of the trade with a natural-language summary line. |
| **Pricing Panel** | The interactive area where the trader adjusts margin and trader rate. |
| **Client Summary** | Preview of what the client will see — the final rates and estimated profit. |
| **Deal Summary** | The trade specifics: amount, direction, account, settlement date(s). |
| **Footer (ticket footer)** | The action bar at the bottom of the ticket: Reject / Release / Send Stream / Send Quote / Withdraw / Return to Stream. |
| **Send Stream** | Default action: provision the client with a continuously updating price. |
| **Send Quote** | Send a single, fixed price (no further updates) — used after the trader clicks the trader rate to stop streaming. |
| **Withdraw** | Pull a live quote back from the client; returns the ticket to pricing mode. |
| **Release** | Make the ticket available for another sales trader to pick up. |
| **Reject** | Decline to price the quote request; terminates the ticket. |
| **Return to Stream** | After switching to fixed mode, resume streaming the trader rate. |
| **Refresh (trader rate)** | While in fixed mode, snap the trader rate field back to the prevailing market rate. |
| **ESP** | Electronic Streaming Price. Auto-priced flow that doesn't need SI but still appears in the Active Blotter (and is removed 5s after completion). |
| **5-second removal rule** | Completed (and ESP-completed) deals stay visible in the Active Blotter for 5 seconds, then vanish. |

## FX market terms

| Term | Definition |
|---|---|
| **Pair / Currency pair** | The two currencies being exchanged, e.g. EURUSD. Left side = base, right side = quote. |
| **Spot** | A trade settling on the standard market spot date (T+2 for most pairs). |
| **Forward / Outright forward** | A trade settling on a single date later than spot, at a rate agreed today. |
| **NDF** | Non-Deliverable Forward. A forward that cash-settles in a major currency on a fixing date; used for restricted EM currencies. |
| **Flexible forward / Time-option forward** | A forward where the client can settle on any date within an agreed window. |
| **Swap** | Two simultaneous legs: a near leg (often spot) and a far leg (forward), opposite directions, same notional. Spot-forward swap vs forward-forward swap. The v4 instrument is the **forward-forward** swap — see [features/swaps.md](features/swaps.md). |
| **Forward-forward swap** | An FX swap whose **both** legs are forwards (near + far, far strictly later). The v4 swap instrument; priced on the net forward-points differential. |
| **Net swap points** | The forward-points differential `net = far − near` (per side) that a [swap](features/swaps.md) is quoted on. Client net + P/L derive from it; a zero-markup quote shows exactly the raw differential. |
| **Block trade** | A bundled set of related deals netted by tenor; can be priced together. |
| **Pip** | Smallest standard price increment. For most pairs the 4th decimal (0.0001); for JPY pairs the 2nd decimal (0.01). |
| **Bid / Ask / Mid** | Bid = the price you can sell at; Ask = the price you can buy at; Mid = arithmetic midpoint. The Ask–Bid difference is the spread. |
| **Trader rate** | The bank's internal mid (or two-way) rate before client margin is applied. |
| **Margin** | The amount, usually in pips, added to (or subtracted from) the trader rate to produce the client price. The bank's revenue per trade. |
| **All-In Rate** | Spot rate + forward points; the rate at which a forward actually settles. |
| **Forward points** | The difference between the spot rate and the forward rate, expressed in pips. |
| **Tenor** | The time from trade date to settlement date (e.g. 1W, 1M, 3M). |
| **Settlement date / Value date** | The date on which the trade actually delivers. |
| **Fixing date** | For NDFs: the date on which the cash-settlement reference rate is observed. |
| **Notional / Amount** | The face value of the trade, in the base currency by convention. |
| **Direction** | The client's action: BUY base / SELL base (equivalently SELL quote / BUY base). |
| **Account** | The client legal entity under which the trade books — relevant to credit limits. |

## RFS Trade Model — state names

States from the RFS trade model used in this prototype. These names are industry-standard and not vendor-proprietary.

| State | Meaning |
|---|---|
| `Queued` | Submission received; for SI-eligible deals, surfaced to the Active Deals Blotter with `Dealable=true`. |
| `PickedUp` | A sales trader has picked the trade up for intervention. |
| `Executable` | A price is live with the client. |
| `Executed` | Client executed; awaiting confirmation. |
| `TradeConfirmed` | Trade booked (terminal). |
| `Expired` | Quote/trade timed out (terminal). |
| `ClientClosed` | Client closed the trade (terminal). |

RFS events used here: `PickUp`, `Hold`, `PriceUpdate`, `Withdraw`, `Execute`, `ExecuteAck`, `TradeConfirmation`, `ClientClose`, `Expire`, `Reject`.

## Sales Intervention Trade Model — state names

| State | Meaning |
|---|---|
| `Initial` | SI machine instantiated; awaiting pickup. |
| `PickUpSent` | Trader clicked Pick Up; ack in flight. |
| `PickedUp` | Ack received; ticket active with prevailing prices streaming. |
| `QuoteSent` | Send Stream or Send Quote clicked; ack in flight. |
| `Quoted` | Quote live with the client. |
| `WithdrawSent` | Withdraw clicked; ack in flight. |
| `HoldSent` | Hold (Release) clicked; ack in flight. |
| `RejectSent` | Reject clicked; ack in flight. |
| `TraderRejected` | Reject acknowledged (terminal). |
| `ClientRejected` | Client declined or timed out (terminal). |
| `TradeConfirmed` | Trade booked (terminal). |

SI events: `PickUp`, `PickUpAck`, `Hold`, `HoldAck`, `Reject`, `RejectAck`, `Quote`, `QuoteAck`, `Withdraw`, `WithdrawAck`, `ClientReject`, `PriceUpdate`, `TradeConfirmed`.

## Blotter fields

| Field | Meaning |
|---|---|
| `TradeRequestId` | Unique identifier for a quote requiring SI. |
| `Dealable` | `true` if no trader has picked up; flips to `false` on pickup, back to `true` on Hold/Release. |

Reference implementations publish these in a container at `/PRIVATE/FX/SALES/BLOTTER/ACTIVEDEALS`. This prototype keeps the field names on the `Deal` type for fidelity.

## Prototype-only terms

| Term | Definition |
|---|---|
| **Dummy feed** | The in-memory pricing + deal simulator. See [components/pricing-feed.md](components/pricing-feed.md) and [components/deal-feed.md](components/deal-feed.md). |
| **Scenario** | A pre-canned sequence of events used for demos and E2E tests. See the [Scenarios section of the index](index.md#scenarios). |
| **Dev Injector** | The hidden control panel at `?dev=1` that lets the operator inject scenarios on demand. See [features/dev-injector.md](features/dev-injector.md). |
| **Rejection reason** | The flag indicating why auto-pricing failed. In v1: `OFF_HOURS`, `SIZE_LIMIT`, `CREDIT_LIMIT`. |
| **Preview flag** | A query-param URL gate that opts into an unfinished/optional capability. The pattern is a pure parser + a `window`-guarded getter (`devVersion.ts`). `?dev=v2` (v2 UX) and `?theme=preview` (light theme) were the original two; both were **promoted to GA and their gates removed in FXSW-047**. The current preview flag is `?dev=v3`. |
| **Light theme** | Light colour palette. Shipped behind `?theme=preview` in Phase 7, then **promoted to GA in FXSW-047** (gate removed). See [features/theme-switching.md](features/theme-switching.md). |
| **`?dev=v3`** | URL preview flag enabling the v3 feature set (external feed, forwards, historical detail). Parsed by `isV3()`; the bare-URL GA app is unchanged. See [features/forward-pricing.md](features/forward-pricing.md). |
| **External market-data feed** | Opt-in runtime adapter (v3) that polls a generic external market-data provider every 5 minutes to re-anchor the simulator. OFF by default; no vendor named. See [components/external-price-feed.md](components/external-price-feed.md). |
| **Auto-priced** | An ESP deal streamed within tolerance with no manual markup. In v3 it opens a read-only ticket and shows the `AUTO_PRICE` timeline phase instead of `PRICE_BACK`. |
| **Lifecycle phase / timeline** | Display-only waypoints (REQUEST/PICKUP/RELEASE/PRICE_BACK/AUTO_PRICE/WITHDRAWN/RESPONSE) observed from the SI/RFS machines for the v3 historical detail. See [data-models/deal-lifecycle-phase.md](data-models/deal-lifecycle-phase.md). |
| **Request ID / Trade ID** | Synthetic display identifiers minted in v3 (`REQ-XXXXXX` at deal creation; `TRD-XXXXXX` at archive for executed deals). |
| **`?dev=v4`** | URL preview flag for the v4 instruments (NDF, swap); a strict superset of `?dev=v3` (`isV3()` is true under v4). See [ADR-0012](decisions/ADR-0012-dev-v4-instrument-gate.md). |
| **Instrument discriminator** | `Deal.instrumentType` (`SPOT \| OUTRIGHT \| NDF \| SWAP`); optional, with `instrumentOf(deal)` deriving a default from the tenor for legacy deals. The v4 discriminator routing pricing + display. See [data-models/deal.md](data-models/deal.md). |
| **NDF** *(prototype)* | Non-Deliverable Forward — the v4 cash-settled, **points-only** instrument (no spot markup). See [features/ndf.md](features/ndf.md). |
| **CSP (Content-Security-Policy)** | The browser security header the build injects to restrict where the page may load/connect (`script-src 'self'`, `connect-src 'self'`, …). Build-only; the dev server is exempt. See [ADR-0015](decisions/ADR-0015-security-remediation.md). |
| **SRI (Subresource Integrity)** | SHA-384 `integrity` hashes added to the build's emitted `<script>`/`<link>` tags so a tampered asset is rejected by the browser. See [ADR-0015](decisions/ADR-0015-security-remediation.md). |

## Source

Drafted from `docs/00-glossary.md`. The state-name conventions and workflow shape are documented in that file's "Research grounding" section, which lives in the build-agent layer (`/docs/`) and is not shipped in `dist/`.
