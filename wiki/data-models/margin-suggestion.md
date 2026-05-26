---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
status: in-progress
---

# Data model — `MarginSuggestion`

Output of the [suggestion engine](../components/suggestion-engine.md). Consumed by the [AI Margin Suggestion panel](../features/ai-margin-suggestion.md) and observable in the test contract.

## Shape — `ready` state

```typescript
type MarginSuggestion = {
  state: 'ready';
  suggestedPips: number;               // ≥ 1, after clamp + round
  confidence: 'low' | 'medium' | 'high';
  rationale: string;                   // single-line, ≤ 120 chars
  factors: Array<{
    name: string;                      // e.g. "Notional size"
    delta: number;                     // pips added (positive) or removed (negative)
    note: string;                      // short explanation, ≤ 60 chars
  }>;
  computedAt: number;                  // Date.now()
};
```

`sum(factors.map(f => f.delta)) + tierBase === suggestedPips` (before the `max(1, round(...))` clamp). The algebraic invariant is tested explicitly.

## Shape — `credit-decline` state

When `rejectionReasons` includes `CREDIT_LIMIT`, the engine short-circuits. See [ADR-0007](../decisions/ADR-0007-credit-breach-recommend-decline.md).

```typescript
type MarginSuggestion = {
  state: 'credit-decline';
  message: string;       // "Credit limit breach — recommend declining."
  computedAt: number;
};
```

No `suggestedPips`, no `factors`, no `confidence`. The panel renders a Reject shortcut button instead of Apply.

## Shape — `computing` state

Returned during the 800ms debounce window after a recompute trigger. Renders the shimmer skeleton in the panel.

```typescript
type MarginSuggestion = { state: 'computing' };
```

## Apply / Undo lifecycle

After the trader clicks Apply, the panel switches to a fourth display state — `applied` — which carries `{ state: 'applied', appliedPips, previousMarginPips }` for the Undo path. This isn't an engine output; it's panel-local state. The actual margin on the deal context is mutated by the panel's Apply handler.

## Test contract

```html
<section data-testid="suggestion-panel" data-suggestion-state="ready">
  <div data-testid="suggestion-pips">4</div>
  <div data-testid="suggestion-confidence">high</div>
  <p data-testid="suggestion-rationale">Gold-tier client with 12M EURUSD…</p>
  <button data-testid="suggestion-apply">Apply</button>
  <button data-testid="suggestion-why">Why?</button>
</section>
```

`data-suggestion-state` values: `computing`, `ready`, `applied`, `credit-decline`.

## Sources

- `docs/09-suggestion-engine.md` §4, §13
- [components/suggestion-engine.md](../components/suggestion-engine.md)
