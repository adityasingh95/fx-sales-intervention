---
last_updated: 2026-06-18
sources:
  - docs/04-dummy-feed-spec.md
  - docs/dev-log.md
status: stable
ticket: FXSW-092
---

# Data model — `DealEvent`

The discriminated union of events the [deal feed](../components/deal-feed.md) emits. All deal-lifecycle events the application sees flow through this union.

```typescript
type DealEvent =
  | { type: 'NEW_SI_DEAL'; deal: Deal; rejectionReasons: RejectionReason[] }
  | { type: 'NEW_ESP_DEAL'; deal: Deal }
  | { type: 'CLIENT_ACCEPT'; dealId: string; executedSide?: DealtSide }
  | { type: 'CLIENT_REJECT'; dealId: string }
  | { type: 'CLIENT_CANCEL'; dealId: string }
  | { type: 'EXPIRE'; dealId: string };
```

`executedSide` (`DealtSide = 'BID' | 'ASK'`, from `src/lib/quoteSide.ts`) records **which side the client actually dealt on** (FXSW-092). A one-sided request deals on its only quotable side; a two-way (`side: 'BOTH'`) request is quoted on both but executes on exactly one, chosen by a per-deal seeded flip in the [scenario player](../components/scenario-player.md#executed-side-for-two-way-requests-fxsw-092). It is **optional** — absent on legacy / edge emissions. See [data-models/deal.md](deal.md) and [ADR-0017](../decisions/ADR-0017-swap-markup-model-and-executed-side.md).

## Routing

Subscribed by `dealsBootstrap.ts` once at app boot. Routes:

| Event | Effect in `dealsStore` |
|---|---|
| `NEW_SI_DEAL` | `addDeal(deal, rejectionReasons, 'SI')`. Starts machines in RFS=`Queued`, SI=`Initial`. |
| `NEW_ESP_DEAL` | `addDeal(deal, [], 'ESP')`. Starts machines in RFS=`Executable` (via `AutoPrice`), SI=`Initial` for the lifetime of the deal. |
| `CLIENT_ACCEPT` | If `executedSide` is present, `recordExecutedSide(dealId, side)` first (so archival can snapshot the dealt side), then `forwardEvent(dealId, TradeConfirmed)`. Both machines transition to `TradeConfirmed`. |
| `CLIENT_REJECT` / `CLIENT_CANCEL` | `forwardEvent(dealId, ClientReject)`. SI → `ClientRejected` (terminal). |
| `EXPIRE` | No-op in v1. RFS `Expire` would need parent-level routing that's not in scope. |

## Source-of-events

In the prototype, every `DealEvent` originates from a scenario script played by the [scenario player](../components/scenario-player.md). There is no auto-generation. In a real deployment these would come from a backend over a streaming connection — the dealFeed's `Subscribable<DealEvent>` interface is the seam that lets the UI swap simulator for real feed without touching downstream code.

## Sources

- `docs/04-dummy-feed-spec.md` §4
- [components/deal-feed.md](../components/deal-feed.md)
- [components/deals-store.md](../components/deals-store.md)
