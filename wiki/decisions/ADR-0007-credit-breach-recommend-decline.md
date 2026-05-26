---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
status: stable
---

# ADR-0007 — Credit-limit breach triggers AI Reject recommendation, not wider pricing

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The [suggestion engine](../components/suggestion-engine.md) takes a deal's rejection reasons as input. `OFF_HOURS` adds +1.5 pips, `SIZE_LIMIT` adds +0.5 pips — both are "the auto-pricer wouldn't price this, so widen the manual margin". A natural third row would be "`CREDIT_LIMIT` adds +N pips for risk premium" — same shape, just another delta.

But credit-limit breach is different in kind. The client's available credit has been exceeded; pricing the trade — at any margin — books risk the bank's credit officers have already flagged as unacceptable. Trying to capture the trade with wider pricing is wrong even if it makes the suggestion engine's API uniform.

## Options considered

1. **Uniform handling.** `CREDIT_LIMIT` is just another rejection reason; the engine adds +N pips and returns a normal `ready`-state suggestion. The trader sees a wider margin and is implicitly nudged to book the trade.
2. **Special-case handling.** When `rejectionReasons` includes `CREDIT_LIMIT`, the engine short-circuits and returns a `credit-decline` shape (no `suggestedPips`, with a recommend-decline message). The [AI Margin Suggestion panel](../features/ai-margin-suggestion.md) renders a Reject shortcut button instead of Apply.

## Decision

Option 2: special-case handling. Credit-breach → recommend decline.

## Consequences

**Positive:**
- Frames the AI as a **guardrail, not a gas pedal**. The product story works because the AI's "smart" moment is knowing when *not* to suggest pricing.
- Removes the cognitive load of "what should I do with a credit-limit-breach deal" from the trader. The recommendation is explicit and one click away.
- The credit-breach demo scenario (see [scenarios/credit-breach.md](../scenarios/credit-breach.md)) becomes a strong product moment — the AI demonstrates judgement, not just arithmetic.
- The Reject shortcut fires the same SI `Reject` event as the ticket footer, so there's a single code path for the action — no parallel handler to maintain.

**Negative:**
- Asymmetric API shape on `MarginSuggestion`. The engine returns either the `ready` shape (with `suggestedPips`, `factors`, `confidence`, `rationale`) or the `credit-decline` shape (with `message` only). The panel has to render two different layouts. Acceptable given the conceptual difference is real.
- A future rejection reason that warrants the same "recommend decline" treatment (e.g. "client on a sanctions list") would need to extend the short-circuit logic. Not a problem at v1 — there's only one credit-decline-style reason — but worth flagging.

## Implementation

- Engine: `src/services/suggestion/engine.ts`. The first branch in `suggestMargin` checks `input.deal.rejectionReasons.includes('CREDIT_LIMIT')`. If true, returns `{ state: 'credit-decline', message: '...', computedAt: ... }` without running the rest of the rule chain.
- Panel: `src/features/ticket/SuggestionPanel.tsx`. Renders the `data-suggestion-state="credit-decline"` layout (red border, AlertTriangle icon, Reject shortcut button replacing Apply). See [features/ai-margin-suggestion.md](../features/ai-margin-suggestion.md) §Layout-credit-decline-state.

## Test contract

```html
<section data-testid="suggestion-panel" data-suggestion-state="credit-decline">
  <p>Credit limit breach — recommend declining.</p>
  <button data-testid="suggestion-reject">Reject deal</button>
</section>
```

The E2E for [scenarios/credit-breach.md](../scenarios/credit-breach.md) asserts on this attribute + button.

## Sources

- `docs/09-suggestion-engine.md` §7
- `docs/02-functional-spec.md` §4.3 — panel credit-decline behaviour
- `docs/05-ui-ux-spec.md` §4.5 — visual layout
