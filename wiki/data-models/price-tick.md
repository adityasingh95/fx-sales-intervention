---
last_updated: 2026-05-26
sources:
  - docs/04-dummy-feed-spec.md
status: stable
---

# Data model — `PriceTick`

A single price update emitted by the [pricing feed](../components/pricing-feed.md).

```typescript
type PriceTick = {
  pair: Pair;            // 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;     // Date.now()
};
```

| Field | Notes |
|---|---|
| `pair` | Closed union. Mirrored in `PAIRS` `as const satisfies readonly Pair[]`. |
| `bid` / `ask` / `mid` | Rounded to the pair's pip precision at the tick boundary, not at the consumer. 4dp for EURUSD / GBPUSD; 2dp for USDJPY / USDINR. |
| `timestamp` | Milliseconds. Used by `RateCell` to detect stale ticks (>3s → cell shows "—"). |

## Notes

- EURUSD's 0.5-pip spread is below 4dp display precision, so after rounding `bid == ask == mid`. Correct per spec, not a bug.
- USDJPY's 1.0-pip spread at 2dp always shows the strict ordering `bid < mid < ask`.
- The pricing feed is consumed directly by components via `usePrice(pair)` hooks — not routed through Zustand. Rationale: 300ms tick × 4 pairs would thrash Zustand subscribers.

## Sources

- `docs/04-dummy-feed-spec.md` §2, §3
- [components/pricing-feed.md](../components/pricing-feed.md)
