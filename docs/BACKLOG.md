# BACKLOG.md

33 tickets across 5 phases. Each ticket has a fixed ID, doc references, acceptance criteria, and the TDD test slate to write **before** the implementation.

## How Claude Code uses this

- Work tickets in order within a phase.
- For each ticket: read the cited doc sections, write the listed tests (they should run red), implement to green, refactor, commit.
- Use the ticket ID in the commit message: `feat(FXSW-014): ticket panel shell with glass overlay`.
- Update this file's status column after each green commit.
- Do not start the next ticket until the current one is fully green and committed.

## TDD intensity legend

| Mark | Meaning |
|---|---|
| **🔴 Strict** | Test list MUST be written first, run red, then implement to green. Used for pure logic, state machines, the suggestion engine. |
| **🟡 Alongside** | Component API and behavior tests written together. Visual iteration follows. |
| **🟢 Acceptance** | Test = the Gherkin scenario. Written when the user-facing flow is fully wired. |

## Summary

| ID | Title | Phase | Effort | TDD | Status |
|---|---|---|---|---|---|
| FXSW-001 | Project scaffolding | 1 | M | 🟡 | ◐ |
| FXSW-002 | Design tokens + Tailwind config | 1 | S | 🟡 | ☑ |
| FXSW-003 | Folder structure | 1 | S | — | ☐ |
| FXSW-004 | prebuild reference-mids script | 1 | S | 🔴 | ☐ |
| FXSW-005 | State machine skeletons | 1 | M | 🔴 | ☐ |
| FXSW-006 | AppShell + Header + empty blotter | 1 | M | 🟡 | ☐ |
| FXSW-007 | PricingFeed with seeded RNG | 2 | M | 🔴 | ☐ |
| FXSW-008 | DealFeed + scenario player | 2 | M | 🔴 | ☐ |
| FXSW-009 | dealsStore + machine spawning | 2 | M | 🔴 | ☐ |
| FXSW-010 | dealMachine cross-model coordination | 2 | L | 🔴 | ☐ |
| FXSW-011 | statusFromMachines derivation | 2 | S | 🔴 | ☐ |
| FXSW-012 | Active Blotter live + 5s removal + Historic | 2 | M | 🟡 | ☐ |
| FXSW-013 | DevInjector + HAPPY_PATH_ESP E2E | 2 | M | 🟢 | ☐ |
| FXSW-014 | TicketPanel shell + glass overlay | 3 | M | 🟡 | ☐ |
| FXSW-015 | ReasonsPanel | 3 | S | 🟡 | ☐ |
| FXSW-016 | Summary + DealSummary panels | 3 | S | 🟡 | ☐ |
| FXSW-017 | PricingPanel streaming mode | 3 | M | 🟡 | ☐ |
| FXSW-018 | PricingPanel fixed mode + margin controls | 3 | M | 🟡 | ☐ |
| FXSW-019 | ClientSummaryPanel | 3 | S | 🔴 | ☐ |
| FXSW-020 | TicketFooter + *Sent → *Ack flow | 3 | L | 🔴 | ☐ |
| FXSW-021 | OFF_HOURS_INTERVENTION E2E | 3 | S | 🟢 | ☐ |
| FXSW-022 | clientProfiles seed data | 4 | S | 🔴 | ☐ |
| FXSW-023 | Suggestion engine (100% branch) | 4 | L | 🔴 | ☐ |
| FXSW-024 | Rationale builder | 4 | S | 🔴 | ☐ |
| FXSW-025 | SuggestionPanel ready / applied / Undo | 4 | M | 🟡 | ☐ |
| FXSW-026 | SuggestionPanel credit-decline + recompute | 4 | M | 🟡 | ☐ |
| FXSW-027 | SIZE_LIMIT + CREDIT_BREACH E2E | 4 | S | 🟢 | ☐ |
| FXSW-028 | Notifications visual layer | 5 | M | 🟡 | ☐ |
| FXSW-029 | Audio chime + mute + settingsStore | 5 | M | 🔴 | ☐ |
| FXSW-030 | Visual polish pass | 5 | M | — | ☐ |
| FXSW-031 | RELEASE_PATH E2E | 5 | S | 🟢 | ☐ |
| FXSW-032 | CI workflow | 5 | S | 🟡 | ☐ |
| FXSW-033 | README + demo recording | 5 | M | — | ☐ |
| FXSW-034 | GitHub Pages deploy workflow | 5 | S | 🟡 | ☐ |

Effort key: S ≈ ≤1h, M ≈ 1–3h, L ≈ 3–6h.

---

# Phase 1 — Scaffold + first slice

## FXSW-001 · Project scaffolding
**Effort:** M · **TDD:** 🟡 · **Depends on:** —
**Docs:** `06-tech-architecture.md` §1, §6 · `CLAUDE.md`

**AC:**
- Vite + React 18 + TS 5 (strict) project initialized with pnpm.
- All dependencies from `06 §1` installed at pinned versions.
- Scripts wired: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:run`, `test:e2e`, `test:e2e:ui`.
- ESLint + Prettier configured.
- Vitest config with jsdom environment.
- Playwright config with single worker, Chromium only, traces on failure.
- `.gitignore` + initial commit on `main`.

**TDD tests (write first):**
- `tests/smoke.test.ts` — imports App, asserts it's a function (proves Vite + TS + Vitest plumbing).
- A throwaway Playwright test `tests/e2e/smoke.spec.ts` that loads `/` and asserts `<body>` exists (proves Playwright + webServer wiring).

**Done when:** `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e` all green on a fresh clone.

**Status note (Phase 0 build):** typecheck / lint / test:run green locally; `test:e2e` deferred — the cloud session's network policy blocks Playwright's browser-download CDN (`*.azureedge.net`). The Playwright **config** and the smoke spec are in place; only the browser binary install is blocked. Validated path forward: GitHub Actions CI (FXSW-032) installs Playwright cleanly and runs the smoke. Local validation possible after widening the cloud env's network policy or running once on a desktop dev machine. Status flipped from ◐ → ☑ when E2E confirms green in CI.

---

## FXSW-002 · Design tokens + Tailwind config
**Effort:** S · **TDD:** 🟡 · **Depends on:** FXSW-001
**Docs:** `05-ui-ux-spec.md` §1 (all token blocks)

**AC:**
- `src/styles/tokens.css` declares every CSS custom property from `05 §1`.
- `tailwind.config.ts` extends theme with token aliases (`bg-bg-panel`, `text-text-dim`, `border-border`, etc.).
- Geist + Geist Mono loaded via `@fontsource/geist-sans` and `@fontsource/geist-mono`.
- Global stylesheet imports tokens + fonts.

**TDD tests (write first):**
- `tokens.test.tsx` — render a probe div with `className="bg-bg-app text-text border-border"`; assert computed style values match the token hex codes.
- `tailwind.config.test.ts` — import the config, assert `theme.extend.colors['bg-panel']` resolves to `#111118`.

**Done when:** tests green; a `<div className="bg-ai-bg text-ai-accent">` renders with the indigo wash and accent text in the dev server.

---

## FXSW-003 · Folder structure
**Effort:** S · **TDD:** — · **Depends on:** FXSW-001
**Docs:** `06-tech-architecture.md` §2

**AC:**
- Every directory in the `06 §2` tree exists.
- Every file in the tree exists as an empty placeholder OR with a single `export {}` line (for TS files) to keep the build green.
- Path alias `@/` → `src/` wired in `tsconfig.json` and `vite.config.ts`.

**No tests.** Structural ticket; verified by `pnpm typecheck` staying clean.

---

## FXSW-004 · prebuild reference-mids script
**Effort:** S · **TDD:** 🔴 · **Depends on:** FXSW-003
**Docs:** `04-dummy-feed-spec.md` §10

**AC:**
- `scripts/fetch-reference-mids.ts` exists per `04 §10`.
- `tsx` added as devDep; `prebuild` and `predev` npm scripts call it.
- Running `pnpm dev` writes a fresh `src/services/feed/referenceMids.json`.
- Network failure falls back to hard-coded values; build never breaks.

**TDD tests (write first):**
- `fetch-reference-mids.test.ts` — `round(1/0.85361, 4)` returns `1.1715`.
- `fetch-reference-mids.test.ts` — with mocked `fetch` returning a Frankfurter shape, the script writes the file with USD-based inverted mids.
- `fetch-reference-mids.test.ts` — with `fetch` throwing, the script writes the fallback values and exits 0.

**Done when:** running `pnpm predev` on a fresh clone with network produces today's mids; with network disabled, produces the fallback; in both cases exit code 0.

---

## FXSW-005 · State machine skeletons
**Effort:** M · **TDD:** 🔴 · **Depends on:** FXSW-003
**Docs:** `03-trade-state-model.md` §1, §2, §6 · `CLAUDE.md` rule §7

**AC:**
- `src/state/machines/timings.ts` exports `ackDelayMs = 250` (overridable from tests by reassignment or env).
- `siMachine.ts` implements states: `Initial`, `PickUpSent`, `PickedUp` only — full state set comes in FXSW-010.
- `rfsMachine.ts` implements states: `Queued`, `PickedUp` only — full state set comes in FXSW-010.
- `dealMachine.ts` parent actor exists with placeholder no-op handlers for all SI events; spawns one of each child on init.
- All machines export inferred TS types for `state.value` and `context`.

**TDD tests (write first):**
- `siMachine.test.ts` — actor starts in `Initial`.
- `siMachine.test.ts` — `send({type:'PickUp'})` transitions to `PickUpSent`.
- `siMachine.test.ts` — after 250ms (`vi.useFakeTimers`), transitions to `PickedUp`.
- `siMachine.test.ts` — overriding `timings.ackDelayMs = 0` makes the transition synchronous.
- `rfsMachine.test.ts` — actor starts in `Queued`.
- `rfsMachine.test.ts` — `send({type:'PickUp'})` transitions to `PickedUp`.
- `dealMachine.test.ts` — spawns both children on init with shared `dealId` in context.

**Done when:** all 7 tests pass; `pnpm typecheck` clean.

---

## FXSW-006 · AppShell + Header + empty blotter
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-002, FXSW-003
**Docs:** `02-functional-spec.md` §1 · `05-ui-ux-spec.md` §2

**AC:**
- `App.tsx` renders the full-window dark workstation layout: header (56px), Active Blotter region (55%), Historic Blotter region (45%).
- Header shows "FX Sales Workstation" left-aligned, mute icon + session clock right-aligned, dev-injector slot conditionally rendered when `?dev=1`.
- 2px top gradient strip per `05 §2`.
- Active Blotter renders one hardcoded row exercising every token: a status pill, mono amount, monospace rate cell, side-coloured cell, reasons chip.
- Historic Blotter shows empty state message.
- No console errors.

**TDD tests (write first):**
- `App.test.tsx` — renders without error; contains text "FX Sales Workstation".
- `App.test.tsx` — does NOT contain the string "Caplin" anywhere in rendered output.
- `App.test.tsx` — with `?dev=1` in URL, dev-injector slot is visible.
- `App.test.tsx` — without `?dev=1`, dev-injector slot is not visible.

**Done when:** tests green; manual eye-test confirms the modern dark feel matches `05 §2` — sharp typography, subtle gradient strip, no rounded-card consumer feel.

---

# Phase 2 — Feed + state coordination

## FXSW-007 · PricingFeed with seeded RNG
**Effort:** M · **TDD:** 🔴 · **Depends on:** FXSW-004, FXSW-005
**Docs:** `04-dummy-feed-spec.md` §3

**AC:**
- `pricingFeed.ts` exports a singleton conforming to the `PricingFeed` interface in `04 §3.4`.
- Loads anchors from `referenceMids.json`.
- Random walk per `04 §3.1` with per-pair `σ` from the spec.
- 300ms tick interval, updates all subscribed pairs each tick.
- Seedable RNG; `window.__seedFeed = 42` produces deterministic output.
- `start()` is idempotent; `stop()` cancels the interval and prevents further emissions.

**TDD tests (write first):**
- `pricingFeed.test.ts` — `subscribe('EURUSD', cb)` receives a tick within 600ms of `start()`.
- `pricingFeed.test.ts` — two subscriptions to same pair both receive ticks.
- `pricingFeed.test.ts` — unsubscribe returned function stops callbacks; further ticks still arrive at other subscribers.
- `pricingFeed.test.ts` — with seed = 42, first 5 ticks for EURUSD match a recorded reference sequence.
- `pricingFeed.test.ts` — after `stop()`, no further callbacks fire even if `start()` is called again with the same seed.
- `pricingFeed.test.ts` — `getLatest('USDJPY')` returns null before any tick, then the latest tick.

**Done when:** all 6 tests pass; coverage ≥ 90%.

---

## FXSW-008 · DealFeed + scenario player
**Effort:** M · **TDD:** 🔴 · **Depends on:** FXSW-005
**Docs:** `04-dummy-feed-spec.md` §4, §5

**AC:**
- `dealFeed.ts` exports a singleton conforming to the `DealFeed` interface in `04 §4.4`.
- `scenarios/definitions.ts` contains the five scenario definitions with the exact client/account/pair/notional/reasons from `07-scenario-pack.md`.
- `scenarios/player.ts` plays scenario events at the right delays. Pre-action delays use `setTimeout`; post-action delays subscribe to deal state and fire when the gating SI state is reached.
- `inject(id)` is idempotent (no double-firing if called twice mid-scenario for the same deal).
- `reset()` cancels all pending events.

**TDD tests (write first):**
- `dealFeed.test.ts` — `subscribe(cb)` receives events.
- `dealFeed.test.ts` — `inject('HAPPY_PATH_ESP')` emits `NEW_ESP_DEAL` synchronously, schedules `CLIENT_ACCEPT` for t+2000.
- `dealFeed.test.ts` — `inject('OFF_HOURS_INTERVENTION')` emits `NEW_SI_DEAL`; `CLIENT_ACCEPT` fires only after a `SEND_STREAM` ack.
- `dealFeed.test.ts` — `reset()` mid-scenario cancels pending events; no callbacks fire after.
- `definitions.test.ts` — every scenario in `07-scenario-pack.md` is registered with the right client name, account, pair, notional, and reasons.

**Done when:** all tests pass; the 5 scenario IDs round-trip from doc → registry → injection.

---

## FXSW-009 · dealsStore + machine spawning
**Effort:** M · **TDD:** 🔴 · **Depends on:** FXSW-005, FXSW-008
**Docs:** `06-tech-architecture.md` §5 · `03-trade-state-model.md` §6

**AC:**
- `dealsStore.ts` (Zustand) holds `Map<dealId, { deal, actor }>`.
- `addDeal(deal)` creates store entry, starts a `dealMachine` actor with the deal as context.
- `removeDeal(dealId)` stops the actor and removes the entry.
- `forwardEvent(dealId, event)` routes the event into that deal's machine.
- Selectors: `useActiveDeals()`, `useHistoricDeals()`, `useDealById(id)`.
- DealFeed events from FXSW-008 are wired into the store (in a top-level `useEffect` in App, or a dedicated bootstrap module).

**TDD tests (write first):**
- `dealsStore.test.ts` — `addDeal` creates the entry and starts an actor whose snapshot is the initial state.
- `dealsStore.test.ts` — `removeDeal` stops the actor (subsequent `forwardEvent` is a no-op, no errors).
- `dealsStore.test.ts` — `forwardEvent` causes the snapshot to advance through the expected state.
- `dealsStore.test.ts` — `useActiveDeals` returns deals whose SI state is not terminal; `useHistoricDeals` returns terminals.
- `dealsStore.test.ts` — `addDeal` for two deals creates two independent actors.

**Done when:** tests pass; manual injection from console (`dealFeed.inject('HAPPY_PATH_ESP')`) results in a row appearing in the active deals selector.

---

## FXSW-010 · dealMachine cross-model coordination
**Effort:** L · **TDD:** 🔴 · **Depends on:** FXSW-005, FXSW-009
**Docs:** `03-trade-state-model.md` §3 (the entire relationship table), §4

**AC:**
- All SI states from `03 §2` implemented in `siMachine.ts`: `Initial`, `PickUpSent`, `PickedUp`, `QuoteSent`, `Quoted`, `WithdrawSent`, `HoldSent`, `RejectSent`, `TraderRejected`, `ClientRejected`, `TradeConfirmed`.
- All RFS states from `03 §1` implemented in `rfsMachine.ts`: `Queued`, `PickedUp`, `Executable`, `TradeConfirmed`, `Expired`, `ClientClosed`.
- `dealMachine` implements every cross-model send in the `03 §3` table.
- `dealable` context flag flips correctly: true in SI `Initial`, false everywhere else, true again after `HoldAck`.
- Every terminal SI state schedules `removeFromActive` after 5 seconds via XState `after`.

**TDD tests (write first):**
- `dealMachine.test.ts` — UI `PickUp`: SI Initial → PickUpSent → PickedUp; RFS Queued → PickedUp.
- `dealMachine.test.ts` — UI `Hold` from PickedUp: SI PickedUp → HoldSent → Initial; RFS PickedUp → Queued; `dealable` becomes true.
- `dealMachine.test.ts` — UI `Quote`: SI PickedUp → QuoteSent → Quoted; RFS PickedUp → Executable.
- `dealMachine.test.ts` — UI `Withdraw` from Quoted: SI Quoted → WithdrawSent → PickedUp; RFS Executable → PickedUp.
- `dealMachine.test.ts` — UI `Reject` from PickedUp: SI → RejectSent → TraderRejected (terminal).
- `dealMachine.test.ts` — UI `Reject` from Quoted: same.
- `dealMachine.test.ts` — `ClientReject` event in Quoted state: SI → ClientRejected (terminal).
- `dealMachine.test.ts` — `TradeConfirmed` event: both SI and RFS go to TradeConfirmed.
- `dealMachine.test.ts` — every terminal SI state fires `removeFromActive` after 5000ms (verified with fake timers).
- `dealMachine.test.ts` — terminal states reject all subsequent events (no transitions).

**Done when:** all 10 tests pass; coverage ≥ 90% on both child machines.

---

## FXSW-011 · statusFromMachines derivation
**Effort:** S · **TDD:** 🔴 · **Depends on:** FXSW-010
**Docs:** `03-trade-state-model.md` §6

**AC:**
- `src/features/blotter/statusFromMachines.ts` exports `derivedStatus(rfsState, siState, dealable) → DisplayStatus`.
- Every cell in the `03 §6` mapping table is implemented.

**TDD tests (write first):**
- `statusFromMachines.test.ts` — one test per row in the §6 table (12 cases).

**Done when:** 100% branch coverage; every spec row has a passing test.

---

## FXSW-012 · Active Blotter live + 5s removal + Historic Blotter
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-009, FXSW-011, FXSW-006
**Docs:** `02-functional-spec.md` §2, §3 · `05-ui-ux-spec.md` §3.2

**AC:**
- Active Blotter wired to `useActiveDeals()`; columns from `02 §2` rendered via AG-Grid.
- Status pills coloured per `03 §8`; left-edge bar per `02 §2 row treatment` table.
- Row click emits SI `PickUp` event for that deal (via `uiStore.openTicket(dealId)` for now; FXSW-014 will handle the actual ticket).
- Each row has `data-deal-id`, `data-rfs-state`, `data-si-state`, `data-display-status`, `data-dealable` attributes.
- Terminal-state row dims at t+0, unmounts at t+5000ms.
- Historic Blotter renders deals from `useHistoricDeals()` with the outcome label per `02 §3`.

**TDD tests (write first):**
- `ActiveBlotter.test.tsx` — given two deals in state, two rows render with correct `data-deal-id`.
- `ActiveBlotter.test.tsx` — row's `data-si-state` and `data-display-status` reflect the underlying machine.
- `ActiveBlotter.test.tsx` — row click calls `uiStore.openTicket(dealId)`.
- `ActiveBlotter.test.tsx` — empty state message renders when no active deals.
- `removalTimer.test.ts` — terminal-state deal: `data-removing` toggles at t=0, row unmounts at t=5000.
- `HistoricBlotter.test.tsx` — renders one row per historic deal with the right outcome label.

**Done when:** tests green; with manual injection of `HAPPY_PATH_ESP` via console, the row appears, completes, dims, and migrates to Historic per spec.

---

## FXSW-013 · DevInjector + HAPPY_PATH_ESP E2E
**Effort:** M · **TDD:** 🟢 · **Depends on:** FXSW-008, FXSW-012
**Docs:** `02-functional-spec.md` §6 · `07-scenario-pack.md` Scenario 1 · `08-test-plan.md` §3

**AC:**
- `DevInjector.tsx` renders in the header when `?dev=1`.
- Six buttons (one per scenario + Reset session) with `data-testid="inject-{id}"`.
- Click invokes `dealFeed.inject(id)`.

**TDD tests (write first):**
- E2E `tests/e2e/happy-path-esp.spec.ts` — full Scenario 1 from `07-scenario-pack.md` Gherkin, transcribed to Playwright using the test fixture pattern from `08 §3`.
- The test pins seed `42`, sets `__zeroAckDelay = true`, and asserts each step via `data-*` attributes.

**Done when:** Playwright E2E passes locally and in CI; total runtime < 12 seconds.

> 🧠 **End of Phase 2 — Wiki Agent trigger.** Build agent saves the phase summary to `raw/prs/FXSW-013-summary.md`. Human switches to the Wiki Agent window and runs: `Ingest raw/prs/FXSW-013-summary.md and the phase 2 commits.` Then: `Lint`. Resume Phase 3 only after wiki state is reconciled.

---

# Phase 3 — Ticket panels + actions

## FXSW-014 · TicketPanel shell + glass overlay
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-006, FXSW-009
**Docs:** `02-functional-spec.md` §1 (ticket overlay), §4.8 · `05-ui-ux-spec.md` §2, §5

**AC:**
- Right-side 640px panel slides in via `transform: translateX` over 240ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
- Glass background: `--color-bg-glass` + `backdrop-filter: blur(20px) saturate(140%)`.
- Blotters dim to 75% opacity when ticket is open.
- Esc closes; clicking outside the panel closes.
- Opening fires `dealMachine.send('PickUp')` for the deal; closing does NOT fire `Hold`.
- `data-testid="ticket-panel"`.

**TDD tests (write first):**
- `TicketPanel.test.tsx` — not rendered when `uiStore.openDealId === null`.
- `TicketPanel.test.tsx` — rendered when set; contains the deal's basic info.
- `TicketPanel.test.tsx` — Esc keypress calls `uiStore.closeTicket()`.
- `TicketPanel.test.tsx` — opening fires SI `PickUp` on the deal's machine.
- `TicketPanel.test.tsx` — closing does NOT fire `Hold`.

**Done when:** tests green; manual: opening from a blotter row shows the slide + blur per spec.

---

## FXSW-015 · ReasonsPanel
**Effort:** S · **TDD:** 🟡 · **Depends on:** FXSW-014
**Docs:** `02-functional-spec.md` §4.1

**AC:**
- One chip per rejection reason with the icon and explanation from `02 §4.1`.
- `data-testid="reasons-panel"`.

**TDD tests (write first):**
- `ReasonsPanel.test.tsx` — given `['OFF_HOURS']`, renders one chip containing "Outside trading window".
- `ReasonsPanel.test.tsx` — given `['SIZE_LIMIT', 'CREDIT_LIMIT']`, renders two chips with the right text.
- `ReasonsPanel.test.tsx` — given `[]`, renders nothing (or a placeholder per spec).

**Done when:** tests green.

---

## FXSW-016 · Summary + DealSummary panels
**Effort:** S · **TDD:** 🟡 · **Depends on:** FXSW-014
**Docs:** `02-functional-spec.md` §4.2, §4.6

**AC:**
- SummaryPanel renders the natural-language sentence per `02 §4.2`.
- DealSummaryPanel renders direction, notional, account, trade date, settlement date (T+2 weekday calc).
- `data-testid="summary-panel"`, `data-testid="deal-summary-panel"`.

**TDD tests (write first):**
- `SummaryPanel.test.tsx` — given Globex BUY 5M USDJPY for SPOT, renders the expected sentence.
- `DealSummaryPanel.test.tsx` — settlement date is T+2 weekdays from trade date (mock Date).
- `DealSummaryPanel.test.tsx` — handles weekend trade-date rollover correctly.

**Done when:** tests green.

---

## FXSW-017 · PricingPanel streaming mode
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-007, FXSW-014
**Docs:** `02-functional-spec.md` §4.4 · `05-ui-ux-spec.md` §4

**AC:**
- Bid/Ask boxes render live from PricingFeed via a custom `usePrice(pair)` hook (subscribes on mount, unsubs on unmount).
- Mid displayed between, dimmer.
- 80ms tick flash (up=green, down=red border) on each price change.
- Stale-feed indicator: if no tick in 3s, cells show "—".
- `data-testid="pricing-panel"`, `data-testid="bid-cell"`, `data-testid="ask-cell"`, `data-testid="mid-cell"`.

**TDD tests (write first):**
- `usePrice.test.tsx` — subscribes on mount; receives tick within 600ms.
- `usePrice.test.tsx` — unsubscribes on unmount.
- `PricingPanel.test.tsx` — with seeded feed, bid/ask cells show expected values.
- `PricingPanel.test.tsx` — tick flash class applied on value change; cleared after 80ms.
- `PricingPanel.test.tsx` — stale-feed mock (no ticks for 3s) shows "—" in cells.

**Done when:** tests green; manual: prices visibly tick at ~3Hz with brief flashes.

---

## FXSW-018 · PricingPanel fixed mode + margin controls
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-017
**Docs:** `02-functional-spec.md` §4.4 · `05-ui-ux-spec.md` §4

**AC:**
- Clicking Bid or Ask box enters fixed mode for that side; clicked box gets `--color-border-focus` outline.
- `Refresh` button appears in fixed mode; clicking snaps the trader rate to current.
- Margin field accepts integer pips; +/- buttons increment/decrement by 1.
- Keyboard `+` / `-` while panel focused has same effect.
- `Return to Stream` action exits fixed mode (button lives in TicketFooter — wired in FXSW-020).
- `data-testid="margin-input"`, `data-testid="margin-plus"`, `data-testid="margin-minus"`, `data-pricing-mode="streaming|fixed"`.

**TDD tests (write first):**
- `PricingPanel.test.tsx` — click Bid → `data-pricing-mode="fixed"`; bid cell has focus-outline class.
- `PricingPanel.test.tsx` — Refresh button only renders in fixed mode.
- `PricingPanel.test.tsx` — + button increments margin by 1; - decrements.
- `PricingPanel.test.tsx` — keypress `+` / `-` does the same.
- `PricingPanel.test.tsx` — margin floor is 1 (can't go below).
- `PricingPanel.test.tsx` — programmatic margin update (simulating FXSW-025 Apply) animates with the indigo outline class for 600ms.

**Done when:** tests green.

---

## FXSW-019 · ClientSummaryPanel
**Effort:** S · **TDD:** 🔴 · **Depends on:** FXSW-018
**Docs:** `02-functional-spec.md` §4.5

**AC:**
- Reads current trader bid/ask + margin, computes client bid/ask via `lib/pips.ts` (already covered by FXSW-005-era pip tests).
- Renders client bid, client ask, estimated profit.
- Frozen in fixed mode using the captured rate; live in streaming.
- `data-testid="client-bid"`, `data-testid="client-ask"`, `data-testid="estimated-profit"`.

**TDD tests (write first):**
- `ClientSummaryPanel.test.tsx` — with bid=1.0850, ask=1.0852, margin=3, EURUSD → client bid 1.0847, client ask 1.0855.
- `ClientSummaryPanel.test.tsx` — with USDJPY (2-decimal pip), correct pip arithmetic.
- `ClientSummaryPanel.test.tsx` — margin change re-renders within 1 frame.
- `ClientSummaryPanel.test.tsx` — fixed mode uses captured rate, not live.

**Done when:** tests green.

---

## FXSW-020 · TicketFooter + *Sent → *Ack flow
**Effort:** L · **TDD:** 🔴 · **Depends on:** FXSW-010, FXSW-014
**Docs:** `02-functional-spec.md` §4.7 · `03-trade-state-model.md` §2, §3

**AC:**
- Five buttons per `02 §4.7`. Visibility gated by SI state.
- Reject and Send Stream are hold-to-confirm (600ms hold or double-click).
- Each button fires the corresponding SI event; the machine transitions through the `*Sent` state with the simulated ack delay.
- Button shows spinner state during the `*Sent` window.
- `data-testid="btn-reject"`, `btn-release`, `btn-send-stream`, `btn-send-quote`, `btn-withdraw`, `btn-return-stream`.

**TDD tests (write first):**
- `TicketFooter.test.tsx` — in SI `PickedUp` streaming mode: Send Stream, Release, Reject visible; Withdraw, Send Quote, Return-to-Stream hidden.
- `TicketFooter.test.tsx` — in SI `PickedUp` fixed mode: Send Quote, Release, Reject, Return-to-Stream visible.
- `TicketFooter.test.tsx` — in SI `Quoted`: Withdraw and Reject visible; others hidden.
- `TicketFooter.test.tsx` — Reject single-click does not fire; hold for 600ms fires.
- `TicketFooter.test.tsx` — Send Stream fires `Quote` event; row's `data-si-state` cycles `QuoteSent` → `Quoted` with the ack delay.
- `TicketFooter.test.tsx` — Send Stream button shows spinner state during `QuoteSent`.
- `TicketFooter.test.tsx` — Release fires `Hold`; SI cycles `HoldSent` → `Initial`; `dealable` flips back to true.

**Done when:** tests green; manual injection of OFF_HOURS_INTERVENTION with full trader-driven flow works end-to-end (though E2E test is FXSW-021).

---

## FXSW-021 · OFF_HOURS_INTERVENTION E2E
**Effort:** S · **TDD:** 🟢 · **Depends on:** FXSW-020
**Docs:** `07-scenario-pack.md` Scenario 2

**AC:**
- Playwright spec transcribing the Gherkin scenario.
- Uses `data-si-state` for state assertions (not text).

**TDD tests (write first):**
- The E2E spec is the test. Written following the template in `08 §3` (`Off-Hours Intervention end-to-end`).

**Done when:** Playwright passes locally and in CI; runtime < 15 seconds.

> 🧠 **End of Phase 3 — Wiki Agent trigger.** Save summary to `raw/prs/FXSW-021-summary.md`. Wiki Agent: ingest + lint with code-drift on `data-testid` and component naming.

---

# Phase 4 — AI Margin Suggestion

## FXSW-022 · clientProfiles seed data
**Effort:** S · **TDD:** 🔴 · **Depends on:** FXSW-008
**Docs:** `09-suggestion-engine.md` §11

**AC:**
- `src/services/suggestion/clientProfiles.ts` exports `getClientProfile(clientName: string): ClientProfile`.
- Five profiles per `09 §11`.

**TDD tests (write first):**
- `clientProfiles.test.ts` — each named client returns the expected tier, volume, acceptance rate, behavior flag.
- `clientProfiles.test.ts` — unknown client returns a default `'new'` tier profile (defensive).

**Done when:** tests green.

---

## FXSW-023 · Suggestion engine (100% branch)
**Effort:** L · **TDD:** 🔴 · **Depends on:** FXSW-022
**Docs:** `09-suggestion-engine.md` §3, §4, §5, §6, §7

**AC:**
- `src/services/suggestion/engine.ts` exports `suggestMargin(input): MarginSuggestion`.
- Implements every branch in `09 §5`.
- `CREDIT_LIMIT` returns the credit-decline shape (`state === 'credit-decline'`, no `suggestedPips`).
- `factors` sum equals `suggestedPips - tierBase` (algebraic invariant).
- `computeConfidence` per `09 §6`.

**TDD tests (write first) — 25+ cases:**
- Per tier (platinum/gold/standard/new), with default notional/market: baseline pip values match.
- Per notional band (≤5M, 5–10M, 10–20M, >20M): delta matches.
- Per behavior flag (flight_risk, high_engagement + 100M vol, neither): delta matches.
- Off-hours rejection reason: +1.5 delta.
- Size-limit rejection reason: +0.5 delta.
- Credit-limit rejection reason: returns credit-decline shape.
- Vol > 1.5: +1 delta.
- Thin liquidity: +1.5 delta.
- High-vol pair: +0.5 delta.
- Acceptance rate < 0.4: -0.5 delta.
- Confidence: high for established + normal market; low for new client or thin liquidity; medium otherwise.
- Algebraic invariant: factors sum + tier base = suggestedPips (across 5 sampled inputs).
- Floor: minimum suggestedPips is 1.

**Done when:** 100% branch coverage on `engine.ts`; all 25+ cases green.

---

## FXSW-024 · Rationale builder
**Effort:** S · **TDD:** 🔴 · **Depends on:** FXSW-023
**Docs:** `09-suggestion-engine.md` §8

**AC:**
- `src/services/suggestion/rationale.ts` exports `buildRationale(factors, suggestedPips, input): string`.
- Output ≤ 120 chars.
- Ends with `— suggesting {N} pips.` for non-credit cases.

**TDD tests (write first):**
- Given the gold/12M EURUSD/size-limit input, output matches the example in `09 §8` to within wording (regex tolerance).
- Given a 0-factor input (everything default), output is concise and grammatical.
- Given 5-factor input, output truncates to drop lowest-magnitude factor and stays ≤ 120 chars.
- Credit-decline input returns the §7 message.

**Done when:** tests green.

---

## FXSW-025 · SuggestionPanel ready / applied / Undo
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-023, FXSW-024, FXSW-018
**Docs:** `02-functional-spec.md` §4.3 · `05-ui-ux-spec.md` §4.5 · `09-suggestion-engine.md` §10, §13

**AC:**
- Renders engine output: suggested pips at 32px mono, rationale, confidence badge, Apply, Why?.
- Apply sets `marginPips` on the deal context and collapses to "Applied {N} pips · Undo" strip.
- Undo restores previous margin and re-expands.
- Why? expands the factors table.
- Indigo accent, sparkle icon, glow per `05 §4.5`.
- Test contract per `09 §13`.

**TDD tests (write first):**
- `SuggestionPanel.test.tsx` — renders pips, rationale, confidence from mocked engine output.
- `SuggestionPanel.test.tsx` — Apply click updates deal context margin and switches `data-suggestion-state` to `applied`.
- `SuggestionPanel.test.tsx` — Undo restores previous margin and switches back to `ready`.
- `SuggestionPanel.test.tsx` — Why? click reveals factor table; second click hides it.
- `SuggestionPanel.test.tsx` — Apply triggers the indigo outline animation on the margin field (test by class/attribute).

**Done when:** tests green.

---

## FXSW-026 · SuggestionPanel credit-decline + recompute
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-025
**Docs:** `09-suggestion-engine.md` §7, §9 · `05-ui-ux-spec.md` §4.5 (computed state)

**AC:**
- Credit-decline state renders the §7 message and a Reject shortcut button instead of Apply.
- Reject shortcut fires the same event as the TicketFooter Reject (single hold-to-confirm).
- Recompute icon button triggers `suggestMargin` again.
- Vol shift > 30% from last input also triggers recompute (debounced 800ms).
- Computed state shows shimmer + "Recomputing…" per spec.

**TDD tests (write first):**
- `SuggestionPanel.test.tsx` — given CREDIT_LIMIT reason, `data-suggestion-state="credit-decline"` and Reject button present, Apply absent.
- `SuggestionPanel.test.tsx` — Reject shortcut fires SI `Reject` event (verify via spy on dealMachine).
- `SuggestionPanel.test.tsx` — recompute click triggers shimmer for ~800ms then new suggestion.
- `SuggestionPanel.test.tsx` — vol change > 30% triggers recompute; vol change ≤ 30% does not.

**Done when:** tests green.

---

## FXSW-027 · SIZE_LIMIT + CREDIT_BREACH E2E
**Effort:** S · **TDD:** 🟢 · **Depends on:** FXSW-025, FXSW-026
**Docs:** `07-scenario-pack.md` Scenarios 3, 4

**AC:**
- Two Playwright specs.
- Assert AI suggestion value (4 pips for Northwind/12M EURUSD), confidence badge text, rationale fragment.

**TDD tests (write first):**
- The E2E specs are the tests.

**Done when:** both pass in CI.

> 🧠 **End of Phase 4 — Wiki Agent trigger.** Save summary to `raw/prs/FXSW-027-summary.md`. Wiki Agent: ingest + lint with **mandatory code-drift on `engine.ts` pip-delta values ↔ `wiki/components/suggestion-engine.md`** (drift-prone area per `WIKI-SETUP.md`).

---

# Phase 5 — Notifications + polish + ship

## FXSW-028 · Notifications visual layer
**Effort:** M · **TDD:** 🟡 · **Depends on:** FXSW-012
**Docs:** `02-functional-spec.md` §5

**AC:**
- ToastStack in top-right; new SI deal fires a toast with deal summary, dismissable, auto-dismiss at 6s.
- Row flash on new SI deal (300ms amber fade).
- Document title prefixes with `● ` for 5s on new SI deal.
- Clicking toast opens the ticket.

**TDD tests (write first):**
- `ToastStack.test.tsx` — toast appears when an `Initial` SI state with `dealable=true` enters the store.
- `ToastStack.test.tsx` — auto-dismisses at 6s.
- `ToastStack.test.tsx` — click calls `uiStore.openTicket(dealId)`.
- `titleFlash.test.ts` — document title prefixed with `● ` for 5s, then restored.
- Re-Release of an already-pickup-then-released deal does NOT re-fire notifications.

**Done when:** tests green.

---

## FXSW-029 · Audio chime + mute + settingsStore
**Effort:** M · **TDD:** 🔴 · **Depends on:** FXSW-028
**Docs:** `02-functional-spec.md` §5.3, §5.4 · `06-tech-architecture.md` §5

**AC:**
- `useNotificationSound` hook plays a 180ms 880Hz sine on new SI deal, via WebAudio API.
- Autoplay unlock on first `click`/`keydown` on `document`.
- `settingsStore` with `muted` flag; persisted to `sessionStorage` key `si.muted`.
- MuteToggle in header reflects state.

**TDD tests (write first):**
- `settingsStore.test.ts` — toggling mute updates state and writes to sessionStorage; reload restores it (test via mock storage).
- `useNotificationSound.test.tsx` — schedules an OscillatorNode when unmuted + after audio unlock (spy on `AudioContext.prototype.createOscillator`).
- `useNotificationSound.test.tsx` — does not schedule when muted.
- `useNotificationSound.test.tsx` — does not schedule before first user gesture.
- `MuteToggle.test.tsx` — click flips state; correct icon per state.

**Done when:** tests green; manual: actually plays a tiny ping on a real new deal in dev.

---

## FXSW-030 · Visual polish pass
**Effort:** M · **TDD:** — · **Depends on:** FXSW-028, FXSW-029, FXSW-026
**Docs:** `05-ui-ux-spec.md` (entire)

**AC:** Eye-test against the UI spec. Specifically:
- Glass blur on ticket overlay visible and crisp.
- Header gradient strip subtle but present.
- AI panel indigo glow distinct from chrome.
- All animation durations match `05 §5` (no jank, no laggy transitions).
- Hover states present on all interactive surfaces.
- Focus rings visible (Tab through and check).
- No console errors anywhere.
- Below 1440px width, the "resize your window" notice renders.

**No automated tests.** Captured in a polish-pass commit.

**Done when:** the operator can sit through the demo and not flinch at any visual moment.

---

## FXSW-031 · RELEASE_PATH E2E
**Effort:** S · **TDD:** 🟢 · **Depends on:** FXSW-020
**Docs:** `07-scenario-pack.md` Scenario 5

**AC:** Playwright spec for Scenario 5.

**Done when:** passes in CI.

---

## FXSW-032 · CI workflow
**Effort:** S · **TDD:** 🟡 · **Depends on:** FXSW-021, FXSW-027, FXSW-031
**Docs:** `08-test-plan.md` §6

**AC:**
- `.github/workflows/ci.yml` per `08 §6`.
- Caches pnpm.
- Uploads Playwright traces on failure.
- Total runtime < 5 minutes.

**TDD tests (write first):**
- `ci.yml` is itself the artifact. Test by pushing a branch and watching the workflow run.

**Done when:** workflow green on `main` and on a sample feature branch.

---

## FXSW-033 · README + demo recording
**Effort:** M · **TDD:** — · **Depends on:** FXSW-030, FXSW-032
**Docs:** `README.md` template-equivalent for shipped repos · `CLAUDE.md` rule §1

**AC:**
- Final `README.md` for the repo: project description (brand-neutral, no vendor names), tech stack, getting started commands, scripts table, link to internal `docs/` for spec, **live demo URL** from FXSW-034.
- 30–60 second screen recording walking through the 5 demo scenarios per the running order in `07-scenario-pack.md`.
- Recording embedded in or linked from README.

**No automated tests.**

**Done when:** the deliverable would not embarrass a senior engineer at a sales demo.

---

## FXSW-034 · GitHub Pages deploy workflow
**Effort:** S · **TDD:** 🟡 · **Depends on:** FXSW-032
**Docs:** `06-tech-architecture.md` §7.1

**AC:**
- `vite.config.ts` reads `base` from `process.env.VITE_BASE_PATH || '/'`.
- `.github/workflows/deploy.yml` exists per `06 §7.1.b`, triggers on push to `main` and `workflow_dispatch`.
- Permissions block grants `pages: write` and `id-token: write` only (least privilege).
- `VITE_BASE_PATH` set to `/fx-sales-intervention/` in the build step.
- Repo Settings → Pages → Source: GitHub Actions (manual one-time setup; document in README).
- First deploy successful; live URL accessible.
- README updated with the live demo URL.

**TDD tests (write first):**
- `vite.config.test.ts` — with `VITE_BASE_PATH=/foo/`, `base` resolves to `/foo/`; with env unset, `base` is `/`.
- Manual: after first push to `main`, deploy workflow runs green and URL serves the app with assets loading correctly (no 404s on JS/CSS under the subpath).

**Done when:**
- Live URL serves the app, dev injector visible at `?dev=1`, all five scenarios runnable from the live URL.
- README contains the live URL prominently.
- The deploy workflow re-runs cleanly on a subsequent push (idempotent).

**Notes:**
- Public repo → free. Private repo → requires paid GitHub plan for Pages.
- If using a custom domain, add `public/CNAME` and change `VITE_BASE_PATH` to `/`.
- Frankfurter fetch runs in CI on every deploy, so reference mids are always current — no manual refresh needed.

> 🧠 **End of Phase 5 — Final Wiki Agent sweep.** Save summary to `raw/prs/FXSW-033-summary.md`. Wiki Agent: full ingest + full lint (all categories, all code-drift checks). Then rewrite `wiki/onboarding.md` from scratch using everything learned during the build. The onboarding page is the project's deliverable for future engineers; it should reflect the shipped state, not the planned state.

---

# Wiki Agent integration

The Wiki Agent is a **separate Claude Code session**, not a sub-agent of the build session. It is set up per `WIKI-SETUP.md` (paste-in activation block, pre-answered initialization, pre-drafted schema). It owns `wiki/` and `raw/`; the build agent owns `src/`, `tests/`, `scripts/`, and config.

The trigger points are inline in the backlog above (the 🧠 markers). The human is responsible for switching windows and invoking the wiki agent at each gate — the build agent does not invoke it. This separation is deliberate: the build agent stays focused on the next ticket, the wiki agent stays focused on synthesizing state, and they communicate via files (`raw/prs/` summaries) rather than direct calls.

**There is no FXSW-XXX ticket for the wiki.** Wiki work is a parallel track on its own cadence, not a unit of the build backlog.
