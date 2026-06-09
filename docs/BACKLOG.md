# BACKLOG.md

Brand-neutral implementation backlog for **FX Sales Workstation**.

This sanitized backlog preserves the completed ticket map and current delivery status without retaining vendor-specific wording from earlier research notes.

## Working rules

- Work tickets in order within a phase.
- Use the ticket ID in commit messages.
- Keep docs, tests, and implementation aligned.
- Do not add vendor names anywhere in committed files or generated output.
- Do not edit `src/` from documentation-cleanup tasks unless explicitly approved.

## TDD intensity legend

| Mark | Meaning |
|---|---|
| **Strict** | Tests first, red → green, then refactor. |
| **Alongside** | Component API and behaviour tests written with implementation. |
| **Acceptance** | E2E/acceptance scenario validates the flow. |

## Summary

| ID | Title | Phase | Status |
|---|---|---|---|
| FXSW-001 | Project scaffolding | 1 | Done |
| FXSW-002 | Design tokens + Tailwind config | 1 | Done |
| FXSW-003 | Folder structure | 1 | Done |
| FXSW-004 | Prebuild reference-mids script | 1 | Done |
| FXSW-005 | State machine skeletons | 1 | Done |
| FXSW-006 | AppShell + Header + empty blotter | 1 | Done |
| FXSW-007 | PricingFeed with seeded RNG | 2 | Done |
| FXSW-008 | DealFeed + scenario player | 2 | Done |
| FXSW-009 | dealsStore + machine spawning | 2 | Done |
| FXSW-010 | dealMachine cross-model coordination | 2 | Done |
| FXSW-011 | statusFromMachines derivation | 2 | Done |
| FXSW-012 | Active Blotter live + 5s removal + Historic | 2 | Done |
| FXSW-013 | DevInjector + HAPPY_PATH_ESP E2E | 2 | Done |
| FXSW-014 | TicketPanel shell + glass overlay | 3 | Done |
| FXSW-015 | ReasonsPanel | 3 | Done |
| FXSW-016 | Summary + DealSummary panels | 3 | Done |
| FXSW-017 | PricingPanel streaming mode | 3 | Done |
| FXSW-018 | PricingPanel fixed mode + margin controls | 3 | Done |
| FXSW-019 | ClientSummaryPanel | 3 | Done |
| FXSW-020 | TicketFooter + acknowledgement flow | 3 | Done |
| FXSW-021 | OFF_HOURS_INTERVENTION E2E | 3 | Done |
| FXSW-022 | Client profile seed data | 4 | Done |
| FXSW-023 | Suggestion engine | 4 | Done |
| FXSW-024 | Rationale builder | 4 | Done |
| FXSW-025 | SuggestionPanel ready / applied / Undo | 4 | Done |
| FXSW-026 | SuggestionPanel credit-decline + recompute | 4 | Done |
| FXSW-027 | SIZE_LIMIT + CREDIT_BREACH E2E | 4 | Done |
| FXSW-028 | Notifications visual layer | 5 | Done |
| FXSW-029 | Audio chime + mute + settingsStore | 5 | Done |
| FXSW-030 | Visual polish pass | 5 | Done |
| FXSW-031 | RELEASE_PATH E2E | 5 | Done |
| FXSW-032 | CI workflow | 5 | Done |
| FXSW-033 | README + demo recording placeholder | 5 | Partial |
| FXSW-034 | GitHub Pages deploy workflow | 5 | Done, pulled forward in Phase 1 |
| FXSW-035 | `devVersion` parser + `?dev=v2` URL gate | 6 | Done |
| FXSW-036 | Resizable blotter divider + sessionStorage persistence (v2) | 6 | Done |
| FXSW-037 | Extend `Side` to BOTH; add `dealtCcy`; `quoteSideFor` helper; BOTH + quote-dealt scenarios; DevInjector entries | 6 | Open |
| FXSW-038 | PricingPanel side-selection UX: dim, re-click-toggle, disabled side (v2) | 6 | Open |
| FXSW-039 | Dual margin state model — replace `margin: number` with `{ marginBid, marginAsk }` (v2) | 6 | Open |
| FXSW-040 | Dual margin UI — two inputs + Balance + Zero buttons (v2) | 6 | Open |
| FXSW-041 | Direction-aware P/L display via `quoteSideFor` (v2) | 6 | Open |
| FXSW-042 | Mobile card-stack blotters at < md breakpoint (v2) | 6 | Open |

## Phase summaries

### Phase 1 — Scaffold + first slice

Established the React/Vite/TypeScript application, tokens, folder structure, initial state-machine skeletons, AppShell, and deployment workflow.

### Phase 2 — Feed + state coordination

Added deterministic pricing feed, scenario-driven deal feed, state store, parent/child state-machine coordination, derived blotter statuses, Active/Historic blotters, Dev Injector, and Happy Path ESP E2E coverage.

### Phase 3 — Ticket panels + actions

Added the ticket overlay, Reasons/Summary/Deal Summary/Pricing/Client Summary panels, footer actions, acknowledgement flows, and OFF_HOURS_INTERVENTION E2E coverage.

### Phase 4 — AI Margin Suggestion

Added client profiles, deterministic suggestion engine, rationale builder, suggestion panel states, credit-decline guardrail, and E2E coverage for credit and margin-tune scenarios.

### Phase 5 — Notifications + polish + ship

Added toasts, title flash, row flash, audio chime, mute persistence, shared button primitives, visual polish, release-path E2E, CI workflow, and README/demo packaging.

### Phase 6 — UX enhancements (v2 preview, behind `?dev=v2`)

Phase 6 lands on the long-lived `dev/v2` branch and ships behind a `?dev=v2` URL gate. The v1 ship state on `main` is preserved byte-for-byte; v2 features layer in via `src/lib/devVersion.ts`. Scope:

- Resizable blotter divider with sessionStorage-persisted split.
- Three-direction request model (`BUY` / `SELL` / `BOTH`) plus explicit `dealtCcy: 'BASE' | 'QUOTE'` so the bid/ask quote side is derived correctly when the notional is in the quote currency.
- PricingPanel side-selection UX — dim the non-selected side, re-click-same-side returns to streaming, disable the non-quoteable side for one-sided requests.
- Dual independent margin inputs (bid + ask) with Balance and Zero shortcut buttons; AI suggestion writes a single value to both sides on Apply.
- Direction-aware P/L display in the Client Summary.
- Card-stack mobile layout below the `md` breakpoint (reverses the v1 horizontal-scroll-only decision).

Spec references: `02-functional-spec.md` §7, `05-ui-ux-spec.md` §11–§12, `07-scenario-pack.md` Scenarios 6 + 7, `09-suggestion-engine.md` §15.

## Phase 6 ticket detail

Each ticket below has AC, TDD test list, and Done-when checklist. The build agent works tickets in order on `dev/v2` and commits per-ticket as `feat(FXSW-NNN): title` (or appropriate prefix).

### FXSW-035 — `devVersion` parser + `?dev=v2` URL gate

**Effort:** S · **TDD:** Strict · **Depends on:** —

**Docs:** `05-ui-ux-spec.md` §12 · `02-functional-spec.md` §6, §7

**AC:**
- New file `src/lib/devVersion.ts` exports `type DevVersion = 'v1' | 'v2'` and `export const devVersion: DevVersion`.
- Parses from `window.location.search`. `?dev=v2` → `'v2'`. Anything else (including `?dev=1`, `?dev`, no query) → `'v1'`.
- `DevInjector` continues to render when `?dev=1` OR `?dev=v2` (v2 is a superset).
- Wiring point only — no UX changes ship in this ticket; FXSW-036 onwards consume it.

**TDD tests (write first):**
- Parser unit tests for `?dev=v2`, `?dev=1`, `?dev`, `?dev=v3`, no query, missing `window`.
- DevInjector renders for both gates.

**Done when:** typecheck/lint/test:run/test:e2e all green on `dev/v2`; v1 visual + behavioural snapshots unchanged.

### FXSW-036 — Resizable blotter divider + sessionStorage persistence

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-035

**Docs:** `02-functional-spec.md` §7.4 · `05-ui-ux-spec.md` §11.1

**AC:**
- New `src/components/ResizeHandle.tsx` — 4px horizontal handle, `data-testid="blotter-resize-handle"`, `cursor: row-resize` on hover.
- `App.tsx` branches on `devVersion`: v1 retains `basis-[55%]` / `basis-[45%]`; v2 reads `settingsStore.blotterSplit` (default 55) and computes flex-basis live.
- `settingsStore.ts` gains `blotterSplit: number` + setter; persists to sessionStorage alongside mute.
- Drag updates split on `pointermove`, persists on `pointerup`. Clamp 20–80.
- Both blotter bodies retain internal vertical scroll.

**TDD tests (write first):**
- ResizeHandle: drag math; clamp boundaries; pointerdown→move→up flow.
- settingsStore: blotterSplit read/write/persistence.
- App layout: v1 unchanged at no-query and `?dev=1`; v2 picks up persisted split.

**Done when:** all gates green; manual drag works at `?dev=v2`; v1 unaffected.

### FXSW-037 — Side BOTH + dealtCcy + quoteSideFor + new scenarios

**Effort:** L · **TDD:** Strict · **Depends on:** FXSW-035

**Docs:** `02-functional-spec.md` §7.3 · `07-scenario-pack.md` Scenarios 6 + 7

**AC:**
- `src/types/deal.ts`: `Side = 'BUY' | 'SELL' | 'BOTH'`; add `dealtCcy: 'BASE' | 'QUOTE'`.
- New `src/lib/quoteSide.ts` with `quoteSideFor(side, dealtCcy)` implementing the 5-row truth table (4 one-sided + BOTH).
- `src/services/scenarios/definitions.ts`: existing 5 scenarios all add `dealtCcy: 'BASE'`. Add `BOTH_SIDED_INQUIRY` (Acme Corp · EURUSD · BOTH · BASE · 8M EUR · `SIZE_LIMIT`) and `QUOTE_DEALT_INQUIRY` (Northwind FX · USDJPY · SELL · QUOTE · 1B JPY · `OFF_HOURS`).
- `dispatcher.ts`: toast text reads "wants to trade …" for BOTH and uses dealt currency for one-sided, e.g. "wants to sell 1,000,000,000 JPY in USDJPY".
- `ActiveBlotter.tsx` colour theming: `BOTH` renders in neutral text colour (existing `--color-text` / `--color-text-dim` — no red/green).
- `DevInjector.tsx`: v2 surfaces `Both-Sided` and `Quote-Dealt` buttons; v1 omits them.

**TDD tests (write first):**
- `quoteSideFor` truth table — all 5 rows.
- Scenario round-trip: new scenarios produce expected `Deal` shape.
- `dispatcher.ts` toast formatting for BOTH and quote-dealt cases.
- DevInjector renders correct button set per devVersion.

**Done when:** all gates green; both new scenarios injectable at `?dev=v2`.

### FXSW-038 — PricingPanel side-selection UX (v2)

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-037

**Docs:** `02-functional-spec.md` §7.1 · `05-ui-ux-spec.md` §11.2

**AC:**
- `Cell` sub-component in `PricingPanel.tsx`: add `disabled?: boolean` and `dimmed?: boolean` props, surface as `data-disabled` / `data-dimmed`.
- In v2 fixed mode, the non-selected cell renders `dimmed=true` (opacity 0.5, muted border).
- In v2 if `quoteSideFor(deal.side, deal.dealtCcy)` is `BID` or `ASK`, the opposite cell renders `disabled=true` (opacity 0.35, `cursor: not-allowed`, no click handler).
- **Re-click the same side** in fixed mode: clears `fixedSide`, switches `pricingMode` to `'streaming'`, both cells return to normal opacity.
- v1 behaviour unchanged.

**TDD tests (write first):**
- v2 dim treatment applied to non-selected side in fixed mode.
- v2 disabled treatment for one-sided requests.
- Re-click toggle returns to streaming.
- v1 regression: BID + ASK both clickable, no dim, no disable.

**Done when:** all gates green; manual click-then-reclick at `?dev=v2` returns to streaming; QUOTE_DEALT_INQUIRY shows BID disabled.

### FXSW-039 — Dual margin state model

**Effort:** L · **TDD:** Strict · **Depends on:** FXSW-038

**Docs:** `02-functional-spec.md` §7.2 · `09-suggestion-engine.md` §15

**AC:**
- `TicketPanel.tsx`: in v2, replaces `margin: number` with `marginPair: { bid: number; ask: number }` (both default to `deal.defaultMarginPips`).
- `PricingPanel.tsx` accepts either shape via a discriminated prop OR a `devVersion`-aware wrapper.
- `ClientSummaryPanel.tsx` computes `clientBid = traderBid - marginPair.bid`, `clientAsk = traderAsk + marginPair.ask`.
- `src/lib/pips.ts`: `estimatedProfitUsd` accepts a margin pair + side + dealtCcy and returns the directionally correct number.
- AI suggestion Apply writes the single suggested value to both sides; Undo restores the prior pair.
- v1 single-margin path unchanged.

**TDD tests (write first):**
- State migration: v2 TicketPanel produces a margin pair.
- AI Apply/Undo symmetry: pair write, pair restore.
- `estimatedProfitUsd` math for each direction × dealt-ccy combination.
- v1 regression: single margin still works at no-query / `?dev=1`.

**Done when:** all gates green; AI Apply animates both margin cells in v2.

### FXSW-040 — Dual margin UI (Balance + Zero)

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-039

**Docs:** `02-functional-spec.md` §7.2 · `05-ui-ux-spec.md` §11.3

**AC:**
- PricingPanel renders two `[−][input][+]` rows in v2: bid above, ask below, Balance + Zero between.
- `data-testid` set: `margin-input-bid`, `margin-input-ask`, `margin-plus-bid`, `margin-minus-bid`, `margin-plus-ask`, `margin-minus-ask`, `margin-balance`, `margin-zero`.
- Balance: `next = round((marginBid + marginAsk) / 2)`; both set to `next`.
- Zero: both set to `0`.
- Keyboard `+` / `-` targets focused input.
- v1 single-margin layout unchanged.

**TDD tests (write first):**
- Balance math (including odd-sum rounding).
- Zero handler.
- Independent +/- per side.
- Keyboard scope per focused input.

**Done when:** all gates green; manual editing of either input does not affect the other.

### FXSW-041 — Direction-aware P/L display

**Effort:** S · **TDD:** Alongside · **Depends on:** FXSW-037, FXSW-039

**Docs:** `02-functional-spec.md` §7.3 · `05-ui-ux-spec.md` §11.3

**AC:**
- `ClientSummaryPanel.tsx`: in v2 branches on `quoteSideFor(deal.side, deal.dealtCcy)`.
- `BID` → single P/L line using bid-side margin.
- `ASK` → single P/L line using ask-side margin.
- `BOTH` → two P/L lines, e.g. "Bid P/L: $X · Ask P/L: $Y".
- Each variant has stable `data-testid`s for E2E: `pnl-bid`, `pnl-ask`, `pnl-both`.
- v1 single-direction display unchanged.

**TDD tests (write first):**
- Each `quoteSide` renders correct shape + numbers.
- v1 regression.

**Done when:** all gates green; QUOTE_DEALT_INQUIRY ticket shows the inverted P/L.

### FXSW-042 — Mobile card-stack blotters

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-035

**Docs:** `02-functional-spec.md` §7.5 · `05-ui-ux-spec.md` §9, §11.4

**AC:**
- Below md (768px), in v2, rows render as stacked `<div>` cards per the §11.4 layout sketches.
- `min-w-[1100px]` / `min-w-[920px]` floors removed below md in v2.
- Card containers retain `data-testid` on `active-blotter-body` / `historic-blotter-body` and `data-deal-id` per row so existing tests pass.
- Tap-to-open uses the same handler as click-row in v1.
- v1 horizontal-scroll layout preserved at no-query / `?dev=1`.

**TDD tests (write first):**
- Viewport ≤ 767 renders card layout (key fields present).
- Tap on card opens ticket.
- Testids preserved.
- v1 regression at 1440×900.

**Done when:** all gates green; manual mobile-emulator view at `?dev=v2` shows cards with no horizontal scroll; v1 view unchanged.

## Current known follow-ups

- Capture and attach the actual demo recording if needed.
- Keep CI and deployment badges current.
- Preserve brand-neutrality across docs, source, wiki, PR text, and build output.
- If a full repository-history cleanup is required, perform a local history rewrite rather than only editing current files.
