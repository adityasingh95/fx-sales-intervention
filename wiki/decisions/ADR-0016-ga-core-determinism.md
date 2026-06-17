---
last_updated: 2026-06-17
sources:
  - docs/phase-summaries/phase-11-swaps-summary.md
  - docs/dev-log.md
status: stable
ticket: FXSW-090
---

# ADR-0016 — GA-core determinism: seeded coin-flip, deal cleanup, injectable IDs

**Date:** 2026-06-17 (Phase 11, FXSW-090)
**Status:** Stable

## Context

The cold security/quality review of the GA core (`audit-core-pre-phase9-review.md`) flagged three reproducibility/robustness gaps that predated the instrument work: the client accept/reject follow-up used `Math.random()` (so a scenario's outcome was not reproducible), pending timers/state-gates for an archived deal were never cleared (an unbounded `gates` Set), and there was no human-friendly way to replay a specific simulated run. These are GA-core concerns, independent of NDF/swap.

## Decision

- **Seeded coin-flip.** The `CLIENT_ACCEPT_OR_REJECT` follow-up is resolved by a seeded PRNG keyed off the deal id (`makeRng(hashSeed(dealId) ^ PLAYER_SEED)`, reusing `services/feed/rng`) instead of `Math.random()`. A given deal's outcome is now reproducible. See [components/scenario-player.md](../components/scenario-player.md).
- **`forgetDeal(dealId)`.** On archival the [scenario player](../components/scenario-player.md) clears every pending timer and state-gate owned by the deal, so no stale follow-up fires and the `gates` Set cannot grow unbounded.
- **Injectable seams.** The player accepts `generateDealId?` and `acceptOrReject?(dealId)` overrides so tests can pin both the id and the follow-up outcome deterministically.
- **`?seed=N` replay knob.** The [pricing feed](../components/pricing-feed.md) resolves its seed with the precedence `window.__seedFeed` (programmatic test path — goldens unchanged) → `?seed=N` URL param (human replay) → wall-clock (fresh session).

### Options considered

- **Leave `Math.random()` and pin only in tests.** Rejected — the scenario outcome was non-reproducible outside tests, and `?seed=N` lets a human replay a run by pasting a URL.
- **Reset the gates Set wholesale on archival.** Rejected — would drop other deals' live gates; `forgetDeal` scopes cleanup to the one dealId.

## Consequences

- **Positive:** scenario outcomes reproducible per deal; no timer/gate leak; runs replayable from a URL; `window.__seedFeed` precedence keeps every existing golden byte-stable.
- **Negative:** runtime deal ids still use `Math.random()` (acceptable — they are opaque handles, not economic inputs); the seed precedence is a small rule a reader must know.

## Sources

- `docs/phase-summaries/phase-11-swaps-summary.md` — FXSW-090 (renumbering note)
- `docs/dev-log.md` FXSW-090
- `security/audit-core-pre-phase9-review.md` — the GA-core findings this ADR closes
- Related: [components/scenario-player.md](../components/scenario-player.md), [components/pricing-feed.md](../components/pricing-feed.md)
