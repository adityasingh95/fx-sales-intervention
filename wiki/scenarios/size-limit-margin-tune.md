---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
  - docs/09-suggestion-engine.md
  - docs/phase-summaries/FXSW-027-summary.md
status: stable
ticket: FXSW-027
---

# Scenario — Size Limit with AI-Suggested Markup

**ID:** `SIZE_LIMIT_MARGIN_TUNE`

The headline AI demo. The suggestion engine surfaces a non-baseline margin (4 pips for this input), the trader clicks Apply, and the client-summary updates live. Exercises the AI Apply / Undo flow, margin propagation into the Pricing Panel, and the SI happy path.

## Test data

| Field | Value |
|---|---|
| Client | Northwind FX (gold tier) |
| Account | NRTH-EUR-3 |
| Pair | EURUSD |
| Side | SELL |
| Notional | 12,000,000 |
| Reasons | `['SIZE_LIMIT']` |
| **Expected AI suggestion** | **4 pips, High confidence** |

## Suggested-pips derivation

| Factor | Δ pips | Note |
|---|---|---|
| Client tier (gold) | (baseline 2) | gold client baseline 2 pips |
| Notional size | +1.5 | 10–20M USD-equivalent |
| Size band breach | +0.5 | Above auto-pricer band |
| **Total** | **4** | (rounded from 4.0) |

## Gherkin

```gherkin
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

## Script

| Trigger | Event |
|---|---|
| t=0 (inject) | `NEW_SI_DEAL` — Northwind SELL 12M EURUSD, reasons `['SIZE_LIMIT']` |
| 2000ms after SI reaches `Quoted` | `CLIENT_ACCEPT` (state-gated) |

## E2E implementation

Spec: `tests/e2e/size-limit-margin-tune.spec.ts`. Commit `ab8cd30` (FXSW-027). Runtime: 9.2s.

- Pins `window.__seedFeed = 42` + `window.__zeroAckDelay = true`.
- Asserts `data-suggestion-state="ready"`, `suggestion-pips` text `"4"`, `suggestion-confidence` text `"high"`, rationale containing `"Gold-tier"` or `"12M EURUSD"`.
- Click `suggestion-apply`; assert panel collapses to `data-suggestion-state="applied"` strip showing `"Applied 4 pips"`; assert margin-input animates to `4` (`data-margin-glow="true"` for 600ms).
- Then hold Send Stream 600ms → `data-si-state="Quoted"` (STREAMING); 2s wait for state-gated `CLIENT_ACCEPT` → `TradeConfirmed` (DONE); 5s removal; Historic with `data-outcome="Executed"`.
- Toast + document-title-prefix assertions deferred to FXSW-028.

## Sources

- `docs/07-scenario-pack.md` Scenario 4
- `docs/09-suggestion-engine.md` §5, §6, §8, §11 — rule engine, confidence, rationale, client profiles
- `docs/phase-summaries/FXSW-027-summary.md`
- `docs/dev-log.md` FXSW-027 — implementation notes
- `docs/BACKLOG.md` FXSW-027
