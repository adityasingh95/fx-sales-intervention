---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/phase-summaries/phase-10-ndf-summary.md
  - docs/dev-log.md
status: stable
ticket: FXSW-079, FXSW-089
---

# ADR-0013 — NDF is priced points-only, enforced structurally

**Date:** 2026-06-17 (Phase 10)
**Status:** Stable

## Context

An [NDF](../features/ndf.md) is cash-settled: the trader marks up the **forward points**, never the spot. The first implementation removed the spot-margin control and markup-mode toggle from the manual ticket render — but the Phase 10 security review (`security/FXSW-081-review.md`, F-1 High) found the **auto-priced (ESP) NDF view still applied a 3-pip spot markup**, and the quote-context capture recorded a phantom spot markup (F-3). The "no spot markup" rule was enforced in **one render path**, so other paths leaked it back.

## Decision

Enforce points-only **structurally**, with a single source of truth in the pricing layer rather than in any view. `spotMarginFor(instrument, marginPair)` in `src/lib/pips.ts` returns `{ bid: 0, ask: 0 }` for an NDF and the entered margin otherwise. **Every** consumer of a priced deal's spot margin calls it:

- the manual ticket (`effectiveSpotMargin`),
- the auto-priced (ESP) read-only view,
- the quote-context capture hook.

The markup-mode toggle is forced off for NDF (`effectiveMarkupMode = 'component'`, `showMarkupToggle={!isNdf}`), and an NDF deal is coerced to a forward tenor at build time (a SPOT request → shortest forward). The three regressions were fixed in-phase during FXSW-080; a new auto-priced-NDF E2E guards the path.

### Options considered

- **Hide the spot-margin control per view (UI-only).** Rejected — that is exactly what failed: every render/capture path would have to remember to zero it, and one (the auto view) didn't.
- **A separate NDF pricing function that omits spot entirely.** Rejected — duplicates the forward math; a single `spotMarginFor` gate reuses the existing outright/points pipeline and makes the zero impossible to bypass via keyboard accelerators or AI-Apply.

## Consequences

- **Positive:** points-only is now a property of the math, not a view; the captured execution margin reconciles with what was shown; defense-in-depth against future render paths. NDF reuses the entire v3 forward surface (two-sided points, all-in, P&L, one-sided lock) minus one degree of freedom.
- **Negative:** consumers must remember to route spot margin through `spotMarginFor` (convention, not type-enforced). The Trader Rate spot cells remain visible (the spot still feeds the outright), which a reader could mistake for an editable spot — mitigated by the `ndf-note`.

## Sources

- `docs/02-functional-spec.md` §12.2 — NDF points-only
- `docs/phase-summaries/phase-10-ndf-summary.md` — FXSW-079, FXSW-089
- `docs/dev-log.md` FXSW-079, FXSW-080, FXSW-089
- `security/FXSW-081-review.md` — F-1 (High), F-3, F-4 (the regressions this ADR closes)
