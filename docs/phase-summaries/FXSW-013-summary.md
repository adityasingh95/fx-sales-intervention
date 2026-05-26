---
phase: 2
ticket_range: FXSW-007 → FXSW-013
date: 2026-05-25
merge_commit: b17735a
branch: claude/cool-planck-MeZgz (merged + retained on remote for now)
gate_counts:
  unit_tests: 183 pass / 4 todo
  e2e_tests: 2 pass (smoke + happy-path-esp)
  typecheck: clean
  lint: clean (--max-warnings 0)
  build: clean
  caplin_grep: dist/ Caplin-free on every commit's build
---

# Phase 2 Summary — Feed + state coordination

Builds on Phase 1 (scaffold + first hardcoded blotter row). End state: scenario-injectable workstation with the Happy Path ESP scenario flowing end-to-end through Active → Historic, four other scenarios queueing as INTERVENE rows waiting for the Ticket Panel (Phase 3).

## What works

**FXSW-007 — PricingFeed with seeded RNG.** Commit `d66d885`.
- Singleton `pricingFeed` at `src/services/feed/pricingFeed.ts` conforming to `04 §3.4`.
- Mulberry32 PRNG + Box-Muller normal sampler; per-pair `sigmaPips` / `spreadPips` / `pipSize` / display `precision` table from `04 §2 §3.1`.
- 300ms tick, 10% mean-reversion to bootstrapped reference mids from `referenceMids.json`.
- Seedable via `window.__seedFeed` (Playwright pins to `42` per `07-scenario-pack.md` notes).
- `stop()` clears subscriptions, latest cache, mids, references, and the interval — the harshest valid interpretation of the AC test "after stop(), no further callbacks fire even if start() is called again." Reset-session UX re-subscribes on remount.
- 6/6 TDD tests pass; seed-42 golden EURUSD mid sequence locked in as `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]`.

**FXSW-008 — DealFeed + scenario player.** Commit `9d979ba`.
- Thin singleton `dealFeed` fans `DealEvent`s out; internal `createScenarioPlayer` factory with injectable `emit` / `now` / `generateDealId` runs scripted scenarios.
- All 5 scenarios from `07-scenario-pack.md` registered at `src/services/scenarios/definitions.ts`. Time-gated follow-ups via `setTimeout`; state-gated follow-ups via `notifyDealState(dealId, siState)` bridge.
- `notifyDealState` is the one departure from the `04 §4.4` interface sketch — added explicitly so the deals store has a single coupling target for SI state changes. Documented at the interface definition.
- 12 tests pass: 4 behavioural on `dealFeed`, 6 round-trips of `definitions` against `07-scenario-pack.md`'s test data, 2 direct on the player's emit/now/generateDealId seams.

**FXSW-009 — dealsStore + machine spawning.** Commit `f8e993d`.
- Zustand `dealsStore` at `src/state/stores/dealsStore.ts` holding `Map<dealId, DealEntry>` per `06 §5`.
- `addDeal` spawns a `dealMachine` actor; child-actor subscriptions on RFS + SI keep cached state names in the entry so React selectors are reactive without `getSnapshot()` from components.
- `removeDeal` / `forwardEvent` / `useActiveDeals` / `useHistoricDeals` / `useDealById` exposed.
- SI subscriber calls `dealFeed.notifyDealState(dealId, siState)` on every transition — closes the FXSW-008 bridge.
- `dealsBootstrap` wires `dealFeed` → `addDeal` once at app boot; called from `main.tsx` before React renders.
- 15 tests pass: 5 store behavioural + 8 `isHistoric` helper + 2 bootstrap integration.

**FXSW-010 — dealMachine cross-model coordination.** Commit `0e04da3`.
- `siMachine` now has all 11 prototype-subset states from `03 §2` plus a hidden `Removed` final state. Each terminal (`TraderRejected` / `ClientRejected` / `TradeConfirmed`) `after: removalDelay → Removed` (the 5-second blotter rule from `02 §Active Blotter` encoded as the timed transition).
- `rfsMachine` has `Queued` / `PickedUp` / `Executable` / `TradeConfirmed` / `ClientClosed` / `Expired`, accepting `PickUp` / `Hold` / `PriceUpdate` / `Withdraw` / `TradeConfirmed` / `Expire` / `ClientClose`.
- `dealMachine.Running.on` fans every trader-driven event into both children with the cross-sends from `03 §3`: `PickUp` → both, `Quote` → SI:Quote + RFS:PriceUpdate, `Withdraw` → both, `Hold` → both, `Reject` → SI only (RFS has no Reject event in §1), `ClientReject` → SI only, `TradeConfirmed` → both.
- `dealsStore.forwardEvent` reverts to parent-routing (`entry.actor.send`), replacing the FXSW-009 interim that bypassed to the SI child.
- `timings.ts` gains `removalDelayMs = 5000` alongside `ackDelayMs`.
- 10 TDD tests pass covering each cross-model row + the 5-second terminal-removal invariant.

**FXSW-011 — statusFromMachines derivation.** Commit `0abbba6`.
- `derivedStatus(rfsState, siState, dealable): DisplayStatus` at `src/features/blotter/statusFromMachines.ts` — the `03 §6` table in code form.
- Predicate order: terminal → `*Sent` in-flight → live (RFS, SI) tuples → `INTERVENE` fallback. Terminals win over the partner machine's label during the 5-second post-terminal window.
- 13 `it.each` cases pass (every documented row + `RejectSent` from both `PickedUp` and `Executable`).

**FXSW-012 — Active Blotter live + 5s removal + Historic Blotter.** Commit `96490b3`.
- `ActiveBlotter` wires to `useActiveDeals()`; each row is a `<button>` with `data-deal-id` / `data-rfs-state` / `data-si-state` / `data-display-status` / `data-dealable` / `data-removing`. Click → `uiStore.openTicket(dealId)`. Left-edge bar color from a `BAR_FOR: Record<DisplayStatus, string>` Tailwind map; terminal rows get `opacity-60`.
- `HistoricBlotter` wires to `useHistoricDeals()` (the new parallel `historic: HistoricEntry[]` list in the store, not a filter on `deals`).
- Store restructured: when SI reaches `Removed`, the subscriber archives the entry to `historic` with the previous terminal `siState` captured + `outcome` derived. `useActiveDeals` now returns *every* live entry (including the 5-second post-terminal window, dimmed), not a filtered view.
- `addDeal(deal, rejectionReasons, channel)` accepts the rejection reasons (carried through to the Reasons column) + a channel parameter for ESP-vs-SI wiring.
- `uiStore` real (`openDealId` / `openTicket` / `closeTicket`).
- `lib/format.ts` real (`formatTime` / `formatAmount` / `formatRate` with 6 tests).
- Cell components (`StatusCell` / `AmountCell` / `ReasonsCell` / `RateCell`) real. RateCell subscribes to `pricingFeed`, shows em-dash placeholder until first tick.
- 14 net new tests; `pricingFeed.start()` called once in `main.tsx`.

**FXSW-013 — DevInjector + HAPPY_PATH_ESP E2E.** Commit `ef01b92`.
- `DevInjector` real: one `data-testid="inject-{ScenarioId}"` button per scenario + a Reset button (wipes dealFeed timers, all live actors, both blotters).
- ESP-channel wiring: `dealsStore.addDeal` for ESP fires a new `AutoPrice` event on the parent dealMachine, which fans `PriceUpdate` to RFS only — RFS goes Queued → Executable, SI stays Initial, derivedStatus → AUTO.
- Bootstrap forwards `CLIENT_ACCEPT` → `TradeConfirmed`, `CLIENT_REJECT` / `CLIENT_CANCEL` → `ClientReject`.
- `rfsMachine` gains a `Removed` cleanup state mirroring siMachine — needed for ESP archival (SI never advances past Initial in the ESP flow).
- `main.tsx` reads `window.__zeroAckDelay` at boot; sets `timings.ackDelayMs = 0` for E2Es. `removalDelayMs` left intact (real wall-clock per `07 Notes on test fidelity`).
- `tests/e2e/happy-path-esp.spec.ts` green in 8s: inject → AUTO within 500ms → DONE after 2s → row leaves Active and lands in Historic with `outcome=Executed` after a further 5s.
- **End of Phase 2 per BACKLOG.**

**Responsive amendment** (out-of-scope of PRD §4, user-requested mid-phase). Commit `e5195a7`.
- Header's dev-injector slot becomes a horizontally-scrollable region; inject buttons get `whitespace-nowrap` so labels stay single-line.
- Each blotter (Active + Historic) wraps column-headers + body in one `overflow-auto` container at `min-w-[1100px]` / `min-w-[920px]`. Column headers sticky-top; whole table scrolls as a unit below the min-w.
- Verified at mobile 390×844, tablet 768×1024, desktop 1440×900 via Playwright.
- Doc reconciliation commit `10e3a43`: PRD §4, functional §1, UI/UX §9, BACKLOG FXSW-033 polish item all updated.

## What's rough or open

- **No TicketPanel.** Four of the five scenarios (`OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH`) queue INTERVENE rows that sit idle in Active because clicking them only sets `uiStore.openDealId` — there's nothing rendering a panel. FXSW-014 unblocks this.
- **AG-Grid is in `package.json` but unused.** FXSW-012 deviated from the AC's "rendered via AG-Grid" wording; the plain flex layout from FXSW-006 carries every column the spec needs. If a future ticket genuinely needs grid features (sortable columns, pinning, grouping), AG-Grid is one import away. Otherwise the dep can be removed during the Phase 5 polish ticket.
- **`window.__zeroAckDelay` hook is global mutation at boot.** `main.tsx` flips `timings.ackDelayMs` to 0 if the flag is set, but tests that do their own `timings.ackDelayMs = 0` in `beforeEach` work fine alongside it. If a future ticket needs runtime ack-delay control (e.g. a settings panel in dev mode), the global-mutation pattern needs to become a real store.
- **The empty-state copy says "Use the dev injector (top right)" but the dev injector only renders with `?dev=1`.** Chicken-and-egg if a user lands at the bare URL. Flagged during the milestone review; FXSW-033 polish ticket can fix.
- **`act()` warnings in jsdom test output** are present but non-blocking — XState actor subscriptions fire outside React's act() scope and trigger Zustand updates that re-render components. Wrapping every store-mutating test line in `act()` removes most but not all. Tests still pass; CI gates green.
- **Browser cache after each deploy.** GitHub Pages serves a stale `index.html` referencing deleted asset hashes; users have to hard-refresh. Out of scope for the prototype; would need a cache-busting header or service worker in a real deployment.

## What surprised you

- **GitHub Pages environment protection rule.** Pushing to `claude/cool-planck-MeZgz` ran the deploy workflow successfully through the build job (artifact uploaded) but the deploy job was rejected by an env-level "Deployment branches" allowlist that only permits main. Discovered when the user reported the live URL still served the Phase 1 hardcoded row despite repeated pushes. Resolution: merge to main. The build agent has no API access to inspect env settings — the human had to read the failure annotation off the Actions UI and screenshot it. Worth flagging in `06-tech-architecture.md §7.1` or a CI-troubleshooting note for future sessions.
- **5-second blotter rule needed an `RFS-Removed` mirror to siMachine.** For SI scenarios both children reach terminal so siMachine's `after: removalDelay → Removed` archives correctly. ESP scenarios leave SI at Initial forever — the deal would never get archived if only siMachine had the Removed cleanup. Adding the same pattern to rfsMachine (with idempotent `archive()` helper guarded by `if (!cur) return`) closed the loop. Doc-pack hadn't called this out; the failing E2E surfaced it.
- **`outcomeFromFinalStates` initially missed the ESP path.** Function checked `siState === 'TradeConfirmed'` for Executed but the ESP flow has `siState === 'Initial'` + `rfsState === 'TradeConfirmed'`. Fell through to `Cancelled` as the fallback. Caught by the same E2E on first run; one-line fix (`||` clause).
- **Tailwind dropdowns on tight columns.** EURUSD's 0.5-pip spread is below 4dp display precision, so `bid == ask == mid` after rounding. The first `pricingFeed` test asserted `ask > bid`, which was wrong — the spread is real, just sub-pip in display. Relaxed to `>=` for EURUSD, kept `>` for USDJPY where the 1.0-pip spread is always visible at 2dp.
- **Responsive design was out of scope per PRD §4, then back in.** User opened the live URL on mobile mid-phase, asked for proper responsive support. Implemented as a single horizontal-scroll layout (not a card-stacked redesign) to keep one codepath. Reconciled four doc spots to match the new reality. Worth noting as a precedent for in-flight spec amendments — the `dev-log.md` entry is the source of truth, the older docs got patched.
- **Spec deviation: `notifyDealState` extends the `DealFeed` interface beyond `04 §4.4`.** Bridge method needed for state-gated scenario follow-ups. Documented inline at the interface definition. Acceptable agent-directed decision; alternative was an out-of-band module that both `dealFeed` and `dealsStore` would have had to know about.

## Recommended next slice

**Ready for Phase 3.** Start with **FXSW-014 — TicketPanel shell + glass overlay** to make INTERVENE rows clickable through to a panel. After FXSW-014, `OFF_HOURS_INTERVENTION` becomes interactively driveable (open ticket → Send Stream → Quoted → CLIENT_ACCEPT after 1.5s → DONE → Historic). That second-scenario E2E is what closes the user-visible loop for SI deals.

The Phase 2 work product is at `b17735a` on `main`. The feature branch `claude/cool-planck-MeZgz` remains on the remote but can be safely deleted after the Wiki Agent ingests this summary. Wiki Agent triggers per `KICKOFF-PROMPT.md` + `WIKI-SETUP.md` — separate session, human-invoked.
