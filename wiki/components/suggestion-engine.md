---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
status: in-progress
ticket: FXSW-023
---

# Component — Suggestion engine

Pure deterministic rule engine that produces an AI Margin Suggestion from the deal context, the client profile, and the current market state. **Not a real model call**, not an API call — see [ADR-0006](../decisions/ADR-0006-deterministic-suggestion-engine.md). The phrase "AI" is used because that is how a trader would perceive and describe the feature; the implementation is a pure function and the most-tested file in the codebase.

Files: `src/services/suggestion/engine.ts`, `src/services/suggestion/rationale.ts`, `src/services/suggestion/marketContext.ts`, `src/services/suggestion/clientProfiles.ts`. Tests: `engine.test.ts` (100% branch target), `rationale.test.ts`, `clientProfiles.test.ts`.

## API

```typescript
function suggestMargin(input: SuggestionInput): MarginSuggestion;
```

`SuggestionInput` carries the deal, the client profile, and market context (current bid/ask + per-pair volatility + session liquidity). `MarginSuggestion` shape lives in [data-models/margin-suggestion.md](../data-models/margin-suggestion.md).

## Rule order

The engine starts from the client-tier baseline and adjusts in four passes:

### 1. Client tier baseline

| Tier | Base pips |
|---|---|
| platinum | 1.5 |
| gold | 2 |
| standard | 3 |
| new | 4 |

### 2. Notional size

| Notional (USD-equiv) | Δ pips | Note |
|---|---|---|
| > 20M | +2.5 | Material risk premium |
| 10–20M | +1.5 | |
| 5–10M | +0.5 | |
| ≤ 5M | 0 | |

### 3. Market context

| Condition | Δ pips |
|---|---|
| `pairVolatility > 1.5` | +1 |
| `sessionLiquidity === 'thin'` | +1.5 |
| Pair ∈ `{USDJPY, USDINR}` (high-vol class) | +0.5 |

In v1 the per-pair `pairVolatility` is a static lookup (`EURUSD: 0.5, GBPUSD: 0.8, USDJPY: 1.0, USDINR: 1.2`) and `sessionLiquidity` is hard-coded `'normal'`. All four v1 pair values are ≤ 1.5, so the `pairVolatility > 1.5` branch never fires in v1 — the rule lives in the engine as a v2 hook. The `thin` liquidity branch is also a v2 hook.

### 4. Rejection-reason context

| Reason | Δ pips |
|---|---|
| `OFF_HOURS` | +1.5 |
| `SIZE_LIMIT` | +0.5 |
| `CREDIT_LIMIT` | — (engine short-circuits to credit-decline, see [ADR-0007](../decisions/ADR-0007-credit-breach-recommend-decline.md)) |

### 5. Client behaviour

| Flag | Δ pips |
|---|---|
| `recentBehaviorFlag === 'flight_risk'` | −1 (tighter — win back) |
| `recentBehaviorFlag === 'high_engagement'` AND `recent30dVolume > 100M` | −0.5 (VIP volume) |
| `recent30dAcceptanceRate < 0.4` | −0.5 (softer — encourage engagement) |

### 6. Floor + rounding

```
suggestedPips = max(1, round(base + sum(deltas)))
```

## Confidence

```typescript
function computeConfidence(input): 'low' | 'medium' | 'high';
```

- **High** — established client (`tier !== 'new'`), `recent30dVolume > 10M`, market not thin.
- **Low** — `tier === 'new'`, OR thin liquidity, OR `recent30dVolume < 1M`.
- **Medium** — everything else.

## CREDIT_LIMIT short-circuit

When `rejectionReasons` includes `CREDIT_LIMIT`, the engine returns the credit-decline shape:

```typescript
{ state: 'credit-decline', message: 'Credit limit breach — recommend declining.', ... }
```

No `suggestedPips`. The [AI suggestion panel](../features/) shows a Reject shortcut button instead of Apply. Rationale: see [ADR-0007](../decisions/ADR-0007-credit-breach-recommend-decline.md).

## Algebraic invariant

For non-credit cases: `sum(factors.map(f => f.delta)) + tierBase === suggestedPips` (before the final `max(1, round(...))` clamp). The `engine.test.ts` includes this as an explicit invariant test across sampled inputs.

## Rationale builder

`buildRationale(factors, suggestedPips, input): string`. Composes 2-3 of the largest-magnitude factors into a natural sentence, capped at 120 chars; ends with `— suggesting {N} pips.` for non-credit cases. Drops the lowest-magnitude factor if the sentence exceeds the cap. See `docs/09-suggestion-engine.md` §8 for the worked examples.

## Reactivity

Recomputed when:

1. The ticket opens (SI reaches `PickedUp`).
2. `pairVolatility` shifts by > 30% from the value used for the last computation.
3. The trader explicitly clicks Recompute in the panel header.

Updates are **debounced at 800ms** to avoid flicker. The suggestion does **not** recompute on every price tick — that would be noise.

## Test contract

Coverage targets per `docs/08-test-plan.md` §8: **100% branch coverage on `engine.ts`**, 90% line on `rationale.ts`. Per-named-client + per-scenario snapshot tests (5 × 5 = 25 cases minimum).

## Status

Phase 4 work. Not yet implemented.

## Sources

- `docs/09-suggestion-engine.md` §3, §5, §6, §7, §8, §9 — inputs, rule engine, confidence, credit-decline, rationale, reactivity
- `docs/08-test-plan.md` §1, §8 — coverage targets
- `docs/BACKLOG.md` FXSW-022, FXSW-023, FXSW-024
