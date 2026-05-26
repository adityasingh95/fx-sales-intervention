---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
  - docs/04-dummy-feed-spec.md
status: stable
ticket: FXSW-013
---

# Scenario — Happy Path ESP

**ID:** `HAPPY_PATH_ESP`

Auto-priced deal flows end-to-end without sales intervention. Validates the ESP path through the [active blotter](../features/active-blotter.md), the [5-second removal rule](../features/active-blotter.md#5-second-removal-rule), and archival to the [historic blotter](../features/historic-blotter.md). The simplest demo scenario.

## Test data

| Field | Value |
|---|---|
| Client | Acme Corp |
| Account | ACME-EUR-1 |
| Pair | EURUSD |
| Side | BUY |
| Notional | 1,000,000 |
| Reasons | _(none — ESP path)_ |

## Gherkin

```gherkin
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

## Script

| t | Event |
|---|---|
| 0 | `NEW_ESP_DEAL` — Acme Corp BUY 1M EURUSD |
| +2000 | `CLIENT_ACCEPT` (time-gated) |

The `CLIENT_ACCEPT` lands on the parent dealMachine as `TradeConfirmed`, fanning to both RFS and SI. RFS goes Executable → TradeConfirmed; SI's guarded `Initial → TradeConfirmed` transition fires (the ESP synthetic transition — see [rfs-machine.md](../components/rfs-machine.md#esp-terminal-coordination)).

## State transitions to observe

- **t=0:** RFS `Executable`, SI `Initial`, display `AUTO`.
- **t=2000:** RFS `TradeConfirmed`, SI `TradeConfirmed`, display `DONE`. Row dims (`data-removing="true"`).
- **t=7000:** Both machines reach `Removed`. Row unmounts. Historic entry appears with `outcome="Executed"`.

## Test contract

Playwright spec: `tests/e2e/happy-path-esp.spec.ts`. Pins `window.__seedFeed = 42` and `window.__zeroAckDelay = true` via `addInitScript` before navigation. The 5-second removal delay is **not** zeroed — it's a real wall-clock assertion.

Assertions hit `data-display-status` and `data-outcome` per `docs/07-scenario-pack.md` "Notes on test fidelity".

## Status

Implemented and passing in CI as of FXSW-013 (Phase 2 close).

## Sources

- `docs/07-scenario-pack.md` Scenario 1
- `docs/04-dummy-feed-spec.md` §5.1
- `docs/dev-log.md` FXSW-013 — implementation notes
