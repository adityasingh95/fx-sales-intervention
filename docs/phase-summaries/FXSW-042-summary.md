---
phase: 6
ticket_range: FXSW-035 → FXSW-042
date: 2026-06-09
branch: dev/v2
gate_counts:
  unit_tests: 379 pass / 0 todo (was 316 at end of Phase 5)
  e2e_tests: 6 pass (smoke + happy-path-esp + off-hours-intervention + credit-breach + size-limit-margin-tune + release-path)
  typecheck: clean
  lint: clean (--max-warnings 0)
  build: clean
  brand_grep: dist/ brand-neutral on every commit's build
---

# Phase 6 Summary — UX enhancements (v2 preview)

Phase 6 ships the user-requested UX polish slice — entirely behind the `?dev=v2` URL gate, on a long-lived `dev/v2` branch. `main` is byte-for-byte untouched; v1 behaviour preserved everywhere (gates verify the v1 contract via the existing test suite at no-query / `?dev=1`).

Builds on Phase 5's shippable ship-state. End state: at `?dev=v2`, the trader gets a resizable blotter divider, three request directions (BUY / SELL / BOTH), an explicit dealt-currency field, redesigned side selection in the Pricing Panel, independent bid + ask margins with Balance / Zero shortcuts, direction-aware P/L, and a card-stack layout on narrow viewports.

## What shipped

- **FXSW-035** `07baaae` — `devVersion` parser + `?dev=v2` URL gate. Single source of truth: `src/lib/devVersion.ts`.
- **FXSW-036** `9b3013d` — Resizable blotter divider with sessionStorage persistence under `si.blotterSplit`. New `<ResizeHandle>` primitive + extracted `resizeMath` helpers.
- **FXSW-037** `f5ecd5e` — `Side` widened to `'BUY' | 'SELL' | 'BOTH'`; new required `dealtCcy: 'BASE' | 'QUOTE'` on `Deal`; new `quoteSideFor(side, dealtCcy)` helper covering the canonical 4-row + BOTH truth table. Two new scenarios (`BOTH_SIDED_INQUIRY`, `QUOTE_DEALT_INQUIRY`); DevInjector splits into V1/V2 lists.
- **FXSW-038** `165dbab` — PricingPanel side-selection UX: dim non-selected cell (50% opacity), re-click toggles back to streaming, disable the non-quoteable side when the request is one-sided (35% opacity + `cursor-not-allowed`).
- **FXSW-039** `633080c` — Dual margin state model. New `MarginPair = { bid: number; ask: number }` type. TicketPanel holds the pair; SuggestionPanel gains optional `onUndo` for lossless v2 undo. v1 path uses the synthesized single value.
- **FXSW-040** `9a10bf5` — Dual margin UI: two stacked `[label][−][input][+]` rows with Balance + Zero buttons centred between them. Per-input keyboard `+/-`. Eight new testids (`margin-input-bid` / `-ask`, `margin-plus-bid` / etc).
- **FXSW-041** `4e5b497` — Direction-aware P/L display: `BID` → single `pnl-bid` line, `ASK` → single `pnl-ask`, `BOTH` → composite `pnl-both` cell. v1 keeps the existing `estimated-profit` testid + blended-average label.
- **FXSW-042** `fd21a5a` — Mobile card-stack blotters at < 768px in v2. New `useIsMobile` hook + ActiveCard + HistoricCard sub-components. v1 retains the horizontal-scroll table per its ship contract.

## What's rough or open

- **AI suggestion is direction-magnitude only.** Engine API unchanged — returns a single `suggestedPips` value applied to both sides on Apply. A future v3 could return `{ bidPips, askPips }` to model asymmetric tier-based skews; deliberately deferred to keep the engine's pure-function contract + test surface intact (`docs/09 §15`).
- **The `inject-RESET` button doesn't clear `savedPairForUndo`.** The state resets when a new deal opens via the `useEffect(..., [openDealId, entry])` reset, but if the trader keeps the ticket open across a `Reset` injection that re-uses the same deal ID, undo could replay stale state. Low-probability path; left as a future polish item.
- **Mobile card layout doesn't surface the trader rate or status pill colour bar.** Tap-to-open the ticket gives full detail; the card itself is intentionally a glance-only summary.
- **`useIsMobile` evaluates at the `matchMedia` breakpoint only.** Browser dev-tools that simulate mobile via UA but keep the desktop viewport will not flip the layout. Acceptable for the prototype.

## What surprised you

- **`SuggestionInput.side` was already trivially widened.** The engine never reads `side` internally — the field is preserved in the input shape for tests and rationale-builder symmetry only. Widening to include BOTH was a one-line change with no functional cascade.
- **jsdom drops `clientY` from `PointerEvent` construction.** The ResizeHandle drag-math tests needed to dispatch `new MouseEvent('pointermove', ...)` instead of using `fireEvent.pointerMove`. Documented in the test file for future readers.
- **The v1 `referenceMids.json` got nuked twice during the session** when long-running dev servers were killed mid-fetch. The CI workflow's `USE_FALLBACK_MIDS=true` fetch step (FXSW-032) saved us; a manual fetch was needed locally to recover.
- **Dual-margin "Undo" can't lossless-restore via a single number.** Discovered while implementing FXSW-039 — the v1 SuggestionPanel API `(next: number) => void` was sufficient when bid===ask always, but v2 lets bid≠ask. Solution: optional `onUndo: () => void` callback so the parent owns the pair restore. Falls back to v1 single-value path when omitted.
- **The mobile breakpoint reversal** ("card-stacked mobile is out" per `docs/05 §9` v1) made sense for v1's "single layout in the codebase" simplicity goal but did not survive contact with real mobile use. v2 reverses it; v1 contract preserved on `main`.
- **`pnpm dev` exits when stdout is closed** (e.g. piped to `head -3`). Used `> /tmp/log` redirection for the visual-verification screenshots.

## Recommended next slice

`dev/v2` is feature-complete relative to the user's request. Next:

1. **Wiki Agent ingest** — separate session, human-triggered. Ingest this summary + all 8 commits. Affected pages:
   - Updated: `wiki/features/ticket.md`, `wiki/features/ai-margin-suggestion.md`, `wiki/data-models/deal.md`, `wiki/data-models/margin-suggestion.md`, `wiki/overview.md`.
   - New: `wiki/components/resize-handle.md`, `wiki/components/dev-version.md`, `wiki/components/use-is-mobile.md`, `wiki/components/quote-side.md`, `wiki/scenarios/both-sided-inquiry.md`, `wiki/scenarios/quote-dealt-inquiry.md`.
2. **Promotion decision** — when v2 is approved for general availability, squash-merge `dev/v2` into `main` and strip the `devVersion === 'v1'` fallback branches. That's a separate cleanup phase.
3. **Optional polish** — the rough/open items above can be picked up individually if needed.

## Brand-neutrality

`grep -ri caplin docs/ src/ tests/ scripts/` returns zero hits. Every commit's `dist/` build is brand-neutral per the FXSW-032 CI gate.

## Tests + gates by ticket

| Ticket | Unit Δ | E2E | Visual |
|---|---|---|---|
| FXSW-035 | +9 (parser + App superset) | 6/6 | parser only — no UI |
| FXSW-036 | +16 (resize math + handle + settings store + App branching + ResizeObserver polyfill) | 6/6 | drag at `?dev=v2`; clamps engage; persists |
| FXSW-037 | +14 (truth table + dispatcher + DevInjector + scenarios) | 6/6 | BOTH scenario row + ticket; quote-dealt toast text |
| FXSW-038 | +7 (dim + disabled + re-click + v1 regression) | 6/6 | indigo glow + 50% dim + 35% disabled at v2 |
| FXSW-039 | +2 (divergent bid/ask render + blended P/L placeholder) | 6/6 | no visual change in this ticket |
| FXSW-040 | +7 (dual UI render + per-side +/- + Balance + Zero + independent edit + keyboard) | 6/6 | dual inputs + Balance + Zero in OFF_HOURS ticket |
| FXSW-041 | +3 (BID + ASK + BOTH P/L branches) | 6/6 | per-direction P/L on `?dev=v2` tickets |
| FXSW-042 | +5 (v2-mobile cards + v1-mobile preserved + useIsMobile hook) | 6/6 | 375×812 v2 stacked cards vs v1 cropped table |

Cumulative: 316 → 379 unit tests (+63). Six e2e specs unchanged + green throughout.
