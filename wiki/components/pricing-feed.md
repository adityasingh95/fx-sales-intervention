---
last_updated: 2026-06-17
sources:
  - docs/04-dummy-feed-spec.md
  - docs/phase-summaries/phase-11-swaps-summary.md
status: stable
ticket: FXSW-007, FXSW-090
---

# Component — `pricingFeed`

In-browser pricing simulator. Emits continuous bid/ask updates for each supported pair via a seeded random walk anchored to baked-at-build-time reference mids. No network, no WebSocket — just a `setInterval` and a Map of subscribers.

File: `src/services/feed/pricingFeed.ts`. Tests: `pricingFeed.test.ts`.

## Public API

```typescript
interface PricingFeed {
  subscribe(pair: Pair, cb: (tick: PriceTick) => void): () => void;
  getLatest(pair: Pair): PriceTick | null;
  start(): void;
  stop(): void;
}
```

`subscribe` returns an unsubscribe function. `start()` is idempotent. `stop()` cancels the interval **and clears all subscriptions** so the dev-injector "Reset session" flow can call `stop()` then `start()` cleanly.

## Supported pairs (v1)

Closed union: `'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'`. Mirrored in a `PAIRS` `as const satisfies readonly Pair[]` array — the two stay locked at compile time.

Covers two pip-precision regimes (4-decimal vs 2-decimal JPY-style), one EM pair, and the operator's home market.

## Price model

Simple random walk around the reference mid:

```
next_mid = current_mid + N(0, σ) * pipSize + meanReversion * (ref - current_mid)
bid      = next_mid - spread/2 * pipSize
ask      = next_mid + spread/2 * pipSize
```

Per-pair config:

| Pair | Reference mid (May 2026 anchor) | Pip position | Spread (pips) | σ (pips) |
|---|---|---|---|---|
| EURUSD | 1.1715 | 4th decimal | 0.5 | 0.3 |
| GBPUSD | 1.3510 | 4th decimal | 1.0 | 0.4 |
| USDJPY | 157.77 | 2nd decimal | 1.0 | 0.3 |
| USDINR | 95.67 | 2nd decimal | 2.0 | 0.5 |

Mean reversion: 10% pull per tick toward the reference. Prices drift but don't wander absurdly during a demo.

Reference mids are regenerated at every build — see [decisions/ADR-0005-bake-reference-mids.md](../decisions/ADR-0005-bake-reference-mids.md).

## Tick frequency

300ms per tick. Each tick updates **all** supported pairs simultaneously. Fast enough to feel live, slow enough to read.

## Seedability

`window.__seedFeed` (read at `start()` time) drives a Mulberry32 PRNG + Box-Muller normal sampling. Both are deterministic, dependency-free, and have good statistical properties for non-cryptographic use.

Playwright pins `window.__seedFeed = 42` via `addInitScript` before navigation so tests get reproducible price sequences.

### `?seed=N` replay knob (FXSW-090)

`resolveFeedSeed()` reads the seed with a three-level precedence:

1. **`window.__seedFeed`** (programmatic) — the test/E2E path; goldens unchanged.
2. **`?seed=N`** URL query param (human-friendly) — paste a URL to replay a run; parsed with `Number` + `Number.isFinite`, coerced to a uint32.
3. **wall-clock** (`Date.now() & 0xFFFFFFFF`) — a fresh, non-reproducible session.

So `window.__seedFeed` always wins (keeping every golden byte-stable), and a human can reproduce a specific simulated run from the URL alone. See [ADR-0016](../decisions/ADR-0016-ga-core-determinism.md).

Golden sequence locked in by the test: seed 42 produces `EURUSD = [1.1715, 1.1714, 1.1714, 1.1714, 1.1714]` for the first 5 ticks.

## Display rounding

Mid / bid / ask are all rounded to the pair's `precision` (4dp for dollar majors, 2dp for JPY / INR) at the tick boundary, not at the consumer. EURUSD's 0.5-pip spread is below 4dp display precision, so `bid == ask == mid` after rounding — that's correct per spec.

## Data model

```typescript
type PriceTick = {
  pair: Pair;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;     // Date.now()
};
```

See also: [data-models/price-tick.md](../data-models/price-tick.md).

## How components consume it

The pricing feed is consumed **directly** by components that need live prices (e.g. `RateCell`, `PricingPanel`) — **not** routed through Zustand. Rationale: 300ms per tick × 4 pairs would thrash Zustand subscribers. Each consuming component subscribes directly to the feed.

`pricingFeed.start()` is called once in `main.tsx` at app boot so the deployed app has live mids within 300ms.

### `usePrice(pair)` hook (FXSW-017)

`src/services/feed/usePrice.ts` is the React-facing wrapper for the feed. Subscribes on mount, unsubscribes on unmount, returns the latest tick. State is seeded from `pricingFeed.getLatest(pair)` so consumers mounting after a tick has already arrived don't render `—` for a frame.

```typescript
const tick = usePrice('EURUSD');  // PriceTick | null
```

In Phase 3 the ticket's `usePrice` call lives at `TicketPanel` level (not inside `PricingPanel` or `ClientSummaryPanel`) so both panels see the same display tick — when fixed mode freezes the rate, they freeze together. See [features/ticket.md](../features/ticket.md) §Pricing-mode-+-margin-state-lifted-to-TicketPanel.

The hook is at `src/services/feed/usePrice.ts` (next to the feed it wraps), not under `src/features/ticket/` — so [active-blotter.md](../features/active-blotter.md)'s `RateCell` can adopt it in a future refactor without a cross-feature import.

## Tests

`src/services/feed/pricingFeed.test.ts` — **6 cases**. Subscribe round-trip; two subscribers receive identical ticks; unsubscribe stops one without affecting others; **seed-42 golden mid sequence `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]`**; `stop()` clears subscriptions; `getLatest()` null-then-cached.

`src/services/feed/usePrice.test.tsx` — **2 cases**. Hook subscribes on mount + receives tick within 600ms; unsubscribes on unmount.

Seed-pinning + half-spread rounding caveat: see [test-patterns.md](test-patterns.md) §1.

## Sources

- `docs/04-dummy-feed-spec.md` §2, §3, §10 — pair config, price model, build-time reference-mid sourcing
- `docs/06-tech-architecture.md` §3, §4 — data flow, service interfaces
- `docs/dev-log.md` FXSW-007 — implementation notes
- `docs/BACKLOG.md` FXSW-007 — implementation ticket
