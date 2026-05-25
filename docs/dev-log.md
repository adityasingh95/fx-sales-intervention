# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales
Workstation** prototype. Each entry is the chat-style summary the
agent posted on ticket completion — terse bullets, decisions split
between **user-directed** and **agent-directed**, gate counts as the
trailing bullet.

The user-vs-agent split is the point of this document. It surfaces
exactly where the AI agent had autonomy under doc-pack guidance, and
exactly where it escalated to the human for direction. The
expectation in a healthy AI-native pipeline is that most routine
implementation decisions stay agent-directed (because the spec pack
covers them) and human attention concentrates on scope, strategy,
and genuine ambiguities.

This is presentation material for two parallel stories:

1. **The prototype** — a sales-trader workstation for FX manual
   pricing intervention. Single-page React + XState app, simulated
   feed, no backend.
2. **The AI-native development pipeline** — a spec pack
   (`docs/00–09`), `CLAUDE.md` operating rules, a TDD-shaped backlog
   (`docs/BACKLOG.md`), a downstream Wiki Agent hand-off contract,
   and a four-gate guard (`typecheck + lint + test:run + test:e2e`)
   on every commit. This log is the artifact that shows the
   pipeline in motion.

Separate from `docs/phase-summaries/` — those are end-of-phase
hand-off summaries for the Wiki Agent. This is the working journal.
Most recent first.

---

## FXSW-010 · dealMachine cross-model coordination
**Commit `0e04da3`**

- TDD red→green: 10 specified `dealMachine.test.ts` cases — context-and-spawn shape, each of the cross-model coordinations (`PickUp` / `Hold` / `Quote` / `Withdraw` / `Reject from PickedUp` / `Reject from Quoted` / `ClientReject in Quoted` / `TradeConfirmed`), the 5-second `removeFromActive` rule across all three terminal SI states, and the "terminal SI states reject all subsequent events" invariant. All run under `vi.useFakeTimers()` so the 250ms ack delays and 5000ms removal delay are instant under `vi.advanceTimersByTime()`.
- **siMachine** now implements every state in `docs/03 §2` (the v1 subset): `Initial`, `PickUpSent`, `PickedUp`, `QuoteSent`, `Quoted`, `WithdrawSent`, `HoldSent`, `RejectSent`, `TraderRejected`, `ClientRejected`, `TradeConfirmed`, plus a hidden `Removed` final state that the terminals reach via `after: removalDelay`. External events are the seven trader-driven ones (`PickUp`, `Quote`, `Withdraw`, `Hold`, `Reject`, `ClientReject`, `TradeConfirmed`); `*Ack` events are modelled as `after` transitions per FXSW-005's convention.
- **rfsMachine** now implements the prototype-subset states from `docs/03 §1`: `Queued`, `PickedUp`, `Executable`, `TradeConfirmed`, `ClientClosed`, `Expired`. Events: `PickUp`, `Hold`, `PriceUpdate`, `Withdraw`, `TradeConfirmed`, `ClientClose`, `Expire`. The dealMachine parent raises these in response to its own trader-driven events per the cross-model table in `docs/03 §3`.
- **dealMachine** runs a single `Running` state whose `on` handlers fan each trader event into both children with the cross-sends from `docs/03 §3`: `PickUp → toSi+toRfs`, `Quote → SI:Quote + RFS:PriceUpdate`, `Withdraw → both`, `Hold → both`, `Reject → SI only` (RFS has no `Reject` event in §1), `ClientReject → SI only`, `TradeConfirmed → both`. Each child ignores events it doesn't accept (XState v5 default), so the fan-out is safe.
- **`timings.ts`** gains `removalDelayMs: 5000` alongside the existing `ackDelayMs`. Tests zero-able for instant assertions.
- **`dealsStore`** now routes via the parent (`entry.actor.send(event)`) instead of going direct to the SI child — the parent's handlers handle the routing properly post-FXSW-010, so the FXSW-009 interim hack is removed. The store's SI subscriber detects the `Removed` SI state and schedules `removeDeal(dealId)` via `queueMicrotask` (deferring so we don't stop the actor mid-subscription-callback). The `dealable` flag is derived from `siState === 'Initial'` per the AC.

**User-directed decisions:** None — `03 §2 §3 §4` and `06 §5` were prescriptive enough on every state, transition, and cross-send.

**Agent-directed decisions:**
- **Terminal-with-`after`-to-`Removed`, not `type: 'final'` with side-effect actions.** AC says "every terminal SI state schedules `removeFromActive` after 5 seconds via XState `after`." XState v5 doesn't cleanly allow `after` transitions on `final` states; conversely, a hidden `Removed` final state reached via `after: { removalDelay: 'Removed' }` is idiomatic. The dealsStore observes the `Removed` transition and calls `removeDeal(dealId)` — the "remove from active" action that the AC names. Spec-compatible, type-clean, no setup-action plumbing needed.
- **Trader `Reject` doesn't transition RFS.** `docs/03 §3` says "Raise `Reject` on RFS → RFS terminal" but `docs/03 §1` doesn't list a `Reject` event for RFS. The spec is inconsistent. The FXSW-010 AC tests only assert the SI side of `Reject`. Picked: leave RFS untouched on trader-reject; the row leaves the Active Blotter via SI's terminal state and the 5-second removal. The closest spec-compliant alternative — raising `ClientClose` on RFS — would change `rfsState` to `ClientClosed` for the 5-second window, which adds nothing visible (RFS isn't displayed) and risks confusing FXSW-011's status derivation.
- **Parent fans every event to both children, even when only one accepts it.** XState v5 silently no-ops events a child doesn't define. The alternative — conditionally fan based on child state — would duplicate the routing knowledge already encoded in the child machines' `on` handlers and add fragility. Fanning is simpler, cheaper, and the child machines remain the single source of truth for "what advances me".
- **Inlined `sendTo` calls in the parent's `on` handlers rather than a `toSi(type)` / `toRfs(type)` helper.** Helper factories erased the precise event-type narrowing that `setup({...}).createMachine({...})` needs to satisfy XState v5's strong generic types. The inline form is verbose but compiles cleanly with no `any`, no `@ts-ignore`, no helper-level cast. CLAUDE.md "if a type is hard, write the type — don't escape" applies.
- **`dealable` derived from `siState === 'Initial'` in the dealsStore entry, not as `assign`'d context on the parent dealMachine.** AC says "`dealable` context flag flips correctly: true in SI Initial, false everywhere else, true again after HoldAck." The parent dealMachine doesn't naturally observe child state transitions (no `onTransition` hook for spawned actors in XState v5 without subscribing), so storing `dealable` as an `assign`'d parent-context field would require a parallel child-subscription inside the parent — duplicating exactly what the dealsStore already does. Derivation in the store entry is the same invariant, half the plumbing. Reads consistently as `entry.dealable`, which is all FXSW-011/012 need.
- **`Removed` cleanup via `queueMicrotask` from the SI subscriber.** Calling `removeDeal` synchronously inside the subscription callback would `actor.stop()` an actor mid-transition. Deferring one microtask is the smallest-possible delay that lets the current transition settle. Setting up an explicit XState invoke / sendParent pipeline would have been more "correct" but adds three indirections to do what one microtask does.
- **No `Reject` event accepted by `Initial`.** The SI machine only accepts `Reject` from `PickedUp` or `Quoted`. Sending `Reject` to `Initial` is a no-op. The AC tests cover both reject-source states; rejecting from `Initial` would be a UI bug (you can't reject something you haven't picked up).
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**156 pass / 5 todo**, up from 146 / 5 — 10 new `dealMachine.test.ts` cases), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-009 · dealsStore + machine spawning
**Commit `f8e993d`**

- TDD red→green: 5 specified `dealsStore.test.ts` behavioural cases (addDeal creates an entry in initial state, removeDeal stops the actor and subsequent forwardEvent is a safe no-op, forwardEvent advances the SI machine through `PickUpSent → PickedUp`, active/historic split works, two addDeal calls produce independent actors) plus 8 `it.each` cases on the pure `isHistoric(siState)` helper covering all five reachable + three terminal SI state names, plus 2 `dealsBootstrap.test.ts` cases that verify `dealFeed.inject('HAPPY_PATH_ESP')` and `dealFeed.inject('CREDIT_BREACH')` actually land entries in the store with the right deal payload.
- `src/state/stores/dealsStore.ts` is a Zustand `create()` store with a `Map<dealId, DealEntry>` per `docs/06 §5`. `DealEntry` holds `{ deal, actor, siState, rfsState, dealable }`. The store subscribes to each spawned child actor's snapshots and replaces the cached state name immutably on every transition, so React selectors stay reactive without anyone calling `getSnapshot()` from a component.
- `addDeal(deal)` creates a `dealMachine` actor with `{ dealId }` input, starts it, pulls the spawned `rfs`/`si` children out of context, subscribes to both, and inserts the entry. Idempotent — a second `addDeal` for the same `dealId` is a no-op.
- The SI subscriber additionally calls `dealFeed.notifyDealState(dealId, stateName)` on every SI transition. That's the bridge wire-up that closes the FXSW-008 loop: state-gated scenarios like `OFF_HOURS_INTERVENTION` (`CLIENT_ACCEPT` 1500ms after SI reaches `Quoted`) will now fire automatically once the SI machine ever reaches that state, which lands in FXSW-010.
- `useActiveDeals()` / `useHistoricDeals()` / `useDealById(id)` are the three selector hooks. Active vs historic split uses the exported `isHistoric(siState)` helper backed by `TERMINAL_SI_STATES = {TraderRejected, ClientRejected, TradeConfirmed}` (from `docs/03 §2 §8`). The split is enforced via a pure function so it's unit-testable without the SI machine having to actually reach a terminal state (none are reachable until FXSW-010).
- `src/state/stores/dealsBootstrap.ts` exports `wireDealFeedToStore()`: subscribes to `dealFeed` once and routes `NEW_ESP_DEAL` / `NEW_SI_DEAL` events to `dealsStore.addDeal`. Idempotent (safe across HMR + repeat calls). Returns an unsubscribe function for tests. Called from `main.tsx` before the React tree renders.

**User-directed decisions:** None — `06 §5`, `03 §6`, and `04 §6` were prescriptive enough on the store shape, the actor spawning, and the cross-feed bridge. The implementation seams I had to pick (where the active/historic split lives, how to type `forwardEvent` given FXSW-005's deliberately-narrow `SiEvent`) sit inside doc-pack guidance.

**Agent-directed decisions:**
- **`forwardEvent` routes directly to the SI child for now**, not through the parent dealMachine. FXSW-005 left the parent's 16 event handlers as no-ops (placeholders for FXSW-010 to fill in with real RFS↔SI coordination from `03 §3`). Sending events to the parent would be silently dropped today. Two paths considered: (a) pull forward FXSW-010's parent-routing now, (b) bypass the parent in the store with a comment marking the interim. Picked (b) — smaller scope concession, the comment names FXSW-010 explicitly, and the contract surface (`forwardEvent(dealId, event) → SI advances`) is the same once FXSW-010 swaps the implementation.
- **`forwardEvent` typed as `SiEvent`, not the dealMachine's broader `DealEvent`.** FXSW-005's `SiEvent` is currently the narrow `{type: 'PickUp'}` placeholder. Typing the store's API to that narrow union means TypeScript catches "you can't send `Reject` yet" today, and the API surface naturally widens for free when FXSW-010 expands the SI event union to all 16 names. Alternative — typing wider and casting at the send site — would have required `as unknown as ...` or a `Record<string, unknown>` escape, both of which CLAUDE.md rules out.
- **`isHistoric` lives in `dealsStore.ts`, not `statusFromMachines.ts`.** The full display-status derivation is FXSW-011's deliverable; `dealsStore` only needs the active/historic boolean for its selectors. Exporting one small constant + helper keeps the store self-contained for this ticket. FXSW-011 can re-export or re-define from a shared module without breaking callers.
- **Store subscribes to children, not the parent.** Parent dealMachine snapshots don't change when children transition (the parent stays in `Running`), so a parent-only subscription would miss every SI/RFS state change. Subscribing to both children and writing back to the store entry's `siState`/`rfsState` is the standard XState-React pattern when you don't want components to call `getSnapshot()` themselves and is what makes `useActiveDeals()` / `useHistoricDeals()` reactive.
- **State updates use immutable Map replacement** (`new Map(state.deals); next.set(id, {...cur, ...patch})`). Zustand needs reference inequality to trigger re-renders, and `Map.set()` returns the same reference. The `replaceEntry` helper centralises the pattern so future patches don't accidentally mutate.
- **Idempotency on `addDeal`** (`if (get().deals.has(id)) return`). Cheap guard against double-injection from HMR, double-firing scenarios, or accidental double `inject(scenarioId)` from a future dev injector double-click. The dealFeed's idempotency is per-scenario-instance; the store's idempotency is per-dealId.
- **No `_setStateForTest` helper, no machine-stub seams.** The 5 specified store tests use real machine transitions (PickUp → PickUpSent → PickedUp via `vi.advanceTimersByTime(timings.ackDelayMs)`) for the reachable path, and the `isHistoric` helper carries the terminal-state coverage on its own. Cleaner than punching test-only holes in the production store.
- **Bootstrap returns an unsubscribe function**. Tests need to tear down between cases; production calls `wireDealFeedToStore()` once at boot and never tears down. Returning the teardown function adds zero cost in production and saves a parallel `getInternalUnsubscribeForTests()` API.
- The Active Blotter still shows the FXSW-006 hardcoded row — wiring the dynamic data into the blotter is FXSW-012. Today you can verify the store works from the dev console: `dealFeed.inject('HAPPY_PATH_ESP')` then `useDealsStore.getState().deals` shows the entry. No user-visible change in the deployed app for this ticket.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**146 pass / 5 todo**, up from 131 / 5 — 15 new tests across `dealsStore.test.ts` and `dealsBootstrap.test.ts`), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-008 · DealFeed + scenario player
**Commit `9d979ba`**

- TDD red→green: 4 specified `dealFeed.test.ts` cases (subscribe round-trips events, `inject('HAPPY_PATH_ESP')` emits `NEW_ESP_DEAL` synchronously and schedules `CLIENT_ACCEPT` at t+2000, `inject('OFF_HOURS_INTERVENTION')` emits `NEW_SI_DEAL` and gates `CLIENT_ACCEPT` on the SI machine reaching `Quoted`, `reset()` cancels both time-gated and state-gated pending events) plus 6 `definitions.test.ts` cases that round-trip every scenario's client/account/pair/side/notional/reasons against `07-scenario-pack.md`, plus 2 direct `player.test.ts` sanity checks that exercise the injectable `generateDealId` / `now` / `emit` seams.
- `src/types/deal.ts` and `src/types/scenario.ts` now real: `Deal`, `Side`, `Tenor`, `RejectionReason`, `ScenarioId`, `SCENARIO_IDS`, `DealChannel`, `FollowUpEvent`, `FollowUpTrigger`, `ScenarioFollowUp`, `Scenario`. Closed unions throughout; `SCENARIO_IDS` mirrors `ScenarioId` with `as const satisfies readonly ScenarioId[]` so the two stay locked at compile time.
- `src/services/feed/types.ts` gets `DealEvent` (the discriminated union from `04 §4.2`) and a `DealFeed` interface that extends the `04 §4.4` sketch with one bridge method: `notifyDealState(dealId, siState)`. Rationale below.
- `src/services/scenarios/definitions.ts` registers all five scenarios (`HAPPY_PATH_ESP`, `OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH`) with verbatim data from `07-scenario-pack.md`. Follow-ups use `{ kind: 'delay', ms }` for time-gated firings and `{ kind: 'after-si-state', state, delayMs }` for state-gated firings.
- `src/services/scenarios/player.ts` exports a `createScenarioPlayer({ emit, now?, generateDealId? })` factory. Time-gated follow-ups use `setTimeout`; state-gated follow-ups register a `Gate` and wait for `notifyDealState(dealId, state)` to schedule the post-delay. `reset()` clears both pending timers and unarmed gates.
- `src/services/feed/dealFeed.ts` is a thin singleton that fans `DealEvent`s out to subscribers and delegates `inject` / `reset` / `notifyDealState` to one internal player.

**User-directed decisions:** None — `04 §4–5` and `07-scenario-pack.md` were prescriptive enough on every field. The only open implementation seams (where to put domain types, how to expose the SI-state gate to the deals store) didn't rise to genuine ambiguity.

**Agent-directed decisions:**
- **Extended the `DealFeed` interface with `notifyDealState(dealId, siState)`.** `04 §6` says "the DealFeed listens to deal status changes via the deal store and triggers the queued event when the precondition state is reached" — that requires a state-injection seam. The `04 §4.4` interface sketch doesn't include one. Two designs were possible: (a) the deals store imports a player module directly and calls a player API, or (b) all bridge traffic goes through `dealFeed` so the deals store has one coupling target. Picked (b): one surface, one obvious wiring point in FXSW-009, and the doc comment on the interface flags why the method is there. Documented with a comment on the interface itself so the next reader sees the rationale at the type definition.
- **Player as a factory + injectable seams**, not a second module-scoped singleton. The factory takes `emit`, `now`, and `generateDealId` so tests can pin the dealId (`d_test1`, `d_test2`) and the `createdAt` timestamp without monkey-patching globals. The dealFeed instantiates one player at module load with `emit` wired to the fan-out — that's the only singleton anyone calls from app code.
- **Inline 6-char ID generator** rather than adding `nanoid` to `package.json`. The spec's `'d_' + nanoid(6)` is illustrative; the prototype only needs in-memory uniqueness with no security or sort-order guarantees, so a `Math.random()`-backed alphanumeric is sufficient and dep-free.
- **State-gate uses the SI state name as a string**, not a closed union. The full SI state set lands in FXSW-010 (`PickUpSent`, `PickedUp`, `QuoteSent`, `Quoted`, `WithdrawSent`, `HoldSent`, `RejectSent`, `TraderRejected`, `ClientRejected`, `TradeConfirmed`). Tying the gate to a not-yet-complete enum would create churn. The trade-off is no typo protection on the gate name; the `definitions.test.ts` round-trip is the practical guard. When FXSW-010 lands the full enum, the gate type can tighten in a 1-line change.
- **Default `defaultMarginPips: 3`** across every scenario (`04 §4.3` says "typically 3"). The variation is in trader behavior at the ticket (FXSW-021+), not the initial deal payload.
- **`Deal.pair` typed as the closed `Pair` union** from `src/services/feed/types.ts`, not `string`. Same rationale as the FXSW-007 `Pair` decision — typo protection at the call site, single source of truth for the four-pair set, the spec's looser `string` was a typing-convenience artifact.
- **No `inject()` idempotency guard beyond per-deal one-shot timers.** AC reads "no double-firing if called twice mid-scenario for the same deal." Each `inject()` generates a fresh `dealId`, so two inject calls produce two independent deals with independent follow-up timers. Same-deal double-firing is structurally prevented by the one-shot timer model — when a `setTimeout` callback runs it removes itself from the active set. No additional guard added.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**131 pass / 5 todo**, up from 119 / 7 — 12 new tests, two `it.todo` placeholders retired), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-007 · PricingFeed with seeded RNG
**Commit `d66d885`**

- TDD red→green: all 6 specified `pricingFeed.test.ts` cases — first subscriber receives a tick within one tick of `start()`, two subscribers to the same pair both receive identical ticks, unsubscribe stops one callback without affecting others, seed-42 produces a recorded EURUSD mid sequence `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]`, `stop()` halts emissions for the original subscriber even across a re-`start()`, and `getLatest(pair)` returns null until the first tick then the latest cached tick.
- `pricingFeed.ts` is a module-scoped singleton conforming to the `PricingFeed` interface from `04 §3.4`. Mulberry32 PRNG + Box-Muller normal sampling drive the random walk; per-pair `sigmaPips` / `spreadPips` / `pipSize` / display `precision` live in a `CONFIG: Record<Pair, PairConfig>` table populated from `04 §2` and `04 §3.1`. Tick interval is 300ms (`04 §3.2`), mean reversion is 10% pull per tick toward `referenceMids.json` anchors (`04 §3.1`).
- `types.ts` defines a closed `Pair` union (`'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'`) plus a `PAIRS` `as const satisfies readonly Pair[]` array — the two stay in lockstep at compile time. `PriceTick` and `PricingFeed` are the only other exports.
- Seeded via `window.__seedFeed` per `04 §7` ("Playwright pins the seed via `window.__seedFeed = 42`"). Read at `start()` time so each fresh start can pick up a new seed. Fallback when unset is `Date.now() & 0xFFFFFFFF`.
- Display rounding per `04 §7` ("no floating-point sin; round to the pair's pip precision for display"): mid/bid/ask are all rounded to the pair's `precision` (4dp for the dollar majors, 2dp for the JPY/INR pairs) at the tick boundary, not at the consumer.

**User-directed decisions:**
- **Which ticket comes after the Phase 1 merge?** Options offered: (a) FXSW-007 `PricingFeed` per backlog order — pure service, no UI change; (b) skip ahead to FXSW-008 + FXSW-009 to make the hardcoded blotter row become a live injected scenario; (c) bundle FXSW-007 + FXSW-008 together since they're conceptually paired. **Chosen:** (a). Backlog order respected; the seed-deterministic feed is independently testable and FXSW-008/9 build on it cleanly.

**Agent-directed decisions:**
- **`Pair` as a closed union** (`'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDINR'`) rather than the `pair: string` shape from the `04 §3.4` interface sketch. Spec is illustrative; the four pairs in `04 §2` are the closed set for v1. Closed unions catch typos (`subscribe('EURSUD', ...)` becomes a compile error) and mirror the `PillColor` pattern already established in FXSW-006. The spec's looser `string` was a typing-convenience artifact, not a requirement.
- **`stop()` clears subscriptions** in addition to halting the interval and resetting all state. The AC test phrasing — "after `stop()`, no further callbacks fire even if `start()` is called again with the same seed" — only holds if subscriptions die with `stop`. Dev-injector "Reset session" flow (`04 §3.4` + §7) calls `stop()` then `start()`; UI components re-subscribe on mount, so the harsher semantics don't break the reset path.
- **Mulberry32 + Box-Muller** for PRNG + normal sampling. Both are standard, deterministic, zero-dependency, and small enough to inline. Mulberry32 has good statistical properties for non-cryptographic use; Box-Muller is the textbook way to turn uniforms into standard normals without a math library. Tested only via the seed-42 golden sequence — the seed-determinism guarantee is what the consumer cares about, not the underlying statistical quality.
- **Test for `bid >= ask` uses `>=` on EURUSD, `>` on USDJPY**. EURUSD's 0.5-pip spread is below 4dp display precision so `bid == ask == mid` after rounding — that's correct per spec, not a bug. USDJPY's 1.0-pip spread at 2dp always shows, so it's the cleaner pair to assert strict ordering on. Both assertions land in the same test for completeness.
- **Reference sequence captured empirically.** Wrote the seed-42 test with a placeholder expectation, ran it once, locked in the produced `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]` as the golden. Standard golden-fixture practice — the test now guards against any RNG / iteration-order / Box-Muller change.
- **Module-scoped state, not a class.** AC says "exports a singleton conforming to the `PricingFeed` interface". Module-scoped `Map`s + a frozen object literal satisfy it with less ceremony than a class + `new` + an exported instance. Test isolation works via `afterEach(() => pricingFeed.stop())` because `stop()` clears everything.
- **Mean reversion as `MEAN_REVERSION * (ref - cur)`** added to the random-walk delta, per the spec's "10% pull per tick" wording (`04 §3.1`). The alternative — multiplicative pull, e.g. `cur + (ref - cur) * 0.1` then add noise separately — gives the same expected steady-state behaviour at this scale; the additive form is what the spec describes literally.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (**119 pass / 7 todo**, up from 113 / 8 — the 6 new pricingFeed tests replaced 1 placeholder), e2e ✓ (smoke), build ✓, dist/ Caplin-free ✓.

---

## FXSW-034 · GitHub Pages deploy workflow (out of order, pulled from Phase 5)
**Commit `0762c4e`**

- TDD red→green: 3 cases in `tests/unit/vite.config.test.ts` covering `resolveBasePath` — env-set returns env value, undefined returns `/`, empty string returns `/`.
- `.github/workflows/deploy.yml` matches `docs/06 §7.1.b` verbatim: triggers on push to `main` + `workflow_dispatch`, least-privilege permissions (`contents: read`, `pages: write`, `id-token: write`), pnpm cached, `VITE_BASE_PATH=/fx-sales-intervention/` set on the build step, `actions/upload-pages-artifact` + `actions/deploy-pages` for the deploy.
- `vite.config.ts` reads base via a new `scripts/resolveBasePath.ts` helper (extracted so vitest can import it under the app tsconfig without dragging `vite + esbuild + plugin-react` through jsdom).
- Verified locally: `VITE_BASE_PATH=/fx-sales-intervention/ pnpm build` produces `dist/index.html` with asset URLs correctly prefixed (`/fx-sales-intervention/assets/index-*.js`). Built bundle stays Caplin-free.
- Minimal `README.md` added at the repo root: project description, live demo URL placeholder pointing at `https://adityasingh95.github.io/fx-sales-intervention/?dev=1`, stack list, commands table, doc index, deploy note. FXSW-033 will polish this into the full shipped README later.

**User-directed decisions:**
- **Should the Pages deploy be wired up now (out of order) or wait for Phase 5?** Options offered: (a) skip ahead to FXSW-034 now to get the prototype on Pages from this branch, (b) commit a built `dist/` folder as a quick hack, (c) stay on plan and do FXSW-034 when Phase 5 lands. **Chosen:** (a). User had already flipped GitHub Pages on against this feature branch and wanted the prototype visible immediately; pulling the proper Actions workflow forward beats the quick-hack dist-commit path, and the dev-log just notes the phase-order skip rather than rewriting the backlog.

**Agent-directed decisions:**
- _Initial decision (revised — see follow-up):_ followed the architecture spec's `branches: [main]` trigger exactly rather than adding the current feature branch. Reasoning at the time: `workflow_dispatch` lets the user manually deploy from any branch via the Actions UI, and adding the feature branch as a temporary trigger would be debt.
- **Follow-up correction:** the architecture-spec trigger turned out not to work for our showcase situation. GitHub Actions only exposes `workflow_dispatch` in the UI for workflows that live on the **default branch**, and `deploy.yml` was only on the feature branch. The Actions tab showed GitHub's auto-generated `pages-build-deployment` workflow (left over from Pages-source-set-to-branch mode) rather than ours. Resolution: added `claude/vigilant-einstein-Dtads` to the `push` trigger so the next push to this branch auto-deploys. Push-trigger workflows DO discover from non-default branches; only `workflow_dispatch` requires default-branch residency. The temporary line gets stripped in the eventual merge commit to main.
- **First deploy was blank — second follow-up:** Pages source was still set to **Deploy from a branch** in repo settings, not GitHub Actions. The deploy workflow ran green and uploaded the artifact, but Pages ignored it and served the raw feature-branch repo root — so the browser loaded the source `index.html` and 404'd on `/src/main.tsx`. Fix was a one-click flip in Settings → Pages → Source → GitHub Actions; no code change needed. Worth flagging because "deploy workflow green + page blank" looked like an asset-path bug at first and isn't; the workflow's success only means the artifact got uploaded, not that Pages is configured to serve it.
- **Trigger cleanup on merge:** the temporary `claude/vigilant-einstein-Dtads` line is removed in the merge-to-main commit, as foreshadowed above. Post-merge the trigger is back to the architecture-spec shape: `push: branches: [main]` + `workflow_dispatch` (which is now usable from the Actions UI because `deploy.yml` lives on the default branch).
- Extracted `resolveBasePath` to `scripts/resolveBasePath.ts` rather than testing it via `vi.resetModules()` + dynamic re-import of `vite.config.ts`. The dynamic-import path hit an esbuild-in-jsdom invariant error (vite-plugin-react ships native bindings that don't survive jsdom's TextEncoder shim) and would have needed `// @vitest-environment node` per file. The helper-extraction approach is more testable, doesn't require an env override, and keeps the helper available to other tooling later.
- pnpm action pinned to `version: 10` to match the repo's `packageManager: pnpm@10.33.0` rather than the spec doc's `version: 9`. Spec doc was written against an older pnpm pin; the workflow has to match what's actually in `package.json` or `install --frozen-lockfile` fails.
- README is intentionally minimal — FXSW-033 owns the polished shipped README. This commit puts in just enough that the live URL is discoverable from the repo root.
- All gates green: typecheck ✓, lint ✓, test:run ✓ (113 pass / 8 todo), build with prod base path ✓, dist/ Caplin-free ✓. The workflow itself runs on GitHub, not locally — first execution is the human's responsibility (see next-step note in commit message).

---

## FXSW-006 · AppShell + Header + first hardcoded blotter row
**Commit `31e6762`**

- TDD red→green: 4 specified `App.test.tsx` cases — renders without error, contains "FX Sales Workstation", does **not** contain "Caplin" (CLAUDE.md rule §1 assertion), dev-injector slot visible with `?dev=1` and hidden without.
- `App.tsx` is now the real workstation shell: 2px gradient top-strip (`from-blue to-ai-accent` per `05 §2`), 56px header with title left + mute icon + session clock right + conditional dev-injector slot, then 55%/45% Active/Historic blotter regions stacked vertically.
- `useSessionClock` ticks `HH:mm:ss` every second via `setInterval`; cleared on unmount. `isDevMode()` reads `URLSearchParams(window.location.search).has('dev')` on every render so tests can flip URL via `window.history.replaceState`.
- `ActiveBlotter` renders the spec's column header row plus one hardcoded "INTERVENE" demo row that exercises every visible token: status pill (`amber`), mono `tabular-nums` time + amount + rate, side-coloured `BUY` (green), two `Chip`s in Reasons. Amber 4px left-edge bar matches `02 §Row states` for the `INTERVENE` label.
- `HistoricBlotter` shows "No historic deals yet." centred in `text-text-mute`.
- Minimal real implementations for `Pill` (7-color variants keyed to the status palette) and `Chip` (border + elevated bg) — both shared components per `05 §3.1`.
- Paranoia check: `grep -ri caplin dist/` after `pnpm build` returns no matches. The Caplin-free guarantee from CLAUDE.md rule §1 holds on the built bundle, not just the source.

**User-directed decisions:** None — `02 §1` + `05 §2` were prescriptive enough. The only genuinely open inputs were the hardcoded row's demo content (client name, amount, etc.) and the empty-state wording, neither of which rises to ambiguity needing human input — they get replaced by live data in FXSW-012 anyway.

**Agent-directed decisions:**
- Did **not** introduce AG-Grid yet. AC says "one hardcoded row exercising every token", and `docs/06 §2` reserves the AG-Grid integration for the live-blotter ticket FXSW-012. A plain flex-row table is enough to validate the token palette in a real layout without dragging the grid library's bundle weight + setup into this ticket.
- Implemented `Pill` and `Chip` as real shared components rather than inline JSX in `ActiveBlotter`. They're listed in the `05 §3.1` shared inventory, FXSW-012 and the ticket panels will need them, and the alternative (inline JSX now, extract later) creates a refactor debt for zero immediate benefit.
- `Pill` API takes a `color` prop with a closed `PillColor` union (`amber | blue | teal | green | red | grey | ai`) rather than accepting an arbitrary color token name. Closed unions give consumers exhaustive checking and prevent typo-driven runtime mismatches.
- `?dev=1` detection reads `URLSearchParams` on every render (not memoised, not module-scoped). Cheap, and means tests can swap the URL via `window.history.replaceState` without rebuilding the component tree. The trade-off (a few microseconds per render) is irrelevant at this scale.
- Mute icon is a placeholder `<button>` with `aria-label` but no wired-up state — actual mute behaviour lands in FXSW-029 (audio chime + settingsStore). Keeping the affordance present from FXSW-006 means later tickets only need to wire state, not add the element.
- All five gates green: typecheck ✓, lint ✓, test:run ✓ (110 pass / 8 todo), build ✓, e2e ✓ (smoke). Built bundle `caplin`-free.

---

## FXSW-005 · State machine skeletons
**Commit `49bde9a`**

- TDD red→green: all 7 specified tests pass (`siMachine` 4, `rfsMachine` 2, `dealMachine` 1).
- `siMachine` — `Initial → PickUpSent → PickedUp` with a named `ackDelay` (250ms) wired through a delay function so `timings.ackDelayMs = 0` from tests immediately makes the transition synchronous.
- `rfsMachine` — `Queued → PickedUp` on `PickUp`. Minimal subset per AC; the rest lands in FXSW-010.
- `dealMachine` — parent that spawns one of each child on init, sharing `dealId` via context.

**User-directed decisions:** None — all decisions within doc-pack guidance (`docs/03 §1, §2, §6` + `CLAUDE.md` rule §7 + the backlog AC's explicit TDD spec).

**Agent-directed decisions:**
- `timings.ts` exports an **object** (`{ ackDelayMs: 250 }`) not `const ackDelayMs = 250`. ES modules make `const` bindings read-only across module boundaries; one of the TDD specs is "overriding `timings.ackDelayMs = 0` makes the transition synchronous", and object property assignment is the only form that satisfies it.
- Delay is wired via a named `ackDelay` **delay function** (`delays: { ackDelay: () => timings.ackDelayMs }`) rather than a literal `after: { 250: ... }`. XState re-evaluates the function lazily on state entry, so test reassignment takes effect on subsequent transitions without rebuilding the machine.
- Declared no-op handlers for **all 16 SI events** from `docs/03 §2` on the parent up-front (not just the few used in this slice). Lets callers wire `send({ type: 'Quote' })` etc. now without TS errors; the real RFS↔SI cross-model coordination from `docs/03 §3` lands cleanly in FXSW-010 by replacing the no-ops in place.
- Each module exports `SnapshotFrom`-derived state-value types so consumers get inferred types instead of repeating the union.
- All gates green: typecheck, lint, test:run (106 pass / 8 todo).

---

## FXSW-004 · Prebuild reference-mids script
**Commit `1ca6d65`**

- Tests-first: 4 cases covering `round` precision, happy-path inversion (EUR/GBP from `1/rate`; JPY/INR straight), HTTP-non-OK → fallback, fetch-throw → fallback.
- Script `scripts/fetch-reference-mids.ts` — Frankfurter USD-based fetch with a 5s `AbortSignal.timeout`, hard-coded fallback, 0 exit code on either path.
- `predev` and `prebuild` wired in `package.json` — confirmed both fire (Frankfurter returns 403 in sandbox network, fallback kicks in, file written, exit 0).

**User-directed decisions:** None — Frankfurter-as-primary, bake-at-build approach, and fallback-on-failure were all locked in by `docs/04 §10`.

**Agent-directed decisions:**
- Direct-run guard: `import.meta.url === file://${process.argv[1]}` so vitest can `import { main, round, FALLBACK }` from the script without triggering a real fetch + write on import. Exports `main(outPath)` parameterised on output path so tests use `mkdtemp` and don't clobber the real generated file.
- `referenceMids.json` is **gitignored**, not checked in. It's a build artifact regenerated on every `pnpm dev`/`pnpm build`; checking it in would create noisy daily diffs.
- `scripts/` added to `tsconfig.app.json` include so `tsc -b` covers the new file (it was outside the existing roots).
- All four gates: typecheck ✓, lint ✓, test:run ✓ (99 pass / 11 todo), build ✓.

---

## FXSW-003 · Folder structure
**Commit `04c4032`**

- Playwright network retry succeeded — chromium installed cleanly at `/opt/pw-browsers/` (had to re-install for v1.44 after `pnpm install` pulled the bundled version).
- Created the full `06 §2` folder tree: 65 new placeholder files across `src/components/`, `src/features/{blotter,ticket,notifications,dev-injector}/`, `src/services/{feed,scenarios,suggestion}/`, `src/state/{stores,machines}/`, `src/types/`, `src/lib/`, plus `tests/e2e/{scenarios,notifications}.spec.ts` and `fixtures.ts`.

**User-directed decisions:** None — the architecture tree in `docs/06 §2` is the literal spec.

**Agent-directed decisions:**
- TS/TSX placeholders use `export {};`; test files (`*.test.ts`) use `it.todo('placeholder')`. Both forms keep typecheck, lint, and vitest green while files wait for real implementations. `it.todo` shows up as a `todo` rather than a failure or a "no tests found" error.
- Kept `index.html` at the **repo root** (Vite 5 convention) rather than moving it under `public/` as the architecture tree shows. Vite's behavior overrides the documentation imprecision; `public/.gitkeep` lets the directory exist for the spec without breaking the bundler.
- Existing `tests/e2e/smoke.spec.ts` (from FXSW-001) kept alongside the three e2e files the architecture lists. Smoke-as-canary stays useful.
- All four gates green: typecheck, lint, test:run (95 pass / 11 todo), test:e2e (smoke).

---

## FXSW-002 · Design tokens + Tailwind config
**Commit `f732331`**

- Every CSS custom property from `docs/05-ui-ux-spec.md §1` lifted into `src/styles/tokens.css`: backgrounds, borders, text, status colors, AI accent family (Cyan/Violet/Teal), functional colors, typography (Geist + Geist Mono via `@fontsource`), spacing, radii, shadows, easings.
- Tailwind theme extended with matching aliases so `bg-bg-panel`, `text-text-dim`, `border-border`, `shadow-ai` resolve.

**User-directed decisions:** None — all token values come straight from `docs/05 §1`.

**Agent-directed decisions:**
- Hex values **duplicated** between `tokens.css` (runtime) and `tailwind.config.ts` (build-time) — the FXSW-002 AC's hex assertion needs an asserted-against source, and Tailwind can't read CSS custom properties at config-evaluation time. The duplication is intentional, not accidental drift.
- Test approach pivoted from the AC's original "assert computed styles on a rendered probe div" to file-content assertions (49 token cases) plus import-the-config-and-assert-the-shape (45 cases). **jsdom doesn't resolve Tailwind classes or CSS `var()` references in `getComputedStyle`**, so the original AC was untestable as-stated. The pivot preserves the spirit (every documented token has an assertion) without depending on a real browser.
- Moved `tailwind.config.ts` out of `tsconfig.node.json` into `tsconfig.app.json` so the config-shape test can import it under the app's project boundary.
- Body sets `tabular-nums` on `.font-mono` so price columns stay aligned.
- All gates green: typecheck, lint, test:run (95 pass).

---

## FXSW-001 · Project scaffolding
**Commit `6999625`**

- Vite 5 + React 18 + TypeScript 5 (strict, no `any`), all dependency versions pinned exactly to `docs/06-tech-architecture.md §1`.
- Full script set wired per `CLAUDE.md`: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:run`, `test:e2e`, `test:e2e:ui`.
- Configs landed: project-reference `tsconfig` with `@/` → `src/` alias, Vite with `VITE_BASE_PATH`-driven base, Tailwind 3 + PostCSS + Autoprefixer (tokens hold til FXSW-002), Vitest with jsdom + globals + `testing-library/jest-dom`, Playwright chromium-only single-worker on 4173 preview, ESLint 8 + Prettier-disable + no-warnings policy, Prettier 3.
- Smoke tests prove the plumbing: `App` is a function (Vite + TS + Vitest pipeline works) and Playwright loads `<body>` (preview + browser launch + assertion works).

**User-directed decisions:** None — stack and pinned versions came directly from `docs/06 §1`.

**Agent-directed decisions:**
- `VITE_BASE_PATH` env-driven base path baked in from day one so the FXSW-034 GitHub Pages deploy doesn't need a config retrofit.
- ESLint runs with `--max-warnings 0`. Warnings fail CI; no gradual-decay rot allowed.
- Playwright pinned to **chromium-only, single-worker**. Multi-browser matrix is out of scope for a prototype; single worker keeps the simulated time-based scenarios deterministic.
- All gates green: typecheck, lint, test:run, e2e.

---

## Phase 0 · Spec pack, backlog, scaffolding (pre-implementation)
**Commits `4ecba9d`, `ac4b8cd`, `1dc1a1f`**

The phase before any code. Sets up everything FXSW-001+ tickets
draw on. Not a single ticket — a multi-day grounding pass.

- **Spec pack** written into `docs/00-glossary.md` through `docs/09-suggestion-engine.md`. Industry-standard FX terminology defined, functional spec for tickets + blotters + notifications, trade-state model (RFS + Sales Intervention) with full state tables and Mermaid diagrams, dummy feed spec, UI/UX spec with every design token, tech architecture, scenario pack, test plan, AI Margin Suggestion engine.
- **Backlog** at `docs/BACKLOG.md` — 34 tickets (FXSW-001 through FXSW-034) across 5 phases. Every ticket has effort estimate (S/M/L), TDD heat-level (🔴 strict / 🟡 component-tests / 🟢 e2e-only / —), dependency list, doc anchors, acceptance criteria, and TDD test list.
- **`CLAUDE.md`** — operating instructions auto-loaded each session. Pinned the stack, the conventions, and ten critical rules.

Phase 0 is where the user-directed-vs-agent-directed split is most
load-bearing: the design decisions made here are what let later
tickets stay agent-directed.

**User-directed decisions** (with the options that were surfaced and the choice taken):
- **Product name vs repo slug.** Options on the table: keep `fx-sales-workstation` as both, or split the slug from the product name. **Chosen:** product name "FX Sales Workstation"; repo slug renamed to `fx-sales-intervention` (commit `ac4b8cd`) to match the underlying functional domain. Slug ≠ product name is intentional.
- **Caplin mentions in the shipped build.** Options: allow Caplin in code identifiers (the canonical Caplin state names are convenient) vs ban Caplin from all shipped artifacts. **Chosen:** ban — UI strings, package metadata, comments, source-map identifiers, README must not mention Caplin. Industry-standard FX terms (`Quoted`, `PickedUp`, `Executable`, `RFS`, `Sales Intervention`) are fine. Locked in as `CLAUDE.md` critical rule §1.
- **One trade machine or two.** Options: collapse RFS + SI into one combined flat machine (simpler, smaller), or model them as two parallel machines with documented cross-sends (mirrors Caplin reality, cleaner v2 path). **Chosen:** two machines with a parent `dealMachine` coordinator. Locked in as `CLAUDE.md` rule §7. The Caplin docs being explicit on this was the deciding factor.
- **AI Margin Suggestion: real LLM call vs deterministic function.** Options: real model call (more impressive demo, latency + non-determinism + cost), or pure deterministic rule engine (predictable, testable, free). **Chosen:** deterministic function. `docs/09-suggestion-engine.md` is the rule book; the in-UI label stays "AI Margin Suggestion" / "Suggested Markup" — the label is real even if the implementation is deterministic. Locked in as `CLAUDE.md` rule §9.
- **Reference FX rates: runtime fetch vs build-time bake.** Options: live HTTP at app startup (current mids, but flaky), or `prebuild` bake to JSON (offline-safe demos, slightly stale). **Chosen:** build-time bake with a hard-coded fallback. Documented in `docs/04 §10`; implemented as FXSW-004.
- **Wiki Agent hand-off path.** Options: write to `raw/prs/` (matches the standard Wiki Agent expectation) vs write to `docs/phase-summaries/` (stays inside the implementation agent's write boundary). **Chosen:** `docs/phase-summaries/` so `CLAUDE.md` rule §10's write boundary stays strict — implementation agent never writes to `wiki/` or `raw/`. The Wiki Agent ingestion config has to be told to read from this path instead of the default.
- **Persistence scope.** Options: none, `sessionStorage`, `localStorage`, IndexedDB. **Chosen:** `sessionStorage` only, and only for two flags (mute toggle + AI-suggestion dismissal). Locked in as `CLAUDE.md` rule §3.

**Agent-directed decisions** (decisions that didn't need a human vote):
- **`*Sent` states with simulated ack delay** (200-300ms). UX fidelity decision — real backends have ack latency, so the demo should show the same affordance. Configurable via `timings.ts`, zeroable in tests. Locked in as `CLAUDE.md` rule §8.
- **5-second removal rule for terminal trades** from the Active Blotter. UX decision derived from `docs/02 §Active Blotter`; locked in as `CLAUDE.md` rule §5.
- **Audio playback unlocked by user gesture**. Browser autoplay policy makes this a forced hand, not a design choice. Locked in as `CLAUDE.md` rule §4.
- **Per-session branch model**. Each Claude Code web session gets a fresh branch (`claude/<adjective-noun>-<id>`) and PRs at consolidation points. This is the harness default, accepted as-is.

No gates at this stage — no code yet. The spec pack itself is the
deliverable, and it's the single grounding source FXSW-001+ all
cite.

---

_Older entries (the bare repo + the initial spec-pack import) are
visible in `git log` directly._
