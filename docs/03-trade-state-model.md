# 03 — Trade State Model

This document defines the prototype's two coordinated state machines: an RFS trade model and a Sales Intervention trade model. The implementation keeps these as distinct machines and coordinates them through a parent `dealMachine`.

## 1. Design principle

A single deal may have two related lifecycle views:

- **RFS lifecycle:** client request/quote lifecycle.
- **Sales Intervention lifecycle:** sales-trader manual-pricing lifecycle.

The prototype keeps both lifecycles explicit because their states are not identical and the UI often needs both to derive the correct row status.

## 2. RFS states

| State | Meaning |
|---|---|
| `Queued` | Request is waiting for pricing or manual intervention. |
| `PickedUp` | A sales trader has picked up the request. |
| `Executable` | A price is live with the client. |
| `TradeConfirmed` | Trade is confirmed/booked. |
| `ClientClosed` | Client closed the request. |
| `Expired` | Request expired. |

## 3. Sales Intervention states

| State | Meaning |
|---|---|
| `Initial` | Deal available for pickup. |
| `PickUpSent` | Pickup acknowledgement is pending. |
| `PickedUp` | Trader owns the ticket. |
| `QuoteSent` | Quote/stream acknowledgement is pending. |
| `Quoted` | Quote/stream is live with client. |
| `WithdrawSent` | Withdraw acknowledgement is pending. |
| `HoldSent` | Release/hold acknowledgement is pending. |
| `RejectSent` | Reject acknowledgement is pending. |
| `TraderRejected` | Trader rejection complete. |
| `ClientRejected` | Client declined or timed out. |
| `TradeConfirmed` | Trade confirmed/booked. |
| `Removed` | Internal hidden state used after terminal grace period. |

## 4. Parent coordination

The parent deal machine owns child actors for the RFS and SI machines. Events are routed to the appropriate child machine, and certain child transitions trigger cross-model events.

| User/system event | SI transition | RFS effect |
|---|---|---|
| `PickUp` | `Initial → PickUpSent → PickedUp` | RFS moves to `PickedUp` |
| `Quote` | `PickedUp → QuoteSent → Quoted` | RFS receives price update and becomes `Executable` |
| `Withdraw` | `Quoted → WithdrawSent → PickedUp` | RFS moves away from executable state |
| `Hold` / Release | `PickedUp or Quoted → HoldSent → Initial` | RFS returns to queued/available state |
| `Reject` | `PickedUp or Quoted → RejectSent → TraderRejected` | RFS closes as rejected |
| `ClientReject` | `Quoted → ClientRejected` | RFS closes as client rejected |
| `TradeConfirmed` | `Quoted → TradeConfirmed` | RFS closes as confirmed |

## 5. Terminal handling

Terminal SI states are:

- `TraderRejected`
- `ClientRejected`
- `TradeConfirmed`

Each terminal state remains visible in Active briefly before entering hidden `Removed`. The store archives the deal into Historic when `Removed` is reached.

## 6. Derived display status

The blotter does not display raw state-machine names directly in all cases. It derives a row status from RFS state, SI state, and `Dealable`.

| Condition | Display |
|---|---|
| ESP flow, executable/complete | `AUTO` or `DONE` depending on lifecycle stage |
| SI `Initial` and dealable | `INTERVENE` |
| SI `PickUpSent` or `PickedUp` | `PICKED UP` |
| SI `QuoteSent` | `QUOTING` |
| SI `Quoted` | `QUOTED` |
| SI `WithdrawSent` | `WITHDRAWING` |
| SI `HoldSent` | `RELEASING` |
| SI `RejectSent` | `REJECTING` |
| SI `TraderRejected` | `REJECTED` |
| SI `ClientRejected` | `DECLINED` |
| SI `TradeConfirmed` | `DONE` |
| RFS `Expired` | `EXPIRED` |

## 7. Event names

The prototype uses stable event names in code and tests:

- `PickUp`
- `PickUpAck`
- `Hold`
- `HoldAck`
- `Reject`
- `RejectAck`
- `Quote`
- `QuoteAck`
- `Withdraw`
- `WithdrawAck`
- `ClientReject`
- `PriceUpdate`
- `TradeConfirmed`
- `Expire`
- `ClientClose`

## 8. Test contract

State names, event names, and derived display statuses are compatibility contracts for:

- unit tests,
- E2E tests,
- scenario injector scripts,
- `data-*` attributes used by Playwright,
- wiki summaries.

Do not rename them without updating all dependent tests and documentation.
