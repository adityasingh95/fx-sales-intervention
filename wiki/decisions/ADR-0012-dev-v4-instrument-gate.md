---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-09-v4-summary.md
  - docs/phase-summaries/phase-10-ndf-summary.md
status: stable
ticket: FXSW-072, FXSW-078
---

# ADR-0012 — `?dev=v4` instrument gate + `instrumentType` discriminator

**Date:** 2026-06-17 (Phase 9–10)
**Status:** Stable

## Context

v4 introduces whole new **instruments** (NDF, swap) on top of the v3 forward work. Two questions had to be settled before any instrument shipped: (1) how to gate the new surfaces so the GA spot app and `?dev=v3` stay byte-stable, and (2) how to distinguish instruments at runtime without churning the ~13 existing `Deal` fixtures or the GA/v3 call sites.

## Decision

**A single preview flag, `?dev=v4`, that is a strict superset of `?dev=v3`.** `src/lib/devVersion.ts` parses `dev` into `'v1' | 'v3' | 'v4'`; `isV3()` returns true for **both** v3 and v4, while `isV4()` is v4-only. So every existing v3 call site "lights up" under v4 with no edit, and only genuinely new instrument surfaces are guarded by `isV4()`. (FXSW-047 had already removed the older `?dev=v2` / `?theme=preview` gates at GA; any value other than `v3`/`v4` resolves to `v1`.)

**An optional `Deal.instrumentType` discriminator** (`SPOT | OUTRIGHT | NDF | SWAP`) with an `instrumentOf(deal)` resolver that derives the default from the tenor when the field is absent (`SPOT` tenor → `SPOT`, any forward tenor → `OUTRIGHT`; NDF/SWAP never auto-derived). `buildDeal` sets it explicitly on every injected deal.

### Options considered

- **A new orthogonal flag (e.g. `?instr=...`) alongside `?dev=v3`.** Rejected — two flags to compose and thread; v4 is conceptually "v3 plus instruments," so a superset flag is simpler.
- **A required `instrumentType` on `Deal`.** Rejected — would force a value onto every legacy fixture and break byte-stability. Optional + resolver keeps fixtures untouched while staying type-safe.
- **Per-component version props threaded through the tree.** Rejected — the project's established pattern is module-level `isV3()`/`isV4()` calls, no prop threading.

## Consequences

- **Positive:** GA and v3 are byte-unchanged (verified by the seed-42 golden + GA spot baseline); v3 code needed zero edits to run under v4; `instrumentOf` gives one read-site-consistent answer everywhere; legacy fixtures untouched.
- **Negative:** `isV3()` being true under v4 is a subtlety a reader must learn (documented in the module header). The discriminator being optional means every consumer must go through `instrumentOf()` rather than reading the field directly — enforced by convention, not the type system.

## Sources

- `docs/02-functional-spec.md` §12 — instrument discriminator
- `docs/05-ui-ux-spec.md` §16 — the `?dev=v4` gate
- `docs/phase-summaries/phase-09-v4-summary.md` (FXSW-072), `phase-10-ndf-summary.md` (FXSW-078)
- Related: [ADR-0010](ADR-0010-brand-neutral-product.md) (preview-flag pattern lineage), [data-models/deal.md](../data-models/deal.md)
