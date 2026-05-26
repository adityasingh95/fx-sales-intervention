---
last_updated: 2026-05-26
sources:
  - docs/01-prd.md
  - docs/06-tech-architecture.md
status: superseded
superseded_by: implementation choice in FXSW-012
---

# ADR-0004 — AG-Grid Community over TanStack Table (superseded)

**Date:** 2026-05-20 (original decision, pre-build)
**Superseded:** 2026-05-24 (FXSW-012 — see Consequences below)
**Status:** Superseded — kept for history

## Context

Both blotters render tabular data. The two viable React table libraries are:

- **AG-Grid Community** — the de facto trading-blotter grid. Free tier covers everything a basic blotter needs. Larger bundle (~200KB gzipped). Pre-built cell renderers, column resize, sort.
- **TanStack Table (formerly React Table)** — headless, BYO-everything. Tiny. More flexible.

## Options considered

1. AG-Grid Community.
2. TanStack Table.
3. A plain flex-row table built from divs / buttons.

## Original decision

Option 1: AG-Grid Community, for fidelity to the typical trading-blotter aesthetic.

## Decision after implementation (FXSW-012)

Option 3: A plain flex-row table. AG-Grid never shipped despite being in `package.json`.

## Why the change

The Phase 2 implementation of [active-blotter.md](../features/active-blotter.md) and [historic-blotter.md](../features/historic-blotter.md) discovered that AG-Grid 31 has no first-class API for per-row `data-*` attributes. The Playwright test contract (see [scenarios/](../scenarios/)) is built on `data-deal-id`, `data-rfs-state`, `data-si-state`, `data-display-status`, `data-dealable`, `data-removing` — all on each row. Implementing those via AG-Grid would have required either:

- A custom row template (heavy + brittle).
- Post-render DOM mutation (fragile + hostile to React).

Meanwhile, the spec for the v1 blotter doesn't need any AG-Grid-specific features:
- No virtualization (deal counts stay small).
- No column resize / pinning / grouping.
- No inline editing.
- No grid-internal sort (default sort is static).

A plain flex-row table built from `<button>` rows satisfies every behavioural AC, gives clean `data-*` attributes, and is ~200KB lighter in the bundle. The trader-blotter aesthetic comes from the design tokens + spacing — not from the grid library.

## Consequences

**Positive:**
- Cleaner test contract; every row's `data-*` attributes are just JSX props.
- Smaller bundle.
- No grid-library version churn to track.
- Component is ~80 lines instead of ~250 lines of grid-config plumbing.

**Negative:**
- `ag-grid-community` and `ag-grid-react` remain in `package.json` for potential future tickets that genuinely need virtualization or column features. Some tree-shaking benefit lost.
- The "AG-Grid Community" line in [overview.md](../overview.md)-style stack descriptions is stale — the prototype no longer uses it on the deployed-build path.

## Status

Marked **superseded** rather than rewritten: the original decision is part of the spec pack and the v2 path may still adopt AG-Grid for features the prototype doesn't have. The implementation reality wins; the spec-vs-toolchain reconciliation is captured here so future readers see the decision trail.

## Sources

- `docs/01-prd.md` §9 Q1 — original decision
- `docs/06-tech-architecture.md` §1 — pinned versions
- `docs/dev-log.md` FXSW-012 — implementation choice + rationale
