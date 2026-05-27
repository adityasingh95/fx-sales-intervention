# 00 — Glossary

Domain terms used across this prototype. Use industry-standard FX terminology consistently.

## Sales Intervention terms

| Term | Definition |
|---|---|
| **Sales Intervention (SI)** | Workflow in which a human sales trader manually prices a quote request that automated pricing could not or should not handle. |
| **RFS** | Request for Stream. A client-initiated request for a streaming price. |
| **Quote ticket** | Trading-app ticket through which a client submits a quote request. Off-screen in this prototype. |
| **Quote handler** | Backend component that would coordinate pricing and risk in a real deployment. Simulated here. |
| **Risk system** | Backend component that decides whether a quote can be auto-priced. Simulated here through scenario data. |
| **Pricing system** | Backend component that computes an auto-price using market rate, margin, bands, and related pricing inputs. Simulated here. |
| **Active Deals Blotter** | Live view of deals in progress, including auto-priced, awaiting pricing, under review, being priced, and just-completed deals during the grace period. |
| **Historic Deals Blotter** | View of terminal-state deals: completed, cancelled, rejected, expired, or closed. |
| **Ticket** | Pricing panel a sales trader opens for a single deal. Only Spot is implemented in v1. |
| **Reasons Panel** | Ticket section showing why the deal needs manual pricing. |
| **Summary Panel** | High-level trade details and natural-language summary. |
| **Pricing Panel** | Area where the trader adjusts margin and rate. |
| **Client Summary** | Preview of the final client-facing price and estimated profit. |
| **Deal Summary** | Trade specifics: amount, direction, account, settlement date. |
| **Footer** | Ticket action bar: Reject / Release / Send Stream / Send Quote / Withdraw / Return to Stream. |
| **Send Stream** | Provision the client with a continuously updating price. |
| **Send Quote** | Send a single fixed price. |
| **Withdraw** | Pull back a live quote from the client. |
| **Release** | Make the ticket available for another trader. |
| **Reject** | Decline to price the quote request. |
| **Return to Stream** | Resume streaming after fixed mode. |
| **ESP** | Electronic Streaming Price. Auto-priced flow that does not need SI but still appears in Active and then Historic. |
| **5-second removal rule** | Terminal deals remain visible in Active briefly before moving to Historic. |

## FX market terms

| Term | Definition |
|---|---|
| **Pair / Currency pair** | Two currencies being exchanged, e.g. EURUSD. |
| **Spot** | Trade settling on the standard market spot date. |
| **Forward / Outright forward** | Trade settling later than spot at a rate agreed today. |
| **NDF** | Non-Deliverable Forward. A forward that cash-settles using a fixing rate. |
| **Flexible forward / Time-option forward** | Forward where the client may settle within an agreed window. |
| **Swap** | Two simultaneous legs: near leg and far leg, usually opposite directions. |
| **Block trade** | Bundled set of related deals priced or netted together. |
| **Pip** | Smallest standard price increment. |
| **Bid / Ask / Mid** | Bid = sell price, Ask = buy price, Mid = arithmetic midpoint. |
| **Trader rate** | Internal rate before client margin is applied. |
| **Margin / Markup** | Pip amount applied to the trader rate to produce the client price. |
| **All-In Rate** | Spot rate plus forward points. |
| **Forward points** | Difference between spot and forward rate, expressed in pips. |
| **Tenor** | Time from trade date to settlement. |
| **Settlement date / Value date** | Date on which the trade delivers. |
| **Fixing date** | Date on which the cash-settlement reference rate is observed for NDFs. |
| **Notional / Amount** | Face value of the trade. |
| **Direction** | Client action: BUY base or SELL base. |
| **Account** | Client legal entity or account under which the trade books. |

## RFS Trade Model state names

| State | Meaning |
|---|---|
| `Queued` | Request received and awaiting processing or manual pricing. |
| `PickedUp` | Sales trader has picked the trade up for intervention. |
| `Executable` | A price is live with the client. |
| `Executed` | Client execution has been acknowledged. |
| `TradeConfirmed` | Trade booked; terminal success. |
| `Expired` | Quote/trade timed out. |
| `ClientClosed` | Client closed the trade. |

RFS events used here: `PickUp`, `Hold`, `PriceUpdate`, `Withdraw`, `Execute`, `ExecuteAck`, `TradeConfirmation`, `ClientClose`, `Expire`, `Reject`.

## Sales Intervention Trade Model state names

| State | Meaning |
|---|---|
| `Initial` | SI machine instantiated; awaiting pickup. |
| `PickUpSent` | Trader clicked Pick Up; acknowledgement in flight. |
| `PickedUp` | Trader has the ticket. |
| `QuoteSent` | Send Stream or Send Quote acknowledgement in flight. |
| `Quoted` | Quote live with the client. |
| `WithdrawSent` | Withdraw acknowledgement in flight. |
| `HoldSent` | Release acknowledgement in flight. |
| `RejectSent` | Reject acknowledgement in flight. |
| `TraderRejected` | Trader rejection acknowledged. |
| `ClientRejected` | Client declined or timed out. |
| `TradeConfirmed` | Trade booked. |

SI events: `PickUp`, `PickUpAck`, `Hold`, `HoldAck`, `Reject`, `RejectAck`, `Quote`, `QuoteAck`, `Withdraw`, `WithdrawAck`, `ClientReject`, `PriceUpdate`, `TradeConfirmed`.

## Blotter fields

| Field | Meaning |
|---|---|
| `TradeRequestId` | Unique identifier for a quote requiring SI. |
| `Dealable` | Whether the deal is available for pickup. |

## Internal terms

| Term | Definition |
|---|---|
| **Dummy feed** | In-memory pricing and deal simulator. |
| **Scenario** | Pre-canned sequence of events used for demos and E2E tests. |
| **Dev Injector** | Hidden `?dev=1` control panel for injecting scenarios. |
| **Rejection reason** | Reason auto-pricing failed. In v1: `OFF_HOURS`, `SIZE_LIMIT`, `CREDIT_LIMIT`. |
