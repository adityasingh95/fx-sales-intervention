---
phase: 3
ticket_range: FXSW-014 → FXSW-021
date: 2026-05-26
branch: claude/cool-planck-MeZgz
gate_counts:
  unit_tests: 235 pass / 3 todo
  e2e_tests: 3 pass (smoke + happy-path-esp + off-hours-intervention)
  typecheck: clean
  lint: clean (--max-warnings 0)
  build: clean
  caplin_grep: dist/ Caplin-free on every commit's build
---

# Phase 3 Summary — Ticket panels + actions

Builds on Phase 2 (live blotters + scenario injector). End state: every SI scenario from `07-scenario-pack.md` can be driven end-to-end through the UI — click an INTERVENE row, panel slides in, send stream / withdraw / reject all wired through the dealMachine's *Sent → *Ack flow, client accepts after 1.5s, row archives to Historic with the correct outcome label. The OFF_HOURS_INTERVENTION E2E is the integration check that locks all of this together.

## What works

**FXSW-014 — TicketPanel shell + glass overlay.** Commit `99e9823`.
- Right-side overlay (640px on `sm:` and up, full-width on mobile per the responsive amendment) slides in over 240ms with `cubic-bezier(0.16, 1, 0.3, 1)` per `docs/05 §2`. Glass background via `bg-bg-glass + backdrop-blur-xl + backdrop-saturate-150`. Backdrop click + Esc close. Blotters dim to `opacity-75` while ticket open.
- Two-pass mount pattern (`requestAnimationFrame(() => setSlidIn(true))`) so the slide-in animates from `translate-x-full` → `translate-x-0` without bouncing.
- Opens fires SI `PickUp` only if `siState === 'Initial'` — re-opening a `PickedUp` deal doesn't double-fire.
- Closing does NOT auto-Hold (per `02 §4.8`).
- 5 specified TDD cases all green.

**FXSW-015 — ReasonsPanel.** Commit `5198b26`.
- "Risk Analysis" section, one chip per RejectionReason with lucide `Clock` / `Maximize2` / `ShieldAlert` icons and the verbatim one-line explanations from `02 §4.1`.
- Empty `reasons[]` → renders null.
- 3 TDD cases pass.

**FXSW-016 — Summary + DealSummary panels.** Commit `096d645`.
- SummaryPanel renders the natural-language sentence ("Client X wants to BUY/SELL Y BASE vs QUOTE for SPOT settlement.") + a key/value strip.
- DealSummaryPanel renders Direction, Notional, Account, Trade date, Settlement date.
- `src/lib/time.ts` real: `addBusinessDays` skips Sat + Sun and rolls weekend trade dates forward; `formatSettlementDate` renders en-GB `27 May 2026`.
- 12 tests pass (2 SummaryPanel + 4 DealSummary + 6 time.ts).

**FXSW-017 — PricingPanel streaming mode.** Commit `1f88333`.
- `usePrice(pair)` hook at `src/services/feed/usePrice.ts` — subscribes to pricingFeed, returns latest tick. State seeded from `getLatest` so consumers mounting after a tick don't render `—` immediately.
- PricingPanel with Bid/Mid/Ask cells. `data-flash="up"/"down"` on a value change, clears after 80ms. Stale watchdog: 3-second `setTimeout` arms on every tick; if it fires, all cells render `—`.
- **Debug detour:** seed-42 first EURUSD tick has `mid_float ∈ [1.17145, 1.171475)` — mid rounds to 1.1715 but `bid = mid_float − 0.000025` rounds to 1.1714. FXSW-007's golden sequence locked only the mid; FXSW-017's panel test now captures the bid/ask asymmetry at the half-spread rounding boundary.
- 5 tests pass (2 usePrice + 3 PricingPanel).

**FXSW-018 — PricingPanel fixed mode + margin controls.** Commit `3a09a3e`.
- Click bid/ask → fixed mode (`data-pricing-mode="fixed"` + `data-focused="true"` on the clicked side). Rate freezes at the captured tick.
- Refresh button (lucide `RefreshCw`) renders only in fixed mode; click re-captures the live tick.
- Margin controls: − / input / + with parent-controlled state. Numeric input clamps floor at 1. Keyboard `+` / `-` works while the panel is mounted (ignored when typing into an input).
- Programmatic margin change animates `data-margin-glow="true"` on the input for 600ms.
- 6 new TDD cases pass (9 PricingPanel total).

**FXSW-019 — ClientSummaryPanel + pips lib + PricingPanel lift.** Commit `466bb45`.
- `src/lib/pips.ts` real: `pipSizeFor`, `clientBidFromTrader`, `clientAskFromTrader` (round to pair display precision), `estimatedProfitUsd` (per-pair conversion via midRate for USD-base pairs).
- ClientSummaryPanel renders Client Bid / Client Ask / Estimated profit. Null tick → em-dash placeholders.
- **Refactor**: PricingPanel becomes presentational for pricing mode + frozen tick. TicketPanel owns the lifted state via a single `usePrice` call and computes `displayTick = pricingMode === 'fixed' ? frozenTick : liveTick`. Both panels now see the same display tick.
- 14 net new tests (9 pips, 5 ClientSummaryPanel).

**FXSW-020 — TicketFooter + *Sent → *Ack flow.** Commit `18e0c24`.
- 6 buttons per `docs/02 §4.7`: Reject / Release / Send Stream / Send Quote / Withdraw / Return-to-Stream. Visibility gated on `siState + pricingMode`.
- HoldButton primitive inlined: 600ms `setTimeout` on `pointerDown`, cancels on `pointerUp` / `pointerLeave`; `onDoubleClick` is the alternative confirm path. Visual progress overlay via a `holdgrow` keyframe added to `global.css`.
- Each button stays mounted through its `*Sent` window so the spinner renders in-place (same testid, same DOM node).
- 7 specified TDD cases pass.

**FXSW-021 — OFF_HOURS_INTERVENTION E2E.** Commit `65e2cbf`.
- `tests/e2e/off-hours-intervention.spec.ts` transcribes `07-scenario-pack.md` Scenario 2 — inject → INTERVENE row → click → ticket → hold Send Stream 600ms → Quoted/STREAMING → 1.5s wait → TradeConfirmed/DONE → 5s wait → Historic with `data-outcome="Executed"`.
- `__seedFeed = 42` + `__zeroAckDelay = true` injected before navigation. Hold via Playwright's `click({ delay: 700 })`.
- Toast + document-title-prefix assertions intentionally deferred to FXSW-028.
- Runtime 8.0s. All three E2Es total 17.9s.

## What's rough or open

- **No notifications layer yet.** FXSW-028 owns the toast + document-title-prefix + audio chime. The OFF_HOURS E2E omits the toast assertions per the Gherkin scenario; a future commit on the E2E adds them once FXSW-028 ships.
- **AI Margin Suggestion still placeholder.** Phase 4 (FXSW-022–026) is the deliverable. The ticket has the placeholder note in the body where the suggestion will mount.
- **`act()` warnings in the test output** are still there — XState child-actor subscriptions firing outside React's `act()` scope. Tests pass, CI gates green; the warnings are noise but flagged in the FXSW-012 entry for a future polish pass.
- **No `Button.tsx` shared component yet.** FXSW-020 inlined ActionButton + HoldButton inside `TicketFooter.tsx`. Per `docs/05 §3.1` they should eventually lift to `src/components/Button.tsx` with a `holdToConfirm` prop. FXSW-029 polish ticket is the right place to lift.
- **CREDIT_BREACH / SIZE_LIMIT_MARGIN_TUNE / RELEASE_PATH scenarios are interactively driveable** but no E2E spec yet. Those are unblocked by FXSW-020 (footer wired) but the Gherkins live for FXSW-028+ alongside notifications.
- **Browser cache after each deploy** remains an open UX gotcha (flagged in Phase 2 summary). User must hard-refresh after a fresh deploy. Out of scope for the prototype.

## What surprised you

- **Seed-42 bid/ask asymmetry caught a real bug in the test expectations.** FXSW-007 locked the mid sequence at `[1.1715, 1.1714, …]`. FXSW-017's first PricingPanel test asserted bid = 1.1715 by inference. The bid is actually 1.1714 because the underlying `mid_float` lands in `[1.17145, 1.171475)` and `bid = mid_float − 0.000025` rounds below. Took a 20-minute debug detour with logged subscriber callbacks to confirm the feed was correct and the test expectation was wrong. Worth flagging because "golden sequences" can hide rounding-boundary asymmetries.
- **Refactor cost of the FXSW-019 PricingPanel lift was low.** Lifting `pricingMode` / `fixedSide` / `frozenTick` from PricingPanel to TicketPanel touched the FXSW-017 + FXSW-018 tests (they now render through a `Harness` that mirrors the TicketPanel wiring) but every behavioural assertion stayed the same. The lift was the right architecture from the start; the FXSW-018 internal state was expedient.
- **Hold-to-confirm + double-click ALSO-paths.** The docs/02 §4.7 spec says "600ms hold OR double-click." Implementing both is one extra `onDoubleClick` handler on the same button; gives the operator a fast-path without compromising the safety affordance.
- **The OFF_HOURS E2E doubles as an integration test for the entire ticket flow.** It exercises FXSW-007 (pricing feed) through FXSW-020 (footer) through FXSW-008 (scenario player's state-gated CLIENT_ACCEPT) through FXSW-009 (deals store archival). Any contract regression on `data-deal-id`, `data-si-state`, `data-display-status`, `data-outcome`, the reasons-panel label, the margin-input value, or the footer button visibility would break this E2E. Worth its weight at the end of Phase 3.
- **No new deps introduced in Phase 3.** Phase 3 added ~30 component + lib files but the only library imports were already in `package.json` from Phase 1: lucide-react (icons), clsx, react, xstate, zustand. The doc-pack's pinned-stack discipline held up cleanly.

## Recommended next slice

**Ready for Phase 4.** Start with **FXSW-022 — clientProfiles seed data**. Then through FXSW-026 the AI Margin Suggestion panel comes online — that's the moment-of-delight Phase 4 is named for. The TicketPanel body already has the placeholder note flagging where it'll mount.

Phase 3 work product lives on `claude/cool-planck-MeZgz` ahead of `main` by 16 commits; the PR back to main + Wiki Agent ingest happen as a single hand-off step.
