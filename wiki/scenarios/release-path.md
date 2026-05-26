---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
status: in-progress
ticket: FXSW-031
---

# Scenario — Release Path

**ID:** `RELEASE_PATH`

Trader picks up an SI deal, reviews it, then hands the ticket back to the desk via Release. Exercises the SI `Hold` path (`PickedUp → HoldSent → Initial` with `Dealable=true` restoration). The deal **stays in the Active Blotter** — it does not leave the active list because the SI machine returns to `Initial`, not a terminal state.

## Test data

| Field | Value |
|---|---|
| Client | Polaris Holdings |
| Account | POLR-INR-1 |
| Pair | USDINR |
| Side | BUY |
| Notional | 3,000,000 |
| Reasons | `['SIZE_LIMIT']` |

## Gherkin

```gherkin
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

## Script

| Trigger | Event |
|---|---|
| t=0 (inject) | `NEW_SI_DEAL` — Polaris BUY 3M USDINR, reasons `['SIZE_LIMIT']` |
| _(none)_ | No follow-up — the scenario is about a non-terminal action |

## No re-notification on release

The [notification trigger](../features/notifications.md#trigger) only fires when a deal **first** appears in the Active Blotter with `Dealable=true`. Releasing a previously-picked-up deal flips `Dealable` back to `true` but does **not** re-fire notifications. This is intentional — the deal was already announced once.

## No automatic second-trader pickup in v1

After release, the deal sits in `Initial` indefinitely. The operator can re-open it from the row and complete it if they want, but there's no simulated colleague picking it up — multi-trader contention is out of scope.

## Status

E2E spec is FXSW-031 (Phase 5). Not yet implemented.

## Sources

- `docs/07-scenario-pack.md` Scenario 5
- `docs/BACKLOG.md` FXSW-031
