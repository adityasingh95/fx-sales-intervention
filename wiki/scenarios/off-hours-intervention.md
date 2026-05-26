---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
status: in-progress
ticket: FXSW-021
---

# Scenario — Off-Hours Intervention

**ID:** `OFF_HOURS_INTERVENTION`

The canonical SI happy path. Notification fires, trader opens ticket, sends stream, client accepts. Exercises every panel in the [ticket](../features/ticket.md), the full SI machine forward path (`Initial → PickUpSent → PickedUp → QuoteSent → Quoted → TradeConfirmed`), the [notifications](../features/notifications.md) layer, and the [5-second removal rule](../features/active-blotter.md#5-second-removal-rule).

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

## Script

| Trigger | Event |
|---|---|
| t=0 (inject) | `NEW_SI_DEAL` — Globex SELL 5M USDJPY, reasons `['OFF_HOURS']` |
| 1500ms after SI reaches `Quoted` | `CLIENT_ACCEPT` (state-gated) |

The state-gated follow-up means `CLIENT_ACCEPT` doesn't fire until the trader has actually sent the stream. If the trader never sends, the scenario stalls quietly — useful behaviour for free-play exploration.

## Status

E2E spec is FXSW-021 (Phase 3, after the ticket panels build out). Not yet implemented. The scenario definition is registered and the state-gated follow-up wires through; what's missing is the ticket UI that the trader drives.

## Sources

- `docs/07-scenario-pack.md` Scenario 2
- `docs/04-dummy-feed-spec.md` §5.2, §6
- `docs/BACKLOG.md` FXSW-021
