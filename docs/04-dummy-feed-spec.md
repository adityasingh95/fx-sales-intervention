# 04 — Dummy Feed Specification

This document defines the simulated pricing and deal feeds used by the frontend prototype.

## 1. Purpose

The dummy feed replaces real market-data, pricing, risk, and quote-handler backends for the prototype. It gives the UI deterministic live-looking data without any runtime external dependency.

## 2. Design goals

- Deterministic enough for tests.
- Live-looking enough for demos.
- Fast startup.
- No network calls at runtime.
- Scenario-driven deal injection.
- Resettable state for E2E tests.

## 3. PricingFeed

`PricingFeed` publishes ticks for configured currency pairs.

### 3.1 Tick shape

```ts
export type PriceTick = {
  pair: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
};
```

### 3.2 Behaviour

- Uses seeded pseudo-random generation for deterministic tests.
- Emits ticks approximately every 300ms.
- Uses reference mids as the starting point.
- Applies small random movement around the mid.
- Maintains bid/ask spread around the mid.
- Offers `subscribe(pair, listener)` and `getLatest(pair)`.

### 3.3 Supported pairs

- `EURUSD`
- `GBPUSD`
- `USDJPY`
- `USDINR`

## 4. DealFeed

`DealFeed` emits scenario events into the application.

### 4.1 Event shape

```ts
export type DealEvent = {
  dealId: string;
  scenarioId: string;
  type: string;
  payload: unknown;
  at: number;
};
```

### 4.2 Behaviour

- Scenarios are injected manually from the Dev Injector.
- The feed supports subscribers.
- `reset()` clears pending timers and scenario state.
- State-gated follow-ups can wait until a deal reaches a target SI state.

## 5. Scenarios

Scenario definitions live in `docs/07-scenario-pack.md` and the implementation under `src/services/scenarios/`.

The core scenarios are:

1. `HAPPY_PATH_ESP`
2. `OFF_HOURS_INTERVENTION`
3. `CREDIT_BREACH`
4. `SIZE_LIMIT_MARGIN_TUNE`
5. `RELEASE_PATH`

## 6. Test hooks

The feed exposes deterministic hooks for E2E reliability:

- seeding the pricing generator,
- resetting deal state,
- reducing acknowledgement delay during tests,
- direct scenario injection through UI buttons.

## 7. Non-goals

- No live market-data integration.
- No backend quote handler.
- No persistence.
- No authentication.
- No real risk or credit engine.

## 8. v3 external reference feed + forward points

### 8.1 `setReferences` seam

`PricingFeed` gains `setReferences(Partial<Record<Pair, number>>)` and
`clearReferences()`. They mutate the reference-mid map that `tick()` already
reads first; the tick/PRNG logic is unchanged, so the seeded sequence is
identical whenever `setReferences` is never called.

### 8.2 External adapter (opt-in)

An adapter under `src/services/feed/external/` fetches provider quotes (the
previous-close forex aggregate), maps them to pair mids, and calls
`setReferences` every 5 minutes. The poller is pure: immediate first poll,
exponential backoff (capped at 30 min), 429 → rate-limited, 5s fetch timeout,
silent fallback to the last-known anchor. OFF by default and never exercised by
tests/E2E, so determinism (seed-42 golden) is preserved. The real provider name
is permitted only in this adapter code, never in UI strings or build output.

### 8.3 Forward points

A deterministic, seeded-per-(pair, tenor) source `forwardPointsFeed.get(pair,
tenor)` uses a separate RNG instance (SPOT = 0, monotonic by tenor). It sits
behind a small interface so a real forward curve can replace it later.

### 8.4 External endpoint update (FXSW-062)

The provider rebranded from Polygon.io to Massive (2025-10); the legacy
`api.polygon.io` host was retired. The adapter `BASE_URL` is now
`https://api.massive.com/v2/aggs/ticker`; the `C:{PAIR}` ticker convention,
previous-close path, and `apiKey` query param are unchanged. As the call is made
from the browser it depends on the provider returning permissive CORS headers;
static hosting has no proxy fallback.

## 9. v4 feed extensions (behind `?dev=v4`)

All v4 feed work is deterministic and seeded; the seed-42 golden and the v3
single-value behaviour are unchanged. Under v3 the new two-sided helpers collapse
to `bid === ask === mid`, so v3 output is byte-identical.

### 9.1 Two-sided forward points

`forwardPointsFeed.get(pair, tenor)` returns a `ForwardPointsPair`
`{ bid, ask, mid }` instead of a scalar (the scalar becomes `mid`). The bid/ask
spread is derived deterministically from the same per-(pair, tenor) RNG used for
`mid`, widening monotonically with tenor (longer tenor → wider points spread) and
symmetric around `mid` (bid = mid − half-spread, ask = mid + half-spread). SPOT
remains `{ bid: 0, ask: 0, mid: 0 }`. Existing callers that want the old behaviour
read `.mid`; v3 paths use `.mid` for both sides.

### 9.2 Swap points

`swapPointsFeed.get(pair, nearTenor, farTenor)` returns the per-leg pairs and the
net differential:

```
{
  near: ForwardPointsPair,   // = forwardPointsFeed.get(pair, nearTenor)
  far:  ForwardPointsPair,   // = forwardPointsFeed.get(pair, farTenor)
  net:  { bid, ask }         // far − near, per side
}
```

`net.bid = far.bid − near.bid`, `net.ask = far.ask − near.ask`. It is a pure
composition of `forwardPointsFeed` (no new RNG), so a forward-forward swap
(near = forward tenor) and an outright-vs-spot swap (near = SPOT) both fall out
of the same source. `far` must be a later tenor than `near`; the caller enforces
ordering (the feed does not reorder).

### 9.3 Instrument-aware feed usage

The feed itself is instrument-agnostic — it exposes spot, two-sided forward
points, and swap points. Instrument semantics (NDF = forward-points markup only;
swap = net-points pricing) live in `lib/pips.ts` and the ticket, not in the feed.
The interfaces remain small so a real curve/swap source can replace the simulated
ones without touching consumers.
