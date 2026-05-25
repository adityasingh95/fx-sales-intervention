# 07 — Scenario Pack

The five scenarios that drive the demo and the E2E tests. Each one is:

1. A reproducible script in the `DealFeed` (see `04-dummy-feed-spec.md §5`).
2. A button in the Dev Injector.
3. A Playwright `test()` in `tests/e2e/scenarios.spec.ts`.

Format: Gherkin, with concrete data (so tests can be written directly from this doc).

---

## Scenario 1 — Happy Path ESP

**ID:** `HAPPY_PATH_ESP`
**Purpose:** Show that auto-priced deals flow through Active and into Historic without intervention.

```gherkin
Feature: ESP deal flows end-to-end without sales intervention

Scenario: An auto-priced EURUSD trade completes successfully
  Given the application is open at the dev URL
  And the Active blotter is empty
  And the Historic blotter is empty

  When the operator clicks "Inject: Happy Path ESP"

  Then within 500ms a new row appears in the Active blotter
  And the row has status "AUTO"
  And the row's CCY pair is "EURUSD"
  And the row's client is "Acme Corp"
  And the row's amount is "1,000,000 EUR"

  When 2 seconds pass

  Then the row's status changes to "DONE"

  When 5 seconds pass

  Then the row is removed from the Active blotter
  And a row with outcome "Executed" appears in the Historic blotter
```

**Test data:**
- Client: `Acme Corp`
- Account: `ACME-EUR-1`
- Pair: `EURUSD`
- Side: `BUY`
- Notional: `1_000_000`

---

## Scenario 2 — Off-Hours Intervention

**ID:** `OFF_HOURS_INTERVENTION`
**Purpose:** Demonstrate the full SI happy path — notification fires, trader opens ticket, sends stream, client accepts.

```gherkin
Feature: A sales trader manually prices a deal rejected for off-hours

Scenario: Off-hours USDJPY deal is priced manually and accepted
  Given the application is open at the dev URL
  And the Active blotter is empty

  When the operator clicks "Inject: Off-Hours Intervention"

  Then within 500ms a new row appears with status "INTERVENE"
  And the row's CCY pair is "USDJPY"
  And the row's client is "Globex Industries"
  And the row's Reasons cell contains "OFF_HOURS"
  And a toast appears in the top-right with text containing "Globex Industries"
  And the document title is prefixed with "● "

  When the operator clicks the new row

  Then the ticket panel slides in from the right
  And the Reasons Panel shows "Outside trading window"
  And the Pricing Panel shows a streaming Bid and Ask for USDJPY
  And the Margin field shows "3"

  When the operator clicks "Send Stream" and holds for 600ms

  Then the row's SI state transitions through "QuoteSent" to "Quoted"
  And the displayed status changes to "STREAMING"
  And the ticket footer shows "Withdraw" and "Reject"

  When 1.5 seconds pass

  Then the row's SI state transitions to "TradeConfirmed"
  And the displayed status changes to "DONE"

  When 5 seconds pass

  Then the row is removed from Active
  And a row with outcome "Executed" appears in Historic
```

**Test data:**
- Client: `Globex Industries`
- Account: `GLBX-JPY-2`
- Pair: `USDJPY`
- Side: `SELL`
- Notional: `5_000_000`
- Rejection reasons: `['OFF_HOURS']`

---

## Scenario 3 — Credit Breach (Reject)

**ID:** `CREDIT_BREACH`
**Purpose:** Demonstrate the trader's ability to reject a deal that should not be priced.

```gherkin
Feature: A sales trader rejects a deal that would breach client credit

Scenario: Credit-breach GBPUSD deal is rejected by trader
  Given the application is open at the dev URL

  When the operator clicks "Inject: Credit Breach"

  Then within 500ms a new row appears with status "INTERVENE"
  And the row's client is "Halcyon Capital"
  And the row's Reasons cell contains "CREDIT_LIMIT"

  When the operator clicks the new row

  Then the ticket panel opens
  And the Reasons Panel shows "Client credit limit would be breached"
  And the AI Suggestion Panel is in "credit-decline" state
  And the AI Suggestion Panel shows text "recommend declining"
  And the AI Suggestion Panel shows a Reject button instead of Apply

  When the operator clicks "Reject" and holds for 600ms

  Then the row's SI state transitions through "RejectSent" to "TraderRejected"
  And the displayed status changes to "REJECTED"
  And the ticket panel closes

  When 5 seconds pass

  Then the row is removed from Active
  And a row with outcome "Rejected by Trader" appears in Historic
```

**Test data:**
- Client: `Halcyon Capital`
- Account: `HALC-GBP-1`
- Pair: `GBPUSD`
- Side: `BUY`
- Notional: `25_000_000`
- Rejection reasons: `['CREDIT_LIMIT']`

---

## Scenario 4 — Size Limit with AI-Suggested Markup

**ID:** `SIZE_LIMIT_MARGIN_TUNE`
**Purpose:** Demonstrate the AI Margin Suggestion + Apply button + live client-summary update.

```gherkin
Feature: Trader applies the AI-suggested margin on a size-breach trade

Scenario: 12M EURUSD priced via AI suggestion
  Given the application is open at the dev URL

  When the operator clicks "Inject: Size Limit + Margin Tune"

  Then a new row appears with status "INTERVENE" and reasons "SIZE_LIMIT"

  When the operator clicks the row

  Then the ticket opens with Margin = 3
  And within 1 second the AI Suggestion Panel shows a suggested-pips value of 4
  And the AI Suggestion rationale contains "Gold-tier" or "12M EURUSD"
  And the confidence badge shows "High"

  When the operator clicks "Apply"

  Then the Margin field animates to "4"
  And the AI Suggestion Panel collapses to "Applied 4 pips · Undo"
  And the Client Bid and Client Ask values update
  And the Estimated Profit increases compared to the 3-pip baseline

  When the operator clicks "Send Stream" and holds for 600ms

  Then the row's SI state transitions to "Quoted"
  And the displayed status changes to "STREAMING"

  When 2 seconds pass

  Then the row's SI state transitions to "TradeConfirmed"
  And the displayed status changes to "DONE"
  And the deal appears in Historic with outcome "Executed"
```

**Test data:**
- Client: `Northwind FX` (gold tier per `09-suggestion-engine.md §11`)
- Account: `NRTH-EUR-3`
- Pair: `EURUSD`
- Side: `SELL`
- Notional: `12_000_000`
- Rejection reasons: `['SIZE_LIMIT']`
- Expected AI suggestion: **4 pips, high confidence** (gold base 2 + notional 10–20M = +1.5 + size band breach = +0.5, rounded to 4)

---

## Scenario 5 — Release Path

**ID:** `RELEASE_PATH`
**Purpose:** Show the trader can hand a ticket back to the desk.

```gherkin
Feature: A trader releases a ticket they cannot take

Scenario: USDINR deal is released back to the desk
  Given the application is open at the dev URL

  When the operator clicks "Inject: Release Path"

  Then a new row appears with status "INTERVENE"
  And the row's client is "Polaris Holdings"

  When the operator clicks the row

  Then the SI machine transitions through "PickUpSent" to "PickedUp"
  And the displayed status changes to "PICKED UP"
  And the ticket opens
  And the row's `Dealable` attribute becomes false

  When the operator clicks "Release"

  Then the SI machine transitions through "HoldSent" back to "Initial"
  And the row's `Dealable` attribute returns to true
  And the displayed status returns to "INTERVENE"
  And the ticket panel closes
  And the row is still visible in the Active blotter
```

**Test data:**
- Client: `Polaris Holdings`
- Account: `POLR-INR-1`
- Pair: `USDINR`
- Side: `BUY`
- Notional: `3_000_000`
- Rejection reasons: `['SIZE_LIMIT']`

---

## Notification mute scenario (cross-cutting, not its own demo)

```gherkin
Feature: The mute toggle suppresses audible cues but not visual ones

Scenario: Mute is honored on notification
  Given the mute toggle is on (bell-slash icon shown)
  When a new SI deal is injected
  Then the row flash fires
  And the toast appears
  And no sound plays

Scenario: Unmute is honored on notification
  Given the mute toggle is off (bell icon shown)
  And the user has clicked anywhere on the page at least once
  When a new SI deal is injected
  Then a sound plays
```

The "user has clicked once" step is the audio-unlock gesture. Playwright fires a synthetic click during test setup to satisfy this.

---

## Notes on test fidelity

- Tests should assert on **`data-si-state` / `data-rfs-state` attributes** and **`data-testid`** values, not on text or color. Text and color may change; the testids and Caplin state names should not.
- The pricing feed seed is pinned to `42` in test runs (via `window.__seedFeed = 42` injected before page load) so the bid/ask values are deterministic.
- The simulated-ack delay constants (see `03-trade-state-model.md §6`) are zeroed in test runs via `window.__zeroAckDelay = true` so transitions are observable but instant.
- Time-based steps use `page.waitForTimeout` only where the test is explicitly about the timer (the 5-second removal). For other waits, prefer `expect(...).toHaveAttribute(...)` with Playwright's auto-retry.

---

## Live demo running order (suggested)

For a 3-minute walkthrough demo:

1. **0:00 — 0:20** — Empty app. Explain layout, notification icons, dev injector.
2. **0:20 — 0:50** — Scenario 1 (ESP). Show flow-through.
3. **0:50 — 1:30** — Scenario 2 (Off-Hours). Open, send stream, accept.
4. **1:30 — 2:00** — Scenario 3 (Credit Breach). Reject path.
5. **2:00 — 2:40** — Scenario 4 (Size + Margin). Show margin controls + client summary update.
6. **2:40 — 3:00** — Run `pnpm test:e2e --headed --workers=1` and watch the same scenarios pass.
