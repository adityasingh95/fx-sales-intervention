---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
status: stable
---

# ADR-0006 — AI Margin Suggestion as a deterministic rule engine

**Date:** 2026-05-20 (pre-build)
**Status:** Stable

## Context

The product story is "trader gets an AI-suggested margin with a one-line rationale and an Apply button". The implementation could be a real model call to a hosted LLM (OpenAI, Anthropic, etc.), a small on-device model, or a deterministic rule engine that produces plausible suggestions from the deal + client + market inputs.

The prototype is offline-runnable, free to host, and runs in CI on every PR. It also needs predictable outputs so the Playwright E2E for [scenarios/size-limit-margin-tune.md](../scenarios/size-limit-margin-tune.md) can assert "expect 4 pips, high confidence" without flakiness.

## Options considered

1. **Real model API call.** More impressive demo. Adds latency (200ms-2s), non-determinism, API-key handling, rate limiting, cost per request, network dependency.
2. **Small on-device model.** Eliminates the API key + network dependency but adds a multi-MB model artifact to the bundle and still introduces non-determinism.
3. **Pure deterministic rule engine.** Predictable, free, offline-runnable, 100% branch-testable.

## Decision

Option 3: a pure deterministic rule engine. The implementation is a pure function. The in-UI label remains "AI Margin Suggestion" / "Suggested Markup" — the label is real (this is how a sales desk would describe and perceive the feature) even though the implementation is deterministic.

## Consequences

**Positive:**
- Free to run, offline-safe, no API keys, no rate limits.
- 100% branch coverage achievable — the [suggestion engine](../components/suggestion-engine.md) is the most-tested file in the codebase (`engine.ts` coverage floor: 100% branches per `docs/08-test-plan.md` §8).
- Snapshot tests per named client × per scenario shape (5 × 5 = 25 cases minimum) lock in expected outputs.
- Per-scenario E2E assertions stable — `SIZE_LIMIT_MARGIN_TUNE` always produces 4 pips, high confidence.
- The rule structure is auditable. The "Why?" expansion in the panel shows every contributing factor and its delta in pips — a trader can sanity-check the suggestion in 5 seconds.

**Negative:**
- The demo story has an asterisk. Anyone who knows how LLMs work will spot that the output is deterministic. The honest answer is that this is a prototype and the engine is the demonstration of the *product surface*, not the model.
- The v2 path — replacing the rule engine with a real model call — would need careful handling of the test contract. The E2E assertions on specific pip values would have to soften to range-based assertions, or the model would need pinning + seeding.

## Implementation

See [components/suggestion-engine.md](../components/suggestion-engine.md) for the rule structure. The credit-breach guardrail (no margin proposed, Reject shortcut shown) is a separate but related decision — [ADR-0007](ADR-0007-credit-breach-recommend-decline.md).

## Sources

- `docs/09-suggestion-engine.md` §1, §5 — rule engine, motivation
- `docs/08-test-plan.md` §1, §8 — 100% branch coverage requirement
- `docs/BACKLOG.md` FXSW-023 — implementation ticket
