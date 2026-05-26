---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
  - docs/phase-summaries/FXSW-021-summary.md
status: stable
ticket: FXSW-021
---

# Scenario — Off-Hours Intervention

**ID:** `OFF_HOURS_INTERVENTION`

The canonical SI happy path. Notification fires, trader opens ticket, sends stream, client accepts. Exercises every panel in the [ticket](../features/ticket.md), the full SI machine forward path (`Initial → PickUpSent → PickedUp → QuoteSent → Quoted → TradeConfirmed`), and the [5-second removal rule](../features/active-blotter.md#5-second-removal-rule).

## Test data

| Field | Value |
|---|---|
| Client | Globex Industries |
| Account | GLBX-JPY-2 |
| Pair | USDJPY |
| Side | SELL |
| Notional | 5,000,000 |
| Reasons | `['OFF_HOURS']` |

## Gherkin

```gherkin
Scenario: Off-hours USDJPY deal is priced manually and accepted
  Given the application is open at the dev URL
  And the Active blotter is empty

  When the operator clicks "Inject: Off-Hours Intervention"

  Then within 500ms a new row appears with status "INTERVENE"
  And the row's CCY pair is "USDJPY"
  And the row's client is "Globex Industries"
  And the row's Reasons cell contains "OFF_HOURS"

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

## Script

| Trigger | Event |
|---|---|
| t=0 (inject) | `NEW_SI_DEAL` — Globex SELL 5M USDJPY, reasons `['OFF_HOURS']` |
| 1500ms after SI reaches `Quoted` | `CLIENT_ACCEPT` (state-gated) |

The state-gated follow-up means `CLIENT_ACCEPT` doesn't fire until the trader has actually sent the stream. If the trader never sends, the scenario stalls quietly — useful behaviour for free-play exploration.

## E2E implementation

Spec: `tests/e2e/off-hours-intervention.spec.ts`. Commit `65e2cbf` (FXSW-021).

- Pins `window.__seedFeed = 42` + `window.__zeroAckDelay = true` via `page.addInitScript` per `docs/07` "Notes on test fidelity".
- Hold via Playwright's `click({ delay: 700 })` — 700ms gives a small margin against the timer-vs-pointerup race. The double-click alternative path also exists on `HoldButton` but the hold is the spec-true path ("clicks Send Stream and holds for 600ms").
- Tolerant timeouts: `Quoted` 1500ms, `TradeConfirmed` 3000ms, archived 6000ms. Each is spec value plus generous CI-jitter slack.
- Assertions hit `data-si-state` / `data-display-status` / `data-outcome` — never text or color, per the test-fidelity rules.
- Runtime: 8.0s. Together with `smoke` + `happy-path-esp` the full Playwright suite runs in 17.9s.

### Toast + title-prefix assertions intentionally deferred

The Gherkin scenario asserts:

> And a toast appears in the top-right with text containing "Globex Industries"
> And the document title is prefixed with "● "

Both are notification-layer behaviour and land with FXSW-028 (Phase 5). The E2E file's header comment names them as intentionally deferred. The current spec passes without them; a follow-up commit on the E2E will add the assertions once FXSW-028 ships.

## Integration coverage

This E2E doubles as an integration test for the entire ticket flow. It exercises [pricing-feed.md](../components/pricing-feed.md) (FXSW-007) through [ticket.md](../features/ticket.md) (FXSW-014–020) through [scenario-player.md](../components/scenario-player.md) (state-gated `CLIENT_ACCEPT`) through [deals-store.md](../components/deals-store.md) (archival). Any contract regression on `data-deal-id`, `data-si-state`, `data-display-status`, `data-outcome`, the reasons-panel label, the margin-input value, or footer button visibility would break this E2E.

## Sources

- `docs/07-scenario-pack.md` Scenario 2
- `docs/04-dummy-feed-spec.md` §5.2, §6
- `docs/phase-summaries/FXSW-021-summary.md`
- `docs/dev-log.md` FXSW-021 — implementation notes
- `docs/BACKLOG.md` FXSW-021
