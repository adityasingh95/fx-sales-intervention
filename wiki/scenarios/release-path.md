---
last_updated: 2026-05-26
sources:
  - docs/07-scenario-pack.md
  - docs/phase-summaries/FXSW-033-summary.md
status: stable
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

## E2E implementation

Spec: `tests/e2e/release-path.spec.ts`. Commit `ad4cade` (FXSW-031). Runtime: 0.7s — the fastest of all six E2Es because there's no `CLIENT_ACCEPT` to wait for and no 5-second blotter-removal.

- Pins `window.__seedFeed = 42` + `window.__zeroAckDelay = true`.
- Asserts `data-dealable="true"` on the new row; `data-si-state` cycles `Initial → PickUpSent → PickedUp`; `data-dealable="false"`; `data-display-status="PICKED UP"`.
- After Release: ticket panel unmounts; `data-si-state` cycles `PickedUp → HoldSent → Initial`; `data-dealable="true"`; status returns to `INTERVENE`; row still in Active (no terminal transition, no 5s removal).

## Release closes the ticket; Esc / backdrop don't

FXSW-031 added one line to `TicketFooter.tsx`'s Release handler: `useUiStore.getState().closeTicket()`. Per `docs/02-functional-spec.md` §4.8, passive close paths (Esc / backdrop click) must **not** auto-Hold — the deal stays in `PickedUp`. The converse — active Hold paths can close — isn't stated explicitly but is consistent with the Gherkin's "the ticket panel closes" assertion and with the affordance ("hand back to the desk" implies finishing with this ticket). A code comment in the Release handler distinguishes the two paths so a future reader doesn't unify them.

## No re-notification on release

The [notification trigger](../features/notifications.md#trigger) only fires when a deal **first** appears in the Active Blotter with `Dealable=true` AND the dealId is not in the dispatcher's `notifiedDealIds` set. Releasing a previously-picked-up deal flips `Dealable` back to `true` but does **not** re-fire notifications — the dealId is already in the set.

## No automatic second-trader pickup in v1

After release, the deal sits in `Initial` indefinitely. The operator can re-open it from the row and complete it if they want, but there's no simulated colleague picking it up — multi-trader contention is out of scope per `docs/03-trade-state-model.md` §9.

## Sources

- `docs/07-scenario-pack.md` Scenario 5
- `docs/phase-summaries/FXSW-033-summary.md`
- `docs/dev-log.md` FXSW-031 — implementation notes
- `docs/BACKLOG.md` FXSW-031
