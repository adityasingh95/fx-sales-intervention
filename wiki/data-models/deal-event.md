---
last_updated: 2026-05-26
sources:
  - docs/04-dummy-feed-spec.md
status: stable
---

# Data model — `DealEvent`

The discriminated union of events the [deal feed](../components/deal-feed.md) emits. All deal-lifecycle events the application sees flow through this union.

```typescript
type DealEvent =
  | { type: 'NEW_SI_DEAL'; deal: Deal; rejectionReasons: RejectionReason[] }
  | { type: 'NEW_ESP_DEAL'; deal: Deal }
  | { type: 'CLIENT_ACCEPT'; dealId: string }
  | { type: 'CLIENT_REJECT'; dealId: string }
  | { type: 'CLIENT_CANCEL'; dealId: string }
  | { type: 'EXPIRE'; dealId: string };
```

## Routing

Subscribed by `dealsBootstrap.ts` once at app boot. Routes:

| Event | Effect in `dealsStore` |
|---|---|
| `NEW_SI_DEAL` | `addDeal(deal, rejectionReasons, 'SI')`. Starts machines in RFS=`Queued`, SI=`Initial`. |
| `NEW_ESP_DEAL` | `addDeal(deal, [], 'ESP')`. Starts machines in RFS=`Executable` (via `AutoPrice`), SI=`Initial` for the lifetime of the deal. |
| `CLIENT_ACCEPT` | `forwardEvent(dealId, TradeConfirmed)`. Both machines transition to `TradeConfirmed`. |
| `CLIENT_REJECT` / `CLIENT_CANCEL` | `forwardEvent(dealId, ClientReject)`. SI → `ClientRejected` (terminal). |
| `EXPIRE` | No-op in v1. RFS `Expire` would need parent-level routing that's not in scope. |

## Source-of-events

In the prototype, every `DealEvent` originates from a scenario script played by the [scenario player](../components/scenario-player.md). There is no auto-generation. In a real deployment these would come from a backend over a streaming connection — the dealFeed's `Subscribable<DealEvent>` interface is the seam that lets the UI swap simulator for real feed without touching downstream code.

## Sources

- `docs/04-dummy-feed-spec.md` §4
- [components/deal-feed.md](../components/deal-feed.md)
- [components/deals-store.md](../components/deals-store.md)
