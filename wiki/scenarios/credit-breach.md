---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
  - docs/09-suggestion-engine.md
status: in-progress
ticket: FXSW-027
---

# Scenario — Credit Breach

**ID:** `CREDIT_BREACH`

Demonstrates the trader rejecting a deal that should not be priced, with the AI Margin Suggestion's **credit-decline** guardrail surfacing the recommendation before the trader acts. Exercises the SI reject path (`Initial → PickUpSent → PickedUp → RejectSent → TraderRejected`), [ADR-0007](../decisions/ADR-0007-credit-breach-recommend-decline.md) (credit-breach → recommend decline, not wider pricing), and the Historic outcome `Rejected by Trader`.

## Test data

| Field | Value |
|---|---|
| Client | Halcyon Capital |
| Account | HALC-GBP-1 |
| Pair | GBPUSD |
| Side | BUY |
| Notional | 25,000,000 |
| Reasons | `['CREDIT_LIMIT']` |

## Gherkin

```gherkin
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

## Script

| Trigger | Event |
|---|---|
| t=0 (inject) | `NEW_SI_DEAL` — Halcyon BUY 25M GBPUSD, reasons `['CREDIT_LIMIT']` |
| _(none)_ | Scenario has no follow-up — terminal action is trader-driven |

## AI Suggestion behaviour

The suggestion engine returns the credit-decline shape (`state === 'credit-decline'`, no `suggestedPips`) per [ADR-0007](../decisions/ADR-0007-credit-breach-recommend-decline.md). The [AI Margin Suggestion panel](../features/ai-margin-suggestion.md) renders:

> "Credit limit breach — recommend declining."

with a **Reject** shortcut button replacing the usual Apply button. The Reject shortcut fires the same SI `Reject` event as the footer button.

## Status

E2E spec is part of FXSW-027 (Phase 4, after the AI suggestion engine + panel). Not yet implemented.

## Sources

- `docs/07-scenario-pack.md` Scenario 3
- `docs/09-suggestion-engine.md` §7 — credit-decline special case
- `docs/BACKLOG.md` FXSW-027
