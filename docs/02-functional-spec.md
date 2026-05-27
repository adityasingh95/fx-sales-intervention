# 02 — Functional Specification

This document defines screen-level behaviour for FX Sales Workstation.

## 1. Application shell

The app renders a single-page dark workstation:

- Header with product name, environment badge, Dev Injector slot, mute toggle, and lightweight status area.
- Main content area with Active Deals and Historic Deals blotters.
- Ticket overlay opened from an eligible Active row.
- Toast stack for new manual-pricing requests.

## 2. Active Deals Blotter

Shows live deals until they reach terminal state and complete the grace-period removal.

### 2.1 Row eligibility

A row is clickable when:

- the deal is in the SI channel,
- the SI state is `Initial`,
- `Dealable=true`, and
- at least one rejection reason is present.

Clicking such a row opens the ticket and sends `PickUp` into the SI machine.

### 2.2 Display status

The displayed status is derived from the RFS state, SI state, and `Dealable` flag. Terminal states override partner-machine labels during the grace-period window.

Expected display statuses include:

- `AUTO`
- `INTERVENE`
- `PICKED UP`
- `QUOTING`
- `QUOTED`
- `WITHDRAWING`
- `RELEASING`
- `REJECTING`
- `DONE`
- `REJECTED`
- `DECLINED`
- `EXPIRED`

### 2.3 Five-second removal

After a terminal SI state is reached, the row remains in Active briefly with terminal styling. It is then removed from Active and archived to Historic.

## 3. Historic Deals Blotter

Shows archived terminal deals. Each row should preserve enough detail for demo traceability:

- deal id,
- client,
- pair,
- side,
- notional,
- terminal outcome,
- terminal state,
- last known rate where available.

Historic rows are read-only in v1.

## 4. Ticket overlay

The ticket opens from an eligible Active row. It is a right-side glass panel on desktop and full-width on narrow screens.

### 4.1 Reasons Panel

Shows one chip per rejection reason:

| Reason | Label | Summary |
|---|---|---|
| `OFF_HOURS` | Off-hours | Request is outside configured trading hours. |
| `SIZE_LIMIT` | Size limit | Request exceeds automatic pricing size. |
| `CREDIT_LIMIT` | Credit limit | Request breaches available credit. |

### 4.2 Summary Panel

Renders a concise natural-language summary:

`Client [Name] wants to [BUY or SELL] [amount] [base currency] vs [quote currency] for [tenor] settlement.`

Also shows account, trade date, and settlement date.

### 4.3 AI Margin Suggestion Panel

For non-credit cases, renders a deterministic suggested margin with a short rationale and an Apply action. After apply, the panel shows Applied state and allows Undo.

For credit-limit cases, the panel recommends declining rather than widening price.

### 4.4 Pricing Panel

Supports two modes:

- **Streaming mode:** bid/ask update from the simulated pricing feed.
- **Fixed mode:** clicking a side freezes the selected quote until refreshed.

The trader may adjust margin in pips using +/- buttons or numeric input. Client price and estimated profit update from the selected margin.

### 4.5 Client Summary

Displays read-only client bid/ask preview and estimated profit.

### 4.6 Deal Summary

Displays deal fields such as direction, notional, account, trade date, and settlement date.

### 4.7 Footer actions

| Action | Availability | Behaviour |
|---|---|---|
| Reject | `PickedUp` or `Quoted` | Sends reject flow and closes terminally after acknowledgement. |
| Release | `PickedUp` or `Quoted` | Sends hold/release flow and returns the row to available state. |
| Send Stream | `PickedUp`, streaming mode | Sends streaming quote. |
| Send Quote | `PickedUp`, fixed mode | Sends fixed quote. |
| Withdraw | `Quoted` | Withdraws live quote. |
| Return to Stream | fixed mode before quote | Re-enters streaming mode. |

Hold-to-confirm is used where the UI spec requires deliberate confirmation.

### 4.8 Closing the panel

Esc and backdrop close the ticket UI without changing deal state. Release explicitly changes the deal state and closes the ticket.

## 5. Notifications

New manual-pricing requests fire:

- row flash,
- toast,
- title flash,
- optional audio chime if unmuted and browser audio is unlocked.

Mute persists to `sessionStorage`.

## 6. Dev Injector

The Dev Injector appears only with `?dev=1`. It exposes buttons for the named scenarios in `docs/07-scenario-pack.md` and a Reset control.

## 7. Accessibility and test hooks

- Important controls must have labels or clear text.
- Rows and panels expose stable `data-testid` / `data-*` attributes for E2E tests.
- State names and scenario ids are treated as compatibility contracts.
