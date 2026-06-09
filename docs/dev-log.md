# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales Workstation** prototype. This sanitized version preserves the implementation trail without retaining vendor-specific research references.

## Purpose

This document records:

- what was implemented,
- which decisions were user-directed,
- which decisions were agent-directed,
- which gates passed,
- which follow-ups were identified.

The prototype story is brand-neutral: a sales-trader workstation for FX manual pricing intervention, built as a single-page React + XState app with simulated feeds and no production backend.

---

## FXSW-037 · Side BOTH + dealtCcy + quoteSideFor + new scenarios (v2)

- `Side` extended from `'BUY' | 'SELL'` to `'BUY' | 'SELL' | 'BOTH'`.
- `Deal` gains a required `dealtCcy: 'BASE' | 'QUOTE'` field. All 5 v1 scenarios add `dealtCcy: 'BASE'` (unchanged behaviour); 2 new v2 scenarios added.
- New `src/lib/quoteSide.ts` exports `quoteSideFor(side, dealtCcy): 'BID' | 'ASK' | 'BOTH'` — the canonical BUY/SELL × base/quote → bid/ask truth table.
- New `src/lib/format.ts` helper `dealtCcyCode(pair, dealtCcy)` returning the 3-letter dealt code. `formatAmount` extended with optional `dealtCcy` param (defaults to `'BASE'` — v1-compatible).
- New scenarios in `definitions.ts`:
  - `BOTH_SIDED_INQUIRY` — Acme Corp · EURUSD · BOTH · BASE · 8M EUR · `SIZE_LIMIT`.
  - `QUOTE_DEALT_INQUIRY` — Northwind FX · USDJPY · SELL · QUOTE · 1B JPY · `OFF_HOURS`.
- `ScenarioId` splits into `V1_SCENARIO_IDS` + `V2_SCENARIO_IDS`; `SCENARIO_IDS` remains the full list.
- `DevInjector` branches on `devVersion`: v2 surfaces both new buttons, v1 stays as before.
- `dispatcher.buildMessage`: BUY → "buy", SELL → "sell", BOTH → "trade"; amount uses dealt currency, so quote-dealt scenarios read "wants to sell 1,000,000,000 JPY USDJPY".
- Blotter color theming: BOTH renders in neutral `text-text-dim` (not red/green).
- `ActiveBlotter` + `HistoricBlotter` pass `dealtCcy` through to `AmountCell` / use `dealtCcyCode` for the historic in-row inline render.
- `SummaryPanel` rewords the sentence for BOTH: "wants two-sided prices on N CCY vs Other"; v1 case "wants to BUY N CCY" preserved.
- `DealSummaryPanel` uses `dealtCcyCode` for both the Direction strip and the Notional formatting.
- `SuggestionInput.side` widened to `'BUY' | 'SELL' | 'BOTH'` so TicketPanel can pass through any side; engine ignores side internally so no logic change.
- 9 component test fixtures updated to include `dealtCcy: 'BASE'`.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (355 pass / 0 todo, +14 across quoteSide + dispatcher + DevInjector + scenarios + buildMessage) · test:e2e ✓ (6/6 in 36.6s).

**User-directed decisions:**

- None — all decisions within Phase 6 plan guidance (BACKLOG FXSW-037 AC + the user-confirmed AskUserQuestion answers).

**Agent-directed decisions:**

- **`dealtCcy` required on `Deal`, not optional.** Adding it as optional would have left every reader doing `?? 'BASE'`. Required + adding it to existing fixtures kept the type clean and forced explicit thinking at every Deal construction site.
- **Widen `SuggestionInput.side` rather than coerce.** Engine.ts and rationale.ts don't read `side`, so widening to `'BUY' | 'SELL' | 'BOTH'` is byte-for-byte equivalent to the prior contract while admitting BOTH at the call site.
- **`SummaryPanel` sentence rewrite for BOTH.** "wants to BOTH 8,000,000 EUR" reads poorly; "wants two-sided prices on 8,000,000 EUR vs USD" reads like a trader. V1 case unchanged.
- **Conditional cross-leg display ("vs" leg).** When base-dealt, "vs" reads the quote code. When quote-dealt, "vs" reads the base. Mirrors how a trader would describe the trade.
- **Single `dealtCcyCode` helper, not five inlined `slice` calls.** One source of truth, importable from `@/lib/format`.
- **Split `SCENARIO_IDS` into V1 + V2.** Keeps `SCENARIOS` index complete (for round-trip tests and persistence) while letting the DevInjector pick its own subset per devVersion.

## FXSW-036 · Resizable blotter divider + sessionStorage persistence (v2)

- New `src/components/ResizeHandle.tsx` — 4px horizontal handle with `cursor-row-resize`, `data-testid="blotter-resize-handle"`, `data-dragging="true"` during active drag, `role="separator"` + aria-valuenow/min/max.
- New `src/lib/resizeMath.ts` — pure `computeNewSplit(initialSplit, initialClientY, currentClientY, containerHeight)` with `BLOTTER_SPLIT_MIN=20` / `BLOTTER_SPLIT_MAX=80`. Extracted from the component file so react-refresh stays happy.
- `settingsStore.ts` extended with `blotterSplit: number` (default 55) + `setBlotterSplit(n)`; persists under `si.blotterSplit` in sessionStorage; malformed stored values fall back to default.
- `App.tsx` branches on `devVersion`: v1 keeps static `flexBasis: 55%`/`45%`; v2 reads `useSettingsStore.blotterSplit`, uses `ResizeObserver` to track main container height, renders `<ResizeHandle>` between the two sections.
- jsdom polyfill: no-op `ResizeObserver` in `src/test-setup.ts` so component tests don't crash.
- Manual visual verification at `?dev=v2` on `pnpm dev` — drag works, clamps engage at 20%/80%, sessionStorage persists across reload. v1 (`?dev=1`) byte-for-byte unchanged per e2e suite (6/6 in 36.3s).
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (341 pass / 0 todo, +16 new across resize math + handle component + settings store + App) · test:e2e ✓ (6/6 in 36.3s).

**User-directed decisions:**

- None — within Phase 6 plan guidance (`05-ui-ux-spec.md §11.1` + BACKLOG FXSW-036 AC).

**Agent-directed decisions:**

- **Update store on every `pointermove` rather than commit on `pointerup`.** The plan said "Drag updates split on pointermove, persists on pointerup". Simpler implementation: writing to sessionStorage on every move is ~60Hz which is cheap, and avoids needing local component state to track the in-progress drag. Visual feedback is live, and a sudden tab close still preserves the latest position.
- **`ResizeObserver` over `window.resize` listener.** More accurate (catches main-element resize from ticket-open opacity transitions, future flex changes) and is the modern idiomatic API. Polyfilled as a no-op for jsdom.
- **MouseEvent dispatch + `act` wrapper in tests instead of `fireEvent.pointerDown`.** jsdom's `PointerEvent` constructor drops `clientY` from the init dict. Tests dispatch `new MouseEvent('pointerdown', { clientY, bubbles })` which jsdom honours.
- **Constants + pure fn live in `src/lib/resizeMath.ts`, not `ResizeHandle.tsx`.** react-refresh ESLint rule requires component files export only components. Moving the math out also makes it directly importable by future consumers (e.g. a horizontal blotter splitter in v3 etc.).
- **No `border-b border-border` on the Active section in v2.** The 4px resize handle is the visual divider; a double border would look chunky.

## FXSW-035 · `devVersion` parser + `?dev=v2` URL gate

- New module `src/lib/devVersion.ts` with `type DevVersion = 'v1' | 'v2'`, pure `parseDevVersion(search)`, and SSR-safe `getDevVersion()` wrapper.
- Parses `?dev=v2` → `'v2'`; everything else (`?dev`, `?dev=1`, `?dev=v3`, `?dev=V2`, no query, other params) → `'v1'`.
- Wiring-only ticket — no UI consumer yet; FXSW-036 onwards branch on it.
- Existing `isDevMode()` in `App.tsx` continues to gate the Dev Injector via `.has('dev')`, so `?dev=v2` already shows the injector as a superset of `?dev=1`. Locked with a new App test.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (325 pass / 0 todo, +9 new) · test:e2e ✓ (6/6 in 35.7s).

**User-directed decisions:**

- None — all decisions within Phase 6 plan guidance (`/root/.claude/plans/spicy-bouncing-pillow.md` §"Versioning gate" + BACKLOG FXSW-035 AC).

**Agent-directed decisions:**

- **Export `parseDevVersion(search: string)` instead of a module-load `const devVersion`.** Plan suggested `export const devVersion`, but a const is evaluated once at module import — awkward to vary `window.location.search` per test. A pure parser fn is trivial to test; `getDevVersion()` wraps it for the single live call-site (no `window` SSR guard needed in jsdom but cheap to add).
- **Case-sensitive match.** `?dev=V2` resolves to v1, not v2. The URL is the contract; users typing the gate get the casing right. Lock in a test so we don't accidentally widen later.
- **No App.tsx code change.** `isDevMode()` already uses `.has('dev')` which is true for `?dev=v2`. The new App test asserts that — locks the superset behaviour without code churn.

## Post-Phase 5 cleanup

- Removed unused placeholder files and unused dependencies.
- Confirmed blotters use a plain flex layout rather than the originally planned grid library.
- Reworded stale comments that made completed work sound pending.
- Kept the current-stack docs aligned with implementation reality.
- All implementation gates were green at the time of cleanup.

## FXSW-033 · README + demo recording

- README was rewritten for the shipped state.
- Added CI/deploy badges, scenario overview, CI notes, demo placeholder, and full docs index.
- Demo recording remained a manual artifact.
- README was checked for brand-neutrality.

## FXSW-032 · CI workflow

- Added CI workflow for typecheck, lint, unit tests, E2E tests, and build.
- Added Playwright trace upload on failure.
- Later fixes pinned runner, built before E2E, and forced IPv4 preview binding.

## FXSW-031 · RELEASE_PATH E2E

- Added E2E coverage for Release path.
- Release closes ticket and returns deal to available state.
- Confirmed the row stays in Active because the path is non-terminal.

## FXSW-030 · Visual polish pass

- Lifted shared button primitives.
- Added polish for ticket overlay, header, AI panel, animations, hover states, and focus rings.
- Preserved existing behavioural tests.

## FXSW-029 · Notification sound + mute

- Added WebAudio chime.
- Added browser audio-unlock handling.
- Added mute toggle with session-level persistence.

## FXSW-028 · Toast and title notifications

- Added toast stack for new manual-pricing requests.
- Added title flash.
- Added row flash for new SI deals.
- Ensured notifications fire once per new eligible deal.

## FXSW-027 · Credit decline guardrail

- AI suggestion panel recommends decline for credit-limit cases.
- Apply is not offered where the correct path is rejection.

## FXSW-026 · Suggestion panel apply/undo

- Added AI Margin Suggestion panel states: ready, applied, undo, computing, and decline.
- Margin can be applied into ticket state and undone.

## FXSW-025 · Suggestion rationale builder

- Added concise rationale generation for deterministic suggestion output.
- Kept rationale short enough for dense trading UI.

## FXSW-024 · Suggestion engine

- Added deterministic suggestion logic.
- Inputs include client profile, rejection reason, notional, pair, and market context.
- Output includes suggested margin, recommendation type, and rationale factors.

## FXSW-023 · Client profiles

- Added seed client profiles for demo scenarios.
- Profiles support tier, sensitivity, risk posture, and relationship context.

## FXSW-022 · Phase 4 wiring

- Wired AI suggestion service into the ticket workflow.
- Preserved deterministic behaviour for tests.

## FXSW-021 · OFF_HOURS E2E

- Added E2E coverage for off-hours manual pricing.
- Flow opens ticket, sends stream, receives client acceptance, and archives to Historic.

## FXSW-020 · Ticket footer and action flow

- Added footer actions for Reject, Release, Send Stream, Send Quote, Withdraw, and Return to Stream.
- Added acknowledgement states for user actions.

## FXSW-019 · Client summary and pips library

- Added client bid/ask preview and estimated profit.
- Added pip-size and client-price helpers.

## FXSW-018 · Pricing panel fixed mode and margin controls

- Added fixed-price selection and refresh.
- Added +/- and numeric margin controls.
- Client price updates from margin changes.

## FXSW-017 · Pricing panel streaming mode

- Added live streaming price cells driven by the simulated feed.
- Added stale-feed handling and value-change animation.

## FXSW-016 · Summary and deal summary panels

- Added natural-language ticket summary.
- Added deal-summary fields and settlement-date formatting.

## FXSW-015 · Reasons panel

- Added risk/rejection reason chips and explanations.
- Ticket renders reason details for manual-pricing cases.

## FXSW-014 · Ticket shell and overlay

- Added right-side ticket overlay.
- Added Esc/backdrop close.
- Opening an eligible row picks up the deal.

## FXSW-013 · Dev Injector and Happy Path ESP E2E

- Added Dev Injector visible behind `?dev=1`.
- Added scenario buttons and Reset.
- Added E2E for Happy Path ESP.

## FXSW-012 · Active and Historic blotters

- Wired Active and Historic blotters to the store.
- Added derived status, terminal dimming, and 5-second archive behaviour.
- Implemented rows using a plain flex layout.

## FXSW-011 · Status derivation

- Added `derivedStatus` mapping across RFS state, SI state, and dealability.
- Covered mapping with unit tests.

## FXSW-010 · Parent deal machine coordination

- Implemented cross-model coordination between RFS and SI machines.
- Added terminal handling and removal transition.

## FXSW-009 · Deals store and machine spawning

- Added Zustand deals store.
- Each deal spawns a parent machine with RFS and SI child machines.
- Store caches child state for React selectors.

## FXSW-008 · DealFeed and scenario player

- Added scenario-driven deal feed.
- Added timed and state-gated follow-ups.
- Added reset handling for tests and demos.

## FXSW-007 · PricingFeed

- Added deterministic simulated pricing feed.
- Added subscriptions and latest-tick access.

## FXSW-001 to FXSW-006 · Phase 1 baseline

- Added Vite + React + TypeScript scaffold.
- Added Tailwind design tokens.
- Added state-machine skeletons.
- Added first application shell and initial blotter row.
- Added GitHub Pages deployment workflow.

## Notes

This file is intentionally summarized after the vendor-reference cleanup. Detailed historical references remain recoverable from Git history, but current documentation is kept brand-neutral.
