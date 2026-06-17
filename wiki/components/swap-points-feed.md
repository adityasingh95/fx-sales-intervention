---
last_updated: 2026-06-17
sources:
  - docs/04-dummy-feed-spec.md
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-083
---

# Component — Swap Points Feed

The pricing source for v4 [swaps](../features/swaps.md). `swapPointsFeed.get(pair, near, far)` returns both legs' two-sided forward points plus the **net differential** (`net = far − near` per side). It is a **pure composition** of the [forward-points feed](pricing-feed.md) — it draws **no new randomness**, so the seed-42 golden and the forward mid sequence are byte-stable.

File: `src/services/feed/swapPoints.ts`. Tests: `swapPoints.test.ts`.

## API

```typescript
type SwapPoints = {
  near: ForwardPointsPair;            // { bid, ask, mid }
  far: ForwardPointsPair;
  net: { bid: number; ask: number };  // far − near, per side
};

swapPointsFeed.get(pair: Pair, nearTenor: Tenor, farTenor: Tenor): SwapPoints
```

## Behaviour

1. Calls `forwardPointsFeed.get(pair, nearTenor)` and `forwardPointsFeed.get(pair, farTenor)` — the same two-sided `{ bid, ask, mid }` points the v3 [forward pricing](../features/forward-pricing.md) uses (see [pricing-feed.md](pricing-feed.md) and FXSW-073).
2. Computes the net per side: `net.bid = round1(far.bid − near.bid)`, `net.ask = round1(far.ask − near.ask)`.
3. Returns both legs plus the net.

Because the only entropy is whatever the forward-points feed already produced, **no RNG draw is added** (FXSW-083). The forward-points spread is itself RNG-free (derived deterministically from tenor), so the whole swap chain is deterministic given the spot seed.

## Design boundary

The feed stays **instrument-agnostic**: it produces the raw differential only. All swap *semantics* — client markup (Per-component vs Total), one-sided gating, P/L — live in `src/lib/pips.ts` and the [SwapPanel](../features/swaps.md), not here. A zero-markup quote therefore shows exactly the raw `far − near` differential. See [ADR-0014](../decisions/ADR-0014-swap-net-points-pricing.md).

## Tests

`swapPoints.test.ts` asserts: net = far − near per side at the pair's precision; composition matches two direct `forwardPointsFeed.get` calls (no divergence); SPOT-leg cases (a SPOT leg contributes zero points); determinism under a pinned seed.

## Sources

- `docs/04-dummy-feed-spec.md` — feed model
- `docs/phase-summaries/phase-11-swaps-summary.md` — FXSW-083 (pure composition, net = far − near)
- `docs/dev-log.md` FXSW-083
- `security/FXSW-087-review.md` F-4 — net built once at the feed boundary, no new RNG (positive)
