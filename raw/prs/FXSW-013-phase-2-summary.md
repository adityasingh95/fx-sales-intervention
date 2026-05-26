---
phase: 2
tickets: FXSW-007 → FXSW-013
date: 2026-05-26 (synthesized retrospectively)
status: stable
note: |
  The build agent's KICKOFF-PROMPT.md hand-off contract called for
  docs/phase-summaries/FXSW-013-summary.md. That file was not produced
  at the time. This summary is synthesized by the wiki agent from
  docs/dev-log.md entries (FXSW-007 through FXSW-013, plus the
  post-phase responsive-layout amendment) and the git log on
  claude/amazing-archimedes-bCg0w. It is the wiki agent's stand-in
  hand-off artifact for the Phase 2 ingest.
sources:
  - docs/dev-log.md
  - git log
---

# Phase 2 — Feed + state coordination — Summary

Phase 2 wired the prototype's data spine end-to-end: a pricing feed, a deal feed driven by scripted scenarios, the two-machine deal lifecycle (RFS + SI coordinated by a parent), status-derivation, live blotters, and a dev injector. Closed with `HAPPY_PATH_ESP` running as a passing Playwright E2E.

## What works

| Ticket | Commit | What landed |
|---|---|---|
| FXSW-007 | `d66d885` | `pricingFeed` singleton: Mulberry32 PRNG + Box-Muller normal sampling, 300ms tick interval, mean-reverted random walk anchored to baked-at-build-time `referenceMids.json`. Seedable via `window.__seedFeed`; seed-42 golden sequence `EURUSD = [1.1715, 1.1714, 1.1714, 1.1714, 1.1714]` locked in by test. `stop()` clears subscriptions. |
| FXSW-008 | `9d979ba` | `dealFeed` + scenario player. Five scenarios registered in `definitions.ts` (`HAPPY_PATH_ESP`, `OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH`) with verbatim payloads from `docs/07-scenario-pack.md`. Time-gated follow-ups (`{ kind: 'delay', ms }`) + state-gated follow-ups (`{ kind: 'after-si-state', state, delayMs }`). `dealFeed.notifyDealState` is the state-injection seam the deals-store calls on every SI transition. |
| FXSW-009 | `f8e993d` | `dealsStore` (Zustand) with `Map<dealId, DealEntry>`. `addDeal` spawns a parent `dealMachine` actor, subscribes to its `rfs` and `si` children, mirrors their snapshots into the entry. Selectors: `useActiveDeals`, `useHistoricDeals`, `useDealById`. SI subscriber calls `dealFeed.notifyDealState` — closes the state-gate loop for FXSW-008's follow-ups. `dealsBootstrap.wireDealFeedToStore()` runs once at boot. |
| FXSW-010 | `0e04da3` | Full `dealMachine` cross-model coordination per `docs/03 §3`. All SI states from `docs/03 §2` implemented; all RFS states from the v1 subset. `*Sent → *Ack` via `after: { ackDelay: ... }` named delay function. Every terminal SI state has `after: { removalDelay: 'Removed' }`. `dealable` derived from `siState === 'Initial'` in the store entry, not on parent context. Inline `sendTo` calls in parent handlers (no helper factories) — XState v5 generics require this. |
| FXSW-011 | `0abbba6` | `statusFromMachines.ts` — pure `derivedStatus(rfs, si, dealable) → DisplayStatus`. 13 `it.each` cases cover every row of `docs/03 §6`. Predicate order: terminals → in-flight `*Sent` → live tuples → fallback. Closed `DisplayStatus` union; `'INTERVENE'` is the documented fallback. |
| FXSW-012 | `96490b3` | Active Blotter live + 5s removal + Historic Blotter. Did **not** use AG-Grid — a plain flex-row table covers every column the spec requires and gives clean per-row `data-*` attributes (AG-Grid 31 has no first-class API for this). Store restructured into parallel `deals: Map` + `historic: HistoricEntry[]`; terminal rows stay in active (dimmed) for 5s before archival. `outcomeFromFinalStates` maps the final state pair to one of five outcome labels at archival time. |
| FXSW-013 | `ef01b92` | `DevInjector.tsx` + `HAPPY_PATH_ESP` E2E. Real Reset button wipes both `deals` and `historic`. ESP-channel wiring pulled forward: `addDeal(deal, reasons, channel)` accepts `'ESP'\|'SI'`; ESP fires an `AutoPrice` event on the parent which fans `PriceUpdate` to RFS only, leaving SI at `Initial`. `rfsMachine` gained a `Removed` cleanup state mirroring SI (ESP deals need it because SI never moves). `derivedStatus` tightened — `rfsState === 'TradeConfirmed'` alone resolves to `DONE`. `outcomeFromFinalStates` broadened — either machine reaching `TradeConfirmed` resolves to `Executed`. `main.tsx` zero-ack-delay hook reads `window.__zeroAckDelay`. |
| — | `e5195a7` | **Post-phase amendment**: responsive layout for mobile + tablet. PRD §4 originally scoped desktop-only; user requested mobile support during the FXSW-013 demo. Horizontal-scroll pattern (header inject strip + each blotter as a single scroll viewport at `min-w-[1100px]`/`min-w-[920px]`). Tailwind `sm:` (640px) breakpoint. Verified on 390×844, 768×1024, 1440×900. No tests added — multi-viewport variants would 6x the e2e wall time without catching regressions the 1280px run wouldn't already catch. |

## What's rough or open

- **Build-agent hand-off violation.** The `docs/phase-summaries/FXSW-013-summary.md` file the KICKOFF-PROMPT.md contract calls for was never created. The dev-log entry for FXSW-013 misread the contract (it claims the file appears "once the human triggers the Wiki Agent" — but the contract clearly puts it in `docs/`, which is build-agent-owned). This summary is the wiki-agent's stand-in.
- **Three of the five scenarios are unblocked at the data + feed level but blocked on UI.** `OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH` all have working definitions + state-gated follow-ups, but driving them requires the TicketPanel (FXSW-014+) for `Send Stream` / `Reject` / `Release`. Their E2Es land alongside the panel work in Phase 3 / 4 / 5.
- **Act warnings in jsdom test output** are present but non-blocking. They come from Zustand store updates triggered by XState actor subscriptions, both outside React's `act()` scope. Per `CLAUDE.md` rule, "no console errors in dev mode" applies to the running app, not test stderr; CI tests still pass.
- **AG-Grid still in `package.json`** despite not shipping in the deployed bundle. Kept for potential future tickets that need virtualization / column resize / grouping. ADR-0004 marks the original decision as superseded.

## What surprised me

- **`docs/03 §3` "Raise `Reject` on RFS → RFS terminal" contradicts `docs/03 §1`** which doesn't list a `Reject` event for RFS. Resolution: leave RFS untouched on trader-reject; the row leaves Active via SI's terminal state + the 5-second rule. Raising `ClientClose` on RFS (the spec-adjacent alternative) would change `rfsState` to `ClientClosed` for the 5-second window, adding nothing visible and risking confusing status-derivation.
- **XState v5 `setup`-typed machines reject helper factories** like `toSi(type)` because of strong generic narrowing. The parent's 16-event handler block is verbose as a result — inline `sendTo` is the only form that compiles cleanly without `any` / `@ts-ignore`. Doc-pack `CLAUDE.md` "if a type is hard, write the type — don't escape" applied.
- **The AG-Grid AC was untestable as-stated** (no first-class per-row `data-*` API). The flex-row swap was a spec-vs-toolchain reconciliation, captured in ADR-0004 as a superseded decision.
- **`*Sent` cleanup needed a hidden `Removed` state on both machines**, not just SI. ESP deals never enter SI workflow (SI stays at `Initial`), so the RFS machine reaches `TradeConfirmed` alone and needs its own removal pathway. The `dealsStore` archive helper is idempotent via an `if (!cur) return` guard — whichever subscriber fires first wins.
- **`?dev=1` was on by default during the responsive demo**, exposing the live URL on mobile without the inject buttons being reachable. Horizontal-scroll fix went in as a PRD amendment, documented in the dev-log "Mobile/responsive layout" entry.

## Phase 2 gate result

| Gate | Result at FXSW-013 close | Notes |
|---|---|---|
| `typecheck` | ✓ | clean |
| `lint` | ✓ | `--max-warnings 0`, no warnings |
| `test:run` | ✓ (**183 pass / 4 todo**) | Up from 110 / 8 at end of Phase 1 — 73 net new tests across the phase |
| `test:e2e` | ✓ | smoke + `happy-path-esp` passing in 8.0s |
| `build` | ✓ | `dist/` clean |
| vendor neutrality | ✓ | forbidden-term grep over `dist/` returns no matches |

## Ready for Phase 3

Yes. Phase 3 (FXSW-014 → FXSW-021) builds the ticket panels on top of the now-live deal lifecycle. The blocker — no UI for trader actions — is exactly what Phase 3 closes.

## Wiki ingestion targets (now done)

When this summary is ingested, it touches:

- [components/pricing-feed.md](../../wiki/components/pricing-feed.md) — FXSW-007
- [components/deal-feed.md](../../wiki/components/deal-feed.md) — FXSW-008
- [components/scenario-player.md](../../wiki/components/scenario-player.md) — FXSW-008
- [components/deals-store.md](../../wiki/components/deals-store.md) — FXSW-009
- [components/deal-machine.md](../../wiki/components/deal-machine.md) — FXSW-010
- [components/si-machine.md](../../wiki/components/si-machine.md) — FXSW-010
- [components/rfs-machine.md](../../wiki/components/rfs-machine.md) — FXSW-010 + FXSW-013 (ESP `Removed` state)
- [components/status-derivation.md](../../wiki/components/status-derivation.md) — FXSW-011
- [features/active-blotter.md](../../wiki/features/active-blotter.md) — FXSW-012
- [features/historic-blotter.md](../../wiki/features/historic-blotter.md) — FXSW-012
- [features/dev-injector.md](../../wiki/features/dev-injector.md) — FXSW-013
- [scenarios/happy-path-esp.md](../../wiki/scenarios/happy-path-esp.md) — FXSW-013 (status: stable)
- [decisions/ADR-0004-ag-grid-community.md](../../wiki/decisions/ADR-0004-ag-grid-community.md) — superseded at FXSW-012

All those pages are already written and reflect the Phase 2 state.
