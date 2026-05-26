---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
  - docs/phase-summaries/FXSW-027-summary.md
status: stable
ticket: FXSW-022
---

# Data model — `MarginSuggestion`

Output of the [suggestion engine](../components/suggestion-engine.md). A **discriminated union** with two variants. Consumed by the [AI Margin Suggestion panel](../features/ai-margin-suggestion.md) and observable in the test contract.

The discriminator field is **`kind`** (not `state`). `state` is the DOM attribute name (`data-suggestion-state`) on the panel; the engine output's discriminator at the type level is `kind`.

```typescript
type ReadySuggestion = {
  kind: 'ready';
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

type CreditDeclineSuggestion = {
  kind: 'credit-decline';
  rationale: string;                   // the CREDIT_DECLINE_RATIONALE constant
  computedAt: number;
};

type MarginSuggestion = ReadySuggestion | CreditDeclineSuggestion;
```

## Algebraic invariant (ready shape)

`sum(factors.map(f => f.delta)) + tierBase === suggestedPips` (before the `max(1, round(...))` clamp). The `engine.test.ts` includes this as an explicit invariant test across sampled inputs.

## Credit-decline shape

No `suggestedPips`, no `factors`, no `confidence`. The `rationale` field carries the `CREDIT_DECLINE_RATIONALE` constant from `src/services/suggestion/rationale.ts`:

> "Credit limit breach — recommend declining. Suggested action: Reject."

The panel renders the rationale + a Reject shortcut button instead of Apply. See [ADR-0007](../decisions/ADR-0007-credit-breach-recommend-decline.md).

## Panel-local display states

The four `data-suggestion-state` values on the panel are **not** all engine outputs:

| `data-suggestion-state` | Source | Notes |
|---|---|---|
| `ready` | Engine `kind: 'ready'` | Engine output. |
| `credit-decline` | Engine `kind: 'credit-decline'` | Engine output. |
| `applied` | Panel-local state | Held as `appliedFrom: number \| null`; presence means "applied," the stored value is what Undo restores. Not an engine output. |
| `computing` | Panel-local state | Shown during the 800ms debounce window after a Recompute trigger. Not an engine output. |

## Test contract

See [features/ai-margin-suggestion.md](../features/ai-margin-suggestion.md) §Test-contract for the full DOM shape with testids per state.

## Implementation

| Ticket | Commit |
|---|---|
| FXSW-022 | `59fff0e` — types declared in `src/services/suggestion/types.ts` |

## Sources

- `docs/09-suggestion-engine.md` §4, §13
- `docs/phase-summaries/FXSW-027-summary.md`
- [components/suggestion-engine.md](../components/suggestion-engine.md)
