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
| FXSW-037 | Extend `Side` to BOTH; add `dealtCcy`; `quoteSideFor` helper; BOTH + quote-dealt scenarios; DevInjector entries | 6 | Done |
| FXSW-038 | PricingPanel side-selection UX: dim, re-click-toggle, disabled side (v2) | 6 | Done |
| FXSW-039 | Dual margin state model — replace `margin: number` with `{ marginBid, marginAsk }` (v2) | 6 | Done |
| FXSW-040 | Dual margin UI — two inputs + Balance + Zero buttons (v2) | 6 | Done |
| FXSW-041 | Direction-aware P/L display via `quoteSideFor` (v2) | 6 | Done |
| FXSW-042 | Mobile card-stack blotters at < md breakpoint (v2) | 6 | Done |
| FXSW-043 | `themePreviewEnabled` parser + `?theme=preview` URL gate | 7 | Open |
| FXSW-044 | `themeStore` + light token block in `tokens.css` | 7 | Open |
| FXSW-045 | `ThemeToggle` header component | 7 | Open |
| FXSW-046 | Per-surface visual rebalancing pass + phase summary | 7 | Open |

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

### Phase 7 — Light theme (behind `?theme=preview`)

Phase 7 lands on the long-lived `dev/light-mode` branch and ships behind a `?theme=preview` URL gate, orthogonal to `?dev=v2`. The dark-only ship state on `main` is preserved byte-for-byte when the flag is absent. Scope:

- Light token block in `tokens.css` selected via `[data-theme="light"]`, with all dark tokens rebalanced for light-surface legibility (status pills darkened, AI indigo preserved).
- `themeStore` (Zustand + sessionStorage, mirrors `settingsStore` pattern) with `prefers-color-scheme` as the first-visit default.
- `ThemeToggle` component in the header (Sun / Moon icons), only mounted when the URL flag is on.
- Per-surface visual rebalancing pass: blotter rows, ticket panels, AI suggestion accent, toast chrome, row-flash keyframe, resize handle, dev injector.

Spec references: `02-functional-spec.md` §8, `05-ui-ux-spec.md` §13–§14.

## Phase 7 ticket detail

Each ticket below has AC, TDD test list, and Done-when checklist. The build agent works tickets in order on `dev/light-mode` and commits per-ticket as `feat(FXSW-NNN): title`.

### FXSW-043 — `themePreviewEnabled` parser + `?theme=preview` URL gate

**Effort:** S · **TDD:** Strict · **Depends on:** —

**Docs:** `05-ui-ux-spec.md` §14 · `02-functional-spec.md` §8

**AC:**
- New file `src/lib/themeMode.ts` exports `export const themePreviewEnabled: boolean` parsed from `window.location.search`.
- `?theme=preview` → `true`. Any other value (including `?theme=light`, `?theme=dark`, `?theme`, no query) → `false`.
- Pure module — no side effects on import. `window` access is guarded so SSR-style import (no window) returns `false`.
- Wiring point only — no UX changes ship in this ticket; FXSW-044+ consume it.

**TDD tests (write first):**
- Parser unit tests for `?theme=preview`, `?theme=light`, `?theme=dark`, `?theme`, no query, missing `window`.
- Orthogonality: works alongside `?dev=v2` (both flags on at once).

**Done when:** typecheck/lint/test:run/test:e2e all green on `dev/light-mode`; dark-only behaviour byte-for-byte preserved at no-query and `?dev=v2`.

### FXSW-044 — `themeStore` + light token block

**Effort:** M · **TDD:** Strict · **Depends on:** FXSW-043

**Docs:** `02-functional-spec.md` §8.1 · `05-ui-ux-spec.md` §13.1

**AC:**
- New `src/state/stores/themeStore.ts` (Zustand) with `mode: 'dark' | 'light'`, `setMode(mode)`, `toggle()`.
- Persistence to sessionStorage under key `si.theme`. Safari-private-mode tolerant (try/catch around set, fall back to in-memory).
- First-visit init: if `themePreviewEnabled` is `true` and no sessionStorage value, read `window.matchMedia('(prefers-color-scheme: light)').matches`. Otherwise force `'dark'`.
- Store subscribes to itself and writes `document.documentElement.dataset.theme = mode` on every change.
- New block `[data-theme='light'] { ... }` appended to `src/styles/tokens.css` per §13.1 of the UI spec — every token in the `:root` block has a light counterpart.
- No new component renders yet; consumed by FXSW-045.

**TDD tests (write first):**
- Store: `setMode`, `toggle`, sessionStorage round-trip, Safari-private fallback.
- First-visit defaults: flag-off forces dark; flag-on + prefers-light returns 'light'; flag-on + sessionStorage value returns that value.
- DOM side-effect: `document.documentElement.dataset.theme` reflects `mode` after every change.
- Tokens regression: each new `[data-theme='light']` selector matches the dark counterpart by token name (smoke test parses the CSS file).

**Done when:** all gates green; manual `document.documentElement.dataset.theme = 'light'` in devtools visibly switches the palette across every surface.

### FXSW-045 — `ThemeToggle` header component

**Effort:** S · **TDD:** Alongside · **Depends on:** FXSW-044

**Docs:** `02-functional-spec.md` §8.3 · `05-ui-ux-spec.md` §13.3

**AC:**
- New `src/features/notifications/ThemeToggle.tsx` (co-located with `MuteToggle` since both are header-level toggle widgets).
- Renders only when `themePreviewEnabled === true`. When false, returns `null`.
- Icon: `Sun` from `lucide-react` when active mode is `'dark'` (the target); `Moon` when active mode is `'light'`. 200ms cross-fade between icons on toggle.
- Same physical size + style as `MuteToggle`: 32×32, `--color-bg-row-hover` on hover, `--color-focus-ring` ring.
- `data-testid="theme-toggle"`, `data-theme-mode={mode}`, `aria-pressed`, dynamic `aria-label`.
- Mounted in `Header` between `MuteToggle` and the existing dev/version chip.

**TDD tests (write first):**
- Renders when flag on; returns null when flag off.
- Click toggles store; aria-pressed flips.
- Icon switches with mode.
- Keyboard: Enter and Space both invoke toggle.

**Done when:** all gates green; at `?theme=preview`, header shows the toggle; toggle visibly switches the palette.

### FXSW-046 — Per-surface visual rebalancing + phase summary

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-045

**Docs:** `05-ui-ux-spec.md` §13.2

**AC:**
- Per-surface manual pass across every named scenario × theme combination (5 base + 2 v2 scenarios × dark + light = 14 visual states). Capture screenshots into `docs/phase-summaries/FXSW-046-screenshots/` for the phase summary.
- Adjustments to keyframes / inline styles where a token swap alone is insufficient (most notably the `row-flash` alpha per §13.2).
- `docs/dev-log.md` entry per ticket, in the established two-list format.
- `docs/phase-summaries/FXSW-046-summary.md` written per `KICKOFF-PROMPT.md` schema — Wiki Agent ingest input.

**TDD tests (write first):**
- Snapshot test against `[data-theme='light']` for any component whose visual rebalancing required a code change beyond a token swap.

**Done when:** all gates green; manual pass over 14 visual states completed; phase summary written.

### Phase 8 — Single-URL GA (strip preview gates)

Phase 8 promotes Phase 6 + Phase 7 from opt-in URL flags to the default-on behaviour. After this phase, the bare URL `/` renders the full app: resizable blotter, dual-margin UI, BOTH-side support, mobile card-stack, ThemeToggle in header, DevInjector visible. The `?dev=v2` and `?theme=preview` flags are gone (no-ops if pasted); the URL-flag pattern itself is documented in `05-ui-ux-spec.md` §14 for future preview gates.

### FXSW-047 — Strip `?dev=v2` and `?theme=preview` gates; promote Phase 6 + 7 to GA

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-046

**AC:**
- Delete `src/lib/devVersion.ts` + test, `src/lib/themeMode.ts` + test.
- Remove `isV2` branches in `App.tsx`, `ActiveBlotter.tsx`, `HistoricBlotter.tsx`, `TicketPanel.tsx`, `DevInjector.tsx`.
- Remove `getThemePreviewEnabled` checks in `themeStore.ts` (always honor `prefers-color-scheme`, always persist) and `ThemeToggle.tsx` (always render).
- Remove the `isDevMode()` helper in `App.tsx`; DevInjector slot always mounts.
- Collapse `V1_SCENARIO_IDS` + `V2_SCENARIO_IDS` into a single `SCENARIO_IDS` export.
- All 5 e2e scenario specs use `page.goto('/')` (no flag).
- All gates green.

**TDD tests (write first / update):**
- `App.test.tsx` — DevInjector and ResizeHandle both render on bare URL.
- `DevInjector.test.tsx` — every scenario testid present on bare URL.
- `ActiveBlotter.test.tsx` — mobile card stack triggers on `useIsMobile() === true` alone (no URL flag).
- `themeStore.test.ts` — drop "force-dark when flag off" / "ignores stored value when flag off" / "does not persist when flag off" tests; remaining tests assert always-persist behaviour.
- `ThemeToggle.test.tsx` — drop "null when flag off" test; remaining icon/toggle tests work without URL setup.

**Done when:** all gates green; bare URL `/` (with no query string) shows DevInjector, the ResizeHandle, the ThemeToggle, and behaves identically to the prior `/?dev=v2&theme=preview`; brand-neutral grep over `dist/` returns zero hits.

## Status note — v3 phase and feedback rounds (FXSW-048…071)

The detailed entries above stop at FXSW-047. Phase 8 (v3, behind `?dev=v3`:
FXSW-048…061) and the two v3 feedback rounds (FXSW-062…071) shipped and are
tracked in `docs/dev-log.md` and `docs/phase-summaries/`. The next free ticket is
**FXSW-072**.

## Phase 9 — bid/ask forward points (v3) + v4 gate scaffolding + Security Agent

**Bid/ask forward points** is a v3-level refinement: existing `?dev=v3` outright
forwards now price each side off its own points value (v4 inherits it). v3 forward
goldens are re-baselined; the GA spot golden and the mid sequence are unchanged.
The new `?dev=v4` gate is introduced here as scaffolding (first consumed by NDF in
Phase 10). The independent **Security Agent** is stood up to review the build at
the end of this and every later phase. Specs: `docs/02` §12, `docs/04` §9.1,
`docs/05` §18.1, `docs/10-security-agent-spec.md`.

### FXSW-072 — `?dev=v4` gate scaffolding (superset of v3)

**Effort:** S · **TDD:** Alongside · **Depends on:** —

**AC:**
- `src/lib/devVersion.ts` widens `DevVersion` to `'v1' | 'v3' | 'v4'`; add
  `isV4()`. `isV4()` implies all v3 behaviour (v4 ⊇ v3): every existing `isV3()`
  call site stays true under `?dev=v4`.
- Bare URL and `?dev=v3` are byte-for-byte unchanged. (First consumer: NDF,
  Phase 10 — no v4-gated behaviour ships in this ticket.)

**TDD:** `devVersion.test.ts` — `?dev=v4` → `isV3() && isV4()`; `?dev=v3` →
`isV3() && !isV4()`; no flag → neither.

**Done when:** all gates green; no v3/GA behaviour change.

### FXSW-073 — Two-sided forward-points feed (v3+)

**Effort:** M · **TDD:** Strict · **Depends on:** —

**AC:**
- `forwardPointsFeed.get(pair, tenor)` returns `{ bid, ask, mid }` (old scalar →
  `mid`); spread derived deterministically from `mid` + tenor (**no extra RNG
  draws**), widening monotonically with tenor, symmetric around `mid`; SPOT →
  all-zero.
- The `mid` sequence is unchanged, so the GA spot golden is intact.

**TDD:** feed unit tests for `bid ≤ mid ≤ ask`, monotonic spread by tenor; assert
the `mid` sequence equals the pre-change scalar (golden unchanged).

**Done when:** all gates green; GA spot golden intact.

### FXSW-074 — Bid/ask points through pricing math (v3+)

**Effort:** M · **TDD:** Strict · **Depends on:** FXSW-073

**AC:**
- `lib/pips.ts`: outright bid uses points `.bid`, ask uses points `.ask`; All-in
  price + estimated P/L are side-specific. Applies to v3 outright forwards.
- No pip/margin math inlined in components.

**TDD:** `pips` unit tests for asymmetric points → asymmetric outright with zero
margin.

**Done when:** all gates green.

### FXSW-075 — Bid/ask points UI + re-baseline v3 snapshots (v3+)

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-074

**AC:**
- Forward-points row shows `fwd-points-bid` / `fwd-points-ask` (each suffixed
  `pips`) plus the `fwd-points-mid` reference, replacing the single `fwd-points`
  cell for v3 outright forwards.
- v3 outright-forward component and E2E snapshots are re-baselined to the
  side-specific values.

**TDD:** component test — two point cells + mid under `?dev=v3`; updated v3
forward E2E expectations.

**Done when:** all gates green; no console errors.

### FXSW-076 — Security Agent bootstrap + first review

**Effort:** M · **TDD:** n/a · **Depends on:** FXSW-075

**AC:**
- `/security/` exists with `CLAUDE.md` (unprimed operating prompt) and
  `TEMPLATE.md`; `docs/10-security-agent-spec.md` published.
- Security Agent runs cold against the current build and writes
  `/security/FXSW-077-review.md` with functional + technical findings and a
  proposed resolution work-item.
- Build-agent write boundary excludes `/security/` (Security Agent-owned), per
  `CLAUDE.md`.

**Done when:** review file present; proposed tickets are actionable; report is
brand-neutral.

### FXSW-077 — Phase 9 docs + dev-log + summary

**Effort:** S · **TDD:** n/a · **Depends on:** FXSW-076

**AC:** dev-log entries for the phase; `docs/phase-summaries/phase-09-v4-summary.md`
written; BACKLOG statuses updated.

**Done when:** all gates green; brand-neutral grep over `dist/` clean.

### Status note — Phase 9 shipped (FXSW-072…077)

Phase 9 (FXSW-072…077) shipped on `claude/pricing-trades-phase-plan-h70vy7` and is
tracked in `docs/dev-log.md` and `docs/phase-summaries/phase-09-v4-summary.md`. The
end-of-phase Security Agent review is `security/FXSW-077-review.md` (0 Critical,
2 High, 5 Medium, 3 Low, 1 Info); its proposed remediation is filed as **FXSW-088**
(below) for Phase 10 triage.

### Status note — Phase 10 shipped (FXSW-078…081)

Phase 10 (FXSW-078…081) shipped on the same branch; see `docs/dev-log.md` and
`docs/phase-summaries/phase-10-ndf-summary.md`. The end-of-phase review is
`security/FXSW-081-review.md` (0 Critical, 2 High, 4 Medium, 2 Low, 1 Info). Its
three NDF points-only correctness findings (F-1/F-3/F-4) were fixed in-phase during
FXSW-080 close; the remaining hardening + the deeper inertness refactor are filed as
**FXSW-089** (below). Next free ticket is **FXSW-090**.

## Phase 10 — NDF (Non-Deliverable Forward)

Adds the `instrumentType` discriminator and the NDF instrument (forward-points
markup only). Specs: `docs/02` §12.2, `docs/05` §18.2–18.3, `docs/03` §10.

### FXSW-078 — `instrumentType` field + injector selector

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-077

**AC:**
- `Deal.instrumentType: 'SPOT' | 'OUTRIGHT' | 'NDF' | 'SWAP'`; `ScenarioOverrides`
  + `buildDeal` merge; default derived from tenor for legacy deals.
- Dev Injector gains `inject-instrument` (v4-only); NDF requires a forward tenor
  (SPOT rejected → shortest forward tenor).

**TDD:** buildDeal default-derivation tests; injector validation test.

**Done when:** all gates green; GA/v3 unaffected.

### FXSW-079 — NDF pricing (points-only markup)

**Effort:** M · **TDD:** Strict · **Depends on:** FXSW-078

**AC:**
- NDF ticket removes the spot-margin block and the all-in/per-component toggle;
  markup taken only on forward points; All-in + P/L from outright + points margin.
- One-sided lock still applies; `data-instrument="NDF"`, `ndf-note` present.

**TDD:** `pips`/ticket tests — spot margin has no effect for NDF; points margin
does; lock honoured.

**Done when:** all gates green; no console errors.

### FXSW-080 — NDF surfaces + Security Agent pass

**Effort:** S · **TDD:** Alongside · **Depends on:** FXSW-079

**AC:** `deal-instrument` cell in blotters/detail; Security Agent review
`/security/FXSW-081-review.md` for Phase 10.

**Done when:** all gates green.

### FXSW-081 — Phase 10 docs + dev-log + summary

**Effort:** S · **TDD:** n/a · **Depends on:** FXSW-080

**Done when:** dev-log + `phase-10-ndf-summary.md` written; gates green.

## Phase 11 — Swaps (forward-forward)

Two-leg swaps priced on net points; component or total markup; either side or
both. Specs: `docs/02` §12.3, `docs/04` §9.2, `docs/05` §18.4–18.5, `docs/03` §10.

### Status note — Phase 11 shipped (FXSW-082…087)

**Done (2026-06-17).** All six tickets implemented on
`claude/pricing-trades-phase-plan-h70vy7`: swap data model + injector
(FXSW-082), points feed (FXSW-083), pricing math (FXSW-084), two-leg UI
(FXSW-085), blotter dual value dates + historic detail + execution capture
(FXSW-086), and this docs/Security-Agent close (FXSW-087). Swaps add **no new
canonical states/machines** (docs/03 §10). Determinism gate intact (seed-42 / GA
spot + mid / v3 forward goldens byte-stable); 513 unit + 14 E2E green. Summary:
`docs/phase-summaries/phase-11-swaps-summary.md`. Cold review:
`security/FXSW-087-review.md`. **Carried forward:** FXSW-088 F-1/F-2/F-3
(state-layer guards — deferred), FXSW-089 F-2 (NDF inertness depth), FXSW-090
(GA-core determinism), plus the SRI + vite-6 residuals from the security pass and
any new FXSW-087 work-item.

### FXSW-082 — Swap data model + injection

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-081

**AC:**
- `instrumentType:'SWAP'` populates `Deal.legs` (NEAR + FAR); near/far may each be
  SPOT or forward (forward-forward); far strictly later than near.
- Injector adds `inject-far-tenor` (v4-only); far ≤ near rejected.

**TDD:** leg-construction + ordering-validation tests.

**Done when:** all gates green; single-leg deals unaffected.

### FXSW-083 — Swap points feed

**Effort:** S · **TDD:** Strict · **Depends on:** FXSW-082

**AC:** `swapPointsFeed.get(pair, near, far)` → `{ near, far, net{bid,ask} }`,
`net = far − near` per side, pure composition of `forwardPointsFeed`.

**TDD:** net-differential unit tests incl. forward-forward and SPOT-near cases.

**Done when:** all gates green; seed-42 golden intact.

### FXSW-084 — Swap pricing math

**Effort:** M · **TDD:** Strict · **Depends on:** FXSW-083

**AC:** `lib/pips.ts` builds client price + P/L from net swap points; supports
per-component (per-leg bid/ask margins) and total (net bid/ask margin) modes.

**TDD:** `pips` tests for both markup modes and one-sided gating.

**Done when:** all gates green.

### FXSW-085 — Swap pricing UI

**Effort:** L · **TDD:** Alongside · **Depends on:** FXSW-084

**AC:**
- Two-leg pricing panel (`leg-near`/`leg-far`), per-leg points, net row
  (`swap-net-bid`/`swap-net-ask`), markup-mode toggle (`swap-markup-mode`),
  per-scope Balance/Zero, one-sided lock across both legs + net.
- `data-instrument="SWAP"`; `PricingPanel` stays a folder of sub-components and
  files stay < 300 lines.

**TDD:** component tests for both markup modes, side gating, net display.

**Done when:** all gates green; no console errors.

### FXSW-086 — Swap blotter + historic detail

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-085

**AC:** swap instrument cell + dual value dates (near → far); detail overlay lists
per-leg tenors/points/value dates + net points used for execution.

**TDD:** blotter/detail component tests.

**Done when:** all gates green.

### FXSW-087 — Phase 11 Security Agent pass + docs + summary

**Effort:** S · **TDD:** n/a · **Depends on:** FXSW-086

**AC:** Security Agent review `/security/FXSW-087-review.md`; dev-log +
`phase-11-swaps-summary.md`; BACKLOG statuses updated; brand-neutral `dist/`.

**Done when:** all gates green.

## Phase 9 security remediation (triage into Phase 10)

Transcribed from `security/FXSW-077-review.md` (the agent's proposed work-item;
renumbered from its draft "FXSW-078" to avoid colliding with the planned NDF
ticket). To be triaged against the specs and implemented in Phase 10. Findings not
fixed are recorded as accepted risk in the report.

### FXSW-088 — Phase 9 security remediation (external-call surface, build pipeline, hardening)

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-077 · **Source:** `security/FXSW-077-review.md`

**Status (2026-06-17): partially done.** Per a "highest-severity only" scoping
decision, the technical/external-surface ACs were implemented; the functional
state-machine ACs were deferred to Phase 11 (Swaps rework those machines).
- ✅ **T-1** API key moved from URL query to an `Authorization: Bearer` header
  (`provider.ts`); `apiKey=` no longer appears in the bundle.
- ✅ **T-2** live build-time fetch is now opt-in (`FETCH_LIVE_MIDS`, default
  pinned fallback) with field-by-field `Number.isFinite` + range validation
  (`scripts/fetch-reference-mids.ts`).
- ✅ **T-3** toolchain bumped — `vite` 5.2.10→5.4.21, `vitest` 1.6.0→3.2.6
  (clears both **critical** advisories), `@playwright/test`→1.56.1, `tsx`→4.22.4,
  `postcss`→8.5.15, plus `pnpm.overrides` (form-data/@babel/core/js-yaml).
  `pnpm audit` 24→5 advisories, **0 critical / 0 of the old highs**. *Residual: 2
  high + 3 moderate, all requiring a `vite` 5→6 major bump (Windows-dev-server /
  Deno-only, no shipped-bundle impact) — **resolved 2026-06-17 via FXSW-091 T-1**:
  vite→7.3.5 + esbuild override, `pnpm audit` now 0.*
- ✅ **T-4 (CSP)** restrictive CSP `<meta>` injected at build only (active in
  `preview`/prod, not dev) via a Vite plugin; `connect-src 'self'`. ⏳ **SRI**
  deferred (Low; needs a build-time hash plugin).
- ⏳ **F-1 / F-2 / F-3** (state-layer side-lock guard, RFS `*Sent` symmetry,
  parent terminal reconciliation) — **deferred to Phase 11**, where the RFS/parent
  machines are extended for Swaps; doing it there avoids a double rework + review.
- ⏳ **T-6** vendor literals in non-adapter test files — deferred (cosmetic).

**AC (full spec; see Status above for done vs deferred):**
- External provider auth no longer uses a URL query string for the API key where
  the provider permits a header; if query-param is unavoidable, the exposure is
  documented and requests are batched to minimise key emission. (T-1)
- The build defaults to the pinned committed reference mids; the live third-party
  fetch is opt-**in** (not opt-out), and any consumed response is validated
  field-by-field with `Number.isFinite` + range check before being written/used. (T-2)
- Toolchain bumped: `vite >= 5.4.15` and `esbuild >= 0.25.0` (override if
  transitive); `pnpm audit` reports zero moderate+ advisories. (T-3)
- `index.html` ships a restrictive CSP `<meta>` (`default-src 'self'`;
  `script-src 'self'`; `connect-src 'self'` + the single provider origin only when
  the live feed is used); SRI added for emitted assets where feasible. (T-4)
- One-sided side-lock enforced by a guard in the SI/deal machine (quotable side
  carried in context), not by the UI `disabled` prop alone. (F-1)
- `*Sent` acknowledgement model on RFS is either made symmetric with SI or
  documented so no consumer reads RFS `Executable` as the client-facing "sent"
  signal. (F-2)
- Parent deal machine reconciles/terminates once both legs are terminal and routes
  terminal/reject events to both legs; terminal protection is explicit, not only
  topological. (F-3)
- Vendor literals removed from test files outside `src/services/feed/external/`. (T-6)

**Done when:**
- `lint`, `typecheck`, `test:run`, and `test:e2e` all pass.
- The seed-42 golden and the GA spot + mid sequence are byte-stable.
- Canonical state names and `data-*` test attributes are unchanged.
- `dist/` remains brand-neutral in user-visible strings and contains no source maps.
- The simulated feed remains the default and the only test/E2E path.

**Triage notes (Build Agent, primed):** F-1/F-2/F-3 touch the XState layer — any
guard/parent-state change must preserve canonical state names, the `*Sent`
contract, and the 5s removal timing (Critical rules #6/#7/#9). Accepted-risk items
(synthetic data as non-PII; v4 NDF/SWAP instrument lenses with no current code
surface) stay as recorded in the report until the relevant code exists.

## Phase 10 security remediation (triage into Phase 11)

Transcribed from `security/FXSW-081-review.md`. The three NDF points-only
correctness findings (F-1 auto-priced spot markup, F-3 audit record, F-4
auto-view toggle) were **fixed in-phase** during FXSW-080 close — they were
functional regressions against FXSW-079's own AC, not hardening gaps. The
remaining items (the deeper state/math-layer enforcement plus the carried-over
external-surface + toolchain hardening) are filed below for Phase 11 triage.
This **overlaps FXSW-088** (Phase 9 remediation, still open) on the external-call
surface + toolchain — do them together.

### FXSW-089 — Phase 10 security remediation (NDF inertness depth + toolchain + carried-over hardening)

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-080 · **Source:** `security/FXSW-081-review.md`

**Status (2026-06-17): mostly done** (shared with FXSW-088 — same work cleared
both). ✅ T-1 toolchain (criticals cleared; vite-6 residual **fully resolved
2026-06-17 via FXSW-091 T-1** — `pnpm audit` now 0),
✅ T-2 key-in-header, ✅ T-3 build-fetch opt-in + validation, ✅ T-4 CSP (SRI
deferred). ⏳ **F-2** (structural NDF inertness below the render layer) — deferred
(Theme D); F-1/F-3/F-4 were already fixed in FXSW-080, so the shipped NDF price is
correct on every path today; F-2 is residual defense-in-depth.

**AC (full spec; see Status above for done vs deferred):**
- NDF spot-markup inertness is enforced **structurally**, not only at the render
  boundary: either clamp the effective spot margin to zero for NDF in one shared
  helper keyed off `instrumentOf(deal)` that every consumer goes through, or have
  the pricing helpers ignore the spot margin for NDF — so the raw `marginPair`
  state can never reintroduce a markup via the keyboard/AI-Apply paths. (F-2)
  *(F-1/F-3/F-4 already fixed in FXSW-080; this is the residual defense-in-depth.)*
- Toolchain bumped: `vite >= 5.4.20`, `vitest >= 3.2.6` (≥1.6.1 minimum),
  `@playwright/test`/`playwright >= 1.55.1`, `esbuild`/`@babel/core` updated
  transitively; `pnpm audit` reports zero high+ advisories. (T-1)
- External provider auth no longer uses a URL query string for the API key where
  a header is accepted; otherwise documented + batched. (T-2, overlaps FXSW-088)
- Build defaults to the pinned committed reference mids (live fetch opt-IN);
  consumed responses validated field-by-field (`Number.isFinite` + range). (T-3,
  overlaps FXSW-088)
- `index.html` ships a restrictive CSP `<meta>`; SRI added where feasible. (T-4,
  overlaps FXSW-088)

**Done when:**
- `lint`, `typecheck`, `test:run`, `test:e2e` all pass.
- Seed-42 golden, GA spot + mid sequence, and v3 forward goldens byte-stable for
  non-NDF instruments; canonical state names + `data-*` unchanged.
- `dist/` brand-neutral in user-visible strings; no source maps.
- Simulated feed remains the default and only test/E2E path.

## GA-core security audit follow-up (deferred)

Transcribed from `security/audit-core-pre-phase9-review.md` — a special cold audit
of the pre-Phase-9 GA core (run 2026-06-17 because the Security Agent only began at
Phase 9, so Phases 1–8 had never had a dedicated deep review). The core got a clean
bill on the things that matter most (pricing/util math, margin flooring, no XSS/DOM
sinks, deterministic suggestion engine, `sessionStorage`/WebAudio hygiene, store
immutability, build hygiene). Findings: 0 Critical, 0 High, 1 Medium, 3 Low, 2 Info.
**Deferred** under the "highest-severity only" scoping (all sub-High).

### FXSW-090 — GA-core determinism + scenario-player lifecycle hardening

**Effort:** S–M · **TDD:** Alongside · **Depends on:** — · **Source:** `security/audit-core-pre-phase9-review.md`

**AC:**
- The `CLIENT_ACCEPT_OR_REJECT` scenario follow-up resolves via a seeded PRNG
  (reuse `services/feed/rng.ts`), keyed off the deal ID or an injectable seed and
  overridable for tests; the credit-breach outcome becomes reproducible. (F-1, Medium)
- The scenario player exposes `forgetDeal(dealId)` that clears that deal's pending
  timers + `after-si-state` gates; called from the archival path and `removeDeal`,
  so no stale follow-up emits and the `gates` set cannot grow unbounded. (F-2, Low)
- Deal IDs (`player.makeDealId`) and display IDs (`lib/ids`) come from an
  injectable/seeded source so tests can pin them; `addDeal` treats a duplicate
  `dealId` as an error/regeneration, not a silent no-op. REQ-/TRD- format unchanged. (F-3, Low)
- (Optional) a documented manual-reproduction seed knob for the spot feed beyond
  `window.__seedFeed`. (T-1, Low)

**Done when:**
- `lint`, `typecheck`, `test:run`, `test:e2e` all pass.
- Seed-42 golden, GA spot + mid sequence, and v3 forward goldens byte-stable.
- Canonical state names + `data-*` unchanged; `dist/` brand-neutral, no source maps.
- Simulated feed remains the default and only test/E2E path.

**Note (F-4/T-2, Info):** RFS `Expire`/`ClientClose` are currently unreachable dead
transitions — re-review when `Expire` forwarding is added (ties into FXSW-088 F-3).
Suggestion `computedAt` wall-clock is non-load-bearing; no action.

## Phase 11 security remediation (triage into Phase 12)

Transcribed from `security/FXSW-087-review.md` (cold end-of-phase review of the
swap work). 7 findings: 0 Critical, 1 High, 2 Medium, 2 Low, 2 Info. The swap
pricing math, one-sided gating and capture reconciliation reviewed clean (F-4,
positive); the items below are the residual functional + technical gaps. The
review proposed this as "FXSW-090" reviewing cold; **renumbered to FXSW-091** here
because FXSW-090 was already taken by the GA-core determinism item above.

### FXSW-091 — Phase 11 security remediation (swap leg-validation + one-sided display + toolchain + CSP/feed reconciliation)

**Effort:** M · **TDD:** Alongside · **Depends on:** FXSW-086 · **Source:** `security/FXSW-087-review.md`

**Status (2026-06-17): DONE.** All findings resolved — ✅ F-1 (legs-adjusted note
+ recorded `swapRequested`), ✅ F-2 (off-side client-net/P/L dashed), ✅ F-3 guard
(sequential-injection E2E), ✅ T-1 (vite→7.3.5 + esbuild override, `pnpm audit`
**0**), ✅ T-2 (live feed + key-entry confined to dev; prod is simulation-only under
`connect-src 'self'`), ✅ T-3 (build-time SRI on emitted assets). `pnpm audit` 0;
522 unit + 15 E2E green; `dist/` ships CSP + SRI, no source maps, brand-neutral.

**AC:**
- `buildSwapLegs` no longer silently invents a valid far for a missing/out-of-order
  (far ≤ near) request: the invalid case is either refused at the injection
  boundary, or the requested-vs-applied tenors are recorded on the deal AND shown
  as a visible "far adjusted" note in `SwapPanel` + `SwapLegDetail`. Valid requests
  produce identical legs to today (swap goldens stable). (F-1, Medium)
- A one-sided swap (`quoteSide` BID or ASK) renders a dash / suppresses the
  non-quotable side's client-net and P/L instead of showing the raw un-marked net;
  the quotable side and its `data-testid`s are unchanged. (F-2, Low)
- A new `v4-swap` E2E asserts: (a) two sequential swap injections do not leak the
  first deal's leg/net margin into the second's captured execution margin, and the
  second opens `PER_COMPONENT` with zero margins; (b) the historic "Net used for
  execution" reconciles with the marked-up net actually sent. (F-3, F-4 guard)
- ✅ **DONE (2026-06-17)** Toolchain: `vite` 5.4.21 → **7.3.5** + `pnpm.overrides`
  `esbuild >=0.28.1`; `pnpm audit` **5 → 0** (both highs + 3 moderates cleared);
  goldens/E2E byte-stable. (T-1, High — also clears the FXSW-088/089 vite-6
  residual.) *vite 6.4.3 cleared the vite high but its esbuild ^0.25 + a forced
  0.28.1 broke the build; vite 7's ^0.27 is override-compatible.*
- The shipped CSP and the opt-in live feed are reconciled: either the runtime
  poller + API-key entry are removed/disabled in the built artefact (simulation
  only; secret never collected), OR `connect-src` lists exactly the single provider
  origin (no wildcard) under the documented v3 exception. (T-2, Medium)
- (Optional) SRI `integrity=` attributes added for emitted same-origin assets.
  (T-3, Info — also clears the deferred FXSW-088 SRI sub-item)

**Done when:**
- `lint`, `typecheck`, `test:run`, `test:e2e` all pass (incl. the new swap
  leg-validation + one-sided-display + sequential-injection assertions).
- Seed-42 golden, GA spot + mid sequence, v3 forward goldens, and v4 NDF + swap
  goldens are byte-stable; canonical state names + `data-*` unchanged.
- `dist/` brand-neutral in user-visible strings, no source maps, ships the
  reconciled CSP. Simulated feed remains the default and only test/E2E path.

## Current known follow-ups

- Capture and attach the actual demo recording if needed.
- Keep CI and deployment badges current.
- Preserve brand-neutrality across docs, source, wiki, PR text, and build output.
- If a full repository-history cleanup is required, perform a local history rewrite rather than only editing current files.
